import {type Request, type Response, Router} from "express";
import {readFile, rename, writeFile} from "fs/promises";
import {randomUUID} from "crypto";
import path from "path";
import type {AnimeData} from "../types.js";
import {DATA_PATH} from "../config.js";
import {copyFile, unlink} from "node:fs/promises";

const router = Router();

router.route("/")
    .get(getData)
    .post(postData);

async function getData(_req: Request, res: Response) {
    try {
        const readData = await readFile(DATA_PATH, "utf8");
        const data: AnimeData = JSON.parse(readData);
        return res.json({data});
    } catch (error) {
        console.error("GET_DATA_ERROR: ", error);
        const err = error as Error;
        return res.status(500).json({code: "GET_DATA_ERROR", message: err.message});
    }
}

async function postData(req: Request, res: Response) {
    const body = req.body as AnimeData;
    if (!body || Object.keys(body).length === 0) {
        return res.status(400).json({code: "EMPTY_BODY", message: "Request body is empty"});
    }

    const tmpPath = path.join(path.dirname(DATA_PATH), `data.${randomUUID()}.tmp`);
    try {
        await writeFile(tmpPath, JSON.stringify(body, null, 4));
        await safeRename(tmpPath, DATA_PATH);
        res.status(200).json({success: true, message: "Данные обновлены"});
    } catch (error) {
        try {
            await unlink(tmpPath);
        } catch {
        }
        console.error("UPDATE_DATA_ERROR: ", error);
        const err = error as Error;
        res.status(500).json({code: "UPDATE_DATA_ERROR", message: err.message});
    }
}

async function safeRename(src: string, dest: string): Promise<void> {
    try {
        await rename(src, dest);
    } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === "EPERM" || err.code === "EACCES") {
            await copyFile(src, dest);
            await unlink(src);
        } else {
            throw err;
        }
    }
}

export default router;