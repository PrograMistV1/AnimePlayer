import { load } from "cheerio";

export class ShikimoriParser {
    constructor(mirror = null) {
        this._dmn = mirror || "shikimori.io";
        this.headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
        };
        this.queue = Promise.resolve();
        this.delayMs = 200;
    }

    //Поиск по названию
    async search(title) {
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

            const res = [];

            $("div.b-db_entry-variant-list_item").each((index, element) => {
                const anime = $(element);

                //Проверяем, что это аниме
                if (anime.attr("data-type") !== "anime") {
                    return;
                }

                const cData = {};
                cData.link = anime.attr("data-url");
                cData.shikimori_id = anime.attr("data-id");

                //Постер
                const imageDiv = anime.find("div.image");
                if (imageDiv.length > 0) {
                    const img = imageDiv.find("picture img");
                    if (img.length > 0 && img.attr("srcset")) {
                        cData.poster = img.attr("srcset").replace(" 2x", "");
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
                    cData.title = nameLink.text().split("/")[0].trim();
                }

                //Информация о типе
                const lineDiv = info.find("div.line").first();
                if (lineDiv.length > 0) {
                    const keyDiv = lineDiv.find("div.key");
                    if (keyDiv.length > 0 && keyDiv.text().trim() === "Тип:") {
                        const valueDiv = lineDiv.find("div.value");

                        const typeTag = valueDiv.find("div.b-tag").first();

                        cData.type =
                            typeTag.length > 0 ? typeTag.text().trim() : null;
                    } else {
                        cData.type = null;
                    }
                } else {
                    cData.type = null;
                }
                res.push(cData);
            });
            return res;
        } catch (e) {
            return [];
        }
    }
    //Задержка запроса
    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    //Получение постера (с задержкой во избежание 429 ошибки)
    async getPoster(shikimoriId, retryCount = 0) {
        const MAX_RETRIES = 5;

        const currentTask = (this.queue = this.queue.then(async () => {
            try {
                const result = await this._fetchPoster(shikimoriId);
                await this._sleep(this.delayMs);
                return result;
            } catch (error) {
                //Повтор попытки, если 429 ошибка
                await this._sleep(this.delayMs * 2 + this.delayMs * retryCount);
                if (error.message === "429" && retryCount < MAX_RETRIES) {
                    return "RETRY_NEEDED";
                }
                throw error;
            }
        }));
        this.queue = currentTask.catch(() => {});
        const result = await currentTask;

        if (result === "RETRY_NEEDED") {
            return this.getPoster(shikimoriId, retryCount + 1);
        }

        return result;
    }

    //Парсинг постера
    async _fetchPoster(shikimoriId) {
        const response = await fetch(
            `https://${this._dmn}/animes/${shikimoriId}`,
            {
                method: "GET",
                headers: this.headers,
            },
        );

        if (response.status === 429) {
            throw new Error("429");
        }

        const htmlContent = await response.text();
        const $ = load(htmlContent);

        const posterBlock = $("div.b-db_entry-poster.b-image");
        if (posterBlock.length === 0) {
            return null;
        }
        const metaImg = posterBlock
            .find('meta[itemprop="image"]')
            .attr("content");
        if (metaImg) {
            return metaImg;
        }
        return null;
    }

    //Получение информации о тайтле
    async getInfoById(shikimoriId) {
        const response = await fetch(
            `https://${this._dmn}/animes/${shikimoriId}`,
            {
                method: "GET",
                headers: this.headers,
            },
        );
        const htmlContent = await response.text();
        const $ = load(htmlContent);

        const res = {
            title: null,
            poster: null,
            type: null,
            episodes: null,
            status: null,
            genres: null,
            rating: null,
            description: null,
        };

        //Название
        const title = $("header.head h1");
        const russianTitle = title.contents().get(0).nodeValue.trim();
        res.title = russianTitle;

        //Постер
        const posterBlock = $("div.b-db_entry-poster.b-image");
        if (posterBlock.length !== 0) {
            const metaImg = posterBlock
                .find('meta[itemprop="image"]')
                .attr("content");
            if (metaImg) {
                res.poster = metaImg;
            }
        }

        //Блок информации
        const blockInfo = $(".c-about .c-info-left .block .b-entry-info");
        blockInfo.find(".line-container").each((index, element) => {
            const key = $(element).find(".key").text().replace(":", "").trim();
            const value = $(element).find(".value");

            if (key == "Тип") {
                res.type = value.text().trim();
            }
            if (key == "Эпизоды") {
                res.episodes = value.text().split(" / ");
            }
            if (key == "Статус") {
                res.status = value.children().first().attr("data-text");
            }
            if (key == "Жанры") {
                res.genres = [];
                value.find(".b-tag").each((i, el) => {
                    const genreName = $(el).find(".genre-ru").text().trim();

                    if (genreName) {
                        res.genres.push(genreName);
                    }
                });
            }
        });

        //Рейтинг
        const rating = $('meta[itemprop="ratingValue"]').attr("content");
        res.rating = parseFloat(rating);

        //Описание
        const blockDesc = $(".c-description .block .b-text_with_paragraphs");

        if (
            blockDesc.length === 0 ||
            blockDesc.find(".b-nothing_here").length > 0
        ) {
            res.description = null;
        } else {
            res.description = blockDesc
                .html()
                .split(/<br\s*\/?>|<br\s*class="br"\s*\/?>/i)
                .map((p) => {
                    return $(`<div>${p}</div>`).text().trim();
                })
                .filter((p) => p.length > 0);
        }
        return res;
    }
}
