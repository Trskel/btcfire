use std::collections::BTreeMap;

use crate::models::ModelPoint;
use crate::simulation::runtime::{RuntimeState, SimulationParams, YearResult};
use crate::strategies::policy::{Anchor, Onboarding, Phase, Review, WithdrawalPolicy};

const BTC_EPSILON: f64 = 1e-12;
const MONTHS_PER_YEAR: f64 = 12.0;

/// A point on a simulated price path: the path price plus the model
/// distribution (median and 1-sigma bands) used to derive the Power Law
/// quantile indicator. Monte Carlo (Phase 9) will feed sampled path prices
/// here; the deterministic driver uses the model median as the path price.
#[derive(Debug, Clone, Default)]
pub struct PathPoint {
    pub year: i32,
    pub price_usd: f64,
    pub median_price_usd: f64,
    pub band_1sigma_low: Option<f64>,
    pub band_1sigma_high: Option<f64>,
    pub band_p10: Option<f64>,
    pub band_p90: Option<f64>,
    pub band_p25: Option<f64>,
    pub band_p75: Option<f64>,
}

const Z_P90: f64 = 1.2816;
const Z_P75: f64 = 0.6745;

impl PathPoint {
    pub fn from_model_point(p: &ModelPoint) -> Self {
        PathPoint {
            year: p.year,
            price_usd: p.path_price_usd.unwrap_or(p.median_price_usd),
            median_price_usd: p.median_price_usd,
            band_1sigma_low: p.band_1sigma_low,
            band_1sigma_high: p.band_1sigma_high,
            band_p10: p.band_p10,
            band_p90: p.band_p90,
            band_p25: p.band_p25,
            band_p75: p.band_p75,
        }
    }

    /// Model dispersion in log space, from 1σ bands or — when the model
    /// emits percentile bands instead — derived from symmetric percentile
    /// bands via the normal z-scores.
    fn sigma(&self) -> Option<f64> {
        if let Some(sigma) = self.sigma_from_pair(self.band_1sigma_low, self.band_1sigma_high, 1.0)
        {
            return Some(sigma);
        }
        if let Some(sigma) = self.sigma_from_pair(self.band_p10, self.band_p90, Z_P90) {
            return Some(sigma);
        }
        self.sigma_from_pair(self.band_p25, self.band_p75, Z_P75)
    }

    fn sigma_from_pair(&self, low: Option<f64>, high: Option<f64>, z: f64) -> Option<f64> {
        match (low, high) {
            (Some(lo), Some(hi))
                if lo > 0.0
                    && hi > lo
                    && self.median_price_usd > lo
                    && z > 0.0 =>
            {
                let lower = (self.median_price_usd / lo).ln() / z;
                let upper = (hi / self.median_price_usd).ln() / z;
                Some((lower + upper) / 2.0)
            }
            (Some(lo), None) if lo > 0.0 && self.median_price_usd > lo && z > 0.0 => {
                Some((self.median_price_usd / lo).ln() / z)
            }
            (None, Some(hi))
                if hi > 0.0 && self.median_price_usd > 0.0 && hi > self.median_price_usd && z > 0.0 =>
            {
                Some((hi / self.median_price_usd).ln() / z)
            }
            _ => None,
        }
    }
}

/// Abramowitz & Stegun 7.1.26 error function approximation.
fn erf(x: f64) -> f64 {
    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let ax = x.abs();
    let t = 1.0 / (1.0 + 0.3275911 * ax);
    let y = 1.0
        - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
            + 0.254829592)
            * t
            * (-ax * ax).exp();
    sign * y
}

/// Quantile (0–100) of `price` within the model's log-normal band at this
/// point. Falls back to the median (50th) when band data is missing.
fn power_law_quantile(price: f64, median: f64, sigma: Option<f64>) -> f64 {
    let Some(sigma) = sigma else {
        return 50.0;
    };
    if sigma <= 0.0 || median <= 0.0 || price <= 0.0 {
        return 50.0;
    }
    let z = (price.ln() - median.ln()) / sigma;
    50.0 * (1.0 + erf(z / std::f64::consts::SQRT_2))
}

fn classify_phase(quantile: f64, policy: &WithdrawalPolicy) -> Phase {
    if quantile < policy.valuation.fair_low {
        Phase::Bear
    } else if quantile > policy.valuation.fair_high {
        Phase::Euphoria
    } else {
        Phase::Fair
    }
}

fn sell_btc(btc: f64, spend_usd: f64, price: f64) -> (f64, f64) {
    if btc <= BTC_EPSILON || price <= 0.0 || spend_usd <= 0.0 {
        return (0.0, 0.0);
    }
    let needed = spend_usd / price;
    let sold = needed.min(btc);
    (sold, sold * price)
}

fn year_map(points: &[PathPoint]) -> BTreeMap<i32, PathPoint> {
    let mut map: BTreeMap<i32, PathPoint> = BTreeMap::new();
    for p in points {
        map.insert(p.year, p.clone());
    }
    map
}

