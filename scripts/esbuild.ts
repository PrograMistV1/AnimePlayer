import * as esbuild from "esbuild";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

const isWatch = process.argv.includes("--watch");

const staticDir = "static";
const outDir = "dist/public";

// Copy index.html + static/ assets into outDir
function copyStatic() {
    fs.mkdirSync(outDir, { recursive: true });

    // index.html лежит в корне проекта
    if (fs.existsSync("index.html")) {
        fs.copyFileSync("index.html", path.join(outDir, "index.html"));
        console.log(`[esbuild] Copied index.html → ${outDir}/index.html`);
    }

    // static/ → css, fonts, images и т.д.
    if (fs.existsSync(staticDir)) {
        fs.cpSync(staticDir, outDir, { recursive: true, force: true });
        console.log(`[esbuild] Copied ${staticDir}/ → ${outDir}/`);
    }
}

function findEntries(): string[] {
    const candidates = [
        "index.ts", "index.js",
        "main.ts",  "main.js",
        "src/index.ts", "src/index.js",
        "src/main.ts",  "src/main.js",
        "front/index.ts", "front/index.js",
        "front/main.ts",  "front/main.js",
    ];
    return candidates.filter((f) => fs.existsSync(f));
}

const entries = findEntries();

if (entries.length === 0) {
    console.error("[esbuild] No entry points found. Edit findEntries() in scripts/esbuild.ts.");
    process.exit(1);
}

console.log("[esbuild] Entry points:", entries);

const buildOptions: esbuild.BuildOptions = {
    entryPoints: entries,
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

if (isWatch) {
    const ctx = await esbuild.context({ ...buildOptions });

    await ctx.watch();
    console.log("[esbuild] Watching for changes...");

    // esbuild internal serve на 127.0.0.1 с автовыбором порта
    const { port: esbuildPort } = await ctx.serve({
        servedir: outDir,
        host: "127.0.0.1",
    });

    const DEV_PORT = 5173;
    const BACKEND = "http://localhost:3000";

    // Прокси: /api → Express, остальное → esbuild + SPA fallback
    http.createServer((req, res) => {
        const isApi = req.url?.startsWith("/api");
        const targetHost = isApi ? "localhost" : "127.0.0.1";
        const targetPort = isApi ? 3000 : esbuildPort;

        const options: http.RequestOptions = {
            hostname: targetHost,
            port: targetPort,
            path: req.url,
            method: req.method,
            headers: req.headers,
        };

        const proxy = http.request(options, (proxyRes) => {
            // SPA fallback: esbuild вернул 404 → отдаём index.html
            if (!isApi && proxyRes.statusCode === 404) {
                const indexPath = path.resolve(outDir, "index.html");
                if (fs.existsSync(indexPath)) {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    fs.createReadStream(indexPath).pipe(res);
                    return;
                }
            }
            res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxy.on("error", (err) => {
            console.error("[proxy] Error:", err.message);
            res.writeHead(502);
            res.end("Bad Gateway");
        });

        req.pipe(proxy);
    }).listen(DEV_PORT, "0.0.0.0", () => {
        console.log(`[esbuild] Dev server:  http://localhost:${DEV_PORT}`);
        console.log(`[esbuild] API proxy:   /api → ${BACKEND}`);
    });

    copyStatic();
} else {
    // Production build
    fs.rmSync(outDir, { recursive: true, force: true });
    copyStatic();

    const result = await esbuild.build(buildOptions);

    if (result.errors.length > 0) {
        console.error("[esbuild] Build failed:", result.errors);
        process.exit(1);
    }

    console.log(`[esbuild] Build complete → ${outDir}/`);
}