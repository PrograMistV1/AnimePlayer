import type {AnimeData, AnimeInfoResponse, AnimeLinkResponse, ApiResponse, SearchResult,} from "../types.ts";

const animeInfoCache = new Map<string, Promise<AnimeInfoResponse>>();

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json().then() as Promise<T>;
}

export async function searchAnime(title: string): Promise<ApiResponse<SearchResult[]>> {
    return fetchJson<ApiResponse<SearchResult[]>>(`/api/anime/search?title=${encodeURIComponent(title)}`);
}

export function getAnimeInfo(shikimoriId: string): Promise<AnimeInfoResponse> {
    if (!animeInfoCache.has(shikimoriId)) {
        const promise = fetchJson<ApiResponse<AnimeInfoResponse>>(
            `/api/anime/info?shikimoriId=${shikimoriId}`
        ).then(data => {
            const response = data.response;
            if (response.shikimoriInfo?.poster) {
                try {
                    sessionStorage.setItem(`poster:${shikimoriId}`, response.shikimoriInfo.poster);
                } catch {
                    console.warn(`Failed to cache poster: ${response.shikimoriInfo.poster}`);
                }
            }
            return response;
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
    const response = await fetch("/api/data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
}