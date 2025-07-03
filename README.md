# File Distributor

A standalone Electron app for Windows that organizes and distributes files from selected input folders into an output folder, grouping them by last modified date and avoiding duplicates.

## Features
- Select one or more input folders
- Select an output folder
- Distribute files by last modified date (YYYY-MM)
- Avoid duplicate files (by content hash and size)
- Progress bar and live logs
- Summary of moved, skipped, and errored files
- Build as a standalone Windows `.exe` installer

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later recommended)
- [npm](https://www.npmjs.com/)

### Setup
1. Open a terminal and navigate to the project directory:
   ```sh
   cd file-distributor
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

### Running in Development
Start the app in development mode:
```sh
npm start
```

### Building a Windows Installer (.exe)
To package the app as a Windows installer:
```sh
npm run make
```
- The installer `.exe` will be found in the `out/make/` directory (e.g., `out/make/squirrel.windows/x64/`).
- Double-click the `.exe` to install the app.

### Usage
1. Click **Add input folder** to select one or more folders or files as sources.
2. Click **Output folder** to select the destination folder.
3. Click **Distribute** to start organizing and copying files.
4. Watch the progress bar and logs for real-time updates.
5. After completion, see a summary of moved, skipped, and errored files in the logs.

### Notes
- Logs and error logs are saved in the output folder as `log.txt` and `errorsLog.txt`.
- The app avoids moving duplicate files by comparing file size and content hash.

### Customization
- To build a portable `.exe` (not an installer), or for advanced packaging options, see the [Electron Forge documentation](https://www.electronforge.io/).

---

**Enjoy using File Distributor!** 