/// Deterministic withdrawal simulation over the model's median path.
pub fn run_withdrawal(
    policy: &WithdrawalPolicy,
    params: &SimulationParams,
    model_points: &[ModelPoint],
) -> Result<Vec<YearResult>, String> {
    let path: Vec<PathPoint> = model_points.iter().map(PathPoint::from_model_point).collect();
    run_withdrawal_on_path(policy, params, &path)
}

/// Deterministic withdrawal simulation over an arbitrary price path. The
/// deterministic driver uses the model median path; Monte Carlo will feed
/// sampled paths.
pub fn run_withdrawal_on_path(
    policy: &WithdrawalPolicy,
    params: &SimulationParams,
    points: &[PathPoint],
) -> Result<Vec<YearResult>, String> {
    let mut policy = policy.clone();
    policy.clamp();

    let horizon = params.horizon_years();
    if horizon == 0 {
        return Ok(Vec::new());
    }

    let map = year_map(points);
    let start = params.retirement_start_year;
    if !map.contains_key(&start) {
        return Err(format!(
            "Model projection does not include retirement year {}",
            start
        ));
    }

    if policy.valuation.enabled {
        run_monthly(&policy, params, &map, horizon)
    } else {
        run_yearly(&policy, params, &map, horizon)
    }
}

fn initial_rate(policy: &WithdrawalPolicy, initial_portfolio: f64) -> f64 {
    match policy.anchor {
        Anchor::PercentOfInitial | Anchor::PercentOfCurrent => policy.rate_pct / 100.0,
        Anchor::FixedUsd => {
            if initial_portfolio > 0.0 {
                policy.spend_usd / initial_portfolio
            } else {
                0.0
            }
        }
    }
}

fn initial_base_spend(policy: &WithdrawalPolicy, initial_rate: f64, initial_portfolio: f64) -> f64 {
    match policy.anchor {
        Anchor::PercentOfInitial | Anchor::PercentOfCurrent => initial_rate * initial_portfolio,
        Anchor::FixedUsd => policy.spend_usd,
    }
}

/// Runs the guardrail rules at a review. Returns the adjusted spend.
/// `spend` is the current period spend (already inflation-adjusted for
/// amount-based anchors).
fn apply_guardrails(
    policy: &WithdrawalPolicy,
    spend: f64,
    portfolio: f64,
    initial_rate: f64,
    initial_portfolio: f64,
    infl: f64,
    floor: f64,
) -> f64 {
    if !policy.guardrails.enabled || portfolio <= 0.0 {
        return spend;
    }
    let wd_rate = spend / portfolio;
    if wd_rate > initial_rate * (1.0 + policy.guardrails.ceiling_pct / 100.0) {
        let cut = spend * (1.0 - policy.guardrails.adjust_pct / 100.0);
        return cut.max(floor);
    }
    if wd_rate < initial_rate * (1.0 - policy.guardrails.floor_pct / 100.0) {
        let prosperity_ok = !policy.guardrails.prosperity || portfolio > initial_portfolio * infl;
        if prosperity_ok {
            return spend * (1.0 + policy.guardrails.adjust_pct / 100.0);
        }
    }
    spend
}

fn run_yearly(
    policy: &WithdrawalPolicy,
    params: &SimulationParams,
    map: &BTreeMap<i32, PathPoint>,
    horizon: usize,
) -> Result<Vec<YearResult>, String> {
    let start = params.retirement_start_year;
    let first = map
        .get(&start)
        .ok_or_else(|| format!("Model projection does not include retirement year {}", start))?;
    let initial_portfolio = params.holdings_btc * first.price_usd;
    let rate = initial_rate(policy, initial_portfolio);

    let mut state = RuntimeState::new(start, params.holdings_btc);
    state.initial_rate = rate;
    state.base_spend_usd = initial_base_spend(policy, rate, initial_portfolio);

    let mut results = Vec::with_capacity(horizon);
    for t in 0..horizon {
        let year = start + t as i32;
        let point = map
            .get(&year)
            .ok_or_else(|| format!("Model projection does not cover year {}", year))?;
        let price = point.price_usd;
        let infl = params.inflation_mult(t as f64);
        let floor = params.floor_usd(t as f64);

        let review_due = t > 0
            && match policy.review {
                Review::Once => false,
                Review::Yearly | Review::Monthly => true,
            };

        let mut spend = match policy.anchor {
            Anchor::PercentOfCurrent => {
                // Re-derived from the current stack at the start of each
                // review period; no inflation on %-of-current math.
                if review_due || t == 0 {
                    let derived = policy.rate_pct / 100.0 * (state.btc * price);
                    state.base_spend_usd = derived;
                    derived
                } else {
                    state.base_spend_usd
                }
            }
            Anchor::PercentOfInitial | Anchor::FixedUsd => state.base_spend_usd * infl,
        };

        if review_due {
            let portfolio = state.btc * price;
            let adjusted = apply_guardrails(
                policy,
                spend,
                portfolio,
                rate,
                initial_portfolio,
                infl,
                floor,
            );
            if adjusted != spend {
                spend = adjusted;
                if policy.anchor != Anchor::PercentOfCurrent {
                    state.base_spend_usd = spend / infl;
                }
            }
        }

        // Payout cadence quantizes onto the step grid: a monthly payout on a
        // yearly step splits the year's spend into twelve equal monthly
        // portions. The yearly result contract aggregates them, so the year's
        // sale is equivalent to a single withdrawal of the full amount.
        let (sold, spent) = sell_btc(state.btc, spend, price);

        state.btc = (state.btc - sold).max(0.0);
        if state.btc <= BTC_EPSILON {
            state.btc = 0.0;
        }

        results.push(YearResult {
            year,
            btc: state.btc,
            cash_usd: 0.0,
            buffer_years: 0.0,
            spend_usd: spent,
            sold_btc: sold,
            phase: None,
        });
    }
    Ok(results)
}

