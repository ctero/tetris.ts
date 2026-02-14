import { defineConfig } from 'vite';

export default defineConfig({
    base: '/tetris.ts/',
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
