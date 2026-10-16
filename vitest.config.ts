/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ascii-motion/core': path.resolve(__dirname, './packages/core/src'),
      '@ascii-motion/premium/remix': path.resolve(__dirname, './packages/premium/src/community/hooks/useRemix.ts'),
      '@ascii-motion/premium': path.resolve(__dirname, './packages/premium/src'),
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
