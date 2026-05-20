import {currentQuality, currentVideoLink, setCurrentQuality} from "../state/playerState.ts";

const video = document.querySelector<HTMLVideoElement>("#video")!;
const videoplayerContainer = document.querySelector<HTMLElement>("#videoplayer")!;
const videoProgressBar = document.querySelector<HTMLElement>("#outside-progress-bar-container")!;
const videoProgressBarCircle = document.querySelector<HTMLElement>("#progress-bar-circle-container")!;
const settingsButton = document.querySelector<HTMLElement>("#settings-button")!;
const settingsSvg = document.querySelector<HTMLElement>("#settings-svg")!;
const settingsMenu = document.querySelector<HTMLElement>("#settings-menu")!;
const restartVideoContainer = document.querySelector<HTMLElement>("#restart-video-container")!;
const toolbar = document.querySelector<HTMLElement>("#toolbar")!;
const startPlayButton = document.querySelector<HTMLElement>("#start-play-button")!;
const startPlayContainer = document.querySelector<HTMLElement>("#start-play-container")!;
const startPlayError = document.querySelector<HTMLElement>("#start-play-error")!;
const restartVideoButton = document.querySelector<HTMLElement>("#restart-video-button")!;
const playButtonLeftStick = document.querySelector<HTMLElement>(".pause-play-div-left")!;
const playButtonRightStick = document.querySelector<HTMLElement>(".pause-play-div-right")!;
const volumeRange = document.querySelector<HTMLInputElement>("#volume-range")!;
const volumeButton = document.querySelector<HTMLElement>("#volume-button")!;
const volumeSvg = document.querySelector<SVGElement>("#volume-svg")!;
const spinner = document.querySelector<HTMLElement>("#spinner")!;
const videoProgressBarLoad = document.querySelector<HTMLElement>("#progress-bar-load")!;
const videoLengthNow = document.querySelector<HTMLElement>("#video-length-now")!;
const videoProgressBarValue = document.querySelector<HTMLElement>("#progress-bar-value")!;
const fullscreenButton = document.querySelector<HTMLElement>("#fullscreen-button")!;
const leftFastForwardElement = document.querySelector<HTMLElement>("#fast-forward-left")!;
const rightFastForwardElement = document.querySelector<HTMLElement>("#fast-forward-right")!;

//============//
//HIDE TOOLBAR//
//============//

let hideToolbarTimeout: ReturnType<typeof setTimeout> | undefined;
let showToolbarTimeout: ReturnType<typeof setTimeout> | undefined;
let hideToolbarTimeoutDisplay: ReturnType<typeof setTimeout> | undefined;
let showToolbarTimeoutDisplay: ReturnType<typeof setTimeout> | undefined;
let toolbarIsHide = false;
let settingsButtonIsClicked = true;
let videoIsStarted = false;

function hideToolbar(): void {
    if (hideToolbarTimeout) clearTimeout(hideToolbarTimeout);
    toolbar.style.opacity = "0";
    hideToolbarTimeout = setTimeout(() => {
        toolbar.style.display = "none";
    }, 200);
    toolbarIsHide = true;
}

function showToolbar(): void {
    if (showToolbarTimeout) clearTimeout(showToolbarTimeout);
    toolbar.style.display = "";
    showToolbarTimeout = setTimeout(() => {
        videoProgressBarCircle.style.transform = `translateX(${
            (videoProgressBar.offsetWidth * video.currentTime) / video.duration
        }px)`;
        toolbar.style.opacity = "1";
    }, 1);
    toolbarIsHide = false;
}

videoplayerContainer.addEventListener("mousemove", () => {
    if (settingsButtonIsClicked && videoIsStarted) {
        showToolbar();
        if (showToolbarTimeoutDisplay) clearTimeout(showToolbarTimeoutDisplay);
        showToolbarTimeoutDisplay = setTimeout(() => hideToolbar(), 2000);
    }
});

videoplayerContainer.addEventListener("touchstart", (event) => {
    if (toolbarIsHide && videoIsStarted) {
        showToolbar();
    } else if (
        event.target !== toolbar &&
        !toolbar.contains(event.target as Node) &&
        settingsButtonIsClicked &&
        event.target !== settingsButton &&
        !settingsButton.contains(event.target as Node) &&
        event.target !== settingsMenu &&
        !settingsMenu.contains(event.target as Node)
    ) {
        if (showToolbarTimeoutDisplay) clearTimeout(showToolbarTimeoutDisplay);
        hideToolbar();
        event.preventDefault();
    }
});

