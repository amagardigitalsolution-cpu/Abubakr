const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'EduResults — School Results System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  })
  mainWindow.loadFile('index.html')
  Menu.setApplicationMenu(null)
}

// ── PRINT ──────────────────────────────────────────────────────────────
ipcMain.on('print-page', (event, htmlContent) => {
  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false }
  })
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)
  printWin.loadURL(dataUrl)
  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print(
      { silent: false, printBackground: true, margins: { marginType: 'none' } },
      (success, errorType) => {
        if (!success) console.log('Print error:', errorType)
        printWin.close()
      }
    )
  })
})

// ── SAVE AS PDF ────────────────────────────────────────────────────────
ipcMain.on('save-pdf', async (event, { htmlContent, filename }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Report Card as PDF',
    defaultPath: filename,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  if (!filePath) return

  const pdfWin = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false }
  })
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent)
  pdfWin.loadURL(dataUrl)
  pdfWin.webContents.on('did-finish-load', async () => {
    const pdfData = await pdfWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
    fs.writeFileSync(filePath, pdfData)
    pdfWin.close()
  })
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
