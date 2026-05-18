import {appendFile, mkdir} from "fs/promises";
import {existsSync} from "fs";
import {LOGS_PATH} from "./config.js";

async function getLogPath(): Promise<string> {
    const date = new Date().toISOString().split("T")[0];
    return `${LOGS_PATH}/${date}.log`;
}

export async function log(message: string): Promise<void> {
    if (!existsSync(LOGS_PATH)) {
        await mkdir(LOGS_PATH, { recursive: true });
    }
    const now = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour12: false });
    const logPath = await getLogPath();
    await appendFile(logPath, `[${time}] ${message}\n`);
}