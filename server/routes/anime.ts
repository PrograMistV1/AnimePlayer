import type {Request, Response} from "express";
import {Router} from "express";
import {createParser} from "@aerosstube/anime-parser-kodik-ts";
import {ShikimoriParser} from "../shikimori-parser.js";

const router = Router();
const parser = await createParser();
const shikimoriParser = new ShikimoriParser();

router.get("/search", search);
router.get("/info", info);
router.get("/link", link);
router.get("/poster", poster);

async function search(req: Request, res: Response) {
    const uncodeTitle = req.query.title as string | undefined;
    if (!uncodeTitle) {
        return res.json({error: "SearchNotFound", errorMessage: "По запросу ничего не найдено",});
    }
    const title = decodeURIComponent(uncodeTitle);
    try {
        const results = await shikimoriParser.search(title);
        res.json({response: results});
    } catch (error) {
        res.json({response: error});
    }
}

async function info(req: Request, res: Response) {
    const shikimoriId = req.query.shikimori_id as string | number | undefined;
    if (!shikimoriId) {
        return res.status(400).json({error: "MissingParams"});
    }
    try {
        const info = await parser.getInfo(shikimoriId, "shikimori");
        res.json({response: info,});
    } catch (error) {
        const err = error as Error;
        if (err.name === "NoResults") {
            res.json({response: {error: "Not found in Kodik"}});
        } else {
            res.status(500).json({error: err.name, errorMessage: err.message});
        }
    }
}

async function link(req: Request, res: Response) {
    const shikimoriId = req.query.shikimori_id as string | number | undefined;
    const seriaNum = req.query.seria_num as string | undefined;
    const translationId = req.query.translation_id as string | number | undefined;
    if (!shikimoriId || !seriaNum || !translationId) {
        return res.status(400).json({error: "MissingParams"});
    }

    try {
        const [link, quality] = await parser.getLink(shikimoriId, "shikimori", Number(seriaNum), translationId,);
        res.json({link: link, maxQuality: quality,});
    } catch (error) {
        const err = error as Error;
        return res.json({error: "GetLinkError", errorMessage: err.message,});
    }
}

async function poster(req: Request, res: Response) {
    try {
        const shikimoriId = req.query.shikimori_id as string | number | undefined;
        if (!shikimoriId) {
            return res.status(400).json({error: "MissingParams"});
        }
        const posterUrl = await shikimoriParser.getPoster(shikimoriId);
        res.json({posterUrl: posterUrl,});
    } catch (error) {
        const err = error as Error;
        res.json({error: "GetPosterError", errorMessage: err.message});
    }
}

export default router;