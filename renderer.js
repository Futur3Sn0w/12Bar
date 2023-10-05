const { ipcRenderer, ipcMain } = require('electron')
const { exec } = require('child_process');
const os = require('os');
const $ = require('jquery');

var bg = localStorage.getItem('background');
var lat = localStorage.getItem('locLat');
var lon = localStorage.getItem('locLon');
var themePreference = localStorage.getItem('themePreference');
var searchPref = localStorage.getItem('searchPref');
var tempUnit = localStorage.getItem('tempUnit');
var userMenu = localStorage.getItem('userMenuPref');
var userCopilot = localStorage.getItem('user-copilot');
var currentWinBuild = os.release().replace('10.0.', '');

const weatherCodes = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow fall",
    73: "Moderate Snow fall",
    75: "Heavy Snow fall",
    77: "Snow grains",
    80: "Slight Rain showers",
    81: "Moderate Rain showers",
    82: "Violent Rain showers",
    85: "Slight snow showers ",
    86: "Heavy snow showers ",
    95: "Thunderstorm with slight hail",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail"
};

let batteryIsCharging = false;

$(window).on('load', function () {
    checkOobe();
    // appLblCheck();
    currentTime();


    ipcRenderer.send('getVolumeLevel');
    ipcRenderer.send('getUserImage');

    $('.appLabel').addClass('notitle')
    $('p.name').hide();
    $('.appLabel .sep').hide();

    if (bg == null) {
        localStorage.setItem('background', false);
    } else if (bg == 'true') {
        $('.backgroundFill').addClass('enabled')
    }

    if (userMenu == null) {
        localStorage.setItem('userMenuPref', true);
    } else if (userMenu == 'true') {
        $('.profileBtn').removeClass('hide')
    } else if (userMenu == 'false') {
        $('.profileBtn').addClass('hide')
    }

    if (tempUnit == null) {
        localStorage.setItem('tempUnit', 'c');
    } else if (tempUnit == 'f') {
        localStorage.setItem('tempUnit', 'f');
    } else if (tempUnit == 'c') {
        localStorage.setItem('tempUnit', 'c');
    }
    checkKey();

    if (themePreference) {
        $(':root').addClass(themePreference);
        $('.searchImg').attr('src', 'resc/imgs/search/' + themePreference.replace('-theme', '') + '.svg')
    } else {
        $(':root').addClass('light-theme');
        localStorage.setItem('themePreference', 'light-theme');
    }

    if (searchPref) {
        if (searchPref == 'true') {
            $('.search .icn').addClass('img')
        }
    }

    if (currentWinBuild < 23493) {
        $('.copilot').addClass('unsupported');
    }

    if (userCopilot == null) {
        localStorage.setItem('user-copilot', true);
    } else if (userCopilot == 'true') {
        $('.copilot').removeClass('user-disable')
    } else if (userCopilot == 'false') {
        $('.copilot').addClass('user-disable')
    }

    $('.wifiIcon').hide();
    ipcRenderer.send('get-netinfo')

    $('body').addClass('loaded');
})

ipcRenderer.on('network-info', (_event, netInf) => {
    var conType = netInf['InterfaceAlias'];
    // var conName = netInf['Name'];
    // The above should work, just isn't needed at the moment

    if (conType == 'Wi-Fi') {
        $('.wifiIcon').show();
        $('.wifiIcon').text('')
    } else if (conType == 'Ethernet') {
        $('.wifiIcon').show();
        $('.wifiIcon').text('')
    } else {
        $('.wifiIcon').hide();
    }
})

ipcRenderer.on('userimage-output', (_event, path) => {
    if (path == null || path == 'null') {
        $('.profileImg').attr('src', process.env.systemdrive + "\\ProgramData\\Microsoft\\User Account Pictures\\user.png");
        localStorage.setItem('userImgPath', process.env.systemdrive + "\\ProgramData\\Microsoft\\User Account Pictures\\user.png");
    } else {
        $('.profileImg').attr('src', path);
        localStorage.setItem('userImgPath', path);
    }
})

ipcRenderer.on('toggleTempUnit', function () {
    checkKey();
})

ipcRenderer.on('checkCopilot', function () {
    if (currentWinBuild < 23493) {
        ipcRenderer.send('no-copilot');
    }
})

ipcRenderer.on('user-enable-copilot', function () {
    $('.copilot').removeClass('user-disable')
})

ipcRenderer.on('user-disable-copilot', function () {
    $('.copilot').addClass('user-disable')
})

ipcRenderer.on('toggleUserMenu', function () {
    userMenu = localStorage.getItem('userMenuPref')
    if (userMenu == 'true') {
        $('.profileBtn').removeClass('hide')
    } else if (userMenu == 'false') {
        $('.profileBtn').addClass('hide')
    }
})

