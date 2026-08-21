use crate::data::PricePoint;
use crate::models::ModelPoint;
use super::stats::{
    current_year, days_since_genesis, first_historic_year, jan1_timestamp,
    linear_regression, log10, pow10, residual_std_dev,
};
use serde::{Deserialize, Serialize};

const DAYS_PER_YEAR: f64 = 365.25;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bitcoin24Config {
    #[serde(default = "default_projection_years")]
    pub projection_years: i32,
}

fn default_projection_years() -> i32 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bitcoin24Result {
    pub points: Vec<ModelPoint>,
    pub r_squared: f64,
    pub a: f64,
    pub b: f64,
}

fn years_since_genesis_f64(ts_ms: i64) -> f64 {
    days_since_genesis(ts_ms) / DAYS_PER_YEAR
}

pub fn run_bitcoin24(
    config: Bitcoin24Config,
    historic_data: Vec<PricePoint>,
) -> Result<Bitcoin24Result, String> {
    if historic_data.is_empty() {
        return Err("Historic data is empty".to_string());
    }
    if historic_data.len() < 2 {
        return Err("Need at least 2 data points for regression".to_string());
    }
    if config.projection_years < 0 {
        return Err("Projection years must be non-negative".to_string());
    }

    let reg_points: Vec<(f64, f64)> = historic_data
        .iter()
        .filter(|p| p.price_usd > 0.0)
        .map(|p| {
            let years = years_since_genesis_f64(p.timestamp_ms);
            (years, log10(p.price_usd))
        })
        .collect();

    if reg_points.len() < 2 {
        return Err("Not enough data points with positive price for regression".to_string());
    }

    let xs: Vec<f64> = reg_points.iter().map(|(x, _)| *x).collect();
    let ys: Vec<f64> = reg_points.iter().map(|(_, y)| *y).collect();

    let reg = linear_regression(&xs, &ys)
        .ok_or("Failed to fit CAGR regression: insufficient data")?;

    let sigma = residual_std_dev(&reg.residuals);

    let first_year = first_historic_year(&historic_data);
    let this_year = current_year();
    let projection_end = if config.projection_years == 0 {
        this_year
    } else {
        this_year + config.projection_years
    };

    let mut points = Vec::new();

    for year in first_year..=projection_end {
        let jan1_ms = jan1_timestamp(year);
        let years = years_since_genesis_f64(jan1_ms);

        let median_log = reg.a * years + reg.b;
        let median = pow10(median_log);

        let point = ModelPoint {
            year,
            timestamp_ms: jan1_ms,
            median_price_usd: median,
            band_1sigma_low: Some(pow10(median_log - sigma)),
            band_1sigma_high: Some(pow10(median_log + sigma)),
            band_2sigma_low: None,
            band_2sigma_high: None,
            band_p10: None,
            band_p90: None,
            band_p25: None,
            band_p75: None,
        };

        points.push(point);
    }

    Ok(Bitcoin24Result {
        points,
        r_squared: reg.r_squared,
        a: reg.a,
        b: reg.b,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    fn sample_data() -> Vec<PricePoint> {
        vec![
            PricePoint {
                timestamp_ms: 1_388_534_400_000,
                price_usd: 800.0,
            },
            PricePoint {
                timestamp_ms: 1_420_070_400_000,
                price_usd: 250.0,
            },
            PricePoint {
                timestamp_ms: 1_451_606_400_000,
                price_usd: 500.0,
            },
            PricePoint {
                timestamp_ms: 1_483_228_800_000,
                price_usd: 4000.0,
            },
            PricePoint {
                timestamp_ms: 1_514_764_800_000,
                price_usd: 10000.0,
            },
            PricePoint {
                timestamp_ms: 1_546_300_800_000,
                price_usd: 7000.0,
            },
            PricePoint {
                timestamp_ms: 1_577_836_800_000,
                price_usd: 10000.0,
            },
            PricePoint {
                timestamp_ms: 1_609_459_200_000,
                price_usd: 40000.0,
            },
            PricePoint {
                timestamp_ms: 1_640_995_200_000,
                price_usd: 30000.0,
            },
            PricePoint {
                timestamp_ms: 1_672_531_200_000,
                price_usd: 30000.0,
            },
            PricePoint {
                timestamp_ms: 1_704_067_200_000,
                price_usd: 55000.0,
            },
        ]
    }

    #[wasm_bindgen_test]
    fn cagr_fit_has_high_r_squared() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 0,
        };
        let result = run_bitcoin24(config, data).unwrap();
        assert!(result.r_squared > 0.80, "R² should be > 0.80, got {}", result.r_squared);
        assert!(result.r_squared <= 1.0);
    }

    #[wasm_bindgen_test]
    fn cagr_slope_is_positive() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 0,
        };
        let result = run_bitcoin24(config, data).unwrap();
        assert!(result.a > 0.0, "CAGR slope a should be positive, got {}", result.a);
    }

    #[wasm_bindgen_test]
    fn reference_2024_median_price() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 0,
        };
        let result = run_bitcoin24(config, data).unwrap();
        let reference = 55000.0;
        let tolerance = 0.70;
        for point in &result.points {
            if point.year == 2024 {
                let diff = (point.median_price_usd - reference).abs() / reference;
                assert!(
                    diff < tolerance,
                    "2024 median price deviates too much: got {}, expected ~{} (+-{:.0}%)",
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
    fn confidence_bands_are_ordered() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 30,
        };
        let result = run_bitcoin24(config, data).unwrap();

        for point in &result.points {
            if let (Some(low), Some(high)) = (point.band_1sigma_low, point.band_1sigma_high) {
                assert!(low < point.median_price_usd, "1σ low should be below median");
                assert!(high > point.median_price_usd, "1σ high should be above median");
            }
        }
    }

    #[wasm_bindgen_test]
    fn confidence_bands_widen_over_time() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 50,
        };
        let result = run_bitcoin24(config, data).unwrap();

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
        let config = Bitcoin24Config {
            projection_years: 30,
        };
        let result = run_bitcoin24(config, vec![]);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn single_data_point_returns_error() {
        let config = Bitcoin24Config {
            projection_years: 30,
        };
        let result = run_bitcoin24(
            config,
            vec![PricePoint {
                timestamp_ms: 1_451_606_400_000,
                price_usd: 500.0,
            }],
        );
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn negative_projection_years_returns_error() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: -5,
        };
        let result = run_bitcoin24(config, data);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn zero_projection_years_returns_only_historic_range() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 0,
        };
        let result = run_bitcoin24(config, data).unwrap();
        let max_year = result.points.iter().map(|p| p.year).max().unwrap();
        assert!(max_year >= 2026, "Should include current year, got {}", max_year);
    }

    #[wasm_bindgen_test]
    fn r_squared_between_zero_and_one() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 0,
        };
        let result = run_bitcoin24(config, data).unwrap();
        assert!(result.r_squared >= 0.0);
        assert!(result.r_squared <= 1.0);
    }

    #[wasm_bindgen_test]
    fn projection_includes_future_years() {
        let data = sample_data();
        let config = Bitcoin24Config {
            projection_years: 30,
        };
        let result = run_bitcoin24(config, data).unwrap();
        let max_year = result.points.iter().map(|p| p.year).max().unwrap();
        let min_year = result.points.iter().map(|p| p.year).min().unwrap();
        assert!(max_year > 2026, "Should project into the future");
        assert!(min_year <= 2014, "Should include historic years");
    }
}
