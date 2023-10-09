const { app, BrowserWindow, crashReporter, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const { setVibrancy } = require('electron-acrylic-window')
const Store = require('electron-store');
const robot = require('robotjs')
const nut = require('@nut-tree/nut-js')
const $ = require('jquery');
const fs = require('fs');
const path = require('path');
const os = require('os')
const activeWin = require('active-win');
const fii = require('file-icon-info');
const wifiName = require('wifi-name');
const audio = require('win-audio').speaker;
const { exec } = require('child_process');
const store = new Store();

let childWindow = null;
let keyprompt;
let win
let volumeLevel
let sWidth
let mainInt
let cwinContSize

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
crashReporter.start({ uploadToServer: false });

// Window defs region begins -----

function createWindow() {
    win = new BrowserWindow({
        width: 1366,
        height: 50,
        maxHeight: 50,
        x: 0,
        y: 0,
        frame: false,
        transparent: true,
        hasShadow: false,
        titleBarStyle: 'hidden',
        resizable: false,
        maximizable: false,
        minimizable: false,
        skipTaskbar: true,
        roundedCorners: false,
        alwaysOnTop: true,
        visibleOnAllWorkspaces: true,
        focusable: false,
        visualEffectState: 'active',
        useContentSize: true,
        // vibrancy: {
        //     effect: 'acrylic', // (default) or 'blur'
        //     disableOnBlur: false // (default)
        // },
        show: false,
        icon: __dirname + '/resc/branding/brand_ico.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })
    setWindowPermSize();
    // setVibrancy(win, { effect: 'acrylic', disableOnBlur: false })

    win.loadFile('index.html')
    audio.polling(500);
}

ipcMain.on('show-keyfield', () => {
    if (!keyprompt) {
        keyprompt = new BrowserWindow({
            parent: win,
            modal: true,
            width: 350,
            height: 135,
            center: true,
            resizable: false,
            movable: true,
            titleBarStyle: 'hidden',
            alwaysOnTop: true,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });

        keyprompt.loadFile('keyfield.html');
    } else {
        keyprompt = null;
    }
});

function optionsPopup(themeTBA) {
    if (childWindow == null) {
        childWindow = new BrowserWindow({
            width: 300,
            height: 4,
            x: sWidth - 305,
            y: 55,
            autoHideMenuBar: true,
            skipTaskbar: true,
            show: false,
            alwaysOnTop: true,
            titleBarStyle: 'hidden',
            resizable: false,
            vibrancy: {
                effect: 'acrylic', // (default) or 'blur'
                disableOnBlur: false, // (default)
                theme: themeTBA
            },
            icon: __dirname + '/resc/branding/brand_ico.ico',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });
        childWindow.loadFile('popup.html');
        childWindow.once('ready-to-show', () => {
            childWindow.setPosition(sWidth - 305, 55, true)
            setVibrancy(childWindow, { effect: 'acrylic', disableOnBlur: false, theme: themeTBA })
            childWindow.webContents.executeJavaScript(`document.body.scrollHeight`).then((result) => {
                childWindow.setSize(300, result + 8, true)
            })
            childWindow.show();
        });
        childWindow.on('close', () => {
            childWindow = null;
        })
        childWindow.on('blur', () => {
            childWindow.close();
        })
    } else {
        childWindow.show();
    }
    childWindow.webContents.on("before-input-event", (event, input) => {
        childWindow.webContents.send('before-input-event', input)
    });
}

ipcMain.on('cwin-ready', function () {
    childWindow.webContents.executeJavaScript(`document.body.scrollHeight`).then((result) => {
        childWindow.setSize(300, result + 8, true)
    })
})

// Window defs region ends -----

// APPBAR region begins -----

const ffi = require('@lwahonen/ffi-napi');
const ref = require('@lwahonen/ref-napi');
const Struct = require('ref-struct-di')(ref);

// Define the APPBARDATA structure as per the Microsoft documentation
const APPBARDATA = Struct({
    cbSize: ref.types.int,
    hWnd: ref.refType(ref.types.void),
    uCallbackMessage: ref.types.int,
    uEdge: ref.types.int,
    rc: Struct({
        left: ref.types.int,
        top: ref.types.int,
        right: ref.types.int,
        bottom: ref.types.int,
    }),
    lParam: ref.refType(ref.types.void)
});

const shabm_shell32 = ffi.Library('shell32.dll', {
    'SHAppBarMessage': ['int32', ['uint32', APPBARDATA]]
});

const registerwm_user32 = new ffi.Library('user32', {
    'RegisterWindowMessageA': ['uint', ['string']]
});

// user32 MoveWindow signature
const movewindow_user32 = new ffi.Library('user32', {
    'MoveWindow': ['bool', [ref.refType(ref.types.void), 'uint32', 'uint32', 'uint32', 'uint32', 'bool']]
});

function ABSetPos(hWnd) {
    let appBarDataPos = new APPBARDATA();
    appBarDataPos.cbSize = APPBARDATA.size;
    appBarDataPos.hWnd = hWnd;
    appBarDataPos.uEdge = 1;
    appBarDataPos.rc.left = 0;
    appBarDataPos.rc.right = 1366;
    appBarDataPos.rc.top = 0;
    appBarDataPos.rc.bottom = 50;

    shabm_shell32.SHAppBarMessage(2 /* ABMsg_QUERYPOS */, appBarDataPos.ref());
    shabm_shell32.SHAppBarMessage(3 /* ABMsg_SETPOS */, appBarDataPos.ref());
    // let result = movewindow_user32.MoveWindow(appBarDataPos.hWnd, appBarDataPos.rc.left, appBarDataPos.rc.top, appBarDataPos.rc.right - appBarDataPos.rc.left, appBarDataPos.rc.bottom - appBarDataPos.rc.top, true);
    movewindow_user32.MoveWindow(appBarDataPos.hWnd, appBarDataPos.rc.left, appBarDataPos.rc.top, appBarDataPos.rc.right - appBarDataPos.rc.left, appBarDataPos.rc.bottom - appBarDataPos.rc.top, true);
    // console.log(result);
}

function initAppBar() {
    let handle = win.getNativeWindowHandle();
    let hWnd = handle.readUInt32LE(0);
    const hWndBuffer = Buffer.alloc(ref.sizeof.pointer);
    hWndBuffer.writeUInt32LE(hWnd, 0);

    // Register 12bar to allow for it to send AppBar messages to Windows
    let registerUCallback = registerwm_user32.RegisterWindowMessageA("AppBarMessage")

    // Initialize the APPBARDATA structure
    let appBarData = new APPBARDATA();
    appBarData.cbSize = APPBARDATA.size;
    appBarData.hWnd = hWndBuffer;
    appBarData.uCallbackMessage = registerUCallback;
    appBarData.uEdge = 1;
    appBarData.rc.left = 0;
    appBarData.rc.top = 0;
    appBarData.rc.right = 1366;
    appBarData.rc.bottom = 50;

    // Register the appbar
    let result = shabm_shell32.SHAppBarMessage(0, appBarData.ref());
    shabm_shell32.SHAppBarMessage(0, appBarData.ref());
    console.log(result);
    ABSetPos(hWndBuffer);
}

// APPBAR region ends -----

// Note:
// initAppBar() is actually run at the very bottom of app.whenReady()
// Comment in/out the function to test the APPBAR functionality


// app. region begins -----

app.whenReady().then(() => {
    createWindow()

    sWidth = screen.getPrimaryDisplay().workAreaSize.width;

    const trayMenu = Menu.buildFromTemplate([
        { label: 'Settings', type: 'normal', click: () => { optionsPopup() } },
        { label: 'DevTools', type: 'normal', click: () => { win.openDevTools({ mode: 'detach' }) } },
        { type: 'separator' },
        { label: 'Relaunch', type: 'normal', click: () => { app.quit(0); app.relaunch(0) } },
        { label: 'Quit', type: 'normal', click: () => { app.quit() } }
    ])
    const icon = nativeImage.createFromPath('resc/branding/brand_ico.ico')
    const tray = new Tray(icon)
    tray.setContextMenu(trayMenu)
    tray.setToolTip('12Bar')
    tray.on('double-click', () => {
        win.webContents.send('get-theme')
    });

    volumeLevel = audio.get();

    // const networkInterfaces = os.networkInterfaces();
    // console.log(networkInterfaces);
    setWindowPermSize();
    networkInfo();

    // Appbar function
    // initAppBar();
})

app.on('will-quit', function () {
    mainInt = null;
})

// app. region ends -----

// ipcMain events region begins -----

mainInt = setInterval(() => {
    getActiveWindow().then((windowInfo) => {
        if (windowInfo) {
            if (windowInfo.owner.name == 'Windows Explorer' || windowInfo.owner.name == '') {
                if (windowInfo.title == '') {
                    win.webContents.send('desktop');
                }
            } else {
                win.webContents.send('no-desktop');
            }

            // I HIGHLY recommend leaving this DISABLED:
            // console.log(windowInfo);
            // win.webContents.send('volumeLevel', volumeLevel);

            getFocusedAppName().then(({ name, title }) => {
                if (name !== 'Electron'
                    && name !== 'Windows Start Experience Host'
                    && name !== 'Windows Shell Experience Host'
                    && title !== 'System tray overflow window.'
                    && title !== 'PowerToys.PowerLauncher'
                    && name !== 'Windows Default Lock Screen'
                    && name !== '12bar'
                    && title !== '12bar'
                    && title !== 'UnlockingWindow'
                    && title !== 'Desktop Coral'
                    && title !== 'Task View'
                    && title !== 'Snap Assist'
                    && name !== 'Rainmeter desktop customization tool'
                    && title !== 'Window Dialog'
                    && title !== 'Program Manager'
                    && title !== 'Search'
                    && name !== "Application Frame Host") {
                    getFocusedAppIcon().then(iconPath => {
                        // console.log(iconPath);
                        fii.getIcon(iconPath, data => {
                            win.webContents.send('icon-data', data);
                        })
                    })
                    win.webContents.send('winTitle', name, title);
                }
            });
        }
    });

    setWindowPermSize();

    backgroundFillState().then((hex) => {
        win.webContents.send('backColor', hex)
    }).catch((error) => {
        // console.error('Error updating background fill state:', error);
    });
}, 500);

async function backgroundFillState() {
    bgFillState = store.get('bg-state')
    if (bgFillState == true) {
        const color = await nut.screen.colorAt(new nut.Point(2, 51));
        const rgb = color.R + ',' + color.G + ',' + color.B;
        const hex = '#' + rgb.split(',').map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        return hex;
    } else {
        const color = await nut.screen.colorAt(new nut.Point(2, 49));
        const rgb = color.R + ',' + color.G + ',' + color.B;
        const hex = '#' + rgb.split(',').map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
        return hex;
    }
}

// function backgroundFillState() {
//     bgFillState = store.get('bg-state')
//     if (bgFillState == true) {
//         win.webContents.send('backColor', "#" + robot.getPixelColor(2, 51));
//     } else {
//         win.webContents.send('backColor', "#" + robot.getPixelColor(2, 49));
//     }
// }

ipcMain.on('set-bg-state', (_event, state) => {
    store.set('bg-state', state);
})

audio.events.on('change', (volume) => {
    // volumeLevel = audio.get();

    var newVol = String(volume.new);  // Convert to string if necessary
    var cleanedVol = newVol.replace('%', '');  // Remove the '%' sign
    win.webContents.send('volumeLevel', cleanedVol);
});

ipcMain.on('win-show', function () {
    setWindowPermSize();
    win.show();
    // initAppBar();
    // setVibrancy(win, { effect: 'acrylic', disableOnBlur: false })
})

ipcMain.on('getUserImage', (event, command) => {
    var username = os.userInfo().username;
    try {
        exec("wmic useraccount where name='" + username + "' get sid", (error, stdout, stderr) => {
            // if (error) {
            //     throw new Error(error.message);
            // }
            var str = stdout; // your string here
            var longestLine = removeShortLines(str);

            var pathA = process.env.systemdrive + '\\Users\\Public\\AccountPictures\\' + longestLine;
            var pathB = pathA.trim();

            function getFirstFileInFolder(folderPath) {
                try {
                    const files = fs.readdirSync(folderPath);
                    if (files.length > 0) {
                        return path.join(folderPath, files[0]);
                    }
                } catch (error) {
                    win.webContents.send('main-console-forward', `Error: ${error.message}`)
                    return null;
                }
                return null;
            }

            const firstFilePath = getFirstFileInFolder(pathB);
            event.sender.send('userimage-output', firstFilePath);
        });
    } catch (error) {
        win.webContents.send('main-console-forward', `Error: ${error.message}`)
    }
});

ipcMain.on('get-netinfo', function () {
    networkInfo();
})

ipcMain.on('power-dialog', function () {
    shutdownWindows();
});

ipcMain.on('getVolumeLevel', (event) => {
    volumeLevel = audio.get();
    // console.log(volumeLevel);
    event.reply('volumeLevel', volumeLevel);
});

ipcMain.on('got-theme-sw', (_event, themeTBA) => {
    optionsPopup(themeTBA);
})

ipcMain.on('toggleBackground', function () {
    win.webContents.send('toggleBackground');
})

ipcMain.on('toggleTheme', (_event, themeTBA) => {
    win.webContents.send('toggleTheme');
    childWindow.close();
    optionsPopup(themeTBA)
})

ipcMain.on('toggleUserMenu', function () {
    win.webContents.send('toggleUserMenu');
})

ipcMain.on('ctrlHotkey', (event, key) => {
    if (key == 'r') {
        win.reload()
        win.webContents.send('checkBackground')
        backgroundFillState();
    }
})

ipcMain.on('checkCopilot', function () {
    win.webContents.send('checkCopilot')
})

ipcMain.on('no-copilot', function () {
    childWindow.webContents.send('no-copilot')
})

ipcMain.on('user-enable-copilot', function () {
    win.webContents.send('user-enable-copilot')
})

ipcMain.on('user-disable-copilot', function () {
    win.webContents.send('user-disable-copilot')
})

ipcMain.on('toggleSearch', function () {
    win.webContents.send('toggleSearch')
})

ipcMain.on('show-popup', (_event, themeTBA) => {
    optionsPopup(themeTBA);
});

ipcMain.on('show-tray-popup', function () {
    robot.keyTap('b', ['command']);
    robot.keyTap('enter');
})

ipcMain.on('devTools', function () {
    win.openDevTools({
        mode: 'detach'
    })
})

ipcMain.on('reset-app', function () {
    mainInt = null;
    win.webContents.send('reset-app');
    app.quit(0);
    app.relaunch(0);
})

ipcMain.on('latLon', (_event, lat, lon) => {
    win.webContents.send('latLon', lat, lon);
})

ipcMain.on('oobe-complete', function () {
    app.quit(0);
    app.relaunch(0);
})

ipcMain.on('winHotkey', (event, key) => {
    robot.keyTap(key, ['command']);
})

ipcMain.on('exit', function () {
    app.quit(0);
})

// ipcMain events region begins -----

// General functions region begins -----

function removeShortLines(str) {
    var lines = str.split('\n');
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].includes('S-1-')) {
            return lines[i];
        }
    }
    return '';
}

