use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PricePoint {
    pub timestamp_ms: i64,
    pub price_usd: f64,
}

#[wasm_bindgen]
pub fn parse_price_data(val: JsValue) -> Result<JsValue, JsValue> {
    let points: Vec<PricePoint> =
        serde_wasm_bindgen::from_value(val).map_err(|e| JsValue::from_str(&e.to_string()))?;
    serde_wasm_bindgen::to_value(&points).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_point_serde_roundtrip() {
        let points = vec![
            PricePoint {
                timestamp_ms: 1367107200000,
                price_usd: 135.3,
            },
            PricePoint {
                timestamp_ms: 1367193600000,
                price_usd: 141.96,
            },
        ];

        let json = serde_json::to_string(&points).unwrap();
        let deserialized: Vec<PricePoint> = serde_json::from_str(&json).unwrap();
        assert_eq!(points, deserialized);
    }

    #[test]
    fn price_point_fields_correct() {
        let p = PricePoint {
            timestamp_ms: 1700000000000,
            price_usd: 37500.50,
        };
        assert_eq!(p.timestamp_ms, 1700000000000);
        assert!((p.price_usd - 37500.50).abs() < f64::EPSILON);
    }
}
