import type {AnimeData, SeriaData} from "../types.ts";

export const seriaData: SeriaData = {
    shikimoriId: undefined,
    seriaNum: undefined,
    translationId: undefined,
    title: undefined,
    translationName: undefined,
};

export let currentVideoLink: string = "";
export let currentQuality: number = 0;
export let availableQualities: number[] = [];

let _AnimeData: AnimeData | null = null;
let _loadedData: AnimeData | null = null;

export function getAnimeData(): AnimeData {
    if (!_AnimeData) throw new Error("AnimeData не загружен");
    return _AnimeData;
}

export function setAnimeData(data: AnimeData): void {
    _AnimeData = data;
    _loadedData = structuredClone(data);
}

export function getLoadedData(): AnimeData | null {
    return _loadedData;
}

export function syncLoadedData(): void {
    _loadedData = structuredClone(_AnimeData);
}

export function isDataChanged(): boolean {
    return JSON.stringify(_AnimeData) !== JSON.stringify(_loadedData);
}

export function setVideoLink(link: string): void {
    currentVideoLink = link;
}

export function setQualities(qualities: number[]): void {
    availableQualities = qualities;
    currentQuality = qualities[0] ?? 0;
}

export function setCurrentQuality(quality: number): void {
    currentQuality = quality;
}