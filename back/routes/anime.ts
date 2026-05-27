import type {Request, Response} from "express";
import {Router} from "express";
import {createParser} from "@aerosstube/anime-parser-kodik-ts";
import {ShikimoriParser} from "../shikimori-parser.js";
import type {InfoRequest, LinkRequest} from "../types.ts";

const router = Router();
const parser = await createParser();
const shikimoriParser = new ShikimoriParser();

router.get("/search", search);
router.get("/info", info);
router.get("/link", link);

async function search(req: Request, res: Response): Promise<void> {
    const uncodeTitle = req.query.title as string | undefined;
    if (!uncodeTitle) {
        res.json({error: "SearchNotFound", errorMessage: "По запросу ничего не найдено"});
        return;
    }
    const title = decodeURIComponent(uncodeTitle);
    try {
        const results = await shikimoriParser.search(title);
        res.json({response: results});
    } catch (error) {
        res.json({response: error});
    }
}

async function info(req: Request, res: Response): Promise<void> {
    const data = req.query as unknown as InfoRequest;
    const {shikimoriId} = data;
    if (!shikimoriId) {
        res.status(400).json({error: "MissingParams"});
        return;
    }
    try {
        const [kodikInfo, shikimoriInfo] = await Promise.allSettled([
            parser.getInfo(shikimoriId, "shikimori"),
            shikimoriParser.getInfo(shikimoriId)
        ]);

        res.json({
            response: {
                kodikInfo: kodikInfo.status === "fulfilled" ? kodikInfo.value : null,
                shikimoriInfo: shikimoriInfo.status === "fulfilled" ? shikimoriInfo.value : null,
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({error: err.name, errorMessage: err.message});
    }
}

async function link(req: Request, res: Response): Promise<void> {
    const data = req.query as unknown as LinkRequest;
    const {shikimoriId, seriaNum, translationId} = data;
    if (!shikimoriId || !seriaNum || !translationId) {
        res.status(400).json({error: "MissingParams"});
        return;
    }

    try {
        const [link] = await parser.getLink(shikimoriId, "shikimori", Number(seriaNum), translationId);
        const dirRes = await fetch(`https:${link}`);
        const html = await dirRes.text();

        const qualities = [...html.matchAll(/href="[^"]*\/(\d+)\.mp4"/g)]
            .map(m => m[1])
            .filter((q): q is string => q !== undefined)
            .map(q => parseInt(q, 10));

        res.json({link, qualities});
    } catch (error) {
        const err = error as Error;
        res.json({error: "GetLinkError", errorMessage: err.message});
    }
}

export default router;