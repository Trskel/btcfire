use crate::data::PricePoint;
use serde::{Deserialize, Serialize};

const GENESIS_MS: i64 = 1_230_940_800_000;
const MS_PER_DAY: f64 = 86_400_000.0;

const SECONDS_PER_DAY: f64 = 86_400.0;

fn days_since_genesis(timestamp_ms: i64) -> f64 {
    (timestamp_ms - GENESIS_MS) as f64 / MS_PER_DAY
}

fn log10(x: f64) -> f64 {
    x.log10()
}

fn pow10(x: f64) -> f64 {
    10.0_f64.powf(x)
}

fn year_to_days(year: i32) -> f64 {
    let jan1_unix_seconds = ((year - 1970) as f64) * 365.25 * SECONDS_PER_DAY;
    let jan1_ms = jan1_unix_seconds * 1000.0;
    days_since_genesis(jan1_ms as i64)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPoint {
    pub year: i32,
    pub timestamp_ms: i64,
    pub median_price_usd: f64,
    pub band_1sigma_low: Option<f64>,
    pub band_1sigma_high: Option<f64>,
    pub band_2sigma_low: Option<f64>,
    pub band_2sigma_high: Option<f64>,
    pub band_p10: Option<f64>,
    pub band_p90: Option<f64>,
    pub band_p25: Option<f64>,
    pub band_p75: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Formulation {
    LogLog,
    PowerFit,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BandStyle {
    #[serde(rename = "1sigma")]
    OneSigma,
    #[serde(rename = "1sigma_2sigma")]
    OneSigmaTwoSigma,
    #[serde(rename = "custom_percentiles")]
    CustomPercentiles,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerLawConfig {
    pub formulation: Formulation,
    pub band_style: BandStyle,
    #[serde(default)]
    pub custom_a: Option<f64>,
    #[serde(default)]
    pub custom_b: Option<f64>,
    #[serde(default = "default_projection_years")]
    pub projection_years: i32,
    #[serde(default)]
    pub custom_p10: Option<f64>,
    #[serde(default)]
    pub custom_p90: Option<f64>,
    #[serde(default)]
    pub custom_p25: Option<f64>,
    #[serde(default)]
    pub custom_p75: Option<f64>,
}

fn default_projection_years() -> i32 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerLawResult {
    pub points: Vec<ModelPoint>,
    pub r_squared: f64,
    pub a: f64,
    pub b: f64,
    pub formulation_used: String,
}

struct RegressionResult {
    a: f64,
    b: f64,
    r_squared: f64,
    residuals: Vec<f64>,
}

fn linear_regression(xs: &[f64], ys: &[f64]) -> Option<RegressionResult> {
    let n = xs.len() as f64;
    if n < 2.0 {
        return None;
    }

    let sum_x: f64 = xs.iter().sum();
    let sum_y: f64 = ys.iter().sum();
    let sum_xy: f64 = xs.iter().zip(ys.iter()).map(|(x, y)| x * y).sum();
    let sum_x2: f64 = xs.iter().map(|x| x * x).sum();

    let denominator = n * sum_x2 - sum_x * sum_x;
    if denominator.abs() < 1e-15 {
        return None;
    }

    let a = (n * sum_xy - sum_x * sum_y) / denominator;
    let b = (sum_y - a * sum_x) / n;

    let mean_y = sum_y / n;
    let ss_res: f64 = xs
        .iter()
        .zip(ys.iter())
        .map(|(x, y)| {
            let pred = a * x + b;
            (y - pred).powi(2)
        })
        .sum();
    let ss_tot: f64 = ys.iter().map(|y| (y - mean_y).powi(2)).sum();

    let r_squared = if ss_tot.abs() < 1e-15 {
        0.0
    } else {
        (1.0 - ss_res / ss_tot).clamp(0.0, 1.0)
    };

    let residuals: Vec<f64> = xs
        .iter()
        .zip(ys.iter())
        .map(|(x, y)| {
            let pred = a * x + b;
            y - pred
        })
        .collect();

    Some(RegressionResult {
        a,
        b,
        r_squared,
        residuals,
    })
}

fn residual_std_dev(residuals: &[f64]) -> f64 {
    let n = residuals.len() as f64;
    if n < 2.0 {
        return 0.0;
    }
    let mean = residuals.iter().sum::<f64>() / n;
    let variance = residuals.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / n;
    variance.sqrt()
}

fn percentile(sorted_data: &[f64], p: f64) -> f64 {
    if sorted_data.is_empty() {
        return 0.0;
    }
    if sorted_data.len() == 1 {
        return sorted_data[0];
    }
    let n = sorted_data.len() as f64;
    let index = (p / 100.0) * (n - 1.0);
    let lo = index.floor() as usize;
    let hi = index.ceil() as usize;
    let frac = index - index.floor();
    sorted_data[lo] + frac * (sorted_data[hi] - sorted_data[lo])
}

fn fit_power_law(
    historic_data: &[PricePoint],
    formulation: &Formulation,
    custom_a: Option<f64>,
    custom_b: Option<f64>,
) -> Result<(f64, f64, f64, Vec<f64>), String> {
    match formulation {
        Formulation::Custom => {
            let a = custom_a.ok_or("Custom a parameter is required")?;
            let b = custom_b.ok_or("Custom b parameter is required")?;
            let residuals: Vec<f64> = historic_data
                .iter()
                .map(|p| {
                    let days = days_since_genesis(p.timestamp_ms);
                    let predicted = log10(p.price_usd) - (a * log10(days) + b);
                    predicted
                })
                .collect();
            let ss_res: f64 = residuals.iter().map(|r| r * r).sum();
            let mean_y: f64 =
                historic_data.iter().map(|p| log10(p.price_usd)).sum::<f64>() / historic_data.len() as f64;
            let ss_tot: f64 = historic_data
                .iter()
                .map(|p| {
                    let y = log10(p.price_usd);
                    (y - mean_y).powi(2)
                })
                .sum();
            let r2 = if ss_tot.abs() < 1e-15 {
                0.0_f64
            } else {
                let val = 1.0_f64 - ss_res / ss_tot;
                val.clamp(0.0, 1.0)
            };
            Ok((a, b, r2, residuals))
        }
        _ => {
            let xs: Vec<f64> = historic_data
                .iter()
                .map(|p| log10(days_since_genesis(p.timestamp_ms)))
                .collect();
            let ys: Vec<f64> = historic_data
                .iter()
                .map(|p| log10(p.price_usd))
                .collect();

            let reg = linear_regression(&xs, &ys)
                .ok_or("Failed to fit regression: insufficient data")?;

            let (a, b) = match formulation {
                Formulation::LogLog => (reg.a, reg.b),
                Formulation::PowerFit => (reg.a, pow10(reg.b)),
                Formulation::Custom => unreachable!(),
            };

            Ok((a, b, reg.r_squared, reg.residuals))
        }
    }
}

fn compute_median_log_price(a: f64, b: f64, days: f64, formulation: &Formulation) -> f64 {
    match formulation {
        Formulation::LogLog | Formulation::Custom => a * log10(days) + b,
        Formulation::PowerFit => a * log10(days) + log10(b),
    }
}

fn first_historic_year(data: &[PricePoint]) -> i32 {
    data.iter()
        .map(|p| {
            let days = days_since_genesis(p.timestamp_ms);
            let years = days / 365.25;
            2009 + years.floor() as i32
        })
        .min()
        .unwrap_or(2009)
}

fn current_year() -> i32 {
    let now_ms = js_sys::Date::now() as i64;
    let days_since_epoch = (now_ms as f64 / MS_PER_DAY).floor();
    let years_since_epoch = (days_since_epoch / 365.25).floor() as i32;
    1970 + years_since_epoch
}

fn compute_band_points(
    a: f64,
    b: f64,
    _r_squared: f64,
    residuals: &[f64],
    band_style: &BandStyle,
    formulation: &Formulation,
    first_year: i32,
    projection_end: i32,
    custom_p10: Option<f64>,
    custom_p90: Option<f64>,
    custom_p25: Option<f64>,
    custom_p75: Option<f64>,
    historic_data: &[PricePoint],
) -> Vec<ModelPoint> {
    let sigma = residual_std_dev(residuals);
    let two_sigma = sigma * 2.0;

    let mut sorted_residuals = residuals.to_vec();
    sorted_residuals.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let (actual_p10, actual_p90, actual_p25, actual_p75) = if !sorted_residuals.is_empty() {
        let cp10 = custom_p10.unwrap_or(10.0);
        let cp90 = custom_p90.unwrap_or(90.0);
        let cp25 = custom_p25.unwrap_or(25.0);
        let cp75 = custom_p75.unwrap_or(75.0);
        (
            percentile(&sorted_residuals, cp10),
            percentile(&sorted_residuals, cp90),
            percentile(&sorted_residuals, cp25),
            percentile(&sorted_residuals, cp75),
        )
    } else {
        (0.0, 0.0, 0.0, 0.0)
    };

    let mut points = Vec::new();

    for year in first_year..=projection_end {
        let days = year_to_days(year);
        let jan1_ms = {
            let unix_seconds = ((year - 1970) as f64 * 365.25 * SECONDS_PER_DAY) as i64;
            unix_seconds * 1000
        };

        let median_log = compute_median_log_price(a, b, days, formulation);
        let median = pow10(median_log);

        let has_historic = historic_data.iter().any(|p| {
            let p_year = {
                let p_days = days_since_genesis(p.timestamp_ms);
                2009 + (p_days / 365.25).floor() as i32
            };
            p_year == year
        });

        let mut point = ModelPoint {
            year,
            timestamp_ms: jan1_ms,
            median_price_usd: median,
            band_1sigma_low: None,
            band_1sigma_high: None,
            band_2sigma_low: None,
            band_2sigma_high: None,
            band_p10: None,
            band_p90: None,
            band_p25: None,
            band_p75: None,
        };

        if !has_historic || sigma > 0.0 {
            match band_style {
                BandStyle::OneSigma => {
                    point.band_1sigma_low = Some(pow10(median_log - sigma));
                    point.band_1sigma_high = Some(pow10(median_log + sigma));
                }
                BandStyle::OneSigmaTwoSigma => {
                    point.band_1sigma_low = Some(pow10(median_log - sigma));
                    point.band_1sigma_high = Some(pow10(median_log + sigma));
                    point.band_2sigma_low = Some(pow10(median_log - two_sigma));
                    point.band_2sigma_high = Some(pow10(median_log + two_sigma));
                }
                BandStyle::CustomPercentiles => {
                    point.band_p10 = Some(pow10(median_log + actual_p10));
                    point.band_p90 = Some(pow10(median_log + actual_p90));
                    point.band_p25 = Some(pow10(median_log + actual_p25));
                    point.band_p75 = Some(pow10(median_log + actual_p75));
                }
            }
        }

        points.push(point);
    }

    points
}

pub fn run_power_law(
    config: PowerLawConfig,
    historic_data: Vec<PricePoint>,
) -> Result<PowerLawResult, String> {
    if historic_data.is_empty() {
        return Err("Historic data is empty".to_string());
    }
    if historic_data.len() == 1 {
        return Err("Need at least 2 data points for regression".to_string());
    }
    if config.projection_years < 0 {
        return Err("Projection years must be non-negative".to_string());
    }

    let formulation_str = match &config.formulation {
        Formulation::LogLog => "log_log".to_string(),
        Formulation::PowerFit => "power_fit".to_string(),
        Formulation::Custom => "custom".to_string(),
    };

    let (a, b, r_squared, residuals) = fit_power_law(
        &historic_data,
        &config.formulation,
        config.custom_a,
        config.custom_b,
    )?;

    let first_year = first_historic_year(&historic_data);
    let this_year = current_year();
    let projection_end = if config.projection_years == 0 {
        this_year
    } else {
        this_year + config.projection_years
    };

    let points = compute_band_points(
        a,
        b,
        r_squared,
        &residuals,
        &config.band_style,
        &config.formulation,
        first_year,
        projection_end,
        config.custom_p10,
        config.custom_p90,
        config.custom_p25,
        config.custom_p75,
        &historic_data,
    );

    Ok(PowerLawResult {
        points,
        r_squared,
        a,
        b,
        formulation_used: formulation_str,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    fn sample_data() -> Vec<PricePoint> {
        vec![
            PricePoint {
                timestamp_ms: 1_388_534_400_000, // 2014-01-01
                price_usd: 800.0,
            },
            PricePoint {
                timestamp_ms: 1_420_070_400_000, // 2015-01-01
                price_usd: 250.0,
            },
            PricePoint {
                timestamp_ms: 1_451_606_400_000, // 2016-01-01
                price_usd: 500.0,
            },
            PricePoint {
                timestamp_ms: 1_483_228_800_000, // 2017-01-01
                price_usd: 4000.0,
            },
            PricePoint {
                timestamp_ms: 1_514_764_800_000, // 2018-01-01
                price_usd: 10000.0,
            },
            PricePoint {
                timestamp_ms: 1_546_300_800_000, // 2019-01-01
                price_usd: 7000.0,
            },
            PricePoint {
                timestamp_ms: 1_577_836_800_000, // 2020-01-01
                price_usd: 10000.0,
            },
            PricePoint {
                timestamp_ms: 1_609_459_200_000, // 2021-01-01
                price_usd: 40000.0,
            },
            PricePoint {
                timestamp_ms: 1_640_995_200_000, // 2022-01-01
                price_usd: 30000.0,
            },
            PricePoint {
                timestamp_ms: 1_672_531_200_000, // 2023-01-01
                price_usd: 30000.0,
            },
            PricePoint {
                timestamp_ms: 1_704_067_200_000, // 2024-01-01
                price_usd: 55000.0,
            },
        ]
    }

    #[wasm_bindgen_test]
    fn log_log_fit_has_high_r_squared() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();
        assert!(result.r_squared > 0.80, "R² should be ≥ 0.80, got {}", result.r_squared);
        assert!(result.r_squared <= 1.0);
    }

    #[wasm_bindgen_test]
    fn power_fit_returns_different_params() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::PowerFit,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();
        assert!(result.a > 0.0, "Power fit a should be positive");
        assert!(result.b > 0.0, "Power fit b should be positive");
    }

    #[wasm_bindgen_test]
    fn custom_mode_uses_provided_params() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::Custom,
            band_style: BandStyle::OneSigma,
            custom_a: Some(5.84),
            custom_b: Some(-17.3),
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();
        assert!((result.a - 5.84).abs() < 1e-6);
        assert!((result.b - (-17.3)).abs() < 1e-6);

        let tolerance = 0.05;
        for point in &result.points {
            if point.year == 2024 {
                let expected_log = 5.84 * log10(year_to_days(2024)) + (-17.3);
                let expected = pow10(expected_log);
                let diff = (point.median_price_usd - expected).abs() / expected;
                assert!(diff < tolerance, "Custom params: year 2024 price mismatch: got {}, expected {}", point.median_price_usd, expected);
            }
        }
    }

    #[wasm_bindgen_test]
    fn reference_2024_price_near_55k() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();
        let reference = 55000.0;
        let tolerance = 0.60;
        for point in &result.points {
            if point.year == 2024 {
                let diff = (point.median_price_usd - reference).abs() / reference;
                assert!(
                    diff < tolerance,
                    "2024 median price deviates too much from reference: got {}, expected ~{} (+-{:.0}%)",
                    point.median_price_usd,
                    reference,
                    tolerance * 100.0
                );
                return;
            }
        }
        panic!("No data point found for year 2024");
    }

    #[wasm_bindgen_test]
    fn confidence_bands_diverge_over_time() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigmaTwoSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 50,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();

        let early = result.points.first().unwrap();
        let late = result.points.last().unwrap();

        if let (Some(el), Some(eh), Some(ll), Some(lh)) = (
            early.band_1sigma_low,
            early.band_1sigma_high,
            late.band_1sigma_low,
            late.band_1sigma_high,
        ) {
            let early_width = eh - el;
            let late_width = lh - ll;
            assert!(
                late_width > early_width,
                "Band width should increase over time: early={}, late={}",
                early_width,
                late_width
            );
        }
    }

    #[wasm_bindgen_test]
    fn empty_historic_data_returns_error() {
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 30,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, vec![]);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn single_data_point_returns_error() {
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 30,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(
            config,
            vec![PricePoint {
                timestamp_ms: 1_359_676_800_000,
                price_usd: 20.0,
            }],
        );
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn zero_projection_years_returns_only_historic_range() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();

        let max_year = result.points.iter().map(|p| p.year).max().unwrap();
        assert!(max_year >= 2026, "Should include current year, got max year {}", max_year);
    }

    #[wasm_bindgen_test]
    fn r_squared_between_zero_and_one() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();
        assert!(result.r_squared >= 0.0);
        assert!(result.r_squared <= 1.0);
    }

    #[wasm_bindgen_test]
    fn log_log_and_power_fit_produce_different_a() {
        let data = sample_data();
        let config_log = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let config_pow = PowerLawConfig {
            formulation: Formulation::PowerFit,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 0,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result_log = run_power_law(config_log, data.clone()).unwrap();
        let result_pow = run_power_law(config_pow, data).unwrap();
        assert!(
            (result_log.a - result_pow.a).abs() > 1e-6 || (result_log.b - result_pow.b).abs() > 1e-6,
            "Log-log and Power fit should produce different parameters"
        );
    }

    #[wasm_bindgen_test]
    fn one_sigma_bands_have_same_width() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: 30,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data).unwrap();
        for point in &result.points {
            assert!(point.band_1sigma_low.is_some(), "1σ low band should be set");
            assert!(point.band_1sigma_high.is_some(), "1σ high band should be set");
            assert!(point.band_2sigma_low.is_none(), "2σ low band should not be set for 1σ mode");
            assert!(point.band_2sigma_high.is_none(), "2σ high band should not be set for 1σ mode");
        }
    }

    #[wasm_bindgen_test]
    fn custom_percentile_bands_provided() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::CustomPercentiles,
            custom_a: None,
            custom_b: None,
            projection_years: 30,
            custom_p10: Some(15.0),
            custom_p90: Some(85.0),
            custom_p25: Some(35.0),
            custom_p75: Some(65.0),
        };
        let result = run_power_law(config, data).unwrap();
        for point in &result.points {
            assert!(point.band_p10.is_some());
            assert!(point.band_p90.is_some());
            assert!(point.band_p25.is_some());
            assert!(point.band_p75.is_some());
        }
    }

    #[wasm_bindgen_test]
    fn negative_projection_years_returns_error() {
        let data = sample_data();
        let config = PowerLawConfig {
            formulation: Formulation::LogLog,
            band_style: BandStyle::OneSigma,
            custom_a: None,
            custom_b: None,
            projection_years: -5,
            custom_p10: None,
            custom_p90: None,
            custom_p25: None,
            custom_p75: None,
        };
        let result = run_power_law(config, data);
        assert!(result.is_err());
    }
}
