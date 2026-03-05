const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add IPC helpers here if needed later
});
