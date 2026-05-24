import {getAnimeInfo, getCachedPoster, saveAnimeData} from "../api/animeApi.ts";
import {advanceToNextSeria, type ContinueWatchingItem} from "../types.ts";
import {getAnimeData, syncLoadedData} from "../state/playerState.ts";
import {transNameToEpCount} from "./search.ts";
import {resumeWatching} from "./restore.ts";

const continueWatchingContainer = document.querySelector<HTMLElement>("#continue-watching-container")!;
const videoS = document.querySelector<HTMLVideoElement>("#video")!;

export async function initContinueWatching(): Promise<void> {
    const appData = getAnimeData();
    const continueWatching = appData.continueWatching;
    continueWatching.sort((a, b) => b.lastUpdate - a.lastUpdate);

    let isNewData = false;
    let isDataExistForRender = false;

    if (continueWatching.length === 0) {
        continueWatchingContainer.textContent = "Ничего не найдено";
        return;
    }

    for (const item of continueWatching) {
        let isBeginRender = false;
        let isCompleted = false;

        if (item.viewed) {
            const {kodikInfo} = await getAnimeInfo(item.shikimoriId);
            const translations = kodikInfo?.translations ?? [];
            const translation = translations.find((t) => t.id === item.translationId);

            if (!translation) continue;

            const transSeries = transNameToEpCount(translation.title);
            const lastSeria = transSeries.length > 1 ? transSeries[1] : transSeries[0];

            if (lastSeria === undefined || item.seriaNum >= lastSeria) {
                isCompleted = true;
            } else {
                isBeginRender = true;
                isNewData = true;
                Object.assign(item, advanceToNextSeria(item), {translationName: translation.title});
            }
        }

        isDataExistForRender = true;
        await createCWCard(item, isBeginRender, isCompleted);
    }

    if (isNewData) {
        await saveAnimeData(getAnimeData());
        syncLoadedData();
    }
    if (!isDataExistForRender) {
        continueWatchingContainer.textContent = "Ничего не найдено";
    }
}

async function createCWCard(data: ContinueWatchingItem, isBeginRender: boolean, isCompleted = false): Promise<void> {
    const container = document.createElement("div");
    container.className = "continue-watching-item";

    let viewedPercent = 0;
    let viewedTime = 0;
    if (data.startedWatching) {
        viewedTime = data.timeCode.second + data.timeCode.minute * 60 + data.timeCode.hour * 3600;
        viewedPercent = Math.round((viewedTime / data.timeCode.fullTimeSeconds) * 100);
    }

    container.addEventListener("click", async () => {
        await resumeWatching(data);
        videoS.currentTime = viewedTime;
        videoS.scrollIntoView({behavior: "smooth"});
    });

    container.innerHTML = `
    <div class="continue-watching-img-container">
        <img src="" alt="poster" id="poster-${data.shikimoriId}" />
        <div class="img-overlay"></div>
        ${isCompleted ? `<div class="completed-badge">Просмотрено</div>` : ""}
    </div>
    <div class="continue-watching-item-info">
        <div class="continue-watching-item-info-title-wrapper">
            <div class="continue-watching-item-info-title">${data.title}</div>
        </div>
        <div class="continue-watching-item-info-settings">
            <p>Серия: ${data.seriaNum}</p>
            <p class="continue-watching-item-info-translations">Озвучка: ${data.translationName}</p>
        </div>
    </div>
    <div class="time-state" style="background: linear-gradient(to right, #ff6792 ${viewedPercent}%, transparent ${viewedPercent}%);"></div>
    `;

    loadPoster(container, data);

    if (isBeginRender) {
        continueWatchingContainer.prepend(container);
        continueWatchingContainer.scrollTo({left: 0, behavior: "smooth"});
        return;
    }
    continueWatchingContainer.appendChild(container);
}

function loadPoster(container: HTMLElement, data: ContinueWatchingItem): void {
    const posterElement = container.querySelector<HTMLImageElement>(`#poster-${data.shikimoriId}`)!;

    const fetchPoster = async () => {
        posterElement.removeEventListener("error", onError);
        try {
            const {shikimoriInfo} = await getAnimeInfo(data.shikimoriId);
            if (shikimoriInfo?.poster) {
                posterElement.src = shikimoriInfo.poster;
                data.posterUrl = shikimoriInfo.poster;
            }
        } catch (e) {
            console.error(e);
        }
    };

    const onError = () => fetchPoster();
    posterElement.addEventListener("error", onError);

    const poster = data.posterUrl ?? getCachedPoster(data.shikimoriId);
    if (poster) {
        posterElement.src = poster;
    } else {
        fetchPoster().then();
    }
}