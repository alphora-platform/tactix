/// <reference types='vitest' />
import { defineConfig, type PluginOption } from 'vite';
import path from 'path';

const isNxGraphCreation = () =>
  typeof globalThis === 'object' &&
  'NX_GRAPH_CREATION' in globalThis &&
  Boolean((globalThis as typeof globalThis & { NX_GRAPH_CREATION?: boolean }).NX_GRAPH_CREATION);

async function loadPlugins(): Promise<PluginOption[]> {
  if (isNxGraphCreation()) {
    return [];
  }

  const [{ default: react }, { TanStackRouterVite }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'),
    import('@tanstack/router-plugin/vite'),
    import('@tailwindcss/vite'),
  ]);

  return [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ];
}

export default defineConfig(async () => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  plugins: await loadPlugins(),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
  test: {
    name: '@org/frontend',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
