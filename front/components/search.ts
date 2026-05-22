import {getAnimeInfo, getAnimeLink, searchAnime} from "../api/animeApi.ts";
import type {KodikInfo, ShikimoriInfo, Translation} from "../types.ts";
import {getCurrentQuality, seriaData, setQualities, setVideoLink} from "../state/playerState.ts";
import {loadVideo} from "./videoPlayer.ts";

const animeInfoTitle = document.querySelector<HTMLElement>("#anime-info-title")!;
const animeInfoImg = document.querySelector<HTMLImageElement>("#anime-info-img")!;
const translationsList = document.querySelector<HTMLElement>("#translations")!;
const translationTitle = document.querySelector<HTMLElement>("#translation-title")!;
const seriesList = document.querySelector<HTMLElement>("#series")!;
const seriaTitle = document.querySelector<HTMLElement>("#seria-title")!;
const searchInput = document.querySelector<HTMLInputElement>("#search-input")!;
const searchResultsList = document.querySelector<HTMLElement>("#search-results")!;
const animeInfoField = document.querySelector<HTMLElement>("#anime-info-field")!;
const animeMetaRow = document.querySelector<HTMLElement>("#anime-meta-row")!;
const animeGenres = document.querySelector<HTMLElement>("#anime-genres")!;
const animeRating = document.querySelector<HTMLElement>("#anime-rating")!;
const animeDescription = document.querySelector<HTMLElement>("#anime-description")!;

function transNameToEpCount(translation: string): number[] {
    const match = translation.match(/(\d+)[~-](\d+) эп\.\)|(\d+) эп\./);
    if (!match) return [];
    if (match[1] && match[2]) return [parseInt(match[1], 10), parseInt(match[2], 10)];
    if (match[3]) return [parseInt(match[3], 10)];
    return [];
}

export {transNameToEpCount};

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: unknown, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    } as T;
}

function createSeriaButton(n: number): void {
    const button = document.createElement("button");
    button.className = "seria-button";
    button.textContent = String(n);
    button.addEventListener("click", () => chooseSeria(n));
    seriesList.appendChild(button);
}

function renderSeriesList(count: number | null, start = 1): void {
    seriesList.textContent = "";
    if (count === null) return;
    if (count === 0) {
        createSeriaButton(0);
        return;
    }
    for (let i = start; i <= count; i++) {
        createSeriaButton(i);
    }
}

function chooseSeria(num: number): void {
    seriaData.seriaNum = num;
    seriaTitle.textContent = `Серия: ${num}`;
    setUrl().then();
}

export function chooseTranslation(translation?: Translation): void {
    if (translation) {
        translationTitle.textContent = `Озвучка: ${translation.title}`;
        seriaData.translationId = translation.id;
        seriaData.translationName = translation.title;
        setUrl().then();
        return;
    }
    translationTitle.textContent = "Озвучка: не выбрана";
    seriaData.translationId = undefined;
}

function renderTranslations(kodikInfo: KodikInfo): void {
    const fragment = document.createDocumentFragment();
    translationsList.textContent = "";

    for (const translation of kodikInfo.translations) {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.className = "list-item-button translations-item";
        button.textContent = translation.title;
        button.addEventListener("click", () => chooseTranslation(translation));
        li.appendChild(button);
        fragment.appendChild(li);
    }
    translationsList.appendChild(fragment);
}