//==========//
//START PLAY//
//==========//

let hideStartPlayErrorTimeout: ReturnType<typeof setTimeout> | undefined;
let hide2StartPlayErrorTimeout: ReturnType<typeof setTimeout> | undefined;

function showStartPlayError(): void {
    clearTimeout(hideStartPlayErrorTimeout);
    clearTimeout(hide2StartPlayErrorTimeout);
    startPlayError.style.display = "flex";
    setTimeout(() => {
        startPlayError.style.opacity = "1";
    }, 10);
    hideStartPlayErrorTimeout = setTimeout(() => {
        startPlayError.style.opacity = "0";
        hide2StartPlayErrorTimeout = setTimeout(() => {
            startPlayError.style.display = "none";
        }, 200);
    }, 1000);
}

function tryStartPlay(): void {
    if (currentVideoLink) {
        videoPlay();
        startPlayContainer.style.display = "none";
        videoIsStarted = true;
    } else {
        showStartPlayError();
    }
}

startPlayButton.addEventListener("click", tryStartPlay);
startPlayButton.addEventListener("touchend", tryStartPlay);

//=============//
//RESTART VIDEO//
//=============//

let isEnded = false;

restartVideoButton.addEventListener("click", () => {
    video.currentTime = 0;
    videoPlay();
    restartVideoContainer.style.display = "none";
});

//==========//
//PLAY PAUSE//
//==========//

let isPlay = false;
let globalIsPlay = true;

document.querySelector<HTMLElement>("#pause-play")!.onclick = playOrPause;
document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && videoIsStarted) playOrPause();
});

function videoPlay(): void {
    playButtonLeftStick.classList.remove("play");
    playButtonRightStick.classList.remove("play");
    video.play();
    isPlay = true;
    showToolbarTimeoutDisplay = setTimeout(() => hideToolbar(), 2000);
    if (isEnded) {
        restartVideoContainer.style.display = "none";
        isEnded = false;
    }
}

function videoPause(): void {
    playButtonLeftStick.classList.add("play");
    playButtonRightStick.classList.add("play");
    video.pause();
    isPlay = false;
    if (showToolbarTimeoutDisplay) clearTimeout(showToolbarTimeoutDisplay);
    showToolbar();
}

function playOrPause(): void {
    if (isPlay) {
        videoPause();
        globalIsPlay = false;
        return;
    }
    videoPlay();
    globalIsPlay = true;
}

if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: "Anime Player",
        artist: "Custom videoplayer",
    });
    navigator.mediaSession.setActionHandler("play", () => {
        videoPlay();
        globalIsPlay = true;
    });
    navigator.mediaSession.setActionHandler("pause", () => {
        videoPause();
        globalIsPlay = false;
    });
}

//======//
//VOLUME//
//======//

let videoVolumeValue = 1;

document.querySelector<HTMLElement>("#volume-container")!.onmouseenter = () => {
    volumeRange.classList.remove("volume-range-hiden");
};
document.querySelector<HTMLElement>("#left-buttons")!.onmouseleave = () => {
    volumeRange.classList.add("volume-range-hiden");
};

volumeButton.addEventListener("click", () => {
    const val = video.volume > 0 ? (videoVolumeValue = video.volume, 0) : videoVolumeValue;
    volumeRange.value = String(val * 100);
    volumeRange.style.background = `linear-gradient(to right, #ffffff ${val * 100}%, transparent ${val * 100}%)`;
    video.volume = val;
    updateVolumeSvg(val);
});