function currentTime() {
    let date = new Date();
    let hh = date.getHours();
    let mm = date.getMinutes();
    let smallDay = date.getDate();
    let smallMonth = date.getMonth() + 1;
    const days = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
    ];

    const currentDay = days[date.getDay()];

    if (hh == 0) {
        hh = 12;
    }
    if (hh > 12) {
        hh = hh - 12;
    }

    hh = (hh < 10) ? "0" + hh : hh;
    mm = (mm < 10) ? "0" + mm : mm;
    smallMonth = (smallMonth < 10) ? "0" + smallMonth : smallMonth;
    smallDay = (smallDay < 10) ? "0" + smallDay : smallDay;

    let time = hh + ":" + mm;
    let dateString = currentDay + " " + smallMonth + "/" + smallDay;

    $('.date').text(dateString);
    $('.time').text(time);
    let t = setTimeout(function () { currentTime() }, 1000);
}

function checkKey() {
    if (navigator.geolocation) {
        console.log("Geolocation is supported.");
        getLatLon().catch((error) => {
            alert(`Error: ${error.message}`);
        });
    } else {
        console.log("Geolocation is not enabled and/or supported by this device.");
    }
    ipcRenderer.send('win-show');
    newWeatherBalloon(lat, lon);
    window.setInterval("newWeatherBalloon(lat, lon);", 10000);
}

function checkOobe() {
    if (localStorage.getItem('oobe') == 'done') {

    } else {
        ipcRenderer.send('show-keyfield');
    }
}

