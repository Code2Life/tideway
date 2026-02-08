import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    ssr: 'src/server.ts',
  },
  ssr: {
    target: 'node',
    noExternal: true,
  },
})
