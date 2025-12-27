import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initDatabase, exportDatabase, importDatabase, saveDatabase, isRunningInElectron } from '@/lib/database';
import { getAppInfo } from '@/lib/electron';

interface DatabaseContextType {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
  dbPath: string | null;
  isDesktopApp: boolean;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  forceSync: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [isDesktopApp, setIsDesktopApp] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await initDatabase();
        setIsReady(true);
        setLastSaved(new Date());
        
        // Check if running in Electron and get path info
        const isElectron = isRunningInElectron();
        setIsDesktopApp(isElectron);
        
        if (isElectron) {
          const info = await getAppInfo();
          if (info) {
            setDbPath(info.dbPath);
          }
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const exportData = () => {
    const data = exportDatabase();
    if (!data) {
      console.error('No database to export');
      return;
    }

    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting_data_${new Date().toISOString().split('T')[0]}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          await importDatabase(data);
          setLastSaved(new Date());
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const forceSync = async (): Promise<void> => {
    await saveDatabase();
    setLastSaved(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 p-6 max-w-md">
          <div className="text-destructive text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Database Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <DatabaseContext.Provider
      value={{
        isReady,
        isLoading,
        error,
        lastSaved,
        dbPath,
        isDesktopApp,
        exportData,
        importData,
        forceSync,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
