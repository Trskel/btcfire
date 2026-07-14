import init from 'btcfire-wasm'

let ready = false

export async function ensureWasm() {
  if (!ready) {
    await init()
    ready = true
  }
}
