use rand_chacha::ChaCha8Rng;
use rand_chacha::rand_core::SeedableRng;
use rand_distr::{Distribution, StandardNormal};
use serde::{Deserialize, Serialize};

use crate::models::ModelPoint;
use crate::simulation::engine::{PathPoint, run_withdrawal_on_path_from_state, year_map};
use crate::simulation::runtime::{RuntimeState, SimulationParams};
use crate::strategies::policy::{Phase, WithdrawalPolicy};

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
    pub spend_p10: f64,
    pub spend_p25: f64,
    pub spend_p50: f64,
    pub spend_p75: f64,
    pub spend_p90: f64,
    pub buffer_years_p10: f64,
    pub buffer_years_p25: f64,
    pub buffer_years_p50: f64,
    pub buffer_years_p75: f64,
    pub buffer_years_p90: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurvivalPoint {
    pub year: i32,
    pub survival_pct: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FailureHistogramPoint {
    pub year: i32,
    pub depleted: u32,
    pub below_min: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloForensics {
    pub survival_by_year: Vec<SurvivalPoint>,
    pub failure_histogram: Vec<FailureHistogramPoint>,
    pub median_failure_year: Option<i32>,
    pub shortfall_median_usd: Option<f64>,
    pub shortfall_p90_usd: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyStats {
    pub final_btc_p10: f64,
    pub final_btc_p50: f64,
    pub final_btc_p90: f64,
    pub success_final_btc_median: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseTimeStats {
    pub bear_pct: f64,
    pub fair_pct: f64,
    pub euphoria_pct: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloResult {
    pub run_count: usize,
    pub seed: u32,
    pub summary: MonteCarloSummary,
    pub percentiles: Vec<YearPercentiles>,
    pub forensics: Option<MonteCarloForensics>,
    pub legacy: Option<LegacyStats>,
    pub phase_time: Option<PhaseTimeStats>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum FailureMode {
    Depleted,
    BelowMin,
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

fn sort_f64(values: &mut [f64]) {
    values.sort_unstable_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
}

fn pct_points(sorted: &[f64]) -> [f64; 5] {
    [
        percentile(sorted, 10.0),
        percentile(sorted, 25.0),
        percentile(sorted, 50.0),
        percentile(sorted, 75.0),
        percentile(sorted, 90.0),
    ]
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
            forensics: None,
            legacy: None,
            phase_time: None,
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
    let mut spend_by_year: Vec<Vec<f64>> = vec![Vec::with_capacity(RUN_COUNT); horizon];
    let mut buffer_by_year: Vec<Vec<f64>> = vec![Vec::with_capacity(RUN_COUNT); horizon];

    let mut depleted_hist: Vec<u32> = vec![0; horizon];
    let mut below_min_hist: Vec<u32> = vec![0; horizon];
    let mut failure_years: Vec<i32> = Vec::with_capacity(RUN_COUNT);
    let mut shortfalls: Vec<f64> = Vec::with_capacity(RUN_COUNT);

    let mut final_btc_all: Vec<f64> = Vec::with_capacity(RUN_COUNT);
    let mut final_btc_success: Vec<f64> = Vec::with_capacity(RUN_COUNT);

    let mut phase_counts = [0usize; 3];

    for _ in 0..RUN_COUNT {
        let path = sample_path(&mut rng, start_year, horizon, &base)?;
        let results =
            run_withdrawal_on_path_from_state(policy, params, &path, start_state)?;

        let depletion_t = results
            .iter()
            .position(|r| r.btc <= EPS && r.sold_btc <= EPS);
        let below_min_t = results.iter().enumerate().find_map(|(t, r)| {
            (r.spend_usd < params.floor_usd(years_offset + t as f64) * (1.0 - EPS))
                .then_some(t)
        });

        let failure = match (depletion_t, below_min_t) {
            (Some(t), _) => Some((t, FailureMode::Depleted)),
            (None, Some(t)) => Some((t, FailureMode::BelowMin)),
            (None, None) => None,
        };

        match failure {
            Some((t, FailureMode::Depleted)) => {
                depleted_count += 1;
                depleted_hist[t] += 1;
            }
            Some((t, FailureMode::BelowMin)) => {
                below_min_count += 1;
                below_min_hist[t] += 1;
            }
            None => {
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
        }

        if let Some((t, _)) = failure {
            failure_years.push(start_year + t as i32);
            let worst = results
                .iter()
                .enumerate()
                .map(|(i, r)| {
                    (params.floor_usd(years_offset + i as f64) - r.spend_usd).max(0.0)
                })
                .fold(0.0_f64, f64::max);
            shortfalls.push(worst);
        }

        let final_btc = results.last().map(|r| r.btc).unwrap_or(0.0);
        final_btc_all.push(final_btc);
        if failure.is_none() {
            final_btc_success.push(final_btc);
        }

        if policy.valuation.enabled {
            for r in &results {
                match r.phase {
                    Some(Phase::Bear) => phase_counts[0] += 1,
                    Some(Phase::Fair) => phase_counts[1] += 1,
                    Some(Phase::Euphoria) => phase_counts[2] += 1,
                    None => {}
                }
            }
        }

        for (t, r) in results.iter().enumerate() {
            btc_by_year[t].push(r.btc);
            spend_by_year[t].push(r.spend_usd);
            buffer_by_year[t].push(r.buffer_years);
        }
    }

    let run_count = RUN_COUNT as f64;
    let percentiles = btc_by_year
        .into_iter()
        .zip(spend_by_year)
        .zip(buffer_by_year)
        .enumerate()
        .map(|(t, ((mut btc, mut spend), mut buffer))| {
            sort_f64(&mut btc);
            sort_f64(&mut spend);
            sort_f64(&mut buffer);
            let b = pct_points(&btc);
            let s = pct_points(&spend);
            let buf = pct_points(&buffer);
            YearPercentiles {
                year: start_year + t as i32,
                p10: b[0],
                p25: b[1],
                p50: b[2],
                p75: b[3],
                p90: b[4],
                spend_p10: s[0],
                spend_p25: s[1],
                spend_p50: s[2],
                spend_p75: s[3],
                spend_p90: s[4],
                buffer_years_p10: buf[0],
                buffer_years_p25: buf[1],
                buffer_years_p50: buf[2],
                buffer_years_p75: buf[3],
                buffer_years_p90: buf[4],
            }
        })
        .collect();

    let mut failed_total = 0u32;
    let mut survival_by_year = Vec::with_capacity(horizon);
    let mut failure_histogram = Vec::with_capacity(horizon);
    for t in 0..horizon {
        let depleted = depleted_hist[t];
        let below_min = below_min_hist[t];
        failed_total += depleted + below_min;
        survival_by_year.push(SurvivalPoint {
            year: start_year + t as i32,
            survival_pct: (RUN_COUNT - failed_total as usize) as f64 / run_count * 100.0,
        });
        failure_histogram.push(FailureHistogramPoint {
            year: start_year + t as i32,
            depleted,
            below_min,
        });
    }

    let median_failure_year = if failure_years.is_empty() {
        None
    } else {
        let mut years: Vec<f64> = failure_years.iter().map(|&y| y as f64).collect();
        sort_f64(&mut years);
        Some(percentile(&years, 50.0) as i32)
    };

    let (shortfall_median_usd, shortfall_p90_usd) = if shortfalls.is_empty() {
        (None, None)
    } else {
        sort_f64(&mut shortfalls);
        (
            Some(percentile(&shortfalls, 50.0)),
            Some(percentile(&shortfalls, 90.0)),
        )
    };

    sort_f64(&mut final_btc_all);
    let legacy = LegacyStats {
        final_btc_p10: percentile(&final_btc_all, 10.0),
        final_btc_p50: percentile(&final_btc_all, 50.0),
        final_btc_p90: percentile(&final_btc_all, 90.0),
        success_final_btc_median: if final_btc_success.is_empty() {
            None
        } else {
            sort_f64(&mut final_btc_success);
            Some(percentile(&final_btc_success, 50.0))
        },
    };

    let phase_time = if policy.valuation.enabled {
        let total_years = RUN_COUNT * horizon;
        Some(PhaseTimeStats {
            bear_pct: phase_counts[0] as f64 / total_years as f64 * 100.0,
            fair_pct: phase_counts[1] as f64 / total_years as f64 * 100.0,
            euphoria_pct: phase_counts[2] as f64 / total_years as f64 * 100.0,
        })
    } else {
        None
    };

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
        forensics: Some(MonteCarloForensics {
            survival_by_year,
            failure_histogram,
            median_failure_year,
            shortfall_median_usd,
            shortfall_p90_usd,
        }),
        legacy: Some(legacy),
        phase_time,
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
            assert!(
                y.spend_p10 <= y.spend_p25,
                "year {}: spend_p10 > spend_p25",
                y.year
            );
            assert!(
                y.spend_p25 <= y.spend_p50,
                "year {}: spend_p25 > spend_p50",
                y.year
            );
            assert!(
                y.spend_p50 <= y.spend_p75,
                "year {}: spend_p50 > spend_p75",
                y.year
            );
            assert!(
                y.spend_p75 <= y.spend_p90,
                "year {}: spend_p75 > spend_p90",
                y.year
            );
            assert!(
                y.buffer_years_p10 <= y.buffer_years_p25,
                "year {}: buffer_years_p10 > buffer_years_p25",
                y.year
            );
            assert!(
                y.buffer_years_p25 <= y.buffer_years_p50,
                "year {}: buffer_years_p25 > buffer_years_p50",
                y.year
            );
            assert!(
                y.buffer_years_p50 <= y.buffer_years_p75,
                "year {}: buffer_years_p50 > buffer_years_p75",
                y.year
            );
            assert!(
                y.buffer_years_p75 <= y.buffer_years_p90,
                "year {}: buffer_years_p75 > buffer_years_p90",
                y.year
            );
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
            assert!((y.spend_p10 - r.spend_usd).abs() < 1e-9, "year {} spend_p10", y.year);
            assert!((y.spend_p25 - r.spend_usd).abs() < 1e-9);
            assert!((y.spend_p50 - r.spend_usd).abs() < 1e-9);
            assert!((y.spend_p75 - r.spend_usd).abs() < 1e-9);
            assert!((y.spend_p90 - r.spend_usd).abs() < 1e-9);
            assert!(
                (y.buffer_years_p10 - r.buffer_years).abs() < 1e-9,
                "year {} buffer_years_p10",
                y.year
            );
            assert!((y.buffer_years_p25 - r.buffer_years).abs() < 1e-9);
            assert!((y.buffer_years_p50 - r.buffer_years).abs() < 1e-9);
            assert!((y.buffer_years_p75 - r.buffer_years).abs() < 1e-9);
            assert!((y.buffer_years_p90 - r.buffer_years).abs() < 1e-9);
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
        assert!(result.forensics.is_none());
        assert!(result.legacy.is_none());
        assert!(result.phase_time.is_none());
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

    fn hist_totals(f: &MonteCarloForensics) -> (u32, u32) {
        (
            f.failure_histogram.iter().map(|h| h.depleted).sum(),
            f.failure_histogram.iter().map(|h| h.below_min).sum(),
        )
    }

    #[wasm_bindgen_test]
    fn depleted_path_fails_at_its_depletion_year() {
        // Fixed 50k spend from 1 BTC at a flat 100k: year 0 keeps 0.5 BTC,
        // year 1 sells the rest, year 2 has nothing left to sell — the
        // depletion year.
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.anchor = crate::strategies::policy::Anchor::FixedUsd;
        policy.spend_usd = 50_000.0;
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        assert_eq!(f.median_failure_year, Some(START + 2));
        assert_eq!(f.failure_histogram[0].depleted, 0);
        assert_eq!(f.failure_histogram[1].depleted, 0);
        assert_eq!(f.failure_histogram[2].depleted, RUN_COUNT as u32);
        assert!(f.failure_histogram.iter().all(|h| h.below_min == 0));
        assert!((f.survival_by_year[0].survival_pct - 100.0).abs() < 1e-9);
        assert!((f.survival_by_year[1].survival_pct - 100.0).abs() < 1e-9);
        assert!((f.survival_by_year[2].survival_pct - 0.0).abs() < 1e-9);
    }

    #[wasm_bindgen_test]
    fn below_minimum_path_fails_at_its_first_below_floor_year() {
        // 4% of current from 1 BTC never depletes, but 4k/year is below the
        // 20k floor from the very first year.
        let policy = WithdrawalPolicy::fixed_pct();
        let params = sim_params(1.0, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        assert_eq!(f.median_failure_year, Some(START));
        assert_eq!(f.failure_histogram[0].below_min, RUN_COUNT as u32);
        assert!(f.failure_histogram.iter().all(|h| h.depleted == 0));
        assert!((f.survival_by_year[0].survival_pct - 0.0).abs() < 1e-9);
    }

    #[wasm_bindgen_test]
    fn success_path_records_no_failure_event() {
        let policy = WithdrawalPolicy::fixed_pct();
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = flat_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        assert!(
            f.failure_histogram
                .iter()
                .all(|h| h.depleted == 0 && h.below_min == 0)
        );
        assert_eq!(f.median_failure_year, None);
        assert_eq!(f.shortfall_median_usd, None);
        assert_eq!(f.shortfall_p90_usd, None);
        assert!(
            f.survival_by_year
                .iter()
                .all(|s| (s.survival_pct - 100.0).abs() < 1e-9)
        );
    }

    #[wasm_bindgen_test]
    fn failure_modes_match_summary_counts() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        let (depleted, below_min) = hist_totals(f);
        let expected_depleted =
            (result.summary.run_out_pct / 100.0 * RUN_COUNT as f64).round() as u32;
        let expected_below_min =
            (result.summary.below_min_pct / 100.0 * RUN_COUNT as f64).round() as u32;
        assert_eq!(depleted, expected_depleted);
        assert_eq!(below_min, expected_below_min);
        assert_eq!(f.median_failure_year.is_some(), depleted + below_min > 0);
    }

    #[wasm_bindgen_test]
    fn zero_floor_limits_failures_to_depletion() {
        // Zero holdings with a zero floor: every path depletes immediately
        // and no below-minimum event is possible.
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(0.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        assert!(f.failure_histogram.iter().all(|h| h.below_min == 0));
        assert_eq!(f.failure_histogram[0].depleted, RUN_COUNT as u32);
    }

    #[wasm_bindgen_test]
    fn survival_starts_full_and_ends_at_success_rate() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        assert!((f.survival_by_year[0].survival_pct - 100.0).abs() < 1e-9);
        let last = f.survival_by_year.last().unwrap();
        assert!((last.survival_pct - result.summary.success_pct).abs() < 1e-9);

        let (depleted, below_min) = hist_totals(f);
        let failing = depleted + below_min;
        let expected_failing = (result.summary.run_out_pct + result.summary.below_min_pct)
            / 100.0
            * RUN_COUNT as f64;
        assert!((failing as f64 - expected_failing).abs() < 0.5);

        if let Some(v) = f.shortfall_median_usd {
            assert!(v >= 0.0);
        }
        if let Some(v) = f.shortfall_p90_usd {
            assert!(v >= 0.0);
        }
    }

    #[wasm_bindgen_test]
    fn immediate_failure_drops_survival_to_zero() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(0.0, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let f = result.forensics.as_ref().unwrap();
        assert!((f.survival_by_year[0].survival_pct - 0.0).abs() < 1e-9);
        assert_eq!(f.median_failure_year, Some(START));
    }

    #[wasm_bindgen_test]
    fn legacy_final_percentiles_are_ordered() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let l = result.legacy.as_ref().unwrap();
        assert!(l.final_btc_p10 >= 0.0);
        assert!(l.final_btc_p10 <= l.final_btc_p50);
        assert!(l.final_btc_p50 <= l.final_btc_p90);
        if let Some(v) = l.success_final_btc_median {
            assert!(v >= 0.0);
        } else {
            assert_eq!(result.summary.success_pct, 0.0);
        }
    }

    #[wasm_bindgen_test]
    fn all_depleted_legacy_zeros_with_null_success_median() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(0.0, 20_000.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let l = result.legacy.as_ref().unwrap();
        assert_eq!(l.final_btc_p10, 0.0);
        assert_eq!(l.final_btc_p50, 0.0);
        assert_eq!(l.final_btc_p90, 0.0);
        assert_eq!(l.success_final_btc_median, None);
    }

    #[wasm_bindgen_test]
    fn legacy_matches_percentile_series_tail() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let l = result.legacy.as_ref().unwrap();
        let last = result.percentiles.last().unwrap();
        assert!((l.final_btc_p10 - last.p10).abs() < 1e-9);
        assert!((l.final_btc_p50 - last.p50).abs() < 1e-9);
        assert!((l.final_btc_p90 - last.p90).abs() < 1e-9);
    }

    #[wasm_bindgen_test]
    fn phase_time_shares_sum_to_100_with_valuation() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let pt = result.phase_time.as_ref().unwrap();
        let sum = pt.bear_pct + pt.fair_pct + pt.euphoria_pct;
        assert!((sum - 100.0).abs() < 1e-6, "phase shares sum was {}", sum);
        assert!(pt.bear_pct >= 0.0 && pt.fair_pct >= 0.0 && pt.euphoria_pct >= 0.0);
    }

    #[wasm_bindgen_test]
    fn phase_time_null_for_yearly_policies() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(1.0, 0.0, 50_000.0, 0.0, HORIZON);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert!(result.phase_time.is_none());
    }

    #[wasm_bindgen_test]
    fn phase_time_null_for_zero_horizon() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 50_000.0, 0.0, 0);
        let points = banded_points(HORIZON);
        let result = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert!(result.phase_time.is_none());
    }

    #[wasm_bindgen_test]
    fn forensics_legacy_and_phase_time_are_reproducible() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 20_000.0, 50_000.0, 3.0, HORIZON);
        let points = banded_points(HORIZON);
        let a = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        let b = run_monte_carlo(&policy, &params, &points, 42, None).unwrap();
        assert_eq!(a.forensics, b.forensics);
        assert_eq!(a.legacy, b.legacy);
        assert_eq!(a.phase_time, b.phase_time);
    }
}
