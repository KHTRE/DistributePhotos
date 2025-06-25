# Distribute Files Into Folders

This Node.js script recursively moves all files from the `Input/` folder (including subfolders) into the `Output/` folder, organizing them by their **last modified date** (`YYYY-MM` format).

## Features

- Handles files in nested folders
- Organizes by last modified date
- Skips duplicates (if content is identical)
- Renames conflicting files automatically
- Logs all actions in `log.txt`

## How to Use

1. Place files and folders inside the `Input/` directory.
2. Run the script:

```bash
node distribute.js