async function getLatLon() {
    try {
        const response = await fetch(`http://ip-api.com/json`);
        const { lat, lon } = await response.json();

        localStorage.setItem("locLat", lat);
        localStorage.setItem("locLon", lon);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

function newWeatherBalloon() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&daily=weathercode&current_weather=true&timezone=auto&forecast_days=1')
        .then(function (resp) { return resp.json() }) // Convert data to json
        .then(function (data) {
            $('.weather').show();
            setTimeout(newDrawWeather(data), 10000);
        })
        .catch(function (error) {
            location.reload();
            blankFunction();
            console.error('An error occurred:', error);
        });
}

function newDrawWeather(d) {
    var feel = weatherCodes[d.current_weather.weathercode];
    var theme;
    var tempPref;
    if (tempUnit == 'c') {
        tempPref = Math.round(d.current_weather.temperature);
    } else if (tempUnit == 'f') {
        tempPref = Math.round((d.current_weather.temperature * 1.8) + 32);
    }
    document.getElementById('wtemp').innerText = tempPref + '°';
    var wIcon = d.current_weather.weathercode;
    if ($(':root').hasClass('dark-theme')) {
        theme = 'dark';
    } else {
        theme = 'light';
    }
    $('.wicon').attr('src', "resc/imgs/weather/" + weatherCodes[d.current_weather.weathercode].replace(/\s+/g, "").toLowerCase() + '.svg');
    $('.wfeel').text(feel)
}

function blankFunction() {
    $('.weather').hide();
}

function toTitleCase(str) {
    return str.replace(/\b\w/g, function (match) {
        return match.toUpperCase();
    });
}

function appLblCheck() {
    if ($('.appLabel').width() <= 30 || $('.appLabel').text().includes('No app selected')) {
        $('.appLabel').addClass('hide');
        $('.appIcn').addClass('hide');
        $('.searchBox').text('Type here to search the web, apps, and your device')
    } else {
        $('.appLabel').removeClass('hide');
        $('.appIcn').removeClass('hide');
        // $('.searchBox').text('Type here to search')
    }
}

function changeTextColor() {
    var backgroundColor = $(".backgroundFill").css("background-color");
    var rgb = backgroundColor.match(/\d+/g);
    var brightness = (299 * rgb[0] + 587 * rgb[1] + 114 * rgb[2]) / 1000;
    var textColor = brightness > 128 ? "black" : "white";
    $(':root').css('--global-text', textColor);
}

$('.statIcons').on('click', function () {
    ipcRenderer.send('winHotkey', 'a');
})

$('.timeDate').on('click', function () {
    ipcRenderer.send('winHotkey', 'n');
})

$('.mainBar').on('click', function () {
    ipcRenderer.send('winHotkey', 's');
})

$('.weather').on('click', function () {
    ipcRenderer.send('winHotkey', 'w');
})

$('.copilot').on('click', function () {
    ipcRenderer.send('winHotkey', 'c');
})

$('.profileBtn').on('click', function () {
    let themeToSend
    if (themePreference == 'light-theme') {
        themeToSend = 'light'
    } else if (themePreference == 'dark-theme') {
        themeToSend = 'dark'
    }
    ipcRenderer.send('show-popup', themeToSend);
})

$('.dropDownBtn').on('click', function () {
    // var inputCtrl = localStorage.getItem('ctrl2');
    // if (inputCtrl == 'true') {
    // ipcRenderer.send('show-popup');
    // } else {
    ipcRenderer.send('show-tray-popup')
    // }
})

if (navigator.getBattery()) {
    setInterval(() => {
        navigator.getBattery().then((battery) => {
            var battNum = battery.level * 100;
            $('.batteryIcn .fill').width(battNum + "%");

            if (battNum <= 10) {
                $('.batteryIcn').text('');
            } else if (battNum <= 20) {
                $('.batteryIcn').text('');
            } else if (battNum <= 30) {
                $('.batteryIcn').text('');
            } else if (battNum <= 40) {
                $('.batteryIcn').text('');
            } else if (battNum <= 50) {
                $('.batteryIcn').text('');
            } else if (battNum <= 60) {
                $('.batteryIcn').text('');
            } else if (battNum <= 70) {
                $('.batteryIcn').text('');
            } else if (battNum <= 80) {
                $('.batteryIcn').text('');
            } else if (battNum <= 90) {
                $('.batteryIcn').text('');
            } else if (battNum <= 100) {
                $('.batteryIcn').text('');
            }

            batteryIsCharging = battery.charging;
            battery.addEventListener("chargingchange", () => {
                batteryIsCharging = battery.charging;
            });
            if (batteryIsCharging) {
                $('.batteryIcn').text('');
            }
        });
    }, 5000);
} else {
    $('.batteryIcn').hide();
}

ipcRenderer.on('winTitle', (_event, name, title) => {
    // appLblCheck();
    // console.log(data)
    $('.appLabel p.name').text(name);
    $('.appLabel p.title').text(title);

    if (name == "Visual Studio Code"
        || name == "Microsoft Edge"
        || name == "Notepad.exe"
        || name == "Discord"
        || name == "mspaint.exe"
        || name == "Google Chrome"
        || name == title) {
        $('.appLabel').addClass('notitle')
        $('p.name').hide();
        $('.appLabel .sep').hide();
    } else {
        $('.appLabel').removeClass('notitle')
        $('p.name').show();
        $('.appLabel .sep').show();
    }

    if (title == "") {
        $('.appLabel').addClass('notitle')
    } else {
        $('.appLabel').removeClass('notitle')
    }
    appLblCheck();
})

ipcRenderer.on('get-theme', function () {
    let themeToSend
    if (themePreference == 'light-theme') {
        themeToSend = 'light'
    } else if (themePreference == 'dark-theme') {
        themeToSend = 'dark'
    }
    ipcRenderer.send('got-theme-sw', themeToSend);
})

ipcRenderer.on('desktop', function () {
    $('.mainBar').addClass('desktop')
    $('.searchBox').text('Type here to search the web, apps, and your device')
})

ipcRenderer.on('no-desktop', function () {
    $('.mainBar').removeClass('desktop')
    $('.searchBox').text('Type here to search')
})

ipcRenderer.on('checkBackground', (_event) => {
    if (bg == null) {
        localStorage.setItem('background', false);
    } else if (bg == 'true') {
        $('.backgroundFill').addClass('enabled')
    } else if (bg == 'false') {
        $('.backgroundFill').removeClass('enabled')
    }
})

ipcRenderer.on('backColor', (_event, color) => {
    $('.backgroundFill').css('background-color', color);
    changeTextColor();
})

ipcRenderer.on('icon-data', (_event, data) => {
    $('.aiImg').attr('src', `data:image/png;base64,${data}`);
});

ipcRenderer.on('toggleTheme', function () {
    $(':root').toggleClass('light-theme dark-theme')
    location.reload();
})

ipcRenderer.on('toggleUserMenu', function () {
    if (userMenu == null) {
        localStorage.setItem('userMenuPref', true);
    } else if (userMenu == 'true') {
        $('.profileBtn').removeClass('hide')
    } else if (userMenu == 'false') {
        $('.profileBtn').addClass('hide')
    }
})

ipcRenderer.on('toggleBackground', (_event) => {
    $('.backgroundFill').toggleClass('enabled');
})

ipcRenderer.on('toggleSearch', function () {
    $('.search .icn').toggleClass('img');
})

ipcRenderer.on('disableBackground', (_event) => {
    $('.backgroundFill').removeClass('enabled');
})

ipcRenderer.on('volumeLevel', (event, volumeLevel) => {
    console.log('System volume level:', volumeLevel);
    if (volumeLevel <= 1) {
        $('.volIcon').text('')
        $('.volIcon').addClass('mute')
    } else if (volumeLevel <= 5) {
        $('.volIcon').text('')
        $('.volIcon').removeClass('mute')
    } else if (volumeLevel <= 33) {
        $('.volIcon').text('')
        $('.volIcon').removeClass('mute')
    } else if (volumeLevel <= 66) {
        $('.volIcon').text('')
        $('.volIcon').removeClass('mute')
    } else if (volumeLevel <= 100) {
        $('.volIcon').text('')
        $('.volIcon').removeClass('mute')
    }
});

ipcRenderer.on('reset-app', function () {
    localStorage.clear();
})

ipcRenderer.on('main-console-forward', (_event, errorMsg) => {
    console.log(errorMsg);
})