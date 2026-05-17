import {load} from "cheerio";
import type {AnimeInfo, SearchResult} from "./types.js";

export class ShikimoriParser {
    private readonly _dmn: string;
    private readonly headers: Record<string, string>;
    private queue: Promise<unknown>;
    private readonly delayMs: number;
    private readonly MAX_RETRIES = 5;

    constructor(mirror: string | null = null) {
        this._dmn = mirror || "shikimori.io";
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
        };
        this.queue = Promise.resolve();
        this.delayMs = 200;
    }

    async search(title: string): Promise<SearchResult[]> {
        const params = new URLSearchParams({
            search: title,
        });
        const response = await fetch(
            `https://${this._dmn}/animes/autocomplete/v2?${params}`,
            {
                method: "GET",
                headers: this.headers,
            },
        );
        //Обработка статусов ответа
        if (response.status === 429) {
            throw new Error(
                "Сервер вернул код 429 для обозначения что запросы выполняются слишком часто.",
            );
        } else if (response.status === 520) {
            throw new Error(
                "Сервер вернул статус ответа 520, что означает что он перегружен и не может ответить сразу.",
            );
        } else if (response.status !== 200) {
            throw new Error(
                `Сервер не вернул ожидаемый код 200. Код: "${response.status}"`,
            );
        }
        const data = await response.json();
        const htmlContent = data.content;

        try {
            const $ = load(htmlContent);

            const res: SearchResult[] = [];

            $("div.b-db_entry-variant-list_item").each((_index, element) => {
                const anime = $(element);

                //Проверяем, что это аниме
                if (anime.attr("data-type") !== "anime") return;

                const cData: Partial<SearchResult> = {};
                cData.link = anime.attr("data-url");
                cData.shikimori_id = anime.attr("data-id");

                //Постер
                const imageDiv = anime.find("div.image");
                if (imageDiv.length > 0) {
                    const img = imageDiv.find("picture img");
                    if (img.length > 0 && img.attr("srcset")) {
                        cData.poster = img.attr("srcset")!.split(" ")[0] ?? null;
                    } else {
                        cData.poster = null;
                    }
                } else {
                    cData.poster = null;
                }

                const info = anime.find("div.info");
                if (info.length === 0) return;

                //Названия
                const nameLink = info.find("div.name a");
                if (nameLink.length > 0) {
                    cData.original_title = nameLink.attr("title");
                    cData.title = nameLink.text().split("/")[0]?.trim();
                }

                //Информация о типе
                const lineDiv = info.find("div.line").first();
                if (lineDiv.length > 0) {
                    const keyDiv = lineDiv.find("div.key");
                    if (keyDiv.length > 0 && keyDiv.text().trim() === "Тип:") {
                        const valueDiv = lineDiv.find("div.value");
                        const typeTag = valueDiv.find("div.b-tag").first();
                        cData.type = typeTag.length > 0 ? typeTag.text().trim() : null;
                    } else {
                        cData.type = null;
                    }
                } else {
                    cData.type = null;
                }
                res.push(cData as SearchResult);
            });
            return res;
        } catch (e) {
            return [];
        }
    }

    async getInfo(shikimoriId: string | number, retryCount = 0): Promise<AnimeInfo> {
        let response: Response;
        try {
            response = await fetch(
                `https://${this._dmn}/animes/${shikimoriId}`,
                {method: "GET", headers: this.headers}
            );
        } catch (error) {
            throw error;
        }
        if (response.status === 429) {
            if (retryCount < this.MAX_RETRIES) {
                await this._sleep(this.delayMs * 2 + this.delayMs * retryCount);
                return this.getInfo(shikimoriId, retryCount + 1);
            }
            throw new Error("429");
        }

        const $ = load(await response.text());

        const res: AnimeInfo = {
            title: null,
            poster: null,
            type: null,
            episodes: null,
            status: null,
            genres: null,
            rating: 0,
            description: null,
        };

        res.title = ($("header.head h1").contents().get(0) as unknown as Text)?.nodeValue?.trim() ?? null;
        res.poster = $("div.b-db_entry-poster.b-image")
            .find('meta[itemprop="image"]')
            .attr("content") ?? null;

        $(".c-about .c-info-left .block .b-entry-info").find(".line-container")
            .each((_index, element) => {
                const key = $(element).find(".key").text().replace(":", "").trim();
                const value = $(element).find(".value");

                if (key == "Тип") res.type = value.text().trim();
                if (key == "Эпизоды") res.episodes = value.text().split(" / ");
                if (key == "Статус") res.status = value.children().first().attr("data-text") ?? null;
                if (key == "Жанры") {
                    res.genres = [];
                    value.find(".b-tag").each((_i, el) => {
                        const genreName = $(el).find(".genre-ru").text().trim();
                        if (genreName) res.genres!.push(genreName);
                    });
                }
            });
        res.rating = parseFloat($('meta[itemprop="ratingValue"]').attr("content") ?? "0");

        const blockDesc = $(".c-description .block .b-text_with_paragraphs");
        if (blockDesc.length === 0 || blockDesc.find(".b-nothing_here").length > 0) {
            res.description = null;
        } else {
            res.description = blockDesc
                .html()!
                .split(/<br\s*\/?>|<br\s*class="br"\s*\/?>/i)
                .map((p) => $(`<div>${p}</div>`).text().trim())
                .filter((p) => p.length > 0);
        }

        return res;
    }

    //Задержка запроса
    private _sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
