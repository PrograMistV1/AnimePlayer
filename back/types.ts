export interface TimeCode {
    fullTimeSeconds: number;
    hour: number;
    minute: number;
    second: number;
}

export interface ContinueWatchingItem {
    title: string;
    shikimoriId: string | number;
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

export interface SearchResult {
    link: string | undefined;
    shikimoriId: string | undefined;
    poster: string | null;
    original_title: string | undefined;
    title: string | undefined;
    type: string | null;
}

export interface AnimeInfo {
    title: string | null;
    poster: string | null;
    type: string | null;
    episodes: string[] | null;
    status: string | undefined | null;
    genres: string[] | null;
    rating: number;
    description: string[] | null;
}

export interface InfoRequest {
    shikimoriId: string;
}

export interface LinkRequest {
    shikimoriId: string;
    seriaNum: string;
    translationId: string;
}
