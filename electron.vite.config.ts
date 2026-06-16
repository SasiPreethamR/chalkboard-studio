import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      lib: { entry: resolve(__dirname, 'electron/main.ts') },
      rollupOptions: {
        external: ['electron'],
        output: { entryFileNames: 'index.js', format: 'es' }
      }
    }
  },
  preload: {
    build: {
      lib: { entry: resolve(__dirname, 'electron/preload.ts') },
      rollupOptions: {
        external: ['electron'],
        output: { entryFileNames: 'index.cjs', format: 'cjs' }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
