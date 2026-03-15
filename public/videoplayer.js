const video = document.querySelector("#video"); //
const videoplayerContainer = document.querySelector("#videoplayer");

const videoProgressBar = document.querySelector(
    "#outside-progress-bar-container",
);
const videoProgressBarCircle = document.querySelector(
    "#progress-bar-circle-container",
);
const settingsButton = document.querySelector("#settings-button");
const settingsSvg = document.querySelector("#settings-svg");
const settingsMenu = document.querySelector("#settings-menu");
let settingsButtonIsClicked = true;

const restartVideoContainer = document.querySelector(
    "#restart-video-container",
);
//============//
//HIDE TOOLBAR//
//============//

const toolbar = document.querySelector("#toolbar");
let hideToolbarTimeout;
let showToolbarTimeout;
let toolbarIsHide = false;

function hideToolbar() {
    if (hideToolbarTimeout) {
        clearTimeout(hideToolbarTimeout);
    }
    toolbar.style.opacity = "0";
    hideToolbarTimeout = setTimeout(() => {
        toolbar.style.display = "none";
    }, 200);
    toolbarIsHide = true;
}

function showToolbar() {
    if (showToolbarTimeout) {
        clearTimeout(showToolbarTimeout);
    }

    toolbar.style.display = "";
    showToolbarTimeout = setTimeout(() => {
        videoProgressBarCircle.style.transform = `translateX(${
            (videoProgressBar.offsetWidth * video.currentTime) / video.duration
        }px)`;
        toolbar.style.opacity = "1";
    }, 1);
    toolbarIsHide = false;
}

let hideToolbarTimeoutDisplay;
let showToolbarTimeoutDisplay;

videoplayerContainer.addEventListener("mousemove", () => {
    if (isPlay && settingsButtonIsClicked) {
        showToolbar();
        if (showToolbarTimeoutDisplay) {
            clearTimeout(showToolbarTimeoutDisplay);
        }
        showToolbarTimeoutDisplay = setTimeout(() => {
            hideToolbar();
        }, 2000);
    }
});

videoplayerContainer.addEventListener("touchstart", (event) => {
    if (toolbarIsHide && videoIsStarted) {
        showToolbar();
    } else {
        if (
            event.target != toolbar &&
            !toolbar.contains(event.target) &&
            settingsButtonIsClicked &&
            event.target != settingsButton &&
            !settingsButton.contains(event.target) &&
            event.target != settingsMenu &&
            !settingsMenu.contains(event.target)
        ) {
            if (showToolbarTimeoutDisplay) {
                clearTimeout(showToolbarTimeoutDisplay);
            }
            hideToolbar();
            event.preventDefault();
        }
    }
});

//==========//
//START PLAY//
//==========//

const startPlayButton = document.querySelector("#start-play-button");
const startPlayContainer = document.querySelector("#start-play-container");
let videoIsStarted = false;
startPlayButton.addEventListener("click", () => {
    videoPlay();
    startPlayContainer.style.display = "none";
    videoIsStarted = true;
});
startPlayButton.addEventListener("touchend", () => {
    videoPlay();
    startPlayContainer.style.display = "none";
    videoIsStarted = true;
});

//=============//
//RESTART VIDEO//
//=============//
const restartVideoButton = document.querySelector("#restart-video-button");
let isEnded = false;

restartVideoButton.addEventListener("click", (event) => {
    video.currentTime = 0;
    videoPlay();
    restartVideoContainer.style.display = "none";
});

//==========//
//PLAY PAUSE//
//==========//

let isPlay = false;
let globalIsPlay = true;
const playButtonLeftStick = document.querySelector(".pause-play-div-left");
const playButtonRightStick = document.querySelector(".pause-play-div-right");

document.querySelector("#pause-play").onclick = playOrPause;
document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && videoIsStarted) {
        playOrPause();
    }
});

