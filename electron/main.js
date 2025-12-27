import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the user data path for storing the database

// Use the directory where main.js (or the executable) lives
let dbPath;

if (process.env.NODE_ENV === "development") {
  dbPath = path.join(__dirname, "accounting_data.db"); // Dev: project folder
} else {
  dbPath = path.join(path.dirname(process.execPath), "accounting_data.db"); // Prod: next to exe
}

// Fallback if folder is not writable
try {
  fs.accessSync(path.dirname(dbPath), fs.constants.W_OK);
} catch (err) {
  dbPath = path.join(app.getPath("userData"), "accounting_data.db");
}


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/favicon.ico"),
    title: "Accounting Manager",
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:8080");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// ───────────────── IPC Handlers ─────────────────

// Get the database file path
ipcMain.handle("get-db-path", () => dbPath);

// Read database
ipcMain.handle("read-database", async () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      return { success: true, data: Array.from(data) };
    }
    return { success: false, error: "Database file not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Write database
ipcMain.handle("write-database", async (_event, data) => {
  try {
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    return { success: true, path: dbPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export database
ipcMain.handle("export-database", async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Database",
      defaultPath: `accounting_data_${new Date().toISOString().split("T")[0]}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    });

    if (!result.canceled && result.filePath) {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, result.filePath);
        return { success: true, path: result.filePath };
      }
      return { success: false, error: "No database to export" };
    }
    return { success: false, error: "Export cancelled" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import database
ipcMain.handle("import-database", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import Database",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const importPath = result.filePaths[0];
      const data = fs.readFileSync(importPath);
      fs.writeFileSync(dbPath, data);
      return { success: true, data: Array.from(data) };
    }
    return { success: false, error: "Import cancelled" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App info
ipcMain.handle("get-app-info", () => ({
  version: app.getVersion(),
  userDataPath: app.getPath("userData"),
  dbPath,
}));