function returnVolumeSvgPath(value: number): string {
    if (value === 0)
        return "M19.8 22.6L16.775 19.575C16.3583 19.8417 15.9167 20.0708 15.45 20.2625C14.9833 20.4542 14.5 20.6083 14 20.725V18.675C14.2333 18.5917 14.4625 18.5083 14.6875 18.425C14.9125 18.3417 15.125 18.2417 15.325 18.125L12 14.8V20L7 15H3V9H6.2L1.4 4.2L2.8 2.8L21.2 21.2L19.8 22.6ZM19.6 16.8L18.15 15.35C18.4333 14.8333 18.6458 14.2917 18.7875 13.725C18.9292 13.1583 19 12.575 19 11.975C19 10.4083 18.5417 9.00834 17.625 7.775C16.7083 6.54167 15.5 5.70834 14 5.275V3.225C16.0667 3.69167 17.75 4.7375 19.05 6.3625C20.35 7.9875 21 9.85834 21 11.975C21 12.8583 20.8792 13.7083 20.6375 14.525C20.3958 15.3417 20.05 16.1 19.6 16.8ZM16.25 13.45L14 11.2V7.95C14.7833 8.31667 15.3958 8.86667 15.8375 9.6C16.2792 10.3333 16.5 11.1333 16.5 12C16.5 12.25 16.4792 12.4958 16.4375 12.7375C16.3958 12.9792 16.3333 13.2167 16.25 13.45ZM12 9.2L9.4 6.6L12 4V9.2Z";
    if (value >= 0.5)
        return "M14 20.725V18.675C15.5 18.2417 16.7083 17.4083 17.625 16.175C18.5417 14.9417 19 13.5417 19 11.975C19 10.4083 18.5417 9.00833 17.625 7.775C16.7083 6.54167 15.5 5.70833 14 5.275V3.225C16.0667 3.69167 17.75 4.7375 19.05 6.3625C20.35 7.9875 21 9.85833 21 11.975C21 14.0917 20.35 15.9625 19.05 17.5875C17.75 19.2125 16.0667 20.2583 14 20.725ZM3 15V9H7L12 4V20L7 15H3ZM14 16V7.95C14.7833 8.31667 15.3958 8.86667 15.8375 9.6C16.2792 10.3333 16.5 11.1333 16.5 12C16.5 12.85 16.2792 13.6375 15.8375 14.3625C15.3958 15.0875 14.7833 15.6333 14 16Z";
    return "M3 15V9H7L12 4V20L7 15H3ZM14 16V7.95C14.7833 8.31667 15.3958 8.86667 15.8375 9.6C16.2792 10.3333 16.5 11.1333 16.5 12C16.5 12.85 16.2792 13.6375 15.8375 14.3625C15.3958 15.0875 14.7833 15.6333 14 16Z";
}

function volumeSlider(): void {
    const val = Number(volumeRange.value) / Number(volumeRange.max);
    volumeRange.style.background = `linear-gradient(to right, #ffffff ${val * 100}%, transparent ${val * 100}%)`;
    video.volume = val;
    updateVolumeSvg(val);
}

function updateVolumeSvg(value: number): void {
    const path = volumeSvg.querySelectorAll("path")[0];
    if (path) path.setAttribute("d", returnVolumeSvgPath(value));
}

(window as any).volumeSlider = volumeSlider;

//=======//
//LOADING//
//=======//

let videoLenghtIsSet = false;

video.addEventListener("loadeddata", () => {
    setVideoLenght();
    barUpdate();
});
video.addEventListener("loadstart", () => {
    if (isPlay) playOrPause();
});
video.addEventListener("waiting", () => {
    if (!videoProgressBarIsMouseDown) spinner.style.display = "";
});
video.addEventListener("playing", () => {
    spinner.style.display = "none";
});
video.ontimeupdate = () => barUpdate();
video.addEventListener("ended", () => {
    videoPause();
    globalIsPlay = false;
    restartVideoContainer.style.display = "";
    isEnded = true;
});