function videoPlay() {
    playButtonLeftStick.classList.remove("play");
    playButtonRightStick.classList.remove("play");
    video.play();
    isPlay = true;
    showToolbarTimeoutDisplay = setTimeout(() => {
        hideToolbar();
    }, 2000);
    if (isEnded) {
        restartVideoContainer.style.display = "none";
        isEnded = false;
    }
}
function videoPause() {
    playButtonLeftStick.classList.add("play");
    playButtonRightStick.classList.add("play");
    video.pause();
    isPlay = false;
    if (showToolbarTimeoutDisplay) {
        clearTimeout(showToolbarTimeoutDisplay);
    }
    showToolbar();
}
function playOrPause() {
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
        title: "Test videoplayer title",
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

const volumeRange = document.querySelector("#volume-range");
const volumeButton = document.querySelector("#volume-button");
const volumeSvg = document.querySelector("#volume-svg");
document.querySelector("#volume-container").onmouseenter =
    volumeButtonOnMouseEnter;
document.querySelector("#left-buttons").onmouseleave = volumeButtonOnMouseLeave;
let videoVolumeValue = 1;

volumeButton.addEventListener("click", () => {
    let val;
    if (video.volume > 0) {
        videoVolumeValue = video.volume;
        val = 0;
    } else {
        val = videoVolumeValue;
    }
    volumeRange.value = val * 100;
    volumeRange.style.background = `linear-gradient(to right, #ffffff ${
        val * 100
    }%, transparent ${val * 100}%)`;
    video.volume = val;
    volumeSvg
        .querySelectorAll("path")[0]
        .setAttribute("d", returnVolumeSvgPath(val));
});
function returnVolumeSvgPath(value) {
    if (value == 0)
        return "M19.8 22.6L16.775 19.575C16.3583 19.8417 15.9167 20.0708 15.45 20.2625C14.9833 20.4542 14.5 20.6083 14 20.725V18.675C14.2333 18.5917 14.4625 18.5083 14.6875 18.425C14.9125 18.3417 15.125 18.2417 15.325 18.125L12 14.8V20L7 15H3V9H6.2L1.4 4.2L2.8 2.8L21.2 21.2L19.8 22.6ZM19.6 16.8L18.15 15.35C18.4333 14.8333 18.6458 14.2917 18.7875 13.725C18.9292 13.1583 19 12.575 19 11.975C19 10.4083 18.5417 9.00834 17.625 7.775C16.7083 6.54167 15.5 5.70834 14 5.275V3.225C16.0667 3.69167 17.75 4.7375 19.05 6.3625C20.35 7.9875 21 9.85834 21 11.975C21 12.8583 20.8792 13.7083 20.6375 14.525C20.3958 15.3417 20.05 16.1 19.6 16.8ZM16.25 13.45L14 11.2V7.95C14.7833 8.31667 15.3958 8.86667 15.8375 9.6C16.2792 10.3333 16.5 11.1333 16.5 12C16.5 12.25 16.4792 12.4958 16.4375 12.7375C16.3958 12.9792 16.3333 13.2167 16.25 13.45ZM12 9.2L9.4 6.6L12 4V9.2Z";
    else if (value >= 0.5)
        return "M14 20.725V18.675C15.5 18.2417 16.7083 17.4083 17.625 16.175C18.5417 14.9417 19 13.5417 19 11.975C19 10.4083 18.5417 9.00833 17.625 7.775C16.7083 6.54167 15.5 5.70833 14 5.275V3.225C16.0667 3.69167 17.75 4.7375 19.05 6.3625C20.35 7.9875 21 9.85833 21 11.975C21 14.0917 20.35 15.9625 19.05 17.5875C17.75 19.2125 16.0667 20.2583 14 20.725ZM3 15V9H7L12 4V20L7 15H3ZM14 16V7.95C14.7833 8.31667 15.3958 8.86667 15.8375 9.6C16.2792 10.3333 16.5 11.1333 16.5 12C16.5 12.85 16.2792 13.6375 15.8375 14.3625C15.3958 15.0875 14.7833 15.6333 14 16Z";
    else if (value < 0.5)
        return "M3 15V9H7L12 4V20L7 15H3ZM14 16V7.95C14.7833 8.31667 15.3958 8.86667 15.8375 9.6C16.2792 10.3333 16.5 11.1333 16.5 12C16.5 12.85 16.2792 13.6375 15.8375 14.3625C15.3958 15.0875 14.7833 15.6333 14 16Z";
}
function volumeSlider() {
    const val = volumeRange.value / volumeRange.max;
    const currentD = volumeSvg.querySelectorAll("path")[0];
    volumeRange.style.background = `linear-gradient(to right, #ffffff ${
        val * 100
    }%, transparent ${val * 100}%)`;
    video.volume = val;
    if (currentD != returnVolumeSvgPath(val)) {
        volumeSvg
            .querySelectorAll("path")[0]
            .setAttribute("d", returnVolumeSvgPath(val));
    }
}
function volumeButtonOnMouseEnter() {
    const volumeRange = document.querySelector("#volume-range");
    if (volumeRange.classList.contains("volume-range-hiden")) {
        volumeRange.classList.remove("volume-range-hiden");
    }
}
function volumeButtonOnMouseLeave() {
    const volumeRange = document.querySelector("#volume-range");
    if (!volumeRange.classList.contains("volume-range-hiden")) {
        volumeRange.classList.add("volume-range-hiden");
    }
}

//=======//
//LOADING//
//=======//

const spinner = document.querySelector("#spinner");
const videoProgressBarLoad = document.querySelector("#progress-bar-load");
let videoLenghtIsSet = false;

video.addEventListener("loadeddata", () => {
    setVideoLenght();
    barUpdate();
    if (isPlay) {
        playOrPause();
    }
});
video.addEventListener("waiting", () => {
    if (!videoProgressBarIsMouseDown) {
        spinner.style.display = "";
    }
});
video.addEventListener("playing", () => {
    spinner.style.display = "none";
});
video.ontimeupdate = () => {
    barUpdate();
};
video.addEventListener("ended", () => {
    videoPause();
    globalIsPlay = false;
    restartVideoContainer.style.display = "";
    isEnded = true;
});

function barUpdate() {
    progressUpdate(video.currentTime);
    videoProgressBarValue.style.width = `${
        (video.currentTime / video.duration) * 100
    }%`;
    videoProgressBarCircle.style.transform = `translateX(${
        (videoProgressBar.offsetWidth * video.currentTime) / video.duration
    }px)`;

    let r = video.buffered;
    let total = video.duration;

    for (let i = 0; i < r.length; i++) {
        let start = (r.start(i) / total) * 100;
        let end = (r.end(i) / total) * 100;
        videoProgressBarLoad.style.width = end + "%";
    }
    if (!videoLenghtIsSet) {
        setVideoLenght();
    }
}
function formatTime(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    const paddedMinutes = minutes.toString().padStart(2, "0");
    const paddedSeconds = seconds.toString().padStart(2, "0");

    if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
}

function progressUpdate(videoCurrentTime) {
    videoLengthNow.textContent = formatTime(videoCurrentTime);
}

function setVideoLenght() {
    const videoDuration = video.duration;
    document.querySelector("#video-length-all").textContent =
        formatTime(videoDuration);
    videoLenghtIsSet = true;
}

//===========//
//DRAG CANCEL//
//===========//

document.addEventListener("dragstart", (event) => {
    event.preventDefault();
});
document.addEventListener("drag", (event) => {
    event.preventDefault();
});
document.addEventListener("drop", (event) => {
    event.preventDefault();
});

//============//
//PROGRESS BAR//
//============//

const videoLengthNow = document.querySelector("#video-length-now");
const videoProgressBarValue = document.querySelector("#progress-bar-value");

let lastTimeVideoRewind = 0;
let throttleRate = 1000 / 90;
let lastProgressBarValue = 0;

let videoProgressBarIsMouseDown = false;
videoProgressBar.addEventListener("pointerdown", (event) => {
    videoProgressBarIsMouseDown = true;
    videoPause();
    videoRewind(event);
});
document.addEventListener("pointerup", () => {
    if (videoProgressBarIsMouseDown) {
        if (globalIsPlay) {
            videoPlay();
        }
        video.currentTime = video.duration * lastProgressBarValue;
    }
    videoProgressBarIsMouseDown = false;
});

document.addEventListener("pointermove", (event) => {
    const now = Date.now();
    if (
        videoProgressBarIsMouseDown &&
        now - lastTimeVideoRewind >= throttleRate
    ) {
        lastTimeVideoRewind = now;
        videoRewind(event);
    }
});

videoProgressBar.addEventListener("touchstart", (event) => {
    videoProgressBarIsMouseDown = true;
    videoPause();
    videoRewind(event.touches[0]);
});
document.addEventListener("touchend", () => {
    if (videoProgressBarIsMouseDown) {
        if (globalIsPlay) {
            videoPlay();
        }
        video.currentTime = video.duration * lastProgressBarValue;
    }
    videoProgressBarIsMouseDown = false;
});
document.addEventListener("touchmove", (event) => {
    const now = Date.now();
    if (
        videoProgressBarIsMouseDown &&
        now - lastTimeVideoRewind >= throttleRate
    ) {
        lastTimeVideoRewind = now;
        videoRewind(event.touches[0]);
    }
});

let lastTimeVideoSCT = 0;
const throttleRateSCT = 1000 / 5;

function videoRewind(event) {
    const progressBarWidth = videoProgressBar.offsetWidth;
    let offsetX = 0;
    const rect = videoProgressBar.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetX = Math.max(0, Math.min(offsetX, progressBarWidth));

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
function handleResizeProgressBar() {
    videoProgressBarCircle.style.transform = `translateX(${
        (videoProgressBar.offsetWidth * video.currentTime) / video.duration
    }px)`;
}
window.addEventListener("resize", handleResizeProgressBar);

//========//
//SETTINGS//
//========//

let settingsDefaultState = true;
let settingsMenuSpeedButtonIsClicked = false;

let videoSpeed = 1;

settingsButton.addEventListener("click", () => {
    if (settingsButtonIsClicked) {
        settingsButtonIsClicked = false;
        settingsSvg.style.transform = "rotate(30deg)";
        settingsMenu.style.opacity = "1";
        setTimeout(() => {
            settingsMenu.style.display = "";
        }, 100);
        if (showToolbarTimeoutDisplay) {
            clearTimeout(showToolbarTimeoutDisplay);
        }
        showToolbar();
    } else {
        setSettingsMenuDefault(true);
        showToolbarTimeoutDisplay = setTimeout(() => {
            hideToolbar();
        }, 2000);
    }
});
document.addEventListener("click", (event) => {
    if (
        !settingsButtonIsClicked &&
        event.target != settingsButton &&
        !settingsButton.contains(event.target) &&
        event.target != settingsMenu &&
        !settingsMenu.contains(event.target)
    ) {
        setSettingsMenuDefault(true);
        showToolbarTimeoutDisplay = setTimeout(() => {
            if (isPlay) {
                hideToolbar();
            }
        }, 2000);
    }
});

const svgChevronRight = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF" ><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>`;
const svgChevronLeft = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>`;
const svgSpeedIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.25 18.3C3.61667 17.5667 3.10833 16.75 2.725 15.85C2.34167 14.95 2.1 14 2 13H4.05C4.15 13.7333 4.33333 14.4292 4.6 15.0875C4.86667 15.7458 5.21667 16.35 5.65 16.9L4.25 18.3ZM2 11C2.13333 10 2.38333 9.05 2.75 8.15C3.11667 7.25 3.61667 6.43334 4.25 5.7L5.65 7.1C5.21667 7.65 4.86667 8.25417 4.6 8.9125C4.33333 9.57084 4.15 10.2667 4.05 11H2ZM10.95 21.95C9.95 21.85 9.00417 21.6083 8.1125 21.225C7.22083 20.8417 6.4 20.35 5.65 19.75L7.05 18.3C7.63333 18.7333 8.24583 19.0917 8.8875 19.375C9.52917 19.6583 10.2167 19.85 10.95 19.95V21.95ZM7.1 5.7L5.65 4.25C6.4 3.65 7.22083 3.15834 8.1125 2.775C9.00417 2.39167 9.96667 2.15 11 2.05V4.05C10.25 4.15 9.55 4.34167 8.9 4.625C8.25 4.90834 7.65 5.26667 7.1 5.7ZM9.5 16.5V7.5L16.5 12L9.5 16.5ZM13 21.95V19.95C15.0167 19.6667 16.6875 18.775 18.0125 17.275C19.3375 15.775 20 14.0167 20 12C20 9.98334 19.3375 8.225 18.0125 6.725C16.6875 5.225 15.0167 4.33334 13 4.05V2.05C15.5667 2.33334 17.7083 3.41667 19.425 5.3C21.1417 7.18334 22 9.41667 22 12C22 14.5833 21.1417 16.8167 19.425 18.7C17.7083 20.5833 15.5667 21.6667 13 21.95Z"fill="white"/></svg>`;
const svgQualityIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 17H21V18H15V17ZM11 17H3V18H11V20H12V18V17V15H11V17ZM14 8H15V6V5V3H14V5H3V6H14V8ZM18 5V6H21V5H18ZM6 14H7V12V11V9H6V11H3V12H6V14ZM10 12H21V11H10V12Z" fill="white"/></svg>`;
const svgCheckIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.55001 18L3.85001 12.3L5.27501 10.875L9.55001 15.15L18.725 5.975L20.15 7.4L9.55001 18Z" fill="white"/></svg>`;

function setSettingsMenuDefault(isClose) {
    if (isClose) {
        settingsButtonIsClicked = true;
        settingsSvg.style.transform = "";
        settingsMenu.style.opacity = "0";
        setTimeout(() => {
            settingsMenu.style.display = "none";
        }, 100);
    }

    if (!settingsDefaultState) {
        setTimeout(() => {
            settingsMenu.style.width = "300px";
            settingsMenu.replaceChildren();
            settingsMenu.appendChild(
                createSettingsElement(
                    svgSpeedIcon,
                    "Скорость воспроизведения",
                    `${videoSpeed}x`,
                    svgChevronRight,
                    (labelType = 1),
                    (itemType = 1),
                    (clickFunc = () => {
                        setTimeout(() => {
                            settingsMenuSpeedClick();
                        }, 10);
                    }),
                ),
            );
            settingsMenu.appendChild(
                createSettingsElement(
                    svgQualityIcon,
                    "Качество",
                    `720p`,
                    svgChevronRight,
                    (labelType = 1),
                    (itemType = 1),
                ),
            );
        }, 100);

        settingsDefaultState = true;
    }
}
function createSettingsElement(
    icon,
    label,
    content,
    chevron,
    labelType = 2,
    itemType = 1,
    clickFunc = false,
    argsForClickFunc,
) {
    const itemClass =
        itemType == 1 ? "settings-menu-item" : "settings-menu-item-2";
    const element = document.createElement("div");
    element.classList.add(itemClass);

    const elementIcon = document.createElement("div");
    elementIcon.classList.add("settings-menu-item-icon");
    elementIcon.innerHTML = icon;

    const elementLabel = document.createElement("div");
    const labelClass =
        labelType == 1
            ? "settings-menu-item-label"
            : "settings-menu-item-label-2";
    elementLabel.classList.add(labelClass);
    elementLabel.innerHTML = label;

    const elementContent = document.createElement("div");
    elementContent.classList.add("settings-menu-item-content");
    elementContent.innerHTML = content;

    const elementChevron = document.createElement("div");
    elementChevron.classList.add("settings-menu-item-chevron");
    elementChevron.innerHTML = chevron;

    element.appendChild(elementIcon);
    element.appendChild(elementLabel);
    if (content) element.appendChild(elementContent);
    if (chevron) element.appendChild(elementChevron);
    if (clickFunc)
        element.onclick = () => {
            clickFunc({ element: element, args: argsForClickFunc });
        };
    return element;
}
//========//
//SETTINGS//
//SPEED   //
//========//

const settingsMenuSpeedButton = document.querySelector("#settings-menu-speed");
settingsMenuSpeedButton.addEventListener("click", (event) => {
    setTimeout(() => {
        settingsMenuSpeedClick();
    }, 100);
});
function settingsMenuSpeedClick() {
    settingsDefaultState = false;
    settingsMenu.style.width = "220px";

    settingsMenu.replaceChildren();
    const backButton = createSettingsElement(
        svgChevronLeft,
        "Скорость воспроизведения",
        "",
        "",
        (labelType = 2),
        (itemType = 2),
    );
    backButton.addEventListener("click", () => {
        setSettingsMenuDefault(false);
    });
    settingsMenu.appendChild(backButton);

    const speedsArray = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    for (speed of speedsArray) {
        let chIcon = speed == videoSpeed ? svgCheckIcon : "";
        settingsMenu.appendChild(
            createSettingsElement(
                chIcon,
                `${speed}x`,
                "",
                "",
                (labelType = 2),
                (itemType = 1),
                (clickFunc = settingsSetSpeed),
                (argsForClickFunc = speed),
            ),
        );
    }
}
function settingsSetSpeed(args) {
    const svgCheckIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.55001 18L3.85001 12.3L5.27501 10.875L9.55001 15.15L18.725 5.975L20.15 7.4L9.55001 18Z" fill="white"/></svg>`;

    for (let i = 1; i < settingsMenu.children.length; i++) {
        settingsMenu.children[i].children[0].innerHTML = "";
    }
    args.element.children[0].innerHTML = svgCheckIcon;
    video.playbackRate = args.args;
    videoSpeed = args.args;
}

//==========//
//FULLSCREEN//
//==========//

const fullscreenButton = document.querySelector("#fullscreen-button");
let isFullscreen = false;

const svgFullscreenOff = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 7H22V10H14V7Z" fill="white"/><path d="M14 2H17V10H14V2Z" fill="white"/><path d="M14 14H22V17H14V14Z" fill="white"/><path d="M14 14H17V22H14V14Z" fill="white"/><path d="M2 14H10V17H2V14Z" fill="white"/><path d="M7 14H10V22H7V14Z" fill="white"/><path d="M2 7H10V10H2V7Z" fill="white"/><path d="M7 2H10V10H7V2Z" fill="white"/></svg>`;
const svgFullscreenOn = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 19H10V22H2V19Z" fill="white"/><path d="M2 14H5V22H2V14Z" fill="white"/><path d="M2 2H10V5H2V2Z" fill="white"/><path d="M2 2H5V10H2V2Z" fill="white"/><path d="M14 2H22V5H14V2Z" fill="white"/><path d="M19 2H22V10H19V2Z" fill="white"/><path d="M14 19H22V22H14V19Z" fill="white"/><path d="M19 14H22V22H19V14Z" fill="white"/></svg>`;

function toggleFullscreen() {
    const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
        if (videoplayerContainer.requestFullscreen) {
            videoplayerContainer.requestFullscreen();
        } else if (videoplayerContainer.mozRequestFullScreen) {
            videoplayerContainer.mozRequestFullScreen();
        } else if (videoplayerContainer.webkitRequestFullscreen) {
            videoplayerContainer.webkitRequestFullscreen();
        } else if (videoplayerContainer.msRequestFullscreen) {
            videoplayerContainer.msRequestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation
                .lock("landscape")
                .then(() => {
                    console.log("Screen locked to landscape");
                })
                .catch((error) => {
                    console.error("Failed to lock screen orientation:", error);
                });
        }

        fullscreenButton.innerHTML = svgFullscreenOff;
        isFullscreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }

        fullscreenButton.innerHTML = svgFullscreenOn;
        isFullscreen = false;
    }
}