/// Geometric interpolation of a yearly quantity at `frac` of the way through
/// `year`. Falls back to the last available point when the next year is
/// beyond the projection.
fn interpolate_log(map: &BTreeMap<i32, PathPoint>, year: i32, frac: f64) -> (f64, f64, Option<f64>) {
    let fallback = map.range(..=year).next_back().map(|(_, p)| p);
    let p0 = fallback
        .or_else(|| map.iter().next().map(|(_, p)| p))
        .cloned();
    let p1 = map.get(&(year + 1)).cloned().or_else(|| p0.clone());

    let (Some(p0), Some(p1)) = (p0, p1) else {
        return (0.0, 0.0, None);
    };

    let interp = |a: f64, b: f64| {
        if a <= 0.0 || b <= 0.0 {
            return 0.0;
        }
        (a.ln() * (1.0 - frac) + b.ln() * frac).exp()
    };

    let price = interp(p0.price_usd, p1.price_usd);
    let median = interp(p0.median_price_usd, p1.median_price_usd);
    let sigma = match (p0.sigma(), p1.sigma()) {
        (Some(a), Some(b)) => Some(interp(a, b)),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    };
    (price, median, sigma)
}

fn run_monthly(
    policy: &WithdrawalPolicy,
    params: &SimulationParams,
    map: &BTreeMap<i32, PathPoint>,
    horizon: usize,
) -> Result<Vec<YearResult>, String> {
    let start = params.retirement_start_year;
    let first = map
        .get(&start)
        .ok_or_else(|| format!("Model projection does not include retirement year {}", start))?;
    let initial_portfolio = params.holdings_btc * first.price_usd;
    let rate = initial_rate(policy, initial_portfolio);

    let mut state = RuntimeState::new(start, params.holdings_btc);
    state.initial_rate = rate;
    state.base_spend_usd = initial_base_spend(policy, rate, initial_portfolio);
    state.deferred_buffer =
        policy.buffer.enabled && policy.valuation.onboarding == Onboarding::DeferredToEuphoria;

    // Immediate onboarding: pre-sell at t0 to fill the buffer to its lower
    // target. Deferred onboarding skips this entirely.
    if policy.buffer.enabled && !state.deferred_buffer {
        let target = policy.valuation.buffer_target_low_years * state.base_spend_usd;
        let (sold, value) = sell_btc(state.btc, target, first.price_usd);
        state.btc = (state.btc - sold).max(0.0);
        state.cash_usd += value;
    }

    let months = horizon * 12;
    let mut results: Vec<YearResult> = Vec::with_capacity(horizon);
    let mut year_spend = 0.0_f64;
    let mut year_sold = 0.0_f64;

    for m in 0..months {
        let t_years = (m / 12) as f64;
        let year = start + (m / 12) as i32;
        let month_in_year = (m % 12) as f64 / MONTHS_PER_YEAR;
        let (price, median, sigma) = interpolate_log(map, year, month_in_year);
        // Inflation compounds yearly: the annual spend is constant within a
        // year and steps up between years.
        let infl = params.inflation_mult(t_years);
        let floor = params.floor_usd(t_years);

        let review_due = match policy.review {
            Review::Once => m == 0,
            Review::Yearly => m % 12 == 0,
            Review::Monthly => true,
        };

        let mut annual = match policy.anchor {
            Anchor::PercentOfCurrent => {
                if review_due {
                    let derived = policy.rate_pct / 100.0 * (state.btc * price);
                    state.base_spend_usd = derived;
                }
                state.base_spend_usd
            }
            Anchor::PercentOfInitial | Anchor::FixedUsd => state.base_spend_usd * infl,
        };

        if review_due && m > 0 {
            let portfolio = state.btc * price;
            let adjusted = apply_guardrails(
                policy,
                annual,
                portfolio,
                rate,
                initial_portfolio,
                infl,
                floor,
            );
            if adjusted != annual {
                annual = adjusted;
                if policy.anchor != Anchor::PercentOfCurrent {
                    state.base_spend_usd = annual / infl;
                }
            }
        }

        // The valuation drip is floor-protected: spending never falls below
        // the inflation-adjusted absolute floor.
        if policy.valuation.enabled {
            annual = annual.max(floor);
        }

        let quantile = power_law_quantile(price, median, sigma);
        let phase = classify_phase(quantile, policy);

        // Monthly drip sale.
        let drip = annual / MONTHS_PER_YEAR;
        let (drip_sold, drip_spent) = sell_btc(state.btc, drip, price);
        state.btc = (state.btc - drip_sold).max(0.0);
        year_spend += drip_spent;
        year_sold += drip_sold;

        // Buffer behavior follows the phase.
        if policy.buffer.enabled && state.btc > BTC_EPSILON {
            match phase {
                Phase::Bear => {
                    // Frozen: no surplus sales in bear.
                }
                Phase::Fair | Phase::Euphoria => {
                    if state.deferred_buffer {
                        // Onboarding: drip-only until the first euphoria.
                        if phase == Phase::Euphoria {
                            state.deferred_buffer = false;
                        }
                    } else {
                        let target = policy.valuation.buffer_target_high_years;
                        let below_target = state.cash_usd / annual.max(1.0) < target;
                        if phase == Phase::Fair || below_target {
                            let surplus_pct = match phase {
                                Phase::Fair => policy.valuation.fair_surplus_pct,
                                _ => policy.valuation.euphoria_surplus_pct,
                            };
                            let monthly_rate = surplus_pct / 100.0 / MONTHS_PER_YEAR;
                            let mut surplus_value = state.btc * monthly_rate * price;
                            if phase == Phase::Euphoria {
                                // Recharge stops at the upper target: cap the
                                // sale at what is needed to reach it.
                                let needed = (target * annual - state.cash_usd).max(0.0);
                                surplus_value = surplus_value.min(needed);
                            }
                            let (surplus_sold, surplus_value) =
                                sell_btc(state.btc, surplus_value, price);
                            state.btc = (state.btc - surplus_sold).max(0.0);
                            state.cash_usd += surplus_value;
                        }
                    }
                }
            }

            // Safety valve: below one year of expenses and the indicator is
            // above its threshold in a non-euphoria phase → recharge one year
            // without waiting for euphoria.
            if phase != Phase::Euphoria
                && state.cash_usd / annual.max(1.0) < 1.0
                && quantile > policy.valuation.safety_valve
                && state.btc > BTC_EPSILON
            {
                let missing = annual - state.cash_usd;
                let (valve_sold, valve_value) = sell_btc(state.btc, missing.max(0.0), price);
                state.btc = (state.btc - valve_sold).max(0.0);
                state.cash_usd += valve_value;
            }
        }

        state.buffer_years = state.cash_usd / annual.max(1.0);

        let year_complete = m % 12 == 11 || m == months - 1;
        if year_complete {
            results.push(YearResult {
                year,
                btc: state.btc,
                cash_usd: state.cash_usd,
                buffer_years: state.buffer_years,
                spend_usd: year_spend,
                sold_btc: year_sold,
                phase: Some(phase),
            });
            year_spend = 0.0;
            year_sold = 0.0;
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::strategies::policy::Payout;

    pub(crate) const START: i32 = 2030;
    pub(crate) const HORIZON: usize = 50;

    pub(crate) fn sim_params(holdings: f64, min_spend: f64, inflation: f64) -> SimulationParams {
        SimulationParams {
            holdings_btc: holdings,
            retirement_start_year: START,
            current_age: 40,
            lifespan: 90,
            minimum_spend_usd: min_spend,
            annual_spend_usd: 50_000.0,
            inflation_rate: inflation,
        }
    }

    fn flat_path(n: usize, price: f64) -> Vec<PathPoint> {
        (0..n)
            .map(|i| PathPoint {
                year: START + i as i32,
                price_usd: price,
                median_price_usd: price,
                band_1sigma_low: None,
                band_1sigma_high: None,
                ..Default::default()
            })
            .collect()
    }

    fn dist_path(n: usize, price: f64, median: f64, low: f64, high: f64) -> Vec<PathPoint> {
        (0..n)
            .map(|i| PathPoint {
                year: START + i as i32,
                price_usd: price,
                median_price_usd: median,
                band_1sigma_low: Some(low),
                band_1sigma_high: Some(high),
                ..Default::default()
            })
            .collect()
    }

    fn assert_close(a: f64, b: f64, tol: f64) {
        assert!(
            (a - b).abs() <= tol,
            "expected {} to be within {} of {}",
            a,
            tol,
            b
        );
    }

    #[test]
    fn percent_of_initial_set_once() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(1.0, 0.0, 0.0);
        let path = flat_path(HORIZON, 100_000.0);
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[0].spend_usd, 4_000.0, 1e-6);
        assert_close(results[1].spend_usd, 4_000.0, 1e-6);
        assert_close(results[0].sold_btc, 0.04, 1e-9);

        // A later price spike does not change the base spend.
        let mut spiky = flat_path(HORIZON, 100_000.0);
        for p in spiky.iter_mut().skip(1) {
            p.price_usd = 500_000.0;
        }
        let results = run_withdrawal_on_path(&policy, &params, &spiky).unwrap();
        assert_close(results[1].spend_usd, 4_000.0, 1e-6);
    }

    #[test]
    fn percent_of_current_rederives_at_each_review() {
        let policy = WithdrawalPolicy::fixed_pct();
        let params = sim_params(1.0, 0.0, 0.0);
        let mut path = flat_path(HORIZON, 100_000.0);
        path[1].price_usd = 50_000.0;
        path[2].price_usd = 100_000.0;
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();

        // Year 0: 4% of 100k = 4,000.
        assert_close(results[0].spend_usd, 4_000.0, 1e-6);
        // Year 1: 4% of (0.96 * 50k) = 1,920.
        assert_close(results[1].spend_usd, 1_920.0, 1e-6);
        // Year 2: 4% of (0.9216 * 100k) = 3,686.4.
        assert_close(results[2].spend_usd, 3_686.4, 1e-3);
    }

    #[test]
    fn fixed_usd_derives_rate_per_path() {
        let policy = WithdrawalPolicy::valuation_based();
        assert_close(initial_rate(&policy, 100_000.0), 0.5, 1e-9);
        assert_close(initial_rate(&policy, 200_000.0), 0.25, 1e-9);

        let params = sim_params(10.0, 0.0, 3.0);
        let path = flat_path(HORIZON, 100_000.0);
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        // Year 0 spend is the fixed spend; year 1 rises with inflation.
        assert_close(results[0].spend_usd, 50_000.0, 1e-6);
        assert_close(results[1].spend_usd, 51_500.0, 1e-6);
    }

    #[test]
    fn amount_based_spend_rises_with_inflation() {
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.anchor = Anchor::FixedUsd;
        policy.spend_usd = 24_000.0;
        let params = sim_params(1.0, 0.0, 3.0);
        let path = flat_path(HORIZON, 100_000.0);
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[0].spend_usd, 24_000.0, 1e-6);
        assert_close(results[1].spend_usd, 24_720.0, 1e-6);
        assert_close(results[2].spend_usd, 25_461.6, 1e-3);
    }

    #[test]
    fn spend_floor_rises_with_inflation() {
        let params = sim_params(1.0, 20_000.0, 3.0);
        assert_close(params.floor_usd(0.0), 20_000.0, 1e-9);
        assert_close(params.floor_usd(1.0), 20_600.0, 1e-9);
        assert_close(params.floor_usd(2.0), 21_218.0, 1e-6);
    }

    #[test]
    fn percent_of_current_ignores_inflation() {
        let policy = WithdrawalPolicy::fixed_pct();
        let params = sim_params(1.0, 0.0, 3.0);
        let mut path = flat_path(HORIZON, 100_000.0);
        path[1].price_usd = 50_000.0;
        path[2].price_usd = 100_000.0;
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[0].spend_usd, 4_000.0, 1e-6);
        assert_close(results[1].spend_usd, 1_920.0, 1e-6);
        assert_close(results[2].spend_usd, 3_686.4, 1e-3);
    }

    #[test]
    fn ceiling_cut_triggers() {
        let policy = WithdrawalPolicy::guardrails();
        let params = sim_params(1.0, 0.0, 0.0);
        let mut path = flat_path(HORIZON, 100_000.0);
        for p in path.iter_mut().skip(1) {
            p.price_usd = 80_000.0;
        }
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        // Year 0: 4% of 100k = 4,000. Year 1 portfolio = 0.96 * 80k = 76.8k,
        // rate = 5.2% > 4.8% ceiling → cut 10% → 3,600.
        assert_close(results[0].spend_usd, 4_000.0, 1e-6);
        assert_close(results[1].spend_usd, 3_600.0, 1e-6);
    }

    #[test]
    fn floor_raise_requires_prosperity() {
        let prices = [100_000.0, 80_000.0, 75_000.0, 70_000.0, 110_000.0];
        let path: Vec<PathPoint> = prices
            .iter()
            .enumerate()
            .map(|(i, p)| PathPoint {
                year: START + i as i32,
                price_usd: *p,
                median_price_usd: *p,
                band_1sigma_low: None,
                band_1sigma_high: None,
                ..Default::default()
            })
            .chain(
                (prices.len()..HORIZON).map(|i| PathPoint {
                    year: START + i as i32,
                    price_usd: 110_000.0,
                    median_price_usd: 110_000.0,
                    band_1sigma_low: None,
                    band_1sigma_high: None,
                    ..Default::default()
                }),
            )
            .collect();

        // Prosperity on: portfolio at year 4 (≈91.3k) is below the 100k
        // starting value → the raise is blocked.
        let policy = WithdrawalPolicy::guardrails();
        let params = sim_params(1.0, 0.0, 0.0);
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[3].spend_usd, 2_916.0, 1e-6);
        assert_close(results[4].spend_usd, 2_916.0, 1e-6);

        // Prosperity off: the same trigger raises the spend.
        let mut policy = WithdrawalPolicy::guardrails();
        policy.guardrails.prosperity = false;
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[4].spend_usd, 3_207.6, 1e-3);

        // Prosperity on with a stronger recovery (portfolio > starting
        // value) raises the spend.
        let raised_path: Vec<PathPoint> = path
            .iter()
            .map(|p| {
                let mut q = p.clone();
                if q.year >= START + 4 {
                    q.price_usd = 130_000.0;
                }
                q
            })
            .collect();
        let policy = WithdrawalPolicy::guardrails();
        let results = run_withdrawal_on_path(&policy, &params, &raised_path).unwrap();
        assert_close(results[4].spend_usd, 3_207.6, 1e-3);
    }

    #[test]
    fn cut_respects_the_spend_floor() {
        let mut policy = WithdrawalPolicy::guardrails();
        policy.anchor = Anchor::FixedUsd;
        policy.spend_usd = 22_000.0;
        let params = sim_params(1.0, 20_000.0, 3.0);
        let mut path = flat_path(HORIZON, 100_000.0);
        for p in path.iter_mut().skip(1) {
            p.price_usd = 80_000.0;
        }
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        // Year 1: rate = 22,660 / 62,400 ≈ 36% > ceiling 26.4% → cut 10% to
        // 20,394, which is below the inflation-adjusted floor 20,600.
        assert_close(results[0].spend_usd, 22_000.0, 1e-6);
        assert_close(results[1].spend_usd, 20_600.0, 1e-6);
    }

    #[test]
    fn review_once_disables_guardrails() {
        let mut policy = WithdrawalPolicy::guardrails();
        policy.review = Review::Once;
        let params = sim_params(1.0, 0.0, 0.0);
        let mut path = flat_path(HORIZON, 100_000.0);
        for p in path.iter_mut().skip(1) {
            p.price_usd = 40_000.0;
        }
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[0].spend_usd, 4_000.0, 1e-6);
        assert_close(results[1].spend_usd, 4_000.0, 1e-6);
        assert_close(results[2].spend_usd, 4_000.0, 1e-6);
    }

    #[test]
    fn monthly_payout_on_yearly_step_matches_yearly_totals() {
        let params = sim_params(1.0, 0.0, 0.0);
        let path = flat_path(HORIZON, 100_000.0);

        let yearly = WithdrawalPolicy::fixed_pct();
        let mut monthly = WithdrawalPolicy::fixed_pct();
        monthly.payout = Payout::Monthly;

        let a = run_withdrawal_on_path(&yearly, &params, &path).unwrap();
        let b = run_withdrawal_on_path(&monthly, &params, &path).unwrap();
        for (ra, rb) in a.iter().zip(b.iter()) {
            assert_close(ra.spend_usd, rb.spend_usd, 1e-6);
            assert_close(ra.sold_btc, rb.sold_btc, 1e-9);
        }
    }

    #[test]
    fn depletion_reports_zeros_without_error() {
        let mut policy = WithdrawalPolicy::classic_fire();
        policy.anchor = Anchor::FixedUsd;
        policy.spend_usd = 100_000.0;
        let params = sim_params(1.0, 0.0, 0.0);
        let path = flat_path(HORIZON, 100_000.0);
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_close(results[0].spend_usd, 100_000.0, 1e-6);
        assert!(results[0].btc <= BTC_EPSILON);
        for r in results.iter().skip(1) {
            assert_eq!(r.spend_usd, 0.0);
            assert_eq!(r.sold_btc, 0.0);
            assert_eq!(r.btc, 0.0);
        }
    }

    #[test]
    fn missing_retirement_year_errors() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = sim_params(1.0, 0.0, 0.0);
        let path: Vec<PathPoint> = flat_path(HORIZON, 100_000.0)
            .into_iter()
            .filter(|p| p.year != START)
            .collect();
        let result = run_withdrawal_on_path(&policy, &params, &path);
        assert!(result.is_err());
    }

    #[test]
    fn same_inputs_produce_identical_results() {
        let policy = WithdrawalPolicy::guardrails();
        let params = sim_params(1.0, 20_000.0, 3.0);
        let path = dist_path(HORIZON, 100_000.0, 100_000.0, 50_000.0, 200_000.0);
        let a = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        let b = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn phase_determination_by_power_law_quantile() {
        let policy = WithdrawalPolicy::valuation_based();
        let median = 100_000.0_f64;
        let sigma = 1.0_f64;

        // Price below the 50th percentile → bear.
        let q = power_law_quantile(median * (-1.0_f64).exp(), median, Some(sigma));
        assert_eq!(classify_phase(q, &policy), Phase::Bear);
        // Price at the median → fair (50th is the fair boundary).
        let q = power_law_quantile(median, median, Some(sigma));
        assert_eq!(classify_phase(q, &policy), Phase::Fair);
        // Price one sigma above → ~84th percentile → fair.
        let q = power_law_quantile(median * 1.0_f64.exp(), median, Some(sigma));
        assert!(q > 84.0 && q < 84.2, "quantile was {}", q);
        assert_eq!(classify_phase(q, &policy), Phase::Fair);
        // Price 1.5 sigma above → ~93rd percentile → euphoria.
        let q = power_law_quantile(median * 1.5_f64.exp(), median, Some(sigma));
        assert_eq!(classify_phase(q, &policy), Phase::Euphoria);

        // Missing bands fall back to the median → fair.
        let q = power_law_quantile(123.0, 100.0, None);
        assert_eq!(q, 50.0);
        assert_eq!(classify_phase(q, &policy), Phase::Fair);
    }

    #[test]
    fn bear_phase_freezes_the_buffer() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 0.0);
        let median = 100_000.0_f64;
        let sigma = 1.0_f64;
        let path = dist_path(
            HORIZON,
            median * (-1.0_f64).exp(),
            median,
            median / 1.0_f64.exp(),
            median * 1.0_f64.exp(),
        );
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Bear));
            assert_eq!(r.cash_usd, 0.0, "bear must not refill the buffer");
            assert_eq!(r.buffer_years, 0.0);
        }
        // The drip is still sold: 50k/year at the bear price.
        let expected_year_spend = 50_000.0_f64;
        assert_close(results[0].spend_usd, expected_year_spend, 1.0);
    }

    #[test]
    fn euphoria_recharges_to_upper_target() {
        let mut policy = WithdrawalPolicy::valuation_based();
        policy.valuation.onboarding = Onboarding::Immediate;
        let params = sim_params(10.0, 0.0, 0.0);
        let median = 100_000.0_f64;
        let sigma = 1.0_f64;
        let path = dist_path(
            HORIZON,
            median * 2.0_f64.exp(),
            median,
            median / 1.0_f64.exp(),
            median * 1.0_f64.exp(),
        );
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Euphoria));
        }
        // Immediate onboarding prefilled 2 years; euphoria recharges toward 4.
        assert!(results[0].buffer_years >= 2.0 - 1e-9);
        let last = results.last().unwrap();
        assert_close(
            last.buffer_years,
            policy.valuation.buffer_target_high_years,
            0.05,
        );
    }

    #[test]
    fn safety_valve_recharges_one_year() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 0.0);
        let median = 100_000.0_f64;
        let sigma = 1.0_f64;
        // Fair phase (z = 1 → 84th percentile): no organic refill (0%), but
        // the quantile is above the median safety threshold → the valve
        // recharges exactly one year.
        let path = dist_path(
            HORIZON,
            median * 1.0_f64.exp(),
            median,
            median / 1.0_f64.exp(),
            median * 1.0_f64.exp(),
        );
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        assert_eq!(results[0].phase, Some(Phase::Fair));
        let last = results.last().unwrap();
        assert_close(last.buffer_years, 1.0, 0.01);
        assert_close(last.cash_usd, 50_000.0, 500.0);
    }

    #[test]
    fn deferred_onboarding_sells_only_drip_in_bear() {
        let policy = WithdrawalPolicy::valuation_based();
        let params = sim_params(10.0, 0.0, 0.0);
        let median = 100_000.0_f64;
        let sigma = 1.0_f64;
        let price = median * (-1.0_f64).exp();
        let path = dist_path(
            HORIZON,
            price,
            median,
            median / 1.0_f64.exp(),
            median * 1.0_f64.exp(),
        );
        let results = run_withdrawal_on_path(&policy, &params, &path).unwrap();
        // No lump-sum buffer sale at day one: cash stays zero, only the
        // monthly drip is sold.
        assert_eq!(results[0].cash_usd, 0.0);
        assert_close(results[0].sold_btc, 50_000.0 / price, 1e-6);
    }

    #[test]
    fn monthly_prices_interpolate_geometrically() {
        let points = vec![
            PathPoint {
                year: START,
                price_usd: 100_000.0,
                median_price_usd: 100_000.0,
                band_1sigma_low: Some(50_000.0),
                band_1sigma_high: Some(200_000.0),
                ..Default::default()
            },
            PathPoint {
                year: START + 1,
                price_usd: 400_000.0,
                median_price_usd: 400_000.0,
                band_1sigma_low: Some(200_000.0),
                band_1sigma_high: Some(800_000.0),
                ..Default::default()
            },
        ];
        let map = year_map(&points);
        let (price, median, sigma) = interpolate_log(&map, START, 0.5);
        assert_close(price, 200_000.0, 1.0);
        assert_close(median, 200_000.0, 1.0);
        assert_close(sigma.unwrap(), 2.0_f64.ln(), 1e-4);

        // Beyond the projection the last point is held flat.
        let (price, _, _) = interpolate_log(&map, START + 1, 0.5);
        assert_close(price, 400_000.0, 1.0);
    }
}


