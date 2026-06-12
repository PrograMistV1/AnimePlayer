import type {AnimeData, AnimeInfoResponse, AnimeLinkResponse, SearchResult} from "../types.ts";

const animeInfoCache = new Map<string, Promise<AnimeInfoResponse>>();

export class ApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiError";
    }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const json = await response.json();

    if (!response.ok) {
        throw new ApiError(json.message ?? "Unknown error");
    }

    return json.data as T;
}

export async function searchAnime(title: string): Promise<SearchResult[]> {
    return fetchJson<SearchResult[]>(`/api/anime/search?title=${encodeURIComponent(title)}`);
}

export function getAnimeInfo(shikimoriId: string): Promise<AnimeInfoResponse> {
    if (!animeInfoCache.has(shikimoriId)) {
        const promise = fetchJson<AnimeInfoResponse>(
            `/api/anime/info?shikimoriId=${shikimoriId}`
        ).then(data => {
            if (data.shikimoriInfo?.poster) {
                try {
                    sessionStorage.setItem(`poster:${shikimoriId}`, data.shikimoriInfo.poster);
                } catch {
                    console.warn(`Failed to cache poster: ${data.shikimoriInfo.poster}`);
                }
            }
            return data;
        }).catch(err => {
            animeInfoCache.delete(shikimoriId);
            throw err;
        });
        animeInfoCache.set(shikimoriId, promise);
    }
    return animeInfoCache.get(shikimoriId)!;
}

export function getCachedPoster(shikimoriId: string): string | null {
    return sessionStorage.getItem(`poster:${shikimoriId}`);
}

export async function getAnimeLink(shikimoriId: string, seriaNum: number, translationId: string): Promise<AnimeLinkResponse> {
    return fetchJson<AnimeLinkResponse>(
        `/api/anime/link?shikimoriId=${shikimoriId}&seriaNum=${seriaNum}&translationId=${translationId}`
    );
}

export async function loadAnimeData(): Promise<AnimeData> {
    return fetchJson<AnimeData>("/api/data");
}

export async function saveAnimeData(data: AnimeData): Promise<void> {
    await fetchJson<void>("/api/data", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    });
}