export async function chooseAnime(results: { shikimori_id: string; title: string; type?: string; }): Promise<void> {
    chooseTranslation();
    clearAnimeCard();
    searchResultsList.textContent = "";
    searchInput.value = "";

    seriaData.shikimoriId = results.shikimori_id;
    seriaData.title = results.title;
    animeInfoTitle.textContent = results.title;

    if (results.type === "Фильм") {
        seriaData.seriaNum = 0;
        seriaTitle.textContent = "Серия: Фильм";
    }

    try {
        const {kodikInfo, shikimoriInfo} = await getAnimeInfo(results.shikimori_id);
        animeInfoImg.src = shikimoriInfo?.poster ?? "";
        animeInfoField.classList.add("visible");

        renderAnimeCard(shikimoriInfo);

        if (!kodikInfo) {
            animeInfoTitle.textContent = `${results.title} АНИМЕ НЕ НАЙДЕНО В БАЗЕ KODIK`;
            translationsList.textContent = "";
            renderSeriesList(null);
            return;
        }

        renderTranslations(kodikInfo);

        if (results.type === "Фильм") {
            renderSeriesList(null);
            return;
        }

        const firstTranslation = kodikInfo.translations[0];
        if (!firstTranslation) {
            renderSeriesList(kodikInfo.series_count);
            return;
        }
        const firstEp = transNameToEpCount(firstTranslation.title)[0] ?? 1;
        if (firstEp === 0) {
            renderSeriesList(kodikInfo.series_count - 1, 0);
        } else {
            renderSeriesList(kodikInfo.series_count);
        }
    } catch (e) {
        console.error("Ошибка в chooseAnime:", e);
    }
}

export async function setUrl(): Promise<void> {
    const {shikimoriId, translationId, seriaNum} = seriaData;
    if (shikimoriId === undefined || translationId === undefined || seriaNum === undefined) return;

    try {
        const data = await getAnimeLink(shikimoriId, seriaNum, translationId);

        setVideoLink(data.link);
        setQualities(data.qualities);
        loadVideo(getCurrentQuality());
    } catch (e) {
        console.error("Ошибка получения ссылки:", e);
    }
}

export function initSearch(): void {
    searchInput.addEventListener(
        "input",
        debounce(async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const data = await searchAnime(target.value);

            if (data.error) {
                searchResultsList.textContent = "";
                return;
            }

            const results = data.response as Array<{
                title: string;
                poster: string;
                shikimori_id: string;
                type?: string;
            }>;

            searchResultsList.textContent = "";
            const fragment = document.createDocumentFragment();

            for (const result of results) {
                const li = document.createElement("li");
                const button = document.createElement("button");
                const poster = document.createElement("img");
                const title = document.createElement("div");

                poster.className = "search-item-poster";
                poster.src = result.poster;
                title.textContent = result.title;
                button.className = "list-item-button";

                button.addEventListener("click", () => chooseAnime(result));
                button.appendChild(poster);
                button.appendChild(title);
                li.appendChild(button);
                fragment.appendChild(li);
            }
            searchResultsList.appendChild(fragment);
        }, 300),
    );
}

function renderAnimeCard(shikimoriInfo: ShikimoriInfo | null): void {
    if (!shikimoriInfo) return;

    const [aired, total] = shikimoriInfo.episodes ?? [];
    animeMetaRow.textContent = [
        shikimoriInfo.type,
        shikimoriInfo.status,
        aired ? total && total !== "?" ? `${aired}/${total} эп.` : `${aired} эп.` : null
    ].filter(Boolean).join(" · ");

    animeGenres.innerHTML = (shikimoriInfo.genres ?? [])
        .map((g: string) => `<span class="genre-tag">${g}</span>`)
        .join("");

    const stars = Math.round(shikimoriInfo.rating / 2);
    animeRating.innerHTML = Array.from({length: 5}, (_, i) =>
        `<span class="star${i < stars ? "" : " empty"}">★</span>`
    ).join("") + `<span class="rating-value">${shikimoriInfo.rating.toFixed(1)}</span>`;

    animeDescription.textContent = shikimoriInfo.description?.join("\n\n") ?? "";
}

function clearAnimeCard(): void {
    animeInfoTitle.textContent = "";
    animeInfoImg.src = "";
    animeMetaRow.textContent = "";
    animeGenres.innerHTML = "";
    animeRating.innerHTML = "";
    animeDescription.textContent = "";
    animeInfoField.classList.remove("visible");
}