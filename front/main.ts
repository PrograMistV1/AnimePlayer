import {loadAnimeData} from "./api/animeApi.ts";
import {seriaData, setAnimeData} from "./state/playerState.ts";
import {initSearch, restoreState} from "./components/search.ts";
import {initContinueWatching} from "./components/continueWatching.ts";
import {initPlayer} from "./components/player.ts";
import "./components/videoPlayer.ts";

document.addEventListener("DOMContentLoaded", async () => {
    //initTheme(); todo вернуть темы
    initSearch();
    initPlayer();

    const data = await loadAnimeData();
    setAnimeData(data);

    await initContinueWatching();

    if (seriaData.shikimoriId) {
        await restoreState();
    }
});