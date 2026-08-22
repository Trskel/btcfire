use rand_chacha::ChaCha8Rng;
use rand_chacha::rand_core::SeedableRng;
use rand_distr::{Distribution, StandardNormal};
use serde::{Deserialize, Serialize};

use crate::models::ModelPoint;
use crate::simulation::engine::{PathPoint, run_withdrawal_on_path_from_state, year_map};
use crate::simulation::runtime::{RuntimeState, SimulationParams};
use crate::strategies::policy::WithdrawalPolicy;

pub const RUN_COUNT: usize = 10_000;
pub const MONTE_CARLO_SEED: u32 = 42;

const EPS: f64 = 1e-9;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloSummary {
    pub run_out_pct: f64,
    pub below_min_pct: f64,
    pub success_pct: f64,
    pub desired_spend_pct: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YearPercentiles {
    pub year: i32,
    pub p10: f64,
    pub p25: f64,
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloResult {
    pub run_count: usize,
    pub seed: u32,
    pub summary: MonteCarloSummary,
    pub percentiles: Vec<YearPercentiles>,
}

fn sample_path(
    rng: &mut ChaCha8Rng,
    start_year: i32,
    horizon: usize,
    points: &[PathPoint],
) -> Result<Vec<PathPoint>, String> {
    let map = year_map(points);
    let mut path: Vec<PathPoint> = Vec::with_capacity(horizon);
    let mut prev_price: f64 = 0.0;

    for t in 0..horizon {
        let year = start_year + t as i32;
        let point = map
            .get(&year)
            .ok_or_else(|| format!("Model projection does not cover year {}", year))?;

        let sampled = if t == 0 {
            point.median_price_usd
        } else {
            let prev = map.get(&(year - 1)).ok_or_else(|| {
                format!("Model projection does not cover year {}", year - 1)
            })?;
            let drift = (point.median_price_usd / prev.median_price_usd).ln();
            let innovation = match point.sigma() {
                Some(sigma) if sigma > 0.0 => {
                    let z: f64 = StandardNormal.sample(rng);
                    sigma * z
                }
                _ => 0.0,
            };
            (prev_price.ln() + drift + innovation).exp()
        };

        prev_price = sampled;
        path.push(PathPoint {
            year,
            price_usd: sampled,
            median_price_usd: point.median_price_usd,
            band_1sigma_low: point.band_1sigma_low,
            band_1sigma_high: point.band_1sigma_high,
            band_p10: point.band_p10,
            band_p90: point.band_p90,
            band_p25: point.band_p25,
            band_p75: point.band_p75,
        });
    }
    Ok(path)
}

fn percentile(sorted: &[f64], pct: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let rank = (pct / 100.0 * sorted.len() as f64).ceil() as usize;
    sorted[rank.clamp(1, sorted.len()) - 1]
}

pub fn run_monte_carlo(
    policy: &WithdrawalPolicy,
    params: &SimulationParams,
    model_points: &[ModelPoint],
    seed: u32,
    start_state: Option<&RuntimeState>,
) -> Result<MonteCarloResult, String> {
    let horizon = params.horizon_years();
    if horizon == 0 {
        return Ok(MonteCarloResult {
            run_count: 0,
            seed,
            summary: MonteCarloSummary {
                run_out_pct: 0.0,
                below_min_pct: 0.0,
                success_pct: 0.0,
                desired_spend_pct: None,
            },
            percentiles: Vec::new(),
        });
    }

    let start_year = start_state
        .map(|s| s.year)
        .unwrap_or(params.retirement_start_year);
    let years_offset = (start_year - params.retirement_start_year) as f64;
    let base: Vec<PathPoint> = model_points.iter().map(PathPoint::from_model_point).collect();

    let mut rng = ChaCha8Rng::seed_from_u64(seed as u64);

    let mut depleted_count = 0usize;
    let mut below_min_count = 0usize;
    let mut success_count = 0usize;
    let mut success_desired_hits = 0usize;
    let mut success_year_total = 0usize;

    let mut btc_by_year: Vec<Vec<f64>> = vec![Vec::with_capacity(RUN_COUNT); horizon];

    for _ in 0..RUN_COUNT {
        let path = sample_path(&mut rng, start_year, horizon, &base)?;
        let results =
            run_withdrawal_on_path_from_state(policy, params, &path, start_state)?;

        let depleted = results
            .iter()
            .any(|r| r.btc <= EPS && r.sold_btc <= EPS);

        let below_min = !depleted
            && results.iter().enumerate().any(|(t, r)| {
                r.spend_usd < params.floor_usd(years_offset + t as f64) * (1.0 - EPS)
            });

        if depleted {
            depleted_count += 1;
        } else if below_min {
            below_min_count += 1;
        } else {
            success_count += 1;
            for (t, r) in results.iter().enumerate() {
                success_year_total += 1;
                let desired = params.inflation_mult(years_offset + t as f64)
                    * params.annual_spend_usd
                    * (1.0 - EPS);
                if r.spend_usd >= desired {
                    success_desired_hits += 1;
                }
            }
        }

        for (t, r) in results.iter().enumerate() {
            btc_by_year[t].push(r.btc);
        }
    }

    let run_count = RUN_COUNT as f64;
    let percentiles = btc_by_year
        .into_iter()
        .enumerate()
        .map(|(t, mut btc)| {
            btc.sort_unstable_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            YearPercentiles {
                year: start_year + t as i32,
                p10: percentile(&btc, 10.0),
                p25: percentile(&btc, 25.0),
                p50: percentile(&btc, 50.0),
                p75: percentile(&btc, 75.0),
                p90: percentile(&btc, 90.0),
            }
        })
        .collect();

    let desired_spend_pct = if success_year_total > 0 {
        Some(success_desired_hits as f64 / success_year_total as f64 * 100.0)
    } else {
        None
    };

    Ok(MonteCarloResult {
        run_count: RUN_COUNT,
        seed,
        summary: MonteCarloSummary {
            run_out_pct: depleted_count as f64 / run_count * 100.0,
            below_min_pct: below_min_count as f64 / run_count * 100.0,
            success_pct: success_count as f64 / run_count * 100.0,
            desired_spend_pct,
        },
        percentiles,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    const START: i32 = 2030;
    const HORIZON: usize = 50;
    const MEDIAN: f64 = 100_000.0;

    fn model_points(
        n: usize,
        median: f64,
        low: Option<f64>,
        high: Option<f64>,
    ) -> Vec<ModelPoint> {
        (0..n)
            .map(|i| ModelPoint {
                year: START + i as i32,
                timestamp_ms: 0,
                median_price_usd: median,
                path_price_usd: None,
                band_1sigma_low: low,
                band_1sigma_high: high,
                band_2sigma_low: None,
                band_2sigma_high: None,
                band_p10: None,
                band_p90: None,
                band_p25: None,
                band_p75: None,
            })
            .collect()
    }

    fn banded_points(n: usize) -> Vec<ModelPoint> {
        model_points(n, MEDIAN, Some(MEDIAN / 1.0_f64.exp()), Some(MEDIAN * 1.0_f64.exp()))
    }

    fn flat_points(n: usize) -> Vec<ModelPoint> {
        model_points(n, MEDIAN, None, None)
    }

    fn sim_params(
        holdings: f64,
        min_spend: f64,
        annual: f64,
        inflation: f64,
        horizon: usize,
    ) -> SimulationParams {
        SimulationParams {
            holdings_btc: holdings,
            retirement_start_year: START,
            current_age: 40,
            lifespan: 40 + horizon as i32,
            minimum_spend_usd: min_spend,
            annual_spend_usd: annual,
            inflation_rate: inflation,
        }
    }

    fn assert_pct_sum(result: &MonteCarloResult) {
        let s = &result.summary;
        assert_eq!(result.run_count, RUN_COUNT);
        let sum = s.run_out_pct + s.below_min_pct + s.success_pct;
        assert!(
            (sum - 100.0).abs() < 1e-6,
            "classification partitions must sum to 100, got {}",
            sum
        );
        assert!(s.run_out_pct >= 0.0 && s.below_min_pct >= 0.0 && s.success_pct >= 0.0);
    }

    #[wasm_bindgen_test]
    fn same_inputs_produce_identical_results() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let a = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let b = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_eq!(a, b);
    }

    #[wasm_bindgen_test]
    fn different_seeds_produce_different_paths() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let a = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let b = run_monte_carlo(&policy, &params, &points, 43, None).unwrap();
        assert_ne!(a.percentiles, b.percentiles);
    }

    #[wasm_bindgen_test]
    fn classification_partitions_the_run() {
        // Monthly valuation policy over a banded projection: a real mixture.
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);

        // Deterministic flat projection with a heavy fixed spend: all
        // depleted, nothing else.
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.anchor = crate::strategies::policy::Anchor::FixedUsd;
        policy.spend_usd = 50_000.0;
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert!((result.summary.run_out_pct - 100.0).abs() < 1e-9);
        assert_eq!(result.summary.success_pct, 0.0);
        assert_eq!(result.summary.desired_spend_pct, None);
    }

    #[wasm_bindgen_test]
    fn depletion_takes_precedence_over_below_minimum() {
        // Fixed 50k spend from 0.1 BTC at 100k: the first year's spend
        // (10k) falls below the 20k floor, then the stack hits zero. The
        // path must count as depleted, not below-minimum.
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.anchor = crate::strategies::policy::Anchor::FixedUsd;
        policy.spend_usd = 50_000.0;
        let params = sim_params(0.1, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert!((result.summary.run_out_pct - 100.0).abs() < 1e-9);
        assert_eq!(result.summary.below_min_pct, 0.0);
    }

    #[wasm_bindgen_test]
    fn below_minimum_without_depletion() {
        // % of current never depletes but spends 4k, below the 20k floor.
        let policy = WithdrawalPolicy::fixed_pct();
        let params = sim_params(1.0, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert!((result.summary.below_min_pct - 100.0).abs() < 1e-9);
        assert_eq!(result.summary.success_pct, 0.0);
        assert_eq!(result.summary.desired_spend_pct, None);
    }

    #[wasm_bindgen_test]
    fn success_with_zero_minimum() {
        let policy = WithdrawalPolicy::fixed_pct();
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert!((result.summary.success_pct - 100.0).abs() < 1e-9);
        assert_eq!(result.summary.below_min_pct, 0.0);
        assert!(result.summary.desired_spend_pct.is_some());
    }

    #[wasm_bindgen_test]
    fn desired_spend_coverage_full_when_spend_matches_desired() {
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.anchor = crate::strategies::policy::Anchor::FixedUsd;
        policy.spend_usd = 50_000.0;
        let params = sim_params(100.0, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert!((result.summary.success_pct - 100.0).abs() < 1e-9);
        let coverage = result.summary.desired_spend_pct.unwrap();
        assert!((coverage - 100.0).abs() < 1e-9, "coverage was {}", coverage);
    }

    #[wasm_bindgen_test]
    fn desired_spend_coverage_measures_only_success_paths() {
        // Valuation-based over banded points: some paths fail. Every
        // success path must spend at least the 20k floor, so coverage
        // counts only success-path years and never dips below 0.
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        if let Some(coverage) = result.summary.desired_spend_pct {
            assert!(coverage >= 0.0 && coverage <= 100.0);
        } else {
            assert_eq!(result.summary.success_pct, 0.0);
        }
    }

    #[wasm_bindgen_test]
    fn percentiles_are_ordered_per_year() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_eq!(result.percentiles.len(), HORIZON);
        for (i, y) in result.percentiles.iter().enumerate() {
            assert_eq!(y.year, START + i as i32);
            assert!(y.p10 <= y.p25, "year {}: p10 > p25", y.year);
            assert!(y.p25 <= y.p50, "year {}: p25 > p50", y.year);
            assert!(y.p50 <= y.p75, "year {}: p50 > p75", y.year);
            assert!(y.p75 <= y.p90, "year {}: p75 > p90", y.year);
        }
    }

    #[wasm_bindgen_test]
    fn percentiles_track_the_median_path_without_dispersion() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let single = crate::simulation::engine::run_withdrawal(&policy, &params, &points).unwrap();
        for (y, r) in result.percentiles.iter().zip(single.iter()) {
            assert!((y.p10 - r.btc).abs() < 1e-9, "year {} p10", y.year);
            assert!((y.p25 - r.btc).abs() < 1e-9);
            assert!((y.p50 - r.btc).abs() < 1e-9);
            assert!((y.p75 - r.btc).abs() < 1e-9);
            assert!((y.p90 - r.btc).abs() < 1e-9);
        }
    }

    #[wasm_bindgen_test]
    fn zero_holdings_all_depleted() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(0.0, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert!((result.summary.run_out_pct - 100.0).abs() < 1e-9);
        assert_eq!(result.summary.desired_spend_pct, None);
    }

    #[wasm_bindgen_test]
    fn single_year_horizon_works() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 50_000.0, 0.0, 1);
        let points = banded_points(1);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_pct_sum(&result);
        assert_eq!(result.percentiles.len(), 1);
        assert_eq!(result.percentiles[0].year, START);
    }

    #[wasm_bindgen_test]
    fn zero_year_horizon_returns_empty_result() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(1.0, 20_000.0, 50_000.0, 0.0, 0);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_eq!(result.run_count, 0);
        assert_eq!(result.summary.run_out_pct, 0.0);
        assert_eq!(result.summary.below_min_pct, 0.0);
        assert_eq!(result.summary.success_pct, 0.0);
        assert_eq!(result.summary.desired_spend_pct, None);
        assert!(result.percentiles.is_empty());
    }

    #[wasm_bindgen_test]
    fn resume_from_state_runs_from_that_year() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, 20);
        let points = flat_points(HORIZON);
        let state = RuntimeState {
            year: START + 10,
            btc: 0.5,
            cash_usd: 0.0,
            buffer_years: 0.0,
            initial_rate: 0.04,
            base_spend_usd: 4_000.0,
            deferred_buffer: false,
        };
        let result =
            run_monte_carlo(&policy, &params, &points, 42, Some(&state)).unwrap();
        assert_eq!(result.run_count, RUN_COUNT);
        assert_eq!(result.percentiles.len(), 20);
        assert_eq!(result.percentiles[0].year, START + 10);
        assert_pct_sum(&result);
    }
}
