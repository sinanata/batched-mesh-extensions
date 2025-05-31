import { resolve } from 'path';
import { defineConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? false : 'public',
  build: {
    sourcemap: true,
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.webgpu.ts'),
      fileName: 'build/webgpu',
      formats: ['es', 'cjs']
    }
  },
  plugins: [
    externalizeDeps()
  ]
}));
