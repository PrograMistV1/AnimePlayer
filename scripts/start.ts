import { spawn, ChildProcess } from "child_process";
import * as readline from "readline";

const RESET  = "\x1b[0m";
const CYAN   = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";

const CLEAR_PATTERNS = ["\x1bc", "\x1B[2J\x1B[0f", "\x1B[2J\x1B[H", "\x1Bc"];

function prefix(color: string, name: string) {
    return `${color}[${name}]${RESET} `;
}

function spawnPrefixed(color: string, name: string, cmd: string, args: string[], env?: NodeJS.ProcessEnv): ChildProcess {
    const pre = prefix(color, name);

    const child = spawn(cmd, args, {
        stdio: ["inherit", "pipe", "pipe"],
        env: { ...process.env, ...env },
    });

    const patchLine = (line: string) => {
        if (CLEAR_PATTERNS.some(p => line.includes(p))) return;
        const cleaned = line.replace(/^\d{2}:\d{2}:\d{2} /, "");
        process.stdout.write(pre + cleaned + "\n");
    };

    readline.createInterface({ input: child.stdout! }).on("line", patchLine);
    readline.createInterface({ input: child.stderr! }).on("line", patchLine);

    child.on("exit", (code) => {
        if (code !== 0 && code !== null) {
            process.stderr.write(`${pre}${RED}exited with code ${code}${RESET}\n`);
            process.exit(code);
        }
    });

    return child;
}

const front = spawnPrefixed(CYAN,   "front", "tsx", ["scripts/esbuild.ts", "--watch"]);
const back  = spawnPrefixed(YELLOW, "back",  "tsx", ["watch", "--env-file=.env", "back/server.ts"]);

process.on("SIGINT", () => {
    front.kill();
    back.kill();
    process.exit(0);
});