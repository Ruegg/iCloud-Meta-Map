const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require("path");
const isDev = require("electron-is-dev");
let mainWindow;

function createWindow() {
    app.commandLine.appendSwitch('disable-web-security');
    mainWindow = new BrowserWindow({
        width: 900,
        height: 680,
        title: 'iCloud Meta Map',
        backgroundColor: '#fff',
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true
        },
        icon: path.join(__dirname, '../build/icon.png')
    });
    mainWindow.setMenuBarVisibility(isDev);
    mainWindow.loadURL(
        isDev ?
        "http://localhost:3000" :
        `file://${path.join(__dirname, "../build/index.html")}`
    );
    mainWindow.on("closed", () => (mainWindow = null));
}
app.on("ready", createWindow);
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
