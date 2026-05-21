const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

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

// Write HTML to a temp file and return the path
function writeTempHTML(htmlContent) {
  const tempPath = path.join(os.tmpdir(), `eduresults_${Date.now()}.html`)
  fs.writeFileSync(tempPath, htmlContent, 'utf-8')
  return tempPath
}

// ── PRINT ──────────────────────────────────────────────────────────────
ipcMain.on('print-page', (event, htmlContent) => {
  const tempFile = writeTempHTML(htmlContent)

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  printWin.loadFile(tempFile)

  printWin.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      printWin.webContents.print(
        { silent: false, printBackground: true, margins: { marginType: 'none' } },
        (success, errorType) => {
          if (!success) console.log('Print error:', errorType)
          printWin.close()
          try { fs.unlinkSync(tempFile) } catch(e) {}
        }
      )
    }, 500) // small delay so page fully renders
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

  const tempFile = writeTempHTML(htmlContent)

  const pdfWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  pdfWin.loadFile(tempFile)

  pdfWin.webContents.on('did-finish-load', async () => {
    setTimeout(async () => {
      try {
        const pdfData = await pdfWin.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        })
        fs.writeFileSync(filePath, pdfData)
        pdfWin.close()
        try { fs.unlinkSync(tempFile) } catch(e) {}
      } catch(err) {
        console.log('PDF error:', err)
        pdfWin.close()
      }
    }, 800) // wait for fonts and images to load
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
