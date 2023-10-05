const { ipcRenderer } = require('electron')
const $ = require('jquery');

$('.saveBtn').on('click', function () {
    window.close();
    localStorage.setItem('oobe', 'done')
})

$('.quitBtn').on('click', function () {
    ipcRenderer.send('exit');
})