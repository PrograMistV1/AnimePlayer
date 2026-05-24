import {video} from "./videoPlayer.ts";
import {chooseAnime, setUrl} from "./search.ts";
import {seriaData} from "../state/playerState.ts";
import type {ContinueWatchingItem} from "../types.ts";

export async function resumeWatching(data: Pick<ContinueWatchingItem,
    "shikimoriId" | "title" | "seriaNum" | "translationId" | "translationName"
>): Promise<void> {
    await chooseAnime({shikimori_id: data.shikimoriId, title: data.title});

    seriaData.shikimoriId = data.shikimoriId;
    seriaData.seriaNum = data.seriaNum;
    seriaData.translationId = data.translationId;
    seriaData.title = data.title;
    seriaData.translationName = data.translationName;

    await setUrl();
}

export async function restoreState(): Promise<void> {
    const {shikimoriId, title, translationId, translationName, seriaNum, currentTime} = seriaData;
    if (!shikimoriId || translationId === undefined || seriaNum === undefined) return;

    await resumeWatching({
        shikimoriId,
        title: title ?? "",
        seriaNum,
        translationId,
        translationName: translationName ?? ""
    });

    if (currentTime) {
        video.addEventListener("loadedmetadata", () => {
            video.currentTime = currentTime;
        }, {once: true});
    }
}