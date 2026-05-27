import type {Cheerio} from "cheerio";
import {load} from "cheerio";
import type {Element} from "domhandler";
import type {AnimeInfo, SearchResult} from "./types.js";

export class ShikimoriParser {
    private readonly _dmn: string;
    private readonly headers: Record<string, string>;
    private readonly delayMs: number;
    private readonly MAX_RETRIES = 5;

    constructor(mirror: string | null = null) {
        this._dmn = mirror || "shikimori.io";
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
        };
        this.delayMs = 200;
    }

    async search(title: string): Promise<SearchResult[]> {
        const params = new URLSearchParams({search: title});
        const response = await fetch(
            `https://${this._dmn}/animes/autocomplete/v2?${params}`,
            {method: "GET", headers: this.headers}
        );

        this.assertResponseOk(response);

        const {content: htmlContent} = await response.json();

        try {
            return this.parseSearchResults(htmlContent);
        } catch {
            return [];
        }
    }

    async getInfo(shikimoriId: string | number, retryCount = 0): Promise<AnimeInfo> {
        const response = await fetch(
            `https://${this._dmn}/animes/${shikimoriId}`,
            {method: "GET", headers: this.headers}
        );
        if (response.status === 429) {
            if (retryCount < this.MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, this.delayMs * 2 + this.delayMs * retryCount));
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

    private assertResponseOk(response: Response): void {
        const handlers: Record<number, string> = {
            429: "Запросы выполняются слишком часто.",
            520: "Сервер перегружен и не может ответить сразу.",
        };

        const message = handlers[response.status];
        if (message) throw new Error(`Сервер вернул код ${response.status}: ${message}`);

        if (response.status !== 200) {
            throw new Error(`Сервер не вернул ожидаемый код 200. Код: "${response.status}"`);
        }
    }

    private parseSearchResults(htmlContent: string): SearchResult[] {
        const $ = load(htmlContent);
        const results: SearchResult[] = [];

        $("div.b-db_entry-variant-list_item").each((_index, element) => {
            const result = this.parseSearchResultItem($(element));
            if (result) results.push(result);
        });

        return results;
    }

    private parseSearchResultItem(anime: Cheerio<Element>): SearchResult | null {
        if (anime.attr("data-type") !== "anime") return null;

        const info = anime.find("div.info");
        if (!info.length) return null;

        return {
            link: anime.attr("data-url"),
            shikimoriId: anime.attr("data-id"),
            poster: this.parsePoster(anime),
            ...this.parseTitles(info),
            type: this.parseType(info),
        } as SearchResult;
    }

    private parsePoster(anime: Cheerio<Element>): string | null {
        const img = anime.find("div.image picture img");
        const srcset = img.attr("srcset");
        return srcset ? srcset.split(" ")[0] ?? null : null;
    }

    private parseTitles(info: Cheerio<Element>): Pick<SearchResult, "title" | "original_title"> {
        const nameLink = info.find("div.name a");
        if (!nameLink.length) return {title: undefined, original_title: undefined};

        return {
            original_title: nameLink.attr("title"),
            title: nameLink.text().split("/")[0]?.trim(),
        };
    }

    private parseType(info: Cheerio<Element>): string | null {
        const lineDiv = info.find("div.line").first();
        if (!lineDiv.length) return null;

        const isTypeKey = lineDiv.find("div.key").text().trim() === "Тип:";
        if (!isTypeKey) return null;

        return lineDiv.find("div.value div.b-tag").first().text().trim() || null;
    }
}