function getActiveWindow() {
    return activeWin();
}

function shutdownWindows() {
    let vbscript = `
        Dim objShell
        Set objShell = CreateObject("shell.application")
        objShell.ShutdownWindows
        Set objShell = Nothing
    `;

    // Write VBScript to a temporary file
    let tempFile = path.join(os.tmpdir(), 'shutdownWindows.vbs');
    fs.writeFileSync(tempFile, vbscript);

    // Execute the VBScript file
    let command = `cscript //nologo "${tempFile}"`;

    exec(command);

    // Delete the temporary file
    // fs.unlinkSync(tempFile);
}

function networkInfo() {
    exec('powershell.exe Get-NetConnectionProfile', (error, stdout, stderr) => {
        if (error) {
            win.webContents.send('main-console-forward', `Error: ${error.message}`)
            return;
        }
        const lines = stdout.split('\n');
        const parsedOutput = {};
        lines.forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) {
                parsedOutput[key.trim()] = value.trim();
            }
        });

        win.webContents.send('network-info', parsedOutput);
    });
}

function setWindowPermSize() {
    var sWidth2 = screen.getPrimaryDisplay().workAreaSize.width;
    win.setContentSize(sWidth2, 50);
    win.setBounds(sWidth2, 50);
    win.setSize(sWidth2, 50, true);
    win.setMinimumSize(1, 1);
    win.setShape([{
        x: 0,
        y: 0,
        width: sWidth2,
        height: 50
    }]);
}

async function getFocusedAppIcon() {
    const activeWindow = await activeWin();
    return activeWindow ? activeWindow.owner.path : '';
}

async function getFocusedAppName() {
    const activeWindow = await activeWin();
    if (activeWindow == null) {
        return activeWindow ? { name: '', title: '' } : '';
    } else if (activeWindow.owner.name == null) {
        return activeWindow ? { name: '', title: activeWindow.title } : '';
    } else if (activeWindow.title == null) {
        return activeWindow ? { name: activeWindow.owner.name, title: '' } : '';
    } else {
        return activeWindow ? { name: activeWindow.owner.name, title: activeWindow.title } : null;
    }
}

// General functions region ends -----