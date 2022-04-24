const {app, BrowserWindow} = require('electron')
const {width, height} = require('./theme.js')

app.whenReady().then(createWindow)

/**
 * Create the main window
 */
function createWindow() {
    const win = new BrowserWindow({
        width,
        height,
        resizable: true,
        frame: true,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadFile('index.html')
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

