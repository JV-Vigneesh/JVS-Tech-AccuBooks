const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Database operations
  getDbPath: () => ipcRenderer.invoke("get-db-path"),
  readDatabase: () => ipcRenderer.invoke("read-database"),
  writeDatabase: (data) => ipcRenderer.invoke("write-database", data),
  exportDatabase: () => ipcRenderer.invoke("export-database"),
  importDatabase: () => ipcRenderer.invoke("import-database"),

  // App info
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  isElectron: true,
});
