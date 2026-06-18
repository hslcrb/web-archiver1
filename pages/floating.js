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
    // 확장 프로그램 컨텍스트 확인
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      try {
        const url = chrome.runtime.getURL('pages/index.html');
        // parent window에서 열기 시도
        if (window.parent && window.parent !== window) {
          window.parent.open(url, '_blank');
        } else {
          window.open(url, '_blank');
        }
      } catch (e) {
        console.error('페이지 열기 실패:', e);
        alert('데이터 관리 페이지를 열 수 없습니다. 확장 프로그램 아이콘을 클릭하여 접근하세요.');
      }
    } else {
      console.warn('Chrome runtime API를 사용할 수 없습니다.');
      alert('확장 프로그램 컨텍스트에서만 작동합니다.');
    }
  });

  // 주기적 업데이트
  setInterval(updateUI, 1000);
  updateUI();
})();
