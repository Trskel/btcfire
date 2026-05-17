use wasm_bindgen::prelude::*;

pub mod data;
mod models;
mod simulation;
mod strategies;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello from BTCFire WASM, {}!", name)
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
