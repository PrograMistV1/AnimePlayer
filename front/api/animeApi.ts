import type { AnimeInfoResponse, AnimeData } from "../types.ts";

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
}

export async function searchAnime(title: string) {
    const data = await fetchJson<{ response: unknown[]; error?: string }>(
        `/api/anime/search?title=${encodeURIComponent(title)}`
    );
    return data;
}

export async function getAnimeInfo(shikimoriId: string): Promise<AnimeInfoResponse> {
    const data = await fetchJson<{ response: AnimeInfoResponse }>(
        `/api/anime/info?shikimori_id=${shikimoriId}`
    );
    return data.response;
}

export async function getAnimeLink(
    shikimoriId: string,
    seriaNum: number,
    translationId: string
): Promise<{ link: string; maxQuality: string }> {
    return fetchJson(
        `/api/anime/link?shikimori_id=${shikimoriId}&seria_num=${seriaNum}&translation_id=${translationId}`
    );
}

export async function loadAnimeData(): Promise<AnimeData> {
    return fetchJson<AnimeData>("/api/data");
}

export async function saveAnimeData(data: AnimeData): Promise<void> {
    await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}