#[cfg(test)]
mod band_path_tests {
    use super::*;
    use crate::strategies::policy::WithdrawalPolicy;

    fn band_model_points(n: usize, path: &str) -> Vec<crate::models::ModelPoint> {
        let median = 100_000.0_f64;
        let (price, low, high) = match path {
            "median" => (median, median / 1.0_f64.exp(), median * 1.0_f64.exp()),
            "minus_1s" => (
                median / 1.0_f64.exp(),
                median / 1.0_f64.exp(),
                median * 1.0_f64.exp(),
            ),
            "plus_1s" => (
                median * 1.0_f64.exp(),
                median / 1.0_f64.exp(),
                median * 1.0_f64.exp(),
            ),
            "plus_2s" => (
                median * 2.0_f64.exp(),
                median / 1.0_f64.exp(),
                median * 1.0_f64.exp(),
            ),
            _ => panic!("unknown path"),
        };
        (0..n)
            .map(|i| crate::models::ModelPoint {
                year: tests::START + i as i32,
                timestamp_ms: 0,
                median_price_usd: median,
                path_price_usd: Some(price),
                band_1sigma_low: Some(low),
                band_1sigma_high: Some(high),
                band_2sigma_low: None,
                band_2sigma_high: None,
                band_p10: None,
                band_p90: None,
                band_p25: None,
                band_p75: None,
            })
            .collect()
    }

