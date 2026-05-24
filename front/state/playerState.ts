import type {AnimeData, SeriaData} from "../types.ts";

export const seriaData: SeriaData = createPersistentState<SeriaData>({
    shikimoriId: undefined,
    seriaNum: undefined,
    translationId: undefined,
    title: undefined,
    translationName: undefined,
}, "seriaData");

type SeriaDataListener = (data: SeriaData) => void;
const seriaDataListeners: SeriaDataListener[] = [];

export function onSeriaDataChange(listener: SeriaDataListener): void {
    seriaDataListeners.push(listener);
}

function createPersistentState<T extends object>(initial: T, key: string): T {
    const saved = localStorage.getItem(key);
    const data = saved ? {...initial, ...JSON.parse(saved)} : initial;

    return new Proxy(data, {
        set(target, prop, value) {
            (target as any)[prop] = value;
            localStorage.setItem(key, JSON.stringify(target));
            seriaDataListeners.forEach(fn => fn(target as SeriaData));
            return true;
        }
    });
}

export const videoState = {
    isPlaying: false,
    intentPlaying: true,
    isEnded: false,
    isStarted: false,
    speed: 1,
    volume: 1,
    savedVolume: 1,
    isChangingQuality: false,
};

let _currentVideoLink: string = "";
let _currentQuality: number = 0;
let _availableQualities: number[] = [];

export function getCurrentVideoLink(): string {
    return _currentVideoLink;
}

export function getCurrentQuality(): number {
    return _currentQuality;
}

export function getAvailableQualities(): number[] {
    return _availableQualities;
}

export function setVideoLink(link: string): void {
    _currentVideoLink = link;
}

export function setQualities(qualities: number[]): void {
    _availableQualities = [...qualities].sort((a, b) => b - a);
    _currentQuality = _availableQualities[0] ?? 0;
}

export function setCurrentQuality(quality: number): void {
    _currentQuality = quality;
}

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

export function saveState(): void {
    localStorage.setItem("seriaData", JSON.stringify(seriaData));
}

export function loadState(): SeriaData | null {
    const saved = localStorage.getItem("seriaData");
    return saved ? JSON.parse(saved) : null;
}