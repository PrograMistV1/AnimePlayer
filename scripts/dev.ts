import * as esbuild from "esbuild";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import chokidar from "chokidar";
import {copyStatic, distDir, outDir, publicDir} from "./static.ts";

const DEV_PORT = 5173;

const LIVERELOAD_SCRIPT = `
<script>
  (function() {
    const saved = sessionStorage.getItem('__dev_scroll');
    if (saved) {
      sessionStorage.removeItem('__dev_scroll');
      const { x, y } = JSON.parse(saved);
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.scrollTo(x, y), 100);
      });
    }

    const es = new EventSource("/__livereload");

    es.onmessage = (e) => {
      const data = JSON.parse(e.data || '{}');

      if (data.type === 'css') {
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
          const el = link;
          const url = new URL(el.href);
          url.searchParams.set('_t', Date.now().toString());
          el.href = url.toString();
        });
        return;
      }

      sessionStorage.setItem('__dev_scroll', JSON.stringify({
        x: window.scrollX,
        y: window.scrollY,
      }));
      location.reload();
    };

    es.onerror = () => setTimeout(() => location.reload(), 1000);
  })();
</script>
`;

function injectLivereload(html: string) {
    return html.replace("</body>", `${LIVERELOAD_SCRIPT}</body>`);
}

function makeLivereloadPlugin(notify: (type?: "css" | "full") => void): esbuild.Plugin {
    return {
        name: "livereload",
        setup(build) {
            build.onEnd((result) => {
                if (result.errors.length === 0) {
                    console.log("[esbuild] rebuilt");
                    setTimeout(() => notify("full"), 50);
                }
            });
        },
    };
}

function startProxy() {
    const clients = new Set<http.ServerResponse>();

    function notifyClients(type: "css" | "full" = "full") {
        for (const client of clients) {
            client.write(`data: ${JSON.stringify({type})}\n\n`);
        }
    }

    const server = http.createServer((req, res) => {
        if (!req.url) {
            res.writeHead(400);
            return res.end();
        }

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

        if (req.url.startsWith("/api")) {
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

        const rawPath = req.url.split("?")[0] ?? "/";
        const urlPath = rawPath === "/" ? "/index.html" : rawPath;

        const candidates = [
            path.join(outDir, urlPath),
            path.join(distDir, "public", urlPath),
            path.join(distDir, urlPath),
        ];

        let filePath: string | null = null;
        for (const candidate of candidates) {
            const resolved = path.resolve(candidate);
            if (!resolved.startsWith(path.resolve(distDir))) continue;
            if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
                filePath = resolved;
                break;
            }
        }

        if (!filePath) {
            const indexPath = path.join(distDir, "index.html");
            if (fs.existsSync(indexPath)) {
                filePath = indexPath;
            } else {
                res.writeHead(404);
                return res.end("Not found");
            }
        }

        const ext = path.extname(filePath);
        const contentType =
            ext === ".html" ? "text/html; charset=utf-8" :
                ext === ".css" ? "text/css" :
                    ext === ".js" ? "application/javascript" :
                        ext === ".json" ? "application/json" :
                            ext === ".svg" ? "image/svg+xml" :
                                ext === ".png" ? "image/png" :
                                    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
                                        ext === ".woff" ? "font/woff" :
                                            ext === ".woff2" ? "font/woff2" :
                                                "application/octet-stream";

        let content = fs.readFileSync(filePath);

        if (ext === ".html") {
            content = Buffer.from(injectLivereload(content.toString()));
        }

        const headers: Record<string, string> = {"Content-Type": contentType};
        if (ext === ".css") {
            headers["Cache-Control"] = "no-store";
        }

        res.writeHead(200, headers);
        res.end(content);
    });

    server.listen(DEV_PORT, "127.0.0.1", () => {
        console.log(`[dev] http://localhost:${DEV_PORT}`);
    });

    return {notifyClients};
}

export async function runDev(buildOptions: esbuild.BuildOptions) {
    const {notifyClients} = startProxy();

    const plugin = makeLivereloadPlugin((type = "full") => notifyClients(type));

    const ctx = await esbuild.context({
        ...buildOptions,
        plugins: [plugin],
    });

    await ctx.watch();

    copyStatic();

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
        notifyClients(filePath.endsWith(".css") ? "css" : "full");
    });

    const indexPath = path.join(process.cwd(), "index.html");
    if (fs.existsSync(indexPath)) {
        chokidar.watch(indexPath).on("change", () => {
            console.log("[html] changed");
            copyStatic();
            notifyClients("full");
        });
    }
}