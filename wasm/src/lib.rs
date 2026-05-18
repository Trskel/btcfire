use wasm_bindgen::prelude::*;

pub mod data;
pub mod models;
mod simulation;
mod strategies;

use models::power_law::{run_power_law, PowerLawConfig, PowerLawResult};

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
}