    fn monthly_results(points: &[crate::models::ModelPoint]) -> Vec<YearResult> {
        let policy = WithdrawalPolicy::valuation_based();
        let params = tests::sim_params(10.0, 0.0, 0.0);
        run_withdrawal(&policy, &params, points).unwrap()
    }

    #[test]
    fn median_path_is_fair_throughout() {
        let points = band_model_points(tests::HORIZON, "median");
        let results = monthly_results(&points);
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Fair));
        }
    }

    #[test]
    fn minus_1s_path_is_bear() {
        let points = band_model_points(tests::HORIZON, "minus_1s");
        let results = monthly_results(&points);
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Bear));
        }
    }

    #[test]
    fn plus_1s_path_is_fair_at_default_thresholds() {
        let points = band_model_points(tests::HORIZON, "plus_1s");
        let results = monthly_results(&points);
        // z = 1 → ~84.1th percentile → still fair below the 85th threshold.
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Fair));
        }
    }

    #[test]
    fn plus_2s_path_is_euphoria() {
        let points = band_model_points(tests::HORIZON, "plus_2s");
        let results = monthly_results(&points);
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Euphoria));
        }
    }

    #[test]
    fn missing_path_price_falls_back_to_median() {
        let mut points = band_model_points(tests::HORIZON, "plus_2s");
        for p in points.iter_mut() {
            p.path_price_usd = None;
        }
        let results = monthly_results(&points);
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Fair));
        }
    }

    #[test]
    fn band_path_enumeration_is_deterministic() {
        for path in ["median", "minus_1s", "plus_1s", "plus_2s"] {
            let points = band_model_points(tests::HORIZON, path);
            let a = monthly_results(&points);
            let b = monthly_results(&points);
            assert_eq!(a, b, "path {} should be deterministic", path);
        }
    }
}

