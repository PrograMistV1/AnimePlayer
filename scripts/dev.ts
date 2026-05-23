import * as esbuild from "esbuild";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import {copyStatic, outDir, publicDir} from "./static.ts";

const DEV_PORT = 5173;
const LIVERELOAD_SCRIPT = `<script>
  (function() {
    const es = new EventSource("/__livereload");
    es.onmessage = () => location.reload();
    es.onerror = () => setTimeout(() => location.reload(), 1000);
  })();
</script>`;

function injectLivereload(html: string): string {
    return html.replace("</body>", `${LIVERELOAD_SCRIPT}</body>`);
}

function makeLivereloadPlugin(notify: () => void): esbuild.Plugin {
    return {
        name: "livereload",
        setup(build) {
            build.onEnd((result) => {
                if (result.errors.length === 0) {
                    console.log("[esbuild] Rebuilt.");
                    setTimeout(notify, 100);
                }
            });
        },
    };
}

function startProxy(esbuildPort: number, notify: () => void) {
    const clients = new Set<http.ServerResponse>();

    function notifyClients() {
        for (const client of clients) {
            client.write("data: reload\n\n");
        }
        notify();
    }

    http.createServer((req, res) => {
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
        const proxyOptions: http.RequestOptions = {
            hostname: isApi ? "localhost" : "127.0.0.1",
            port: isApi ? 3000 : esbuildPort,
            path: req.url,
            method: req.method,
            headers: req.headers,
        };

        const proxy = http.request(proxyOptions, (proxyRes) => {
            const isHtml = proxyRes.headers["content-type"]?.includes("text/html");

            if (!isApi && proxyRes.statusCode === 404) {
                const indexPath = path.resolve(outDir, "index.html");
                if (fs.existsSync(indexPath)) {
                    let html = fs.readFileSync(indexPath, "utf-8");
                    html = injectLivereload(html);
                    res.writeHead(200, {"Content-Type": "text/html"});
                    res.end(html);
                    return;
                }
            }

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
        console.log(`[esbuild] Dev server running at http://localhost:${DEV_PORT}`);
    });

    return {notifyClients};
}

export async function runDev(buildOptions: esbuild.BuildOptions) {
    let notifyRef: (() => void) | null = null;

    const plugin = makeLivereloadPlugin(() => notifyRef?.());

    const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [plugin],
    });

    await ctx.watch();

    const {port: esbuildPort} = await ctx.serve({
        servedir: outDir,
        host: "0.0.0.0",
    });

    const {notifyClients} = startProxy(esbuildPort, () => {
    });
    notifyRef = notifyClients;

    copyStatic();

    const watchTargets = ["index.html", publicDir].filter((t) => fs.existsSync(t));
    for (const target of watchTargets) {
        fs.watch(target, {recursive: true}, () => {
            copyStatic();
            notifyClients();
        });
    }
}