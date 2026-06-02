import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Chrome Extension build config:
// Content scripts and service workers must be self-contained IIFE bundles.
// We build them as separate Vite builds to avoid multi-entry IIFE conflicts.

export default defineConfig(({ mode }) => {
  const configs: Record<string, () => ReturnType<typeof defineConfig>> = {
    content: () => ({
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: resolve(__dirname, 'src/content/overlay.tsx'),
          output: {
            entryFileNames: 'content/overlay.js',
            format: 'iife',
            inlineDynamicImports: true,
          },
        },
        cssCodeSplit: false,
      },
    }),
    keyblock: () => ({
      plugins: [],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, 'src/content/keyblock.ts'),
          output: {
            entryFileNames: 'content/keyblock.js',
            format: 'iife',
            inlineDynamicImports: true,
          },
        },
      },
    }),
    background: () => ({
      plugins: [],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(__dirname, 'src/background/service-worker.ts'),
          output: {
            entryFileNames: 'background/service-worker.js',
            format: 'iife',
            inlineDynamicImports: true,
          },
        },
      },
    }),
  }

  if (mode === 'background') return configs.background()
  if (mode === 'keyblock') return configs.keyblock()
  return configs.content()
})
