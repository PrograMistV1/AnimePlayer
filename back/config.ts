import path from "path";
import {fileURLToPath} from "url";
import {existsSync} from "fs";
import {writeFile} from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");

export const DATA_PATH = path.join(ROOT, "data.json");
export const PORT = Number(process.env.PORT) || 3000;
export const LOGS_PATH = path.join(ROOT, "logs");

if (!existsSync(DATA_PATH)) {
    await writeFile(DATA_PATH, JSON.stringify({
        searchMethod: "shikimoriParser", continueWatching: []
    }, null, 4));
    console.log("data.json создан");
}