fullscreenButton.addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (event) => {
    if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
    }
});

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("mozfullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
document.addEventListener("msfullscreenchange", handleFullscreenChange);

function handleFullscreenChange() {
    isFullscreen = !!(
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
    fullscreenButton.innerHTML = isFullscreen
        ? svgFullscreenOff
        : svgFullscreenOn;
}

//============//
//FAST FORWARD//
//============//

const leftFastForwardElement = document.querySelector("#fast-forward-left");
const rightFastForwardElement = document.querySelector("#fast-forward-right");

document.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft" && videoIsStarted) {
        leftFastForward();
    } else if (event.code === "ArrowRight" && videoIsStarted) {
        rightFastForward();
    }
});

let lastTapTime = 0;
const doubleTapDelay = 200;

videoplayerContainer.addEventListener("touchstart", (event) => {
    if (
        videoIsStarted &&
        event.target != toolbar &&
        !toolbar.contains(event.target)
    ) {
        let currentTime = new Date().getTime();
        let tapDistance = currentTime - lastTapTime;

        const rect = videoplayerContainer.getBoundingClientRect();
        const x = event.touches[0].clientX - rect.left;
        const vpWidth = rect.width;

        if (x < vpWidth / 2) {
            if (tapDistance < doubleTapDelay) {
                leftFastForward();
            }
        } else if (x > vpWidth / 2) {
            if (tapDistance < doubleTapDelay) {
                rightFastForward();
            }
        }
        lastTapTime = currentTime;
    }
});

