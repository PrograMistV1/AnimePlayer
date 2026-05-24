import {getAnimeInfo, saveAnimeData} from "../api/animeApi.ts";
import type {ContinueWatchingItem} from "../types.ts";
import {getAnimeData, isDataChanged, seriaData, syncLoadedData} from "../state/playerState.ts";

const videoS = document.querySelector<HTMLVideoElement>("#video")!;

let lastTimeUpdateTimeCode = 0;

export function initPlayer(): void {
    videoS.addEventListener("timeupdate", onTimeUpdate);
    videoS.addEventListener("loadeddata", onLoadedData);

    window.addEventListener("beforeunload", () => persistData({beacon: true}));
    window.addEventListener("pagehide", (e) => persistData({beacon: true, condition: e.persisted}));
    document.addEventListener("visibilitychange", () =>
        persistData({beacon: true, condition: document.visibilityState === "hidden"})
    );
}

async function onTimeUpdate(): Promise<void> {
    const now = Date.now();
    if (now - lastTimeUpdateTimeCode < 10000) return;

    const animeData = getAnimeData().continueWatching.find(
        (item) => item.shikimoriId === seriaData.shikimoriId
    );
    if (!animeData) return;

    const currentTime = Math.floor(videoS.currentTime);

    if (currentTime > videoS.duration - 120) {
        animeData.viewed = true;
        animeData.startedWatching = false;
    }

    animeData.timeCode = {
        ...animeData.timeCode,
        hour: Math.floor(currentTime / 3600),
        minute: Math.floor((currentTime % 3600) / 60),
        second: currentTime % 60,
    };
    animeData.lastUpdate = Date.now();
    lastTimeUpdateTimeCode = now;

    await persistData();
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
            timeCode: {fullTimeSeconds: Math.floor(videoS.duration), hour: 0, minute: 0, second: 0},
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
            animeData.posterUrl = shikimoriInfo?.poster ?? null;
        } catch (e) {
            console.error(e);
        }
    }

    await persistData();
}

async function persistData({beacon = false, condition = true} = {}): Promise<void> {
    if (!condition || (beacon && !isDataChanged())) return;

    if (beacon) {
        const blob = new Blob([JSON.stringify(getAnimeData())], {type: "application/json"});
        if (!navigator.sendBeacon("/api/data", blob)) {
            await saveAnimeData(getAnimeData()).catch(console.error);
        }
    } else {
        await saveAnimeData(getAnimeData());
    }

    syncLoadedData();
}