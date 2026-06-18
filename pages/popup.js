const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');
const statusText = document.getElementById('statusText');
const statsText = document.getElementById('statsText');

function updateUI() {
  chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response) => {
    if (response) {
      if (response.recording) {
        statusText.innerText = "녹화 중...";
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        exportBtn.classList.add('hidden');
      } else {
        statusText.innerText = "대기 중";
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        if (response.requestCount > 0) {
          exportBtn.classList.remove('hidden');
        }
      }
      statsText.innerText = `요청: ${response.requestCount}개`;
    }
  });
}

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "START_RECORDING" }, updateUI);
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "STOP_RECORDING" }, updateUI);
});

exportBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'pages/index.html' });
});

setInterval(updateUI, 1000);
updateUI();
