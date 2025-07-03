const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

function setupIpcHandlers(mainWindow) {
  ipcMain.handle('select-input', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'openDirectory', 'multiSelections'],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('select-output', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.on('start-distribution', async (event, { inputPaths, outputPath }) => {
    mainWindow.webContents.send('distribution-log', `Input: ${inputPaths.join(', ')}`);
    mainWindow.webContents.send('distribution-log', `Output: ${outputPath}`);
    try {
      const files = await getAllFilesFromPaths(inputPaths);
      let countMoved = 0;
      let countSkipped = 0;
      let logLines = [];
      let errorLines = [];
      for (let i = 0; i < files.length; i++) {
        const inputFilePath = files[i];
        try {
          const stat = await fs.stat(inputFilePath);
          const modifiedAt = stat.mtime;
          const year = modifiedAt.getFullYear();
          const month = String(modifiedAt.getMonth() + 1).padStart(2, '0');
          const targetFolder = path.join(outputPath, `${year}-${month}`);
          await fs.mkdir(targetFolder, { recursive: true });
          const newFileName = await generateUniqueFileNameWithComparison(targetFolder, inputFilePath);
          if (newFileName === null) {
            logLines.push(`Skipped (duplicate): ${inputFilePath}`);
            countSkipped++;
            mainWindow.webContents.send('distribution-log', `Skipped (duplicate): ${inputFilePath}`);
            continue;
          }
          const targetFilePath = path.join(targetFolder, newFileName);
          await fs.copyFile(inputFilePath, targetFilePath);
          logLines.push(`Copied: ${inputFilePath} → ${targetFilePath}`);
          countMoved++;
          mainWindow.webContents.send('distribution-log', `Copied: ${inputFilePath} → ${targetFilePath}`);
        } catch (err) {
          errorLines.push(`Error: ${inputFilePath}\nReason: ${err.message}\n`);
          mainWindow.webContents.send('distribution-log', `Error: ${inputFilePath} Reason: ${err.message}`);
        }
        mainWindow.webContents.send('distribution-progress', Math.round(((i + 1) / files.length) * 100));
      }
      logLines.push(`\nTotal files copied: ${countMoved}`);
      logLines.push(`Total files skipped (identical): ${countSkipped}`);
      await fs.writeFile(path.join(outputPath, 'log.txt'), logLines.join('\n'), 'utf8');
      if (errorLines.length > 0) {
        await fs.writeFile(path.join(outputPath, 'errorsLog.txt'), errorLines.join('\n'), 'utf8');
      }
      mainWindow.webContents.send('distribution-done');
    } catch (err) {
      mainWindow.webContents.send('distribution-log', `Fatal error: ${err.message}`);
      mainWindow.webContents.send('distribution-done');
    }
  });
}

async function getAllFilesFromPaths(paths) {
  let allFiles = [];
  for (const p of paths) {
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
      allFiles.push(...(await getAllFilesRecursively(p)));
    } else if (stat.isFile()) {
      allFiles.push(p);
    }
  }
  return allFiles;
}

async function getAllFilesRecursively(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await getAllFilesRecursively(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function getFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function generateUniqueFileNameWithComparison(dir, originalFilePath) {
  const originalName = path.basename(originalFilePath);
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  const originalStat = await fs.stat(originalFilePath);
  const originalSize = originalStat.size;
  const originalHash = await getFileHash(originalFilePath);
  let newName = originalName;
  let index = 1;
  while (true) {
    const candidatePath = path.join(dir, newName);
    try {
      const candidateStat = await fs.stat(candidatePath);
      if (candidateStat.size !== originalSize) {
        newName = `${base} (${index})${ext}`;
        index++;
        continue;
      }
      const candidateHash = await getFileHash(candidatePath);
      if (candidateHash === originalHash) {
        return null; // Same file
      }
      newName = `${base} (${index})${ext}`;
      index++;
    } catch {
      break; // File doesn't exist — safe to use
    }
  }
  return newName;
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // mainWindow.webContents.openDevTools(); // Remove or comment out this line to prevent DevTools from opening
  setupIpcHandlers(mainWindow);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
