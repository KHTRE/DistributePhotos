import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'Input');
const OUTPUT_DIR = path.join(ROOT, 'Output');
const LOG_FILE = path.join(ROOT, 'log.txt');
const ERROR_LOG_FILE = path.join(ROOT, 'errorsLog.txt');

// Recursively get all file paths under a directory
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

// Generate SHA-256 hash of a file's content
async function getFileHash(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

// Generate unique filename or detect duplicate
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

// Organize files by last modified date and log results
async function organizeFilesByModifiedDate() {
  const files = await getAllFilesRecursively(INPUT_DIR);
  const logLines = [];
  const errorLines = [];
  let countMoved = 0;
  let countSkipped = 0;

  for (const inputFilePath of files) {
    try {
      const stat = await fs.stat(inputFilePath);
      const modifiedAt = stat.mtime;

      const year = modifiedAt.getFullYear();
      const month = String(modifiedAt.getMonth() + 1).padStart(2, '0');
      const targetFolder = path.join(OUTPUT_DIR, `${year}-${month}`);

      await fs.mkdir(targetFolder, { recursive: true });

      const newFileName = await generateUniqueFileNameWithComparison(targetFolder, inputFilePath);

      if (newFileName === null) {
        logLines.push(`Skipped (duplicate): ${path.relative(INPUT_DIR, inputFilePath)}`);
        countSkipped++;
        continue;
      }

      const targetFilePath = path.join(targetFolder, newFileName);
      await fs.rename(inputFilePath, targetFilePath);

      logLines.push(`Moved: ${path.relative(INPUT_DIR, inputFilePath)} → ${path.relative(ROOT, targetFilePath)}`);
      countMoved++;
    } catch (err) {
      errorLines.push(`Error: ${inputFilePath}\nReason: ${err.message}\n`);
    }
  }

  logLines.push(`\nTotal files moved: ${countMoved}`);
  logLines.push(`Total files skipped (identical): ${countSkipped}`);

  await fs.writeFile(LOG_FILE, logLines.join('\n'), 'utf8');
  if (errorLines.length > 0) {
    await fs.writeFile(ERROR_LOG_FILE, errorLines.join('\n'), 'utf8');
    console.warn(`⚠️ Some files caused errors. See errorsLog.txt`);
  }

  console.log(`✅ ${countMoved} file(s) moved, ${countSkipped} skipped. See log.txt for details.`);
}

organizeFilesByModifiedDate().catch(err => {
  console.error('❌ Unexpected error:', err);
});



