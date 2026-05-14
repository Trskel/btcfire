use wasm_bindgen::prelude::*;

mod models;
mod simulation;
mod strategies;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello from BTCFire WASM, {}!", name)
}
