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
      const runBuild = () =>
        new Promise<void>((resolve) => {
          const build = spawn('wasm-pack', ['build', '--target', 'web'], {
            cwd: wasmDir,
            stdio: 'inherit',
          })
          build.on('exit', () => resolve())
        })

      await runBuild()

      const watcher = spawn(
        'cargo',
        ['watch', '-s', 'wasm-pack build --target web'],
        { cwd: wasmDir, stdio: 'inherit' },
      )
      watcher.on('error', (err) =>
        server.config.logger.error(`wasm watcher: ${err.message}`),
      )
      server.httpServer?.once('close', () => watcher.kill())

      fs.watch(path.join(wasmDir, 'pkg'), { recursive: true }, () => {
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), wasm(), wasmDevWatcher()],
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
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
