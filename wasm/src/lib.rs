use wasm_bindgen::prelude::*;

pub mod data;
pub mod models;
pub mod simulation;
pub mod strategies;

use models::bitcoin24::{run_bitcoin24, Bitcoin24Config, Bitcoin24Result};
use models::power_law::{run_power_law, PowerLawConfig, PowerLawResult};
use models::s2f::{run_s2f, S2FConfig, S2FResult};
use simulation::engine::run_withdrawal;
use simulation::runtime::{SimulationParams, YearResult};
use strategies::policy::WithdrawalPolicy;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello from BTCFire WASM, {}!", name)
}

#[wasm_bindgen]
pub fn run_power_law_wasm(
    config_js: JsValue,
    historic_data_js: JsValue,
) -> Result<JsValue, JsValue> {
    let config: PowerLawConfig = serde_wasm_bindgen::from_value(config_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid config: {}", e)))?;

    let historic_data: Vec<data::PricePoint> = serde_wasm_bindgen::from_value(historic_data_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid historic data: {}", e)))?;

    let result: PowerLawResult = run_power_law(config, historic_data)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn run_s2f_wasm(
    config_js: JsValue,
    historic_data_js: JsValue,
) -> Result<JsValue, JsValue> {
    let config: S2FConfig = serde_wasm_bindgen::from_value(config_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid config: {}", e)))?;

    let historic_data: Vec<data::PricePoint> = serde_wasm_bindgen::from_value(historic_data_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid historic data: {}", e)))?;

    let result: S2FResult = run_s2f(config, historic_data)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn run_bitcoin24_wasm(
    config_js: JsValue,
    historic_data_js: JsValue,
) -> Result<JsValue, JsValue> {
    let config: Bitcoin24Config = serde_wasm_bindgen::from_value(config_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid config: {}", e)))?;

    let historic_data: Vec<data::PricePoint> = serde_wasm_bindgen::from_value(historic_data_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid historic data: {}", e)))?;

    let result: Bitcoin24Result = run_bitcoin24(config, historic_data)
        .map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn run_withdrawal_wasm(
    config_js: JsValue,
    params_js: JsValue,
    prices_js: JsValue,
) -> Result<JsValue, JsValue> {
    let policy: WithdrawalPolicy = serde_wasm_bindgen::from_value(config_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid policy: {}", e)))?;

    let params: SimulationParams = serde_wasm_bindgen::from_value(params_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid simulation params: {}", e)))?;

    let prices: Vec<models::ModelPoint> = serde_wasm_bindgen::from_value(prices_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid price projection: {}", e)))?;

    let results: Vec<YearResult> =
        run_withdrawal(&policy, &params, &prices).map_err(|e| JsValue::from_str(&e))?;

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn greet_returns_expected_message() {
        assert_eq!(greet("World"), "Hello from BTCFire WASM, World!");
    }

    #[wasm_bindgen_test]
    fn greet_handles_empty_name() {
        assert_eq!(greet(""), "Hello from BTCFire WASM, !");
    }

    #[wasm_bindgen_test]
    fn run_withdrawal_wasm_returns_yearly_results() {
        let policy = WithdrawalPolicy::classic_fire();
        let params = SimulationParams {
            holdings_btc: 1.0,
            retirement_start_year: 2030,
            current_age: 40,
            lifespan: 90,
            minimum_spend_usd: 0.0,
            annual_spend_usd: 50_000.0,
            inflation_rate: 0.0,
        };
        let prices: Vec<models::ModelPoint> = (0..50)
            .map(|i| models::ModelPoint {
                year: 2030 + i,
                timestamp_ms: 0,
                median_price_usd: 100_000.0,
                path_price_usd: None,
                band_1sigma_low: None,
                band_1sigma_high: None,
                band_2sigma_low: None,
                band_2sigma_high: None,
                band_p10: None,
                band_p90: None,
                band_p25: None,
                band_p75: None,
            })
            .collect();

        let policy_js = serde_wasm_bindgen::to_value(&policy).unwrap();
        let params_js = serde_wasm_bindgen::to_value(&params).unwrap();
        let prices_js = serde_wasm_bindgen::to_value(&prices).unwrap();

        let result = run_withdrawal_wasm(policy_js, params_js, prices_js).unwrap();
        let results: Vec<YearResult> = serde_wasm_bindgen::from_value(result).unwrap();
        assert_eq!(results.len(), 50);
        assert_eq!(results[0].year, 2030);
        assert!((results[0].spend_usd - 4000.0).abs() < 1e-6);
    }
}
