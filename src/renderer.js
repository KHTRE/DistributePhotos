/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

console.log('👋 This message is being logged by "renderer.js", included via webpack');

const addFilesBtn = document.getElementById('add-files-btn');
const outputFolderBtn = document.getElementById('output-folder-btn');
const distributeBtn = document.getElementById('distribute-btn');
const progressBar = document.getElementById('progress-bar');
const logArea = document.getElementById('log-area');
const inputList = document.getElementById('input-list');
const outputFolderName = document.getElementById('output-folder-name');

let inputPaths = [];
let outputPath = '';
let lastStats = { moved: 0, skipped: 0, errored: 0 };

function updateDistributeState() {
  distributeBtn.disabled = !(inputPaths.length > 0 && outputPath);
}

function renderInputList() {
  inputList.innerHTML = '';
  inputPaths.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    inputList.appendChild(li);
  });
}

function renderOutputFolder() {
  outputFolderName.textContent = outputPath || '';
}

addFilesBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.selectInput();
  if (result && result.length > 0) {
    inputPaths = result;
    renderInputList();
    updateDistributeState();
  }
});

outputFolderBtn.addEventListener('click', async () => {
  const result = await window.electronAPI.selectOutput();
  if (result) {
    outputPath = result;
    renderOutputFolder();
    updateDistributeState();
  }
});

distributeBtn.addEventListener('click', () => {
  progressBar.value = 0;
  logArea.textContent = '';
  lastStats = { moved: 0, skipped: 0, errored: 0 };
  window.electronAPI.startDistribution({ inputPaths, outputPath });
});

window.electronAPI.onProgress((percent) => {
  progressBar.value = percent;
});

window.electronAPI.onLog((msg) => {
  logArea.textContent += msg + '\n';
  if (msg.startsWith('Copied:')) lastStats.moved++;
  if (msg.startsWith('Skipped')) lastStats.skipped++;
  if (msg.startsWith('Error:')) lastStats.errored++;
});

window.electronAPI.onDistributionDone(() => {
  logArea.textContent += 'Distribution complete!\n';
  logArea.textContent += `Moved: ${lastStats.moved}, Skipped: ${lastStats.skipped}, Errored: ${lastStats.errored}\n`;
});
