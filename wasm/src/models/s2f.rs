use crate::data::PricePoint;
use crate::models::ModelPoint;
use super::stats::{
    current_year, first_historic_year, linear_regression, log10, pow10,
    residual_std_dev, year_midpoint_timestamp, jan1_timestamp,
};
use serde::{Deserialize, Serialize};

const BLOCKS_PER_EPOCH: f64 = 210_000.0;
const MS_PER_BLOCK: f64 = 600_000.0;
const BLOCKS_PER_YEAR: f64 = 52_560.0;

fn get_halvings() -> Vec<(i64, f64)> {
    vec![
        (1230940800000, 50.0),
        (1354118400000, 25.0),
        (1468022400000, 12.5),
        (1589155200000, 6.25),
        (1713571200000, 3.125),
        (1836662400000, 1.5625),
        (1959753600000, 0.78125),
        (2082844800000, 0.390625),
        (2205936000000, 0.1953125),
        (2329027200000, 0.09765625),
        (2452118400000, 0.048828125),
    ]
}

fn get_epoch_info(ts_ms: i64) -> (usize, i64, f64) {
    let halvings = get_halvings();
    let mut epoch = 0;
    let mut epoch_start = halvings[0].0;
    let mut subsidy = halvings[0].1;

    for (i, &(h_ts, h_subsidy)) in halvings.iter().enumerate() {
        if ts_ms < h_ts {
            break;
        }
        epoch = i;
        epoch_start = h_ts;
        subsidy = h_subsidy;
    }

    (epoch, epoch_start, subsidy)
}

