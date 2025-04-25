const { app, Menu, Tray, globalShortcut, nativeTheme, nativeImage, systemPreferences } = require('electron');
const { exec } = require('child_process');
const path = require('path');

const WORK = 30
const BREAK = 5
let tray = null;
let timeLeft = WORK * 60;
let isRunning = false;
let interval = null;
let isWorkCycle = true;
let soundChild;
let trayIconSuffix = "";
const TRAY_ICON_PATH = `${__dirname}/images/tray_icon`

app.whenReady().then(() => {
    tray = new Tray(getTrayIcon());
    updateTray();

    // Context menu for tray
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Skip', click: () => switchCycle() },
        { label: 'Quit', click: () => app.quit() }
    ]);
    // tray.setContextMenu(contextMenu);

    tray.on('right-click', () => {
        startTimer();
    });

    tray.on('click', () => {
        tray.popUpContextMenu(contextMenu)
    })

    globalShortcut.register('Control+Shift+P', () => {
        startTimer();
    });
    globalShortcut.register('Control+Shift+K', () => {
        switchCycle();
    });

    // Listen for theme changes
    nativeTheme.on('updated', () => {
        updateTrayIcon();
    });

    app.dock.hide(); // Hide dock icon on macOS
});

function startTimer() {
    try {
        if (isRunning) {
            clearInterval(interval)
            isRunning = false
            return
        };
        isRunning = true;
        interval = setInterval(() => {
            timeLeft--;
            updateTray();
            if (timeLeft <= 0) {
                playCycleEndSound();
                switchCycle();
            }
        }, 1000);
        if (soundChild != null) {
            soundChild.kill()
            soundChild = null
        }
    } finally {
        updateTrayIcon()
    }
}

function updateTray() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    tray.setTitle(timeString);
}

function getTrayIcon() {
    trayIconSuffix = isRunning ? "" : "-paused"
    const basePath = nativeTheme.shouldUseDarkColors ? 'icon-dark' : 'icon-dark';
    const iconPath = path.join(TRAY_ICON_PATH, `${basePath}${trayIconSuffix}@2x.png`)
    const img = nativeImage.createFromPath(iconPath);
    // img.addRepresentation({
    //     scaleFactor: 2,
    //     width: 32,
    //     height: 32,
    //     path: path.join(__dirname, `${basePath}@2x.png`)
    // });
    return img
}

function updateTrayIcon() {
    if (tray) {
        tray.setImage(getTrayIcon());
    }
}

function playCycleEndSound() {
    const soundFile = isWorkCycle
        ? 'sounds/Radar.m4r' // Sound for end of work cycle
        : 'sounds/Time-Passing.m4r'; // Sound for end of break cycle
    soundChild = exec(`afplay ${soundFile}`, (err) => {
        if (err) console.error(new Date().toLocaleString(), 'Error playing sound:', err);
    });
}

function switchCycle() {
    isWorkCycle = !isWorkCycle;
    timeLeft = isWorkCycle ? WORK * 60 : BREAK * 60; // Switch between 25 min work and 5 min break
    updateTray();
}

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});