#[cfg(test)]
mod percentile_path_tests {
    use super::*;
    use crate::strategies::policy::WithdrawalPolicy;

    /// Power Law custom-percentile band style: no 1σ bands, only p10/p90.
    fn percentile_points(n: usize, path_price: f64) -> Vec<crate::models::ModelPoint> {
        let median = 100_000.0_f64;
        (0..n)
            .map(|i| crate::models::ModelPoint {
                year: tests::START + i as i32,
                timestamp_ms: 0,
                median_price_usd: median,
                path_price_usd: Some(path_price),
                band_1sigma_low: None,
                band_1sigma_high: None,
                band_2sigma_low: None,
                band_2sigma_high: None,
                band_p10: Some(median / 3.6),
                band_p90: Some(median * 3.6),
                band_p25: None,
                band_p75: None,
            })
            .collect()
    }

    #[test]
    fn p90_path_is_euphoria_with_percentile_bands() {
        let points = percentile_points(tests::HORIZON, 100_000.0_f64 * 3.6);
        let policy = WithdrawalPolicy::valuation_based();
        let params = tests::sim_params(10.0, 0.0, 0.0);
        let results = run_withdrawal(&policy, &params, &points).unwrap();
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Euphoria));
        }
    }

    #[test]
    fn p10_path_is_bear_with_percentile_bands() {
        let points = percentile_points(tests::HORIZON, 100_000.0_f64 / 3.6);
        let policy = WithdrawalPolicy::valuation_based();
        let params = tests::sim_params(10.0, 0.0, 0.0);
        let results = run_withdrawal(&policy, &params, &points).unwrap();
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Bear));
        }
    }

    #[test]
    fn median_path_with_percentile_bands_is_fair() {
        let points = percentile_points(tests::HORIZON, 100_000.0_f64);
        let policy = WithdrawalPolicy::valuation_based();
        let params = tests::sim_params(10.0, 0.0, 0.0);
        let results = run_withdrawal(&policy, &params, &points).unwrap();
        for r in results.iter().take(5) {
            assert_eq!(r.phase, Some(Phase::Fair));
        }
    }
}
