// Floating Control Panel
(function() {
  const statusText = document.getElementById('statusText');
  const reqCount = document.getElementById('req-count');
  const recDot = document.getElementById('recDot');
  const controls = document.getElementById('controls');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const exportBtn = document.getElementById('exportBtn');

  // 드래그 기능
  const floatEl = document.getElementById('archiver-float');
  let isDragging = false;
  let startX, startY, initialX, initialY;

  floatEl.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = floatEl.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    floatEl.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    floatEl.style.position = 'fixed';
    floatEl.style.left = (initialX + dx) + 'px';
    floatEl.style.top = (initialY + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    floatEl.style.cursor = 'move';
  });

  // 상태 업데이트
  function updateUI() {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response) => {
      if (!response) return;
      
      reqCount.textContent = response.requestCount || 0;
      
      if (response.recording) {
        statusText.textContent = 'REC';
        controls.className = 'controls recording';
        recDot.style.display = 'block';
      } else {
        statusText.textContent = '대기 중';
        controls.className = 'controls stopped';
        recDot.style.display = 'none';
      }
    });
  }

  // 버튼 이벤트
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "START_RECORDING" }, (response) => {
      if (response && response.status === "started") {
        updateUI();
      }
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "STOP_RECORDING" }, (response) => {
      if (response && response.status === "stopped") {
        updateUI();
      }
    });
  });

  exportBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "OPEN_MANAGER" }, () => {
      // 관리 페이지 열기
    });
    
    // 확장 프로그램 페이지 열기
    if (chrome.runtime && chrome.runtime.getURL) {
      window.open(chrome.runtime.getURL('pages/index.html'), '_blank');
    }
  });

  // 주기적 업데이트
  setInterval(updateUI, 1000);
  updateUI();
})();
