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
    let variance = residuals.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / (n - 1.0);
    variance.sqrt()
}

pub(crate) fn current_year() -> i32 {
    let now_ms = js_sys::Date::now() as i64;
    let now_days = (now_ms as f64 / MS_PER_DAY).floor() as i64;
    let years = epoch_days_to_year(now_days);
    years
}

fn is_leap_year(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn epoch_days_to_jan1(year: i32) -> i64 {
    let mut days: i64 = 0;
    for y in 1970..year {
        days += if is_leap_year(y) { 366 } else { 365 };
    }
    days
}

fn epoch_days_to_year(epoch_days: i64) -> i32 {
    let mut year = 1970;
    let mut remaining = epoch_days;
    loop {
        let year_days: i64 = if is_leap_year(year) { 366 } else { 365 };
        if remaining < year_days {
            break;
        }
        remaining -= year_days;
        year += 1;
    }
    year
}

pub(crate) fn days_to_jan1(year: i32) -> f64 {
    let genesis_days = GENESIS_MS as f64 / MS_PER_DAY;
    epoch_days_to_jan1(year) as f64 - genesis_days
}

pub(crate) fn jan1_timestamp(year: i32) -> i64 {
    epoch_days_to_jan1(year) * MS_PER_DAY as i64
}

pub(crate) fn year_midpoint_timestamp(year: i32) -> i64 {
    let jan1_days = epoch_days_to_jan1(year);
    let mid_days = jan1_days + 182;
    mid_days * MS_PER_DAY as i64
}

pub(crate) fn first_historic_year(data: &[PricePoint]) -> i32 {
    data.iter()
        .map(|p| {
            let days = (p.timestamp_ms / MS_PER_DAY as i64) as f64;
            let genesis_days = GENESIS_MS as f64 / MS_PER_DAY;
            let days_since_genesis = days - genesis_days;
            let years = days_since_genesis / 365.25;
            2009 + years.floor() as i32
        })
        .min()
        .unwrap_or(2009)
}
