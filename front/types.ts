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
    translationsId: string | number;
    translationsName: string;
    seriaNum: number;
    startedWatching: boolean;
    viewed: boolean;
    timeCode: TimeCode;
    lastUpdate: number;
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