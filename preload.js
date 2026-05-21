const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  print: (htmlContent) => ipcRenderer.send('print-page', htmlContent),
  savePDF: (htmlContent, filename) => ipcRenderer.send('save-pdf', { htmlContent, filename })
})
