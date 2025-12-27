// Electron API type definitions and utilities

export interface ElectronAPI {
  getDbPath: () => Promise<string>;
  readDatabase: () => Promise<{ success: boolean; data?: number[]; error?: string }>;
  writeDatabase: (data: number[]) => Promise<{ success: boolean; path?: string; error?: string }>;
  exportDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>;
  importDatabase: () => Promise<{ success: boolean; data?: number[]; error?: string }>;
  getAppInfo: () => Promise<{ version: string; userDataPath: string; dbPath: string }>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Check if running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
};

// Get the Electron API (only available in Electron)
export const getElectronAPI = (): ElectronAPI | null => {
  if (isElectron()) {
    return window.electronAPI!;
  }
  return null;
};

// Read database from file system (Electron only)
export const electronReadDatabase = async (): Promise<Uint8Array | null> => {
  const api = getElectronAPI();
  if (!api) return null;
  
  const result = await api.readDatabase();
  if (result.success && result.data) {
    return new Uint8Array(result.data);
  }
  return null;
};

// Write database to file system (Electron only)
export const electronWriteDatabase = async (data: Uint8Array): Promise<boolean> => {
  const api = getElectronAPI();
  if (!api) return false;
  
  const result = await api.writeDatabase(Array.from(data));
  return result.success;
};

// Export database with file dialog (Electron only)
export const electronExportDatabase = async (): Promise<string | null> => {
  const api = getElectronAPI();
  if (!api) return null;
  
  const result = await api.exportDatabase();
  if (result.success && result.path) {
    return result.path;
  }
  return null;
};

// Import database with file dialog (Electron only)
export const electronImportDatabase = async (): Promise<Uint8Array | null> => {
  const api = getElectronAPI();
  if (!api) return null;
  
  const result = await api.importDatabase();
  if (result.success && result.data) {
    return new Uint8Array(result.data);
  }
  return null;
};

// Get app info (Electron only)
export const getAppInfo = async (): Promise<{ version: string; userDataPath: string; dbPath: string } | null> => {
  const api = getElectronAPI();
  if (!api) return null;
  
  return await api.getAppInfo();
};
