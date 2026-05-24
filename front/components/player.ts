import {getAnimeInfo, saveAnimeData} from "../api/animeApi.ts";
import type {ContinueWatchingItem} from "../types.ts";
import {getAnimeData, isDataChanged, seriaData, syncLoadedData} from "../state/playerState.ts";

const videoS = document.querySelector<HTMLVideoElement>("#video")!;

let lastTimeUpdateTimeCode = 0;

export function initPlayer(): void {
    videoS.addEventListener("timeupdate", onTimeUpdate);
    videoS.addEventListener("loadeddata", onLoadedData);

    window.addEventListener("beforeunload", () => validUploadData());
    window.addEventListener("pagehide", (e) => validUploadData(e.persisted));
    document.addEventListener("visibilitychange", () =>
        validUploadData(document.visibilityState === "hidden")
    );
}

async function onTimeUpdate(): Promise<void> {
    const now = Date.now();
    if (now - lastTimeUpdateTimeCode < 10000) return;

    const appData = getAnimeData();
    const animeData = appData.continueWatching.find(
        (item) => item.shikimoriId === seriaData.shikimoriId
    );

    if (!animeData) return;

    const currentTime = Math.floor(videoS.currentTime);

    if (currentTime > videoS.duration - 120) {
        animeData.viewed = true;
        animeData.startedWatching = false;
    }

    animeData.timeCode.hour = Math.floor(currentTime / 3600);
    animeData.timeCode.minute = Math.floor((currentTime % 3600) / 60);
    animeData.timeCode.second = currentTime % 60;
    animeData.lastUpdate = Date.now();

    lastTimeUpdateTimeCode = now;

    await saveAnimeData(getAnimeData());
    syncLoadedData();
}

async function onLoadedData(): Promise<void> {
    const appData = getAnimeData();
    let animeData: ContinueWatchingItem | undefined = appData.continueWatching.find(
        (item) => item.shikimoriId === seriaData.shikimoriId
    );

    if (!animeData) {
        animeData = {
            title: seriaData.title ?? "",
            shikimoriId: seriaData.shikimoriId ?? "",
            posterUrl: null,
            translationsId: seriaData.translationId ?? "",
            translationsName: seriaData.translationName ?? "",
            seriaNum: seriaData.seriaNum ?? 0,
            startedWatching: true,
            viewed: false,
            timeCode: {
                fullTimeSeconds: Math.floor(videoS.duration),
                hour: 0,
                minute: 0,
                second: 0,
            },
            lastUpdate: Date.now(),
        };
        appData.continueWatching.push(animeData);
    } else {
        animeData.startedWatching = true;
        animeData.seriaNum = seriaData.seriaNum ?? animeData.seriaNum;
        animeData.translationsId = seriaData.translationId ?? animeData.translationsId;
        animeData.translationsName = seriaData.translationName ?? animeData.translationsName;
        animeData.timeCode.fullTimeSeconds = Math.floor(videoS.duration);
    }

    if (!animeData.posterUrl) {
        try {
            const {shikimoriInfo} = await getAnimeInfo(animeData.shikimoriId);
            if (shikimoriInfo?.poster) {
                animeData.posterUrl = shikimoriInfo.poster;
            }
        } catch (e) {
            console.error(e);
        }
    }

    await saveAnimeData(getAnimeData());
    syncLoadedData();
}

function validUploadData(condition: boolean = true): void {
    if (condition && isDataChanged()) {
        const data = JSON.stringify(getAnimeData());
        const sent = navigator.sendBeacon("/api/data", new Blob([data], {type: "application/json"}));
        if (!sent) {
            saveAnimeData(getAnimeData()).catch((e) => console.error(e));
        }
        syncLoadedData();
    }
}