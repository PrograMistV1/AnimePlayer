import * as fs from "fs";
import * as path from "path";

const publicDir = "front/public";
const outDir = "dist/public";

export function copyStatic() {
    fs.mkdirSync(outDir, {recursive: true});

    if (fs.existsSync("index.html")) {
        fs.copyFileSync("index.html", path.join(outDir, "index.html"));
    }

    if (fs.existsSync(publicDir)) {
        fs.cpSync(publicDir, outDir, {recursive: true, force: true});
    }
}

export {publicDir, outDir};