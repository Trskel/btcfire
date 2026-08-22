#!/usr/bin/env node
/**
 * Build the Rust wasm crate and atomically swap the output into wasm/pkg.
 *
 * wasm-pack deletes and rewrites its out-dir in place, so a rebuild briefly
 * leaves the package unresolvable. Building into a staging dir and renaming
 * it over pkg keeps the package valid for the whole build, so the dev
 * server never sees a missing "btcfire-wasm".
 *
 * Usage: node scripts/build-wasm.mjs   (or `npm run build:wasm` from web/)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const wasmDir = path.join(root, 'wasm')
const staging = path.join(wasmDir, 'pkg.staging')
const pkg = path.join(wasmDir, 'pkg')
const old = path.join(wasmDir, 'pkg.old')

const result = spawnSync(
  'wasm-pack',
  ['build', '--target', 'web', '--out-dir', 'pkg.staging'],
  { cwd: wasmDir, stdio: 'inherit' },
)
if (result.error) {
  console.error(`wasm-pack failed to start: ${result.error.message}`)
  process.exit(1)
}
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

rmSync(old, { recursive: true, force: true })
if (existsSync(pkg)) renameSync(pkg, old)
renameSync(staging, pkg)
rmSync(old, { recursive: true, force: true })
