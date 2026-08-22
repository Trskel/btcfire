use crate::strategies::policy::Phase;
use serde::{Deserialize, Serialize};

fn default_inflation_rate() -> f64 {
    3.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationParams {
    pub holdings_btc: f64,
    pub retirement_start_year: i32,
    pub current_age: i32,
    pub lifespan: i32,
    pub minimum_spend_usd: f64,
    pub annual_spend_usd: f64,
    #[serde(default = "default_inflation_rate")]
    pub inflation_rate: f64,
}

impl SimulationParams {
    pub fn horizon_years(&self) -> usize {
        (self.lifespan - self.current_age).max(0) as usize
    }

    pub fn inflation_mult(&self, years: f64) -> f64 {
        (1.0 + self.inflation_rate / 100.0).powf(years)
    }

    pub fn floor_usd(&self, years: f64) -> f64 {
        self.minimum_spend_usd * self.inflation_mult(years)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeState {
    pub year: i32,
    pub btc: f64,
    pub cash_usd: f64,
    pub buffer_years: f64,
    pub initial_rate: f64,
    pub base_spend_usd: f64,
    pub deferred_buffer: bool,
}

impl RuntimeState {
    pub fn new(retirement_year: i32, holdings_btc: f64) -> Self {
        RuntimeState {
            year: retirement_year,
            btc: holdings_btc,
            cash_usd: 0.0,
            buffer_years: 0.0,
            initial_rate: 0.0,
            base_spend_usd: 0.0,
            deferred_buffer: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YearResult {
    pub year: i32,
    pub btc: f64,
    pub cash_usd: f64,
    pub buffer_years: f64,
    pub spend_usd: f64,
    pub sold_btc: f64,
    pub phase: Option<Phase>,
}