function formatTime(time: number): string {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function progressUpdate(videoCurrentTime: number): void {
    videoLengthNow.textContent = formatTime(videoCurrentTime);
}

function setVideoLenght(): void {
    const duration = video.duration;
    if (!duration) {
        document.querySelector<HTMLElement>("#video-length-all")!.textContent = formatTime(0);
        return;
    }
    document.querySelector<HTMLElement>("#video-length-all")!.textContent = formatTime(duration);
    videoLenghtIsSet = true;
}

function barUpdate(): void {
    progressUpdate(video.currentTime);
    videoProgressBarValue.style.width = `${(video.currentTime / video.duration) * 100}%`;
    videoProgressBarCircle.style.transform = `translateX(${(videoProgressBar.offsetWidth * video.currentTime) / video.duration}px)`;

    const buffered = video.buffered;
    for (let i = 0; i < buffered.length; i++) {
        videoProgressBarLoad.style.width = `${(buffered.end(i) / video.duration) * 100}%`;
    }
    if (!videoLenghtIsSet) setVideoLenght();
}

//===========//
//DRAG CANCEL//
//===========//

document.addEventListener("dragstart", (e) => e.preventDefault());
document.addEventListener("drag", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());

//============//
//PROGRESS BAR//
//============//

let lastTimeVideoRewind = 0;
const throttleRate = 1000 / 90;
let lastProgressBarValue = 0;
let videoProgressBarIsMouseDown = false;

videoProgressBar.addEventListener("pointerdown", (event) => {
    videoProgressBarIsMouseDown = true;
    videoPause();
    videoRewind(event);
});
document.addEventListener("pointerup", () => {
    if (videoProgressBarIsMouseDown) {
        if (globalIsPlay) videoPlay();
        video.currentTime = video.duration * lastProgressBarValue;
    }
    videoProgressBarIsMouseDown = false;
});
document.addEventListener("pointermove", (event) => {
    const now = Date.now();
    if (videoProgressBarIsMouseDown && now - lastTimeVideoRewind >= throttleRate) {
        lastTimeVideoRewind = now;
        videoRewind(event);
    }
});

videoProgressBar.addEventListener("touchstart", (event) => {
    videoProgressBarIsMouseDown = true;
    videoPause();
    const touch = event.touches[0];
    if (touch) videoRewind(touch);
});
document.addEventListener("touchend", () => {
    if (videoProgressBarIsMouseDown) {
        if (globalIsPlay) videoPlay();
        video.currentTime = video.duration * lastProgressBarValue;
    }
    videoProgressBarIsMouseDown = false;
});
document.addEventListener("touchmove", (event) => {
    const now = Date.now();
    if (videoProgressBarIsMouseDown && now - lastTimeVideoRewind >= throttleRate) {
        lastTimeVideoRewind = now;
        const touch = event.touches[0];
        if (touch) videoRewind(touch);
    }
});

let lastTimeVideoSCT = 0;
const throttleRateSCT = 1000 / 5;

function videoRewind(event: { clientX: number }): void {
    const progressBarWidth = videoProgressBar.offsetWidth;
    const rect = videoProgressBar.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBarWidth));
    const value = offsetX / progressBarWidth;

    videoProgressBarValue.style.width = `${value * 100}%`;
    videoProgressBarCircle.style.transform = `translateX(${offsetX}px)`;
    progressUpdate(video.duration * value);

    if (isEnded) {
        restartVideoContainer.style.display = "none";
        isEnded = false;
    }

    const now = Date.now();
    if (now - lastTimeVideoSCT >= throttleRateSCT) {
        lastTimeVideoSCT = now;
        video.currentTime = video.duration * value;
    }
    lastProgressBarValue = value;
}

window.addEventListener("resize", () => {
    videoProgressBarCircle.style.transform = `translateX(${(videoProgressBar.offsetWidth * video.currentTime) / video.duration}px)`;
});

//========//
//SETTINGS//
//========//