let leftFastForwardTimeout;
let rightFastForwardTimeout;

function leftFastForward() {
    if (leftFastForwardTimeout) {
        clearTimeout(leftFastForwardTimeout);
    }
    leftFastForwardElement.style.display = "";

    leftFastForwardTimeout = setTimeout(() => {
        leftFastForwardElement.style.opacity = "1";
        leftFastForwardTimeout = setTimeout(() => {
            leftFastForwardElement.style.opacity = "0";
            leftFastForwardTimeout = setTimeout(() => {
                leftFastForwardElement.style.display = "none";
                leftFastForwardTimeout = undefined;
            }, 300);
        }, 500);
    }, 1);
    video.currentTime -= 10;
    console.log("forward: ", lastProgressBarValue);
    if (isEnded) {
        restartVideoContainer.style.display = "none";
        isEnded = false;
    }
}

function rightFastForward() {
    if (rightFastForwardTimeout) {
        clearTimeout(rightFastForwardTimeout);
    }
    rightFastForwardElement.style.display = "";

    rightFastForwardTimeout = setTimeout(() => {
        rightFastForwardElement.style.opacity = "1";
        rightFastForwardTimeout = setTimeout(() => {
            rightFastForwardElement.style.opacity = "0";
            rightFastForwardTimeout = setTimeout(() => {
                rightFastForwardElement.style.display = "none";
                rightFastForwardTimeout = undefined;
            }, 300);
        }, 500);
    }, 1);
    video.currentTime += 10;
    console.log("forward: ", lastProgressBarValue);
}
