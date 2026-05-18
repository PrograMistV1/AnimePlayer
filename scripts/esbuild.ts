import * as esbuild from "esbuild";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

const isWatch = process.argv.includes("--watch");

const staticDir = "static";
const outDir = "dist/public";

function copyStatic() {
    fs.mkdirSync(outDir, { recursive: true });

    if (fs.existsSync("index.html")) {
        fs.copyFileSync("index.html", path.join(outDir, "index.html"));
        console.log(`[esbuild] Copied index.html → ${outDir}/index.html`);
    }

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
    // SSE клиенты для livereload
    const clients = new Set<http.ServerResponse>();

    function notifyClients() {
        for (const client of clients) {
            client.write("data: reload\n\n");
        }
    }

    // esbuild плагин: уведомляет браузер после каждой пересборки
    const livereloadPlugin: esbuild.Plugin = {
        name: "livereload",
        setup(build) {
            build.onEnd((result) => {
                if (result.errors.length === 0) {
                    console.log("[esbuild] Rebuilt, reloading browser...");
                    notifyClients();
                }
            });
        },
    };

    const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [livereloadPlugin],
    });

    await ctx.watch();
    console.log("[esbuild] Watching for changes...");

    const { port: esbuildPort } = await ctx.serve({
        servedir: outDir,
        host: "127.0.0.1",
    });

    const DEV_PORT = 5173;
    const BACKEND = "http://localhost:3000";

    // Скрипт livereload, инжектируемый в index.html
    const LIVERELOAD_SCRIPT = `
<script>
  (function() {
    const es = new EventSource("/__livereload");
    es.onmessage = () => location.reload();
    es.onerror = () => setTimeout(() => location.reload(), 1000);
  })();
</script>`;

    function injectLivereload(html: string): string {
        return html.replace("</body>", `${LIVERELOAD_SCRIPT}</body>`);
    }

    http.createServer((req, res) => {
        // SSE endpoint для livereload
        if (req.url === "/__livereload") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            });
            res.write(": connected\n\n");
            clients.add(res);
            req.on("close", () => clients.delete(res));
            return;
        }

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
            const isHtml = proxyRes.headers["content-type"]?.includes("text/html");

            // SPA fallback: esbuild вернул 404 → отдаём index.html
            if (!isApi && proxyRes.statusCode === 404) {
                const indexPath = path.resolve(outDir, "index.html");
                if (fs.existsSync(indexPath)) {
                    let html = fs.readFileSync(indexPath, "utf-8");
                    html = injectLivereload(html);
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(html);
                    return;
                }
            }

            // Инжектируем livereload в HTML-ответы
            if (isHtml && !isApi) {
                const chunks: Buffer[] = [];
                proxyRes.on("data", (chunk) => chunks.push(chunk));
                proxyRes.on("end", () => {
                    let html = Buffer.concat(chunks).toString("utf-8");
                    html = injectLivereload(html);
                    res.writeHead(proxyRes.statusCode ?? 200, {
                        ...proxyRes.headers,
                        "content-length": Buffer.byteLength(html),
                    });
                    res.end(html);
                });
                return;
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
        console.log(`[esbuild] Livereload:  активен`);
    });

    copyStatic();

    // Следим за index.html и static/ — esbuild их не видит
    const watchTargets = ["index.html", staticDir].filter((t) => fs.existsSync(t));
    for (const target of watchTargets) {
        fs.watch(target, { recursive: true }, (_event, filename) => {
            console.log(`[esbuild] Changed: ${filename ?? target}, reloading...`);
            copyStatic();
            notifyClients();
        });
    }
    console.log(`[esbuild] Watching also: ${watchTargets.join(", ")}`);
} else {
    fs.rmSync(outDir, { recursive: true, force: true });
    copyStatic();

    const result = await esbuild.build(buildOptions);

    if (result.errors.length > 0) {
        console.error("[esbuild] Build failed:", result.errors);
        process.exit(1);
    }

    console.log(`[esbuild] Build complete → ${outDir}/`);
}