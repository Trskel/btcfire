use crate::data::PricePoint;

pub(crate) const GENESIS_MS: i64 = 1_230_940_800_000;
pub(crate) const MS_PER_DAY: f64 = 86_400_000.0;

pub(crate) fn days_since_genesis(timestamp_ms: i64) -> f64 {
    (timestamp_ms - GENESIS_MS) as f64 / MS_PER_DAY
}

pub(crate) fn log10(x: f64) -> f64 {
    x.log10()
}

pub(crate) fn pow10(x: f64) -> f64 {
    10.0_f64.powf(x)
}

pub(crate) struct RegressionResult {
    pub a: f64,
    pub b: f64,
    pub r_squared: f64,
    pub residuals: Vec<f64>,
}

pub(crate) fn linear_regression(xs: &[f64], ys: &[f64]) -> Option<RegressionResult> {
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

pub(crate) fn residual_std_dev(residuals: &[f64]) -> f64 {
    let n = residuals.len() as f64;
    if n < 2.0 {
        return 0.0;
    }
    let mean = residuals.iter().sum::<f64>() / n;
    let variance = residuals.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / n;
    variance.sqrt()
}

pub(crate) fn current_year() -> i32 {
    let now_ms = js_sys::Date::now() as i64;
    let days_since_epoch = (now_ms as f64 / MS_PER_DAY).floor();
    let years_since_epoch = (days_since_epoch / 365.25).floor() as i32;
    1970 + years_since_epoch
}

pub(crate) fn first_historic_year(data: &[PricePoint]) -> i32 {
    data.iter()
        .map(|p| {
            let days = days_since_genesis(p.timestamp_ms);
            let years = days / 365.25;
            2009 + years.floor() as i32
        })
        .min()
        .unwrap_or(2009)
}
