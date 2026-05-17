import {loadAnimeData} from "./api/animeApi.ts";
import {setAnimeData} from "./state/playerState.ts";
import {initTheme} from "./components/theme.ts";
import {initSearch} from "./components/search.ts";
import {initContinueWatching} from "./components/continueWatching.ts";
import {initPlayer} from "./components/player.ts";

document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    initSearch();
    initPlayer();

    const data = await loadAnimeData();
    setAnimeData(data);

    await initContinueWatching();
});