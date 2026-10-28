import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Carrega o .env local (TEST_DATABASE_URL). No CI as variáveis já vêm do ambiente.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/support/prepararBanco.ts'],
  },
});
