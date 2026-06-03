import { execa } from "execa";

const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function prefix(color: string, name: string) {
    return (line: string) => {
        if (!line) return;
        process.stdout.write(`${color}[${name}]${RESET} ${line}\n`);
    };
}

function run(name: string, color: string, cmd: string, args: string[]) {
    const p = execa(cmd, args, {
        stdio: "pipe",
        env: process.env,
    });

    const log = prefix(color, name);

    p.stdout?.on("data", (d) =>
        d.toString().split("\n").forEach(log)
    );

    p.stderr?.on("data", (d) =>
        d.toString().split("\n").forEach(log)
    );

    p.catch(() => {});

    return p;
}

const front = run(
    "front",
    CYAN,
    "tsx",
    ["scripts/esbuild.ts", "--watch"]
);

const back = run(
    "back",
    YELLOW,
    "tsx",
    ["watch", "--env-file=.env", "back/server.ts"]
);

process.on("SIGINT", async () => {
    front.kill();
    back.kill();
    process.exit(0);
});