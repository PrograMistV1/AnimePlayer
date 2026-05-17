import { defineConfig } from "vite";

export default defineConfig({
    root: ".",
    publicDir: "static",
    build: {
        outDir: "dist/public",
    },
    server: {
        proxy: {
            "/api": "http://localhost:3000",
        },
    },
});