const svgChevronRight = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>`;
const svgChevronLeft = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>`;
const svgSpeedIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.25 18.3C3.61667 17.5667 3.10833 16.75 2.725 15.85C2.34167 14.95 2.1 14 2 13H4.05C4.15 13.7333 4.33333 14.4292 4.6 15.0875C4.86667 15.7458 5.21667 16.35 5.65 16.9L4.25 18.3ZM2 11C2.13333 10 2.38333 9.05 2.75 8.15C3.11667 7.25 3.61667 6.43334 4.25 5.7L5.65 7.1C5.21667 7.65 4.86667 8.25417 4.6 8.9125C4.33333 9.57084 4.15 10.2667 4.05 11H2ZM10.95 21.95C9.95 21.85 9.00417 21.6083 8.1125 21.225C7.22083 20.8417 6.4 20.35 5.65 19.75L7.05 18.3C7.63333 18.7333 8.24583 19.0917 8.8875 19.375C9.52917 19.6583 10.2167 19.85 10.95 19.95V21.95ZM7.1 5.7L5.65 4.25C6.4 3.65 7.22083 3.15834 8.1125 2.775C9.00417 2.39167 9.96667 2.15 11 2.05V4.05C10.25 4.15 9.55 4.34167 8.9 4.625C8.25 4.90834 7.65 5.26667 7.1 5.7ZM9.5 16.5V7.5L16.5 12L9.5 16.5ZM13 21.95V19.95C15.0167 19.6667 16.6875 18.775 18.0125 17.275C19.3375 15.775 20 14.0167 20 12C20 9.98334 19.3375 8.225 18.0125 6.725C16.6875 5.225 15.0167 4.33334 13 4.05V2.05C15.5667 2.33334 17.7083 3.41667 19.425 5.3C21.1417 7.18334 22 9.41667 22 12C22 14.5833 21.1417 16.8167 19.425 18.7C17.7083 20.5833 15.5667 21.6667 13 21.95Z" fill="white"/></svg>`;
const svgQualityIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 17H21V18H15V17ZM11 17H3V18H11V20H12V18V17V15H11V17ZM14 8H15V6V5V3H14V5H3V6H14V8ZM18 5V6H21V5H18ZM6 14H7V12V11V9H6V11H3V12H6V14ZM10 12H21V11H10V12Z" fill="white"/></svg>`;
const svgCheckIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.55001 18L3.85001 12.3L5.27501 10.875L9.55001 15.15L18.725 5.975L20.15 7.4L9.55001 18Z" fill="white"/></svg>`;

let settingsDefaultState = true;
let videoSpeed = 1;

settingsButton.addEventListener("click", () => {
    if (settingsButtonIsClicked) {
        settingsButtonIsClicked = false;
        settingsSvg.style.transform = "rotate(30deg)";

        renderSettings();

        settingsMenu.style.opacity = "1";
        setTimeout(() => {
            settingsMenu.style.display = "";
        }, 100);
        if (showToolbarTimeoutDisplay) clearTimeout(showToolbarTimeoutDisplay);
        showToolbar();
    } else {
        setSettingsMenuDefault(true);
        showToolbarTimeoutDisplay = setTimeout(() => hideToolbar(), 2000);
    }
});

document.addEventListener("click", (event) => {
    if (
        !settingsButtonIsClicked &&
        event.target !== settingsButton &&
        !settingsButton.contains(event.target as Node) &&
        event.target !== settingsMenu &&
        !settingsMenu.contains(event.target as Node)
    ) {
        setSettingsMenuDefault(true);
        showToolbarTimeoutDisplay = setTimeout(() => {
            if (isPlay) hideToolbar();
        }, 2000);
    }
});

interface SettingsClickArgs {
    element: HTMLElement;
    args: unknown;
}

function createSettingsElement(
    icon: string,
    label: string,
    content: string,
    chevron: string,
    labelType: 1 | 2 = 2,
    itemType: 1 | 2 = 1,
    clickFunc: ((args: SettingsClickArgs) => void) | false = false,
    argsForClickFunc?: unknown,
): HTMLElement {
    const element = document.createElement("div");
    element.classList.add(itemType === 1 ? "settings-menu-item" : "settings-menu-item-2");

    const elementIcon = document.createElement("div");
    elementIcon.classList.add("settings-menu-item-icon");
    elementIcon.innerHTML = icon;

    const elementLabel = document.createElement("div");
    elementLabel.classList.add(labelType === 1 ? "settings-menu-item-label" : "settings-menu-item-label-2");
    elementLabel.innerHTML = label;

    element.appendChild(elementIcon);
    element.appendChild(elementLabel);

    if (content) {
        const elementContent = document.createElement("div");
        elementContent.classList.add("settings-menu-item-content");
        elementContent.innerHTML = content;
        element.appendChild(elementContent);
    }
    if (chevron) {
        const elementChevron = document.createElement("div");
        elementChevron.classList.add("settings-menu-item-chevron");
        elementChevron.innerHTML = chevron;
        element.appendChild(elementChevron);
    }
    if (clickFunc) {
        element.onclick = () => clickFunc({element, args: argsForClickFunc});
    }
    return element;
}

function setSettingsMenuDefault(isClose: boolean): void {
    if (isClose) {
        settingsButtonIsClicked = true;
        settingsSvg.style.transform = "";
        settingsMenu.style.opacity = "0";
        setTimeout(() => {
            settingsMenu.style.display = "none";
        }, 100);
    }

    if (!settingsDefaultState) {
        setTimeout(() => renderSettings(), 100);
        settingsDefaultState = true;
    }
}

function renderSettings(): void {
    settingsMenu.style.width = "300px";
    settingsMenu.replaceChildren();
    settingsMenu.appendChild(createSettingsElement(
        svgSpeedIcon, "Скорость воспроизведения", `${videoSpeed}x`, svgChevronRight,
        1, 1, () => setTimeout(() => settingsMenuSpeedClick(), 10),
    ));
    settingsMenu.appendChild(createSettingsElement(
        svgQualityIcon, "Качество", `${currentQuality}p`, svgChevronRight,
        1, 1, () => setTimeout(() => settingsMenuQualityClick(), 10),
    ));
}

//========//
//SPEED   //
//========//

function settingsMenuSpeedClick(): void {
    settingsDefaultState = false;
    settingsMenu.style.width = "220px";
    settingsMenu.replaceChildren();

    const backButton = createSettingsElement(svgChevronLeft, "Скорость воспроизведения", "", "", 2, 2);
    backButton.addEventListener("click", () => setSettingsMenuDefault(false));
    settingsMenu.appendChild(backButton);

    for (const speed of [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
        settingsMenu.appendChild(createSettingsElement(
            speed === videoSpeed ? svgCheckIcon : "", `${speed}x`, "", "",
            2, 1, settingsSetSpeed, speed,
        ));
    }
}

function settingsSetSpeed(args: SettingsClickArgs): void {
    for (let i = 1; i < settingsMenu.children.length; i++) {
        const child = settingsMenu.children[i]?.children[0] as HTMLElement | undefined;
        if (child) child.innerHTML = "";
    }
    const child = args.element.children[0] as HTMLElement | undefined;
    if (child) child.innerHTML = svgCheckIcon;
    video.playbackRate = args.args as number;
    videoSpeed = args.args as number;
}

//========//
//QUALITY //
//========//

function settingsMenuQualityClick(): void {
    settingsDefaultState = false;
    settingsMenu.style.width = "220px";
    settingsMenu.replaceChildren();

    const backButton = createSettingsElement(svgChevronLeft, "Качество", "", "", 2, 2);
    backButton.addEventListener("click", () => setSettingsMenuDefault(false));
    settingsMenu.appendChild(backButton);

    // TODO: заменить на availableQualities из стейта
    const qualitiesArray = [720, 480, 360];
    for (const quality of qualitiesArray) {
        settingsMenu.appendChild(createSettingsElement(
            quality === currentQuality ? svgCheckIcon : "", `${quality}p`, "", "",
            2, 1, settingsSetQuality, quality,
        ));
    }
}

function settingsSetQuality(args: SettingsClickArgs): void {
    for (let i = 1; i < settingsMenu.children.length; i++) {
        const child = settingsMenu.children[i]?.children[0] as HTMLElement | undefined;
        if (child) child.innerHTML = "";
    }
    const child = args.element.children[0] as HTMLElement | undefined;
    if (child) child.innerHTML = svgCheckIcon;
    setCurrentQuality(args.args as number);

    const currentTime = video.currentTime;
    const wasPlaying = isPlay;

    while (video.firstChild) video.removeChild(video.firstChild);
    const source = document.createElement("source");
    source.type = "video/mp4";
    source.src = `https:${currentVideoLink}${currentQuality}.mp4`;
    source.id = "video-source";
    video.appendChild(source);
    video.load();

    video.addEventListener("loadeddata", () => {
        video.currentTime = currentTime;
        if (wasPlaying) videoPlay();
    }, {once: true});

    setSettingsMenuDefault(true);
}

//==========//
//FULLSCREEN//
//==========//

const svgFullscreenOff = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 7H22V10H14V7Z" fill="white"/><path d="M14 2H17V10H14V2Z" fill="white"/><path d="M14 14H22V17H14V14Z" fill="white"/><path d="M14 14H17V22H14V14Z" fill="white"/><path d="M2 14H10V17H2V14Z" fill="white"/><path d="M7 14H10V22H7V14Z" fill="white"/><path d="M2 7H10V10H2V7Z" fill="white"/><path d="M7 2H10V10H7V2Z" fill="white"/></svg>`;
const svgFullscreenOn = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 19H10V22H2V19Z" fill="white"/><path d="M2 14H5V22H2V14Z" fill="white"/><path d="M2 2H10V5H2V2Z" fill="white"/><path d="M2 2H5V10H2V2Z" fill="white"/><path d="M14 2H22V5H14V2Z" fill="white"/><path d="M19 2H22V10H19V2Z" fill="white"/><path d="M14 19H22V22H14V19Z" fill="white"/><path d="M19 14H22V22H19V14Z" fill="white"/></svg>`;

function toggleFullscreen(): void {
    const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
        if (videoplayerContainer.requestFullscreen) videoplayerContainer.requestFullscreen();
        else if ((videoplayerContainer as any).mozRequestFullScreen) (videoplayerContainer as any).mozRequestFullScreen();
        else if ((videoplayerContainer as any).webkitRequestFullscreen) (videoplayerContainer as any).webkitRequestFullscreen();
        else if ((videoplayerContainer as any).msRequestFullscreen) (videoplayerContainer as any).msRequestFullscreen();

        if (screen.orientation?.lock) {
            screen.orientation.lock("landscape").catch((e) => console.error(e));
        }
        fullscreenButton.innerHTML = svgFullscreenOff;
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if ((document as any).mozCancelFullScreen) (document as any).mozCancelFullScreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen();

        if (screen.orientation?.unlock) screen.orientation.unlock();
        fullscreenButton.innerHTML = svgFullscreenOn;
    }
}

fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("keydown", (event) => {
    if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
    }
});

function handleFullscreenChange(): void {
    const isFs = !!(
        document.fullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
    );
    fullscreenButton.innerHTML = isFs ? svgFullscreenOff : svgFullscreenOn;
}

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("mozfullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
document.addEventListener("msfullscreenchange", handleFullscreenChange);

//============//
//FAST FORWARD//
//============//

document.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft" && videoIsStarted) leftFastForward();
    else if (event.code === "ArrowRight" && videoIsStarted) rightFastForward();
});

let lastTapTime = 0;
const doubleTapDelay = 200;

videoplayerContainer.addEventListener("touchstart", (event) => {
    if (videoIsStarted && event.target !== toolbar && !toolbar.contains(event.target as Node)) {
        const now = Date.now();
        const tapDistance = now - lastTapTime;
        const rect = videoplayerContainer.getBoundingClientRect();
        const touch = event.touches[0];
        if (!touch) return;
        const x = touch.clientX - rect.left;

        if (tapDistance < doubleTapDelay) {
            if (x < rect.width / 2) leftFastForward();
            else rightFastForward();
        }
        lastTapTime = now;
    }
});

let leftFastForwardTimeout: ReturnType<typeof setTimeout> | undefined;
let rightFastForwardTimeout: ReturnType<typeof setTimeout> | undefined;

function showFastForward(el: HTMLElement, timeoutRef: { value: ReturnType<typeof setTimeout> | undefined }): void {
    if (timeoutRef.value) clearTimeout(timeoutRef.value);
    el.style.display = "";
    timeoutRef.value = setTimeout(() => {
        el.style.opacity = "1";
        timeoutRef.value = setTimeout(() => {
            el.style.opacity = "0";
            timeoutRef.value = setTimeout(() => {
                el.style.display = "none";
                timeoutRef.value = undefined;
            }, 300);
        }, 500);
    }, 1);
}

const leftTimeout = {value: leftFastForwardTimeout};
const rightTimeout = {value: rightFastForwardTimeout};

function leftFastForward(): void {
    showFastForward(leftFastForwardElement, leftTimeout);
    video.currentTime -= 10;
    if (isEnded) {
        restartVideoContainer.style.display = "none";
        isEnded = false;
    }
}

function rightFastForward(): void {
    showFastForward(rightFastForwardElement, rightTimeout);
    video.currentTime += 10;
}

export function initVideoPlayer(): void {
}