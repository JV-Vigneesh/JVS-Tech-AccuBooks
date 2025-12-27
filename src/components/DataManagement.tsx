import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Database, RefreshCw, HardDrive, Monitor, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { isElectron, getAppInfo, electronExportDatabase, electronImportDatabase } from '@/lib/electron';

export default function DataManagement() {
  const { exportData, importData, lastSaved, forceSync, dbPath } = useDatabase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [appInfo, setAppInfo] = useState<{ version: string; userDataPath: string; dbPath: string } | null>(null);
  const isDesktopApp = isElectron();

  useEffect(() => {
    if (isDesktopApp) {
      getAppInfo().then(info => setAppInfo(info));
    }
  }, [isDesktopApp]);

  const handleExport = async () => {
    if (isDesktopApp) {
      // Use native file dialog in Electron
      const savedPath = await electronExportDatabase();
      if (savedPath) {
        toast({
          title: 'Data Exported',
          description: `Database saved to: ${savedPath}`,
        });
      }
    } else {
      // Browser download
      exportData();
      toast({
        title: 'Data Exported',
        description: 'Your database has been downloaded as a .db file',
      });
    }
  };

  const handleImportClick = async () => {
    if (isDesktopApp) {
      // Use native file dialog in Electron
      setIsImporting(true);
      try {
        const data = await electronImportDatabase();
        if (data) {
          toast({
            title: 'Data Imported',
            description: 'Your database has been restored. Refreshing...',
          });
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        toast({
          title: 'Import Failed',
          description: err instanceof Error ? err.message : 'Failed to import database',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
      }
    } else {
      // Browser file picker
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.db')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a .db file',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      await importData(file);
      toast({
        title: 'Data Imported',
        description: 'Your database has been restored. Refreshing...',
      });
      // Reload to apply changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({
        title: 'Import Failed',
        description: err instanceof Error ? err.message : 'Failed to import database',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      toast({
        title: 'Synced',
        description: isDesktopApp ? 'Database saved to local file' : 'Database saved to browser storage',
      });
    } catch (err) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to save database',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Management
        </CardTitle>
        <CardDescription>
          {isDesktopApp 
            ? 'Your data is stored locally on your PC in a SQLite database file.'
            : 'Your data is stored locally in a SQLite database. Export to create portable backups.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Mode Indicator */}
        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
          {isDesktopApp ? (
            <Monitor className="h-5 w-5 text-primary" />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isDesktopApp ? 'Desktop App Storage' : 'Browser Storage'}
            </p>
            {isDesktopApp && appInfo ? (
              <p className="text-xs text-muted-foreground font-mono truncate" title={appInfo.dbPath}>
                {appInfo.dbPath}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {lastSaved
                  ? `Last saved: ${format(lastSaved, 'PPp')}`
                  : 'Not yet saved'}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>

        {/* Last Saved (for Desktop) */}
        {isDesktopApp && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <HardDrive className="h-4 w-4 text-primary" />
            <p className="text-sm">
              {lastSaved
                ? `Last saved: ${format(lastSaved, 'PPp')}`
                : 'Not yet saved'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Export Database</h4>
            <p className="text-sm text-muted-foreground">
              {isDesktopApp 
                ? 'Save a copy of your database to any location'
                : 'Download your data as a portable .db file'}
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Import Database</h4>
            <p className="text-sm text-muted-foreground">
              Restore data from a backup .db file
            </p>
            <Button
              variant="outline"
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
            {!isDesktopApp && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".db"
                onChange={handleFileChange}
                className="hidden"
              />
            )}
          </div>
        </div>

        {isDesktopApp ? (
          <div className="p-4 border border-primary/30 bg-primary/10 rounded-lg">
            <p className="text-sm text-primary">
              <strong>Desktop Mode:</strong> Your data is automatically saved to your PC. 
              No cloud, no browser storage - your data stays on your computer.
            </p>
          </div>
        ) : (
          <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Tip:</strong> For desktop app with local file storage, export this project 
              and build it as an Electron app. Your data will be stored directly on your PC.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