fn get_s2f_for_timestamp(ts_ms: i64) -> f64 {
    let halvings = get_halvings();
    let (epoch, epoch_start, subsidy) = get_epoch_info(ts_ms);

    let mut supply = 0.0;
    for i in 0..epoch {
        supply += BLOCKS_PER_EPOCH * halvings[i].1;
    }

    let ms_in_epoch = (ts_ms - epoch_start).max(0) as f64;
    let blocks_mined = (ms_in_epoch / MS_PER_BLOCK).floor();
    supply += blocks_mined * subsidy;

    let annual_issuance = subsidy * BLOCKS_PER_YEAR;
    if annual_issuance < 1e-15 {
        return 0.0;
    }

    supply / annual_issuance
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S2FConfig {
    #[serde(default = "default_projection_years")]
    pub projection_years: i32,
}

fn default_projection_years() -> i32 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S2FResult {
    pub points: Vec<ModelPoint>,
    pub r_squared: f64,
    pub a: f64,
    pub b: f64,
}

pub fn run_s2f(config: S2FConfig, historic_data: Vec<PricePoint>) -> Result<S2FResult, String> {
    if historic_data.is_empty() {
        return Err("Historic data is empty".to_string());
    }
    if historic_data.len() < 2 {
        return Err("Need at least 2 data points for regression".to_string());
    }
    if config.projection_years < 0 {
        return Err("Projection years must be non-negative".to_string());
    }

    // Filter to data after July 2010 when BTC had meaningful exchange-traded value
    let min_trading_ts: i64 = 1_277_942_400_000;

    let reg_points: Vec<(f64, f64)> = historic_data
        .iter()
        .filter(|p| p.timestamp_ms >= min_trading_ts)
        .filter(|p| p.price_usd > 0.0)
        .map(|p| {
            let s2f = get_s2f_for_timestamp(p.timestamp_ms);
            (log10(s2f), log10(p.price_usd))
        })
        .collect();

    if reg_points.len() < 2 {
        return Err("Not enough data points after July 2010 to fit S2F model".to_string());
    }

    let xs: Vec<f64> = reg_points.iter().map(|(x, _)| *x).collect();
    let ys: Vec<f64> = reg_points.iter().map(|(_, y)| *y).collect();

    let reg = linear_regression(&xs, &ys)
        .ok_or("Failed to fit S2F regression: insufficient data")?;

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
        let midpoint_ts = year_midpoint_timestamp(year);
        let s2f = get_s2f_for_timestamp(midpoint_ts);
        let s2f_log = log10(s2f);

        let median_log = reg.a * s2f_log + reg.b;
        let median = pow10(median_log);

        let jan1_ms = jan1_timestamp(year);

        let point = ModelPoint {
            year,
            timestamp_ms: jan1_ms,
            median_price_usd: median,
            path_price_usd: None,
            band_1sigma_low: Some(pow10(median_log - sigma)),
            band_1sigma_high: Some(pow10(median_log + sigma)),
            band_2sigma_low: Some(pow10(median_log - sigma * 2.0)),
            band_2sigma_high: Some(pow10(median_log + sigma * 2.0)),
            band_p10: None,
            band_p90: None,
            band_p25: None,
            band_p75: None,
        };

        points.push(point);
    }

    Ok(S2FResult {
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
                timestamp_ms: 1388534400000, // 2014-01-01
                price_usd: 800.0,
            },
            PricePoint {
                timestamp_ms: 1420070400000, // 2015-01-01
                price_usd: 250.0,
            },
            PricePoint {
                timestamp_ms: 1451606400000, // 2016-01-01
                price_usd: 500.0,
            },
            PricePoint {
                timestamp_ms: 1483228800000, // 2017-01-01
                price_usd: 4000.0,
            },
            PricePoint {
                timestamp_ms: 1514764800000, // 2018-01-01
                price_usd: 10000.0,
            },
            PricePoint {
                timestamp_ms: 1546300800000, // 2019-01-01
                price_usd: 7000.0,
            },
            PricePoint {
                timestamp_ms: 1577836800000, // 2020-01-01
                price_usd: 10000.0,
            },
            PricePoint {
                timestamp_ms: 1609459200000, // 2021-01-01
                price_usd: 40000.0,
            },
            PricePoint {
                timestamp_ms: 1640995200000, // 2022-01-01
                price_usd: 30000.0,
            },
            PricePoint {
                timestamp_ms: 1672531200000, // 2023-01-01
                price_usd: 30000.0,
            },
            PricePoint {
                timestamp_ms: 1704067200000, // 2024-01-01
                price_usd: 55000.0,
            },
        ]
    }

    #[wasm_bindgen_test]
    fn s2f_in_epoch_2_around_25() {
        let ts = 1483228800000; // 2017-01-01 (after 2nd halving, epoch 2)
        let s2f = get_s2f_for_timestamp(ts);
        assert!(s2f > 20.0, "S2F in epoch 2 should be >20, got {}", s2f);
        assert!(s2f < 35.0, "S2F in epoch 2 should be <35, got {}", s2f);
    }

    #[wasm_bindgen_test]
    fn s2f_in_epoch_3_around_55() {
        let ts = 1640995200000; // 2022-01-01 (epoch 3)
        let s2f = get_s2f_for_timestamp(ts);
        assert!(s2f > 45.0, "S2F in epoch 3 should be >45, got {}", s2f);
        assert!(s2f < 70.0, "S2F in epoch 3 should be <70, got {}", s2f);
    }

    #[wasm_bindgen_test]
    fn s2f_doubles_at_halving() {
        let just_before = 1713571200000 - 600_000; // 1 block before 4th halving
        let just_after = 1713571200000 + 600_000; // 1 block after 4th halving

        let s2f_before = get_s2f_for_timestamp(just_before);
        let s2f_after = get_s2f_for_timestamp(just_after);

        let ratio = s2f_after / s2f_before;
        assert!(
            ratio > 1.5 && ratio < 2.5,
            "S2F should approximately double at halving: before={}, after={}, ratio={}",
            s2f_before,
            s2f_after,
            ratio
        );
    }

    #[wasm_bindgen_test]
    fn regression_on_s2f_data() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 0,
        };
        let result = run_s2f(config, data).unwrap();

        assert!(result.r_squared > 0.0, "R² should be > 0, got {}", result.r_squared);
        assert!(result.r_squared <= 1.0, "R² should be ≤ 1");
        assert!(result.a > 0.0, "S2F slope a should be positive, got {}", result.a);
    }

    #[wasm_bindgen_test]
    fn known_regression_slope_positive() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 0,
        };
        let result = run_s2f(config, data).unwrap();

        assert!(result.a > 2.0, "S2F regression slope should be > 2.0, got {}", result.a);
    }

    #[wasm_bindgen_test]
    fn confidence_bands_are_ordered() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 30,
        };
        let result = run_s2f(config, data).unwrap();

        for point in &result.points {
            if let (Some(low), Some(high)) = (point.band_1sigma_low, point.band_1sigma_high) {
                assert!(low < point.median_price_usd, "1σ low should be below median");
                assert!(high > point.median_price_usd, "1σ high should be above median");
            }
        }
    }

    #[wasm_bindgen_test]
    fn two_sigma_bands_enclose_one_sigma_bands() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 30,
        };
        let result = run_s2f(config, data).unwrap();

        for point in &result.points {
            let (Some(l1), Some(h1)) = (point.band_1sigma_low, point.band_1sigma_high) else {
                panic!("1σ bands should be present");
            };
            let (Some(l2), Some(h2)) = (point.band_2sigma_low, point.band_2sigma_high) else {
                panic!("2σ bands should be present");
            };
            assert!(l2 < l1, "2σ low should be below 1σ low");
            assert!(h2 > h1, "2σ high should be above 1σ high");
        }
    }

    #[wasm_bindgen_test]
    fn empty_historic_data_returns_error() {
        let config = S2FConfig {
            projection_years: 30,
        };
        let result = run_s2f(config, vec![]);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn single_data_point_returns_error() {
        let config = S2FConfig {
            projection_years: 30,
        };
        let result = run_s2f(
            config,
            vec![PricePoint {
                timestamp_ms: 1451606400000,
                price_usd: 500.0,
            }],
        );
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn zero_projection_years_returns_only_historic_range() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 0,
        };
        let result = run_s2f(config, data).unwrap();
        let max_year = result.points.iter().map(|p| p.year).max().unwrap();
        assert!(max_year >= 2026, "Should include current year, got {}", max_year);
    }

    #[wasm_bindgen_test]
    fn r_squared_between_zero_and_one() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 0,
        };
        let result = run_s2f(config, data).unwrap();
        assert!(result.r_squared >= 0.0);
        assert!(result.r_squared <= 1.0);
    }

    #[wasm_bindgen_test]
    fn negative_projection_years_returns_error() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: -5,
        };
        let result = run_s2f(config, data);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn s2f_increases_each_halving_epoch() {
        let ts_2014 = 1388534400000;
        let ts_2018 = 1514764800000;
        let ts_2022 = 1640995200000;

        let s2f_2014 = get_s2f_for_timestamp(ts_2014);
        let s2f_2018 = get_s2f_for_timestamp(ts_2018);
        let s2f_2022 = get_s2f_for_timestamp(ts_2022);

        assert!(s2f_2018 > s2f_2014, "S2F should increase over time");
        assert!(s2f_2022 > s2f_2018, "S2F should increase over time");
    }

    #[wasm_bindgen_test]
    fn projection_includes_future_years() {
        let data = sample_data();
        let config = S2FConfig {
            projection_years: 30,
        };
        let result = run_s2f(config, data).unwrap();
        let max_year = result.points.iter().map(|p| p.year).max().unwrap();
        let min_year = result.points.iter().map(|p| p.year).min().unwrap();
        assert!(max_year > 2026, "Should project into the future");
        assert!(min_year <= 2014, "Should include historic years");
    }
}
