pub mod bitcoin24;
pub mod power_law;
pub mod s2f;
pub(crate) mod stats;

use serde::{Deserialize, Serialize};

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
