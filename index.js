let currentData = null;

async function loadData() {
  chrome.runtime.sendMessage({ action: "STOP_RECORDING" }, (response) => {
    if (response && response.data) {
      currentData = response.data;
      displayData();
    }
  });
}

function displayData() {
  const info = document.getElementById('sessionInfo');
  const list = document.getElementById('requestList');
  if (!currentData) return;
  info.innerText = `시작 시간: ${new Date(currentData.startTime).toLocaleString()} | 총 요청: ${currentData.requests.length}개 | 스냅샷: ${currentData.snapshots.length}개`;
  list.innerHTML = currentData.requests.map(req => `
    <tr>
      <td>${new Date(req.timestamp).toLocaleTimeString()}</td>
      <td>${req.method}</td>
      <td class="url-cell" title="${req.url}">${req.url}</td>
      <td>${req.type}</td>
    </tr>
  `).join('');
}

document.getElementById('exportZip').addEventListener('click', async () => {
  if (!currentData) return;
  const blob = await exportFullZip(currentData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "web_archive_full.zip";
  a.click();
});

document.getElementById('exportWacz').addEventListener('click', async () => {
  if (!currentData) return;
  const blob = await exportWACZ(currentData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "web_archive.wacz";
  a.click();
});

loadData();
