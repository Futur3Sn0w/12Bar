const { ipcRenderer } = require('electron')
const $ = require('jquery');
var bg = localStorage.getItem('background');
var themePreference = localStorage.getItem('themePreference');
var searchPref = localStorage.getItem('searchPref');
var userMenu = localStorage.getItem('userMenuPref');
var tempUnit = localStorage.getItem('tempUnit');
var userCopilot = localStorage.getItem('user-copilot');

const os = require('os');

$(window).on('load', function () {
    var userImg = localStorage.getItem('userImgPath');
    var username = os.userInfo().username;

    ipcRenderer.send('checkCopilot');

    if (bg == 'true') {
        $('.backgroundCB').attr('checked', true)
    }

    if (themePreference) {
        $(':root').addClass(themePreference);
        $('.themeCB').prop('checked', themePreference === 'dark-theme');
    }

    if (tempUnit == 'f') {
        $('.tempUnitCB').prop('checked', true)
        $('.tempUnitBtn .tuTemp').text('°F');
    } else if (tempUnit == 'c') {
        $('.tempUnitCB').prop('checked', false)
        $('.tempUnitBtn .tuTemp').text('°C');
    }

    if (searchPref == 'true') {
        $('.searchToggleCB').attr('checked', true);
    }

    if (userMenu == 'true') {
        $('.userimgCB').attr('checked', true);
    } else if (userMenu == 'false') {
        $('.userimgCB').attr('checked', false);
    }

    if (userCopilot == 'true') {
        $('.copilotCB').attr('checked', true)
    }

    $('.userImg').attr('src', userImg);
    $('.username').text(username);
    if (themePreference) {
        $('.searchImg').attr('src', 'resc/imgs/search/' + themePreference.replace('-theme', '') + '.svg')
    }

    ipcRenderer.send('cwin-ready');
})

ipcRenderer.on('no-copilot', function () {
    $('.copilotBtn').addClass('hide');
})

$('.copilotBtn').on('click', function () {
    localStorage.setItem('user-copilot', $('.copilotCB').is(':checked'))
    if (localStorage.getItem('user-copilot') == 'true') {
        ipcRenderer.send('user-enable-copilot')
    } else if (localStorage.getItem('user-copilot') == 'false') {
        ipcRenderer.send('user-disable-copilot')
    }
})

$('.refreshBtn').on('click', function () {
    if ($('.refreshBtn').hasClass('debug')) {
        ipcRenderer.send('devTools');
    } else {
        ipcRenderer.send('ctrlHotkey', 'r');
    }
})

$('.tempUnitBtn').on('click', function () {
    var newTempUnitPref = $('.tempUnitCB').is(':checked') ? 'f' : 'c';
    localStorage.setItem('tempUnit', newTempUnitPref);
    if (newTempUnitPref == 'f') {
        $('.tempUnitBtn .tuTemp').text('°F');
    } else if (newTempUnitPref == 'c') {
        $('.tempUnitBtn .tuTemp').text('°C');
    }
    ipcRenderer.send('ctrlHotkey', 'r');
})

$('.backgroundBtn').on('click', function () {
    ipcRenderer.send('toggleBackground');
    localStorage.setItem('background', $('.backgroundCB').is(':checked'))
})

$('.themeCB').on('click', function () {
    $(':root').toggleClass('light-theme dark-theme');
    var newThemePref = $(':root').hasClass('light-theme') ? 'light-theme' : 'dark-theme';
    var themeToSend = $(':root').hasClass('light-theme') ? 'light' : 'dark';
    localStorage.setItem('themePreference', newThemePref);
    ipcRenderer.send('toggleTheme', themeToSend);
});

$('.searchToggleCB').on('click', function () {
    ipcRenderer.send('toggleSearch');
    var searchStat = $('.searchToggleCB').is(':checked') ? 'true' : 'false';
    localStorage.setItem('searchPref', searchStat);
});

$('.userimgBtn').on('click', function () {
    ipcRenderer.send('toggleUserMenu');
    var userMenuPref = $('.userimgCB').is(':checked') ? 'true' : 'false';
    localStorage.setItem('userMenuPref', userMenuPref);
});

$('.exitBtn').on('click', function () {
    ipcRenderer.send('exit');
})

ipcRenderer.on("before-input-event", (event, input) => {
    localStorage.setItem('ctrl', input.control)
});


$('.resetBtn').on('click', function () {
    var ctrl = localStorage.getItem('ctrl')
    if (ctrl == 'true') {
        ipcRenderer.send('reset-app')
    } else {
        alert('In order to prevent accidental presses, hold the Ctrl key before clicking this to reset 12bar.')
    }
});

$('.popupCloseBtn').on('click', function () {
    window.close();
})

ipcRenderer.on('refresh', function () {
    location.reload();
})

$('.btn1').on('click', function () {
    ipcRenderer.send('winHotkey', 'i');
})

$('.btn2').on('click', function () {
    if ($('.btn2').attr('btnTxt') == 'Dev tools') {
        ipcRenderer.send('devTools')
    } else {
        ipcRenderer.send('show-popup');
    }
})

$('.btn3').on('click', function () {
    ipcRenderer.send('power-dialog');
})

ipcRenderer.on('before-input-event', (_event, input) => {
    if (input.control) {
        $('.btn2').attr('btnTxt', 'Dev tools').text('')
    } else {
        $('.btn2').attr('btnTxt', 'Refresh 12Bar').text('')
    }
})