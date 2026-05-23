import * as esbuild from "esbuild";
import * as fs from "fs";
import { outDir } from "./static.ts";

export const ENTRY = "front/main.ts";

export function getBuildOptions(isWatch: boolean): esbuild.BuildOptions {
    return {
        entryPoints: [ENTRY],
        bundle: true,
        outdir: outDir,
        format: "esm",
        platform: "browser",
        target: ["es2020"],
        sourcemap: isWatch ? "inline" : false,
        minify: !isWatch,
        loader: {
            ".png":   "file",
            ".jpg":   "file",
            ".jpeg":  "file",
            ".gif":   "file",
            ".svg":   "file",
            ".woff":  "file",
            ".woff2": "file",
            ".ttf":   "file",
            ".eot":   "file",
            ".ico":   "file",
            ".css":   "css",
        },
        assetNames: "assets/[name]-[hash]",
        chunkNames: "assets/[name]-[hash]",
    };
}

export async function runBuild(options: esbuild.BuildOptions) {
    fs.rmSync(outDir, { recursive: true, force: true });

    const result = await esbuild.build(options);

    if (result.errors.length > 0) {
        console.error("[esbuild] Build failed:", result.errors);
        process.exit(1);
    }

    console.log("[esbuild] Done.");
}