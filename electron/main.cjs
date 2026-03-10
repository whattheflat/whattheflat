const { app, BrowserWindow, systemPreferences } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

async function handlePermissions() {
  // macOS requires an explicit native request for microphone access in packaged apps
  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone')
      if (status !== 'granted') {
        await systemPreferences.askForMediaAccess('microphone')
      }
    } catch (err) {
      console.error('[Main] Microphone permission error:', err)
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 620,
    minHeight: 600,
    title: 'WhatTheFlat ♭? - JamBuddy',
    icon: path.join(__dirname, '../assets/whattheflat-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,  // allows renderer getUserMedia to work on all platforms
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await handlePermissions()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
