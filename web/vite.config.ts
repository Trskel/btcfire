import path from 'path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'

function wasmDevWatcher(): Plugin {
  return {
    name: 'wasm-dev-watcher',
    apply: 'serve',
    async configureServer(server) {
      if (process.env.VITEST) return
      const wasmDir = path.resolve(__dirname, '../wasm')
      const buildScript = path.resolve(__dirname, '../scripts/build-wasm.mjs')
      const runBuild = () =>
        new Promise<boolean>((resolve) => {
          const build = spawn('node', [buildScript], { stdio: 'inherit' })
          build.on('error', (err) => {
            server.config.logger.error(`wasm build failed to start: ${err.message}`)
            resolve(false)
          })
          build.on('exit', (code) => resolve(code === 0))
        })

      let building = false
      let queued = false
      let debounceTimer: ReturnType<typeof setTimeout> | null = null
      let reloadTimer: ReturnType<typeof setTimeout> | null = null

      const fullReload = () => {
        if (reloadTimer) clearTimeout(reloadTimer)
        reloadTimer = setTimeout(() => {
          reloadTimer = null
          server.ws.send({ type: 'full-reload' })
        }, 250)
      }

      const buildAndReload = async (reload = true) => {
        if (building) {
          queued = true
          return
        }
        building = true
        const ok = await runBuild()
        building = false
        if (ok) {
          if (reload) fullReload()
        } else {
          server.config.logger.error(
            'wasm build failed — "btcfire-wasm" keeps serving the previous build',
          )
        }
        if (queued) {
          queued = false
          void buildAndReload()
        }
      }

      const scheduleBuild = () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          debounceTimer = null
          void buildAndReload()
        }, 300)
      }

      void buildAndReload(false)

      const sources = [
        path.join(wasmDir, 'src'),
        path.join(wasmDir, 'Cargo.toml'),
        path.join(wasmDir, 'Cargo.lock'),
      ]
      const watchers: fs.FSWatcher[] = []
      for (const target of sources) {
        if (!fs.existsSync(target)) continue
        watchers.push(
          fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, () => {
            scheduleBuild()
          }),
        )
      }

      // Watch the wasm dir itself so manual rebuilds (`npm run build:wasm` in
      // another terminal) also reload. The parent watch survives the pkg swap,
      // unlike a watch attached directly to the pkg directory.
      watchers.push(
        fs.watch(wasmDir, (_event, filename) => {
          if (filename === 'pkg' || filename === 'pkg.old') fullReload()
        }),
      )

      server.httpServer?.once('close', () => {
        for (const watcher of watchers) watcher.close()
        if (debounceTimer) clearTimeout(debounceTimer)
        if (reloadTimer) clearTimeout(reloadTimer)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), wasm(), wasmDevWatcher()],
  optimizeDeps: {
    exclude: ['btcfire-wasm'],
  },
  server: {
    host: true,
    fs: {
      allow: ['.', '../wasm/pkg'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    mainFields: ['browser', 'module', 'jsnext:main', 'jsnext', 'main'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
