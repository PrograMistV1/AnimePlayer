export interface TimeCode {
    fullTimeSeconds: number;
    hour: number;
    minute: number;
    second: number;
}

export interface ContinueWatchingItem {
    title: string;
    shikimoriId: string;
    posterUrl: string | null;
    translationsId: string;
    translationsName: string;
    seriaNum: number;
    startedWatching: boolean;
    viewed: boolean;
    timeCode: TimeCode;
    lastUpdate: number;
}

export function createWatchingItem(seriaData: SeriaData, durationSeconds: number): ContinueWatchingItem {
    return {
        title: seriaData.title ?? "",
        shikimoriId: seriaData.shikimoriId ?? "",
        posterUrl: null,
        translationsId: seriaData.translationId ?? "",
        translationsName: seriaData.translationName ?? "",
        seriaNum: seriaData.seriaNum ?? 0,
        startedWatching: true,
        viewed: false,
        timeCode: {fullTimeSeconds: durationSeconds, hour: 0, minute: 0, second: 0},
        lastUpdate: Date.now(),
    };
}

export function advanceToNextSeria(item: ContinueWatchingItem): ContinueWatchingItem {
    return {
        ...item,
        seriaNum: item.seriaNum + 1,
        viewed: false,
        startedWatching: false,
        lastUpdate: Date.now(),
    };
}

export interface AnimeData {
    searchMethod: string;
    continueWatching: ContinueWatchingItem[];
}

export interface Translation {
    id: string;
    title: string;
    type: string;
    is_voice: boolean;
}

export interface KodikInfo {
    series_count: number;
    translations: Translation[];
}

export interface ShikimoriInfo {
    title: string | null;
    poster: string | null;
    type: string | null;
    episodes: string[] | null;
    status: string | undefined | null;
    genres: string[] | null;
    rating: number;
    description: string[] | null;
}

export interface AnimeInfoResponse {
    kodikInfo: KodikInfo | null;
    shikimoriInfo: ShikimoriInfo | null;
}

export interface SeriaData {
    shikimoriId: string | undefined;
    seriaNum: number | undefined;
    translationId: string | undefined;
    title: string | undefined;
    translationName: string | undefined;
}

export interface AnimeLinkResponse {
    link: string;
    qualities: number[];
}