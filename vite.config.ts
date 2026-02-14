import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/core/**/*.ts'],
            exclude: ['src/core/__tests__/**'],
        },
    },
} as any);
