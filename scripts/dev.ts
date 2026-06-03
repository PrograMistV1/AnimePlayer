import * as esbuild from "esbuild";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import chokidar from "chokidar";
import { copyStatic, outDir, publicDir } from "./static.ts";

const DEV_PORT = 5173;

const LIVERELOAD_SCRIPT = `
<script>
  (function() {
    const es = new EventSource("/__livereload");
    es.onmessage = () => location.reload();
    es.onerror = () => setTimeout(() => location.reload(), 1000);
  })();
</script>
`;

function injectLivereload(html: string) {
    return html.replace("</body>", `${LIVERELOAD_SCRIPT}</body>`);
}

function makeLivereloadPlugin(notify: () => void): esbuild.Plugin {
    return {
        name: "livereload",
        setup(build) {
            build.onEnd((result) => {
                if (result.errors.length === 0) {
                    console.log("[esbuild] rebuilt");
                    setTimeout(notify, 50);
                }
            });
        },
    };
}

function startProxy(notify: () => void) {
    const clients = new Set<http.ServerResponse>();

    function notifyClients() {
        for (const client of clients) {
            client.write("data: reload\n\n");
        }
        notify();
    }

    const server = http.createServer((req, res) => {
        if (!req.url) {
            res.writeHead(400);
            return res.end();
        }

        // =====================
        // SSE
        // =====================
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
            req.on("error", () => clients.delete(res));
            return;
        }

        const isApi = req.url.startsWith("/api");

        // =====================
        // API proxy
        // =====================
        if (isApi) {
            const proxy = http.request(
                {
                    hostname: "127.0.0.1",
                    port: 3000,
                    path: req.url,
                    method: req.method,
                    headers: req.headers,
                },
                (proxyRes) => {
                    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
                    proxyRes.pipe(res);
                }
            );

            proxy.on("error", (err) => {
                console.error("[proxy api]", err.message);
                res.writeHead(502);
                res.end("Bad Gateway");
            });

            req.pipe(proxy);
            return;
        }

        // =====================
        // STATIC files
        // =====================
        let filePath = path.join(outDir, req.url === "/" ? "index.html" : req.url);

        if (!filePath.startsWith(outDir)) {
            res.writeHead(403);
            return res.end("Forbidden");
        }

        if (!fs.existsSync(filePath)) {
            filePath = path.join(outDir, "index.html");
        }

        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            return res.end("Not found");
        }

        let content = fs.readFileSync(filePath);

        const ext = path.extname(filePath);

        const contentType =
            ext === ".html"
                ? "text/html"
                : ext === ".css"
                    ? "text/css"
                    : ext === ".js"
                        ? "application/javascript"
                        : "application/octet-stream";

        if (ext === ".html") {
            content = Buffer.from(injectLivereload(content.toString()));
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    });

    server.listen(DEV_PORT, "127.0.0.1", () => {
        console.log(`[dev] http://localhost:${DEV_PORT}`);
    });

    return { notifyClients };
}

export async function runDev(buildOptions: esbuild.BuildOptions) {
    let notifyRef: (() => void) | null = null;

    const plugin = makeLivereloadPlugin(() => notifyRef?.());

    const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [plugin],
    });

    await ctx.watch();

    const { notifyClients } = startProxy(() => {});
    notifyRef = notifyClients;

    copyStatic();

    // =====================
    // STATIC WATCH (chokidar)
    // =====================
    const watcher = chokidar.watch(publicDir, {
        ignoreInitial: true,
        persistent: true,
    });

    watcher.on("all", (event, filePath) => {
        if (
            filePath.endsWith("~") ||
            filePath.includes(".swp") ||
            filePath.includes(".tmp")
        ) return;

        console.log("[static]", event, filePath);

        copyStatic();
        notifyClients();
    });

    // index.html отдельно
    const indexPath = path.join(process.cwd(), "index.html");

    if (fs.existsSync(indexPath)) {
        chokidar.watch(indexPath).on("change", () => {
            console.log("[html] changed");
            copyStatic();
            notifyClients();
        });
    }
}