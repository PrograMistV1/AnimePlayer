import * as fs from "fs";
import * as path from "path";

const publicDir = "front/public";
export const outDir = "dist/assets";
export const distDir = "dist";

export function copyStatic() {
    fs.mkdirSync(distDir, {recursive: true});
    fs.mkdirSync(outDir, {recursive: true});

    if (fs.existsSync("index.html")) {
        fs.copyFileSync("index.html", path.join(distDir, "index.html"));
    }

    const publicOut = path.join(distDir, "public");
    if (fs.existsSync(publicDir)) {
        fs.mkdirSync(publicOut, {recursive: true});
        fs.cpSync(publicDir, publicOut, {recursive: true, force: true});
    }
}

export {publicDir};