import * as fs from "fs";
import {ENTRY, getBuildOptions, runBuild} from "./build.ts";
import {runDev} from "./dev.ts";

const isWatch = process.argv.includes("--watch");

if (!fs.existsSync(ENTRY)) {
    console.error(`[esbuild] Entry point not found: ${ENTRY}`);
    process.exit(1);
}

const buildOptions = getBuildOptions(isWatch);

if (isWatch) {
    await runDev(buildOptions);
} else {
    await runBuild(buildOptions);
}