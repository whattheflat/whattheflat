// Preload runs in a privileged context before the renderer.
// Expose only what the app actually needs from Node/Electron here.
// Currently the app is pure browser JS so nothing needs exposing.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
