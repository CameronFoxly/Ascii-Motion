/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Mirror vite.config.ts: use the stub when the private premium submodule is absent (e.g. CI).
const hasPremium = fs.existsSync(path.resolve(__dirname, './packages/premium/src/index.ts'));
const premiumStub = path.resolve(__dirname, './src/lib/premium-stub.ts');

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ascii-motion/core': path.resolve(__dirname, './packages/core/src'),
      '@ascii-motion/premium/remix': hasPremium
        ? path.resolve(__dirname, './packages/premium/src/community/hooks/useRemix.ts')
        : premiumStub,
      '@ascii-motion/premium': hasPremium ? path.resolve(__dirname, './packages/premium/src') : premiumStub,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'packages/**/node_modules'],
    setupFiles: [],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      include: [
        'src/types/timeline.ts',
        'src/types/easing.ts',
        'src/utils/sessionMigration.ts',
        'src/stores/timelineStore.ts',
        'src/stores/animationStoreAdapter.ts',
        'src/hooks/useTimelineHistory.ts',
      ],
      reporter: ['text', 'text-summary'],
    },
  },
});
