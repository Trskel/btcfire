import init from 'btcfire-wasm'

let initPromise: Promise<unknown> | null = null

export function ensureWasm() {
  initPromise ??= init()
  return initPromise
}
