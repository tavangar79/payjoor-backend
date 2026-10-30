import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    hookTimeout: 30_000,
    testTimeout: 15_000,
    // Fake values so src/config/env.ts parses; no test talks to real services.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'fatal',
      PUBLIC_BASE_URL: 'http://localhost:3000',
      MONGODB_URI: 'mongodb://localhost:27017/pagesanj-test',
      REDIS_URL: 'redis://localhost:6379',
      BOXAPI_INSTAGRAM_TOKEN: 'test-boxapi-token',
      SESSION_SECRET: 's'.repeat(32),
      DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
      // One mongod binary cache, whether tests run from the repo root or from backend/.
      MONGOMS_DOWNLOAD_DIR: fileURLToPath(new URL('../node_modules/.cache/mongodb-memory-server', import.meta.url)),
    },
  },
});
