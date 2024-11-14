import { defineConfig } from 'vite'
export default defineConfig({
    base: "https://dengcheke.github.io/ray-tracing-typescript/",
    build: {
        outDir: 'docs',
    },
    worker: {
        format: "es"
    },
    server: {
        host: '0.0.0.0'
    }
});