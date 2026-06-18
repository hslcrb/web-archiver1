import { getAllFromDB } from '../engines/db.js';

let currentData = {
  requests: [],
  snapshots: [],
  startTime: Date.now()
};

async function loadData() {
  currentData.requests = await getAllFromDB("requests");
  currentData.snapshots = await getAllFromDB("snapshots");
  displayData();
}

function displayData() {
  const info = document.getElementById('sessionInfo');
  const list = document.getElementById('requestList');
  if (!currentData) return;
  info.innerText = `총 요청: ${currentData.requests.length}개 | 스냅샷: ${currentData.snapshots.length}개`;
  
  // 대용량 리스트 렌더링 최적화 (상위 100개만 우선 표시)
  const displayRequests = currentData.requests.slice(0, 100);
  list.innerHTML = displayRequests.map(req => `
    <tr>
      <td>${new Date(req.timestamp).toLocaleTimeString()}</td>
      <td>${req.method}</td>
      <td class="url-cell" title="${req.url}">${req.url}</td>
      <td>${req.type}</td>
    </tr>
  `).join('');
}

document.getElementById('exportZip').addEventListener('click', async () => {
  if (currentData.requests.length === 0) return;
  const blob = await window.exportFullZip(currentData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "web_archive_full.zip";
  a.click();
});

document.getElementById('exportWacz').addEventListener('click', async () => {
  if (currentData.requests.length === 0) return;
  const blob = await window.exportWACZ(currentData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "web_archive.wacz";
  a.click();
});

document.getElementById('openPlayer').addEventListener('click', () => {
  window.open('player.html', '_blank');
});

loadData();
