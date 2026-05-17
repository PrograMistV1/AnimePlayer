import express from "express";
import path from "path";
import {fileURLToPath} from "url";
import {readFile, rename, writeFile} from "fs/promises";
import {createParser} from "@aerosstube/anime-parser-kodik-ts";
import {ShikimoriParser} from "./shikimori-parser.js";
import {randomUUID} from "crypto";
import {existsSync} from "fs";
import type {AnimeData} from "./types.js";

const parser = await createParser();
const shikimoriParser = new ShikimoriParser();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, "data.json");
if (!existsSync(DATA_PATH)) {
    await writeFile(DATA_PATH, JSON.stringify({
        searchMethod: "shikimoriParser", continueWatching: []
    }, null, 4));
    console.log("data.json создан");
}

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, "../public")));


app.route("/api/data")
    .get(async (_req, res) => {
        try {
            const readData = await readFile(DATA_PATH, "utf8");
            const data: AnimeData = JSON.parse(readData);
            console.log(data);
            return res.json(data);
        } catch (error) {
            const err = error as Error;
            return res.json({
                error: "GetDataError", errorMessage: err.message,
            });
        }
    })
    .post(async (req, res) => {
        const body = req.body as AnimeData;
        if (!body || Object.keys(body).length === 0) {
            return res.status(400).json({error: "EmptyBody"});
        }

        const tmpPath = path.join(__dirname, `data.${randomUUID()}.tmp`);
        try {
            await writeFile(tmpPath, JSON.stringify(body, null, 4));
            await rename(tmpPath, DATA_PATH);

            res.status(200).json({
                success: true, message: "Данные обновлены",
            });
        } catch (error) {
            console.log(error);
            const err = error as Error;
            res.status(500).json({
                error: "UpdateDataError", errorMessage: err.message,
            });
        }
    });


app.get("/api/anime/search", async (req, res) => {
    const uncodeTitle = req.query.title as string | undefined;
    if (!uncodeTitle) {
        return res.json({
            error: "SearchNotFound", errorMessage: "По запросу ничего не найдено",
        });
    }
    const title = decodeURIComponent(uncodeTitle);

    try {
        // const results = await parser.search(  //Поиск через kodik парсер (НЕ РАБОТАЕТ)
        //     title,
        //     100,
        //     true,
        //     null,
        //     false,
        //     true
        // );
        const results = await shikimoriParser.search(title);
        res.json({
            response: results,
        });
    } catch (error) {
        res.json({
            response: error,
        });
    }
});

app.get("/api/anime/info", async (req, res) => {
    const shikimoriId = req.query.shikimori_id as string | number | undefined;
    if (!shikimoriId) {
        return res.status(400).json({error: "MissingParams"});
    }

    try {
        const info = await parser.getInfo(shikimoriId, "shikimori");
        res.json({
            response: info,
        });
    } catch (error) {
        const err = error as Error;
        if (err.name === "NoResults") {
            res.json({
                response: {error: "Not found in Kodik"},
            });
        } else {
            res.status(500).json({error: err.name, errorMessage: err.message});
        }
    }
});

app.get("/api/anime/link", async (req, res) => {
    const shikimoriId = req.query.shikimori_id as string | number | undefined;
    const seriaNum = req.query.seria_num as string | undefined;
    const translationId = req.query.translation_id as string | number | undefined;
    if (!shikimoriId || !seriaNum || !translationId) {
        return res.status(400).json({error: "MissingParams"});
    }

    try {
        const [link, quality] = await parser.getLink(shikimoriId, "shikimori", Number(seriaNum), translationId,);
        res.json({
            link: link, maxQuality: quality,
        });
    } catch (error) {
        const err = error as Error;
        return res.json({
            error: "GetLinkError", errorMessage: err.message,
        });
    }
});

app.get("/api/anime/poster", async (req, res) => {
    try {
        const shikimoriId = req.query.shikimori_id as string | number | undefined;
        if (!shikimoriId) {
            return res.status(400).json({error: "MissingParams"});
        }
        const posterUrl = await shikimoriParser.getPoster(shikimoriId);
        res.json({
            posterUrl: posterUrl,
        });
    } catch (error) {
        const err = error as Error;
        res.json({error: "GetPosterError", errorMessage: err.message});
    }
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});