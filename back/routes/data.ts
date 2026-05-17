import {type Request, type Response, Router} from "express";
import {readFile, rename, writeFile} from "fs/promises";
import {randomUUID} from "crypto";
import path from "path";
import type {AnimeData} from "../types.js";
import {__dirname, DATA_PATH} from "../config.js";

const router = Router();

router.route("/")
    .get(getData)
    .post(postData);

async function getData(_req: Request, res: Response) {
    try {
        const readData = await readFile(DATA_PATH, "utf8");
        const data: AnimeData = JSON.parse(readData);
        return res.json(data);
    } catch (error) {
        console.error("GetDataError:", error);
        const err = error as Error;
        return res.json({error: "GetDataError", errorMessage: err.message,});
    }
}

async function postData(req: Request, res: Response) {
    const body = req.body as AnimeData;
    if (!body || Object.keys(body).length === 0) {
        return res.status(400).json({error: "EmptyBody"});
    }

    const tmpPath = path.join(__dirname, `data.${randomUUID()}.tmp`);
    try {
        await writeFile(tmpPath, JSON.stringify(body, null, 4));
        await rename(tmpPath, DATA_PATH);

        res.status(200).json({success: true, message: "Данные обновлены",});
    } catch (error) {
        console.error("UpdateDataError:", error);
        const err = error as Error;
        res.status(500).json({error: "UpdateDataError", errorMessage: err.message,});
    }
}

export default router;