import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.unit.test.ts', '**/*.infra.test.ts'],
    setupFiles: './tests/jest/setup.helper.test.ts',
    globals: true,
    root: './',
    watch: true,
  },
});
