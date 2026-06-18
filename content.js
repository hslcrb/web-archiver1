(function() {
  function injectFloating() {
    if (document.getElementById('web-archiver-root')) return;
    const root = document.createElement('div');
    root.id = 'web-archiver-root';
    const shadow = root.attachShadow({ mode: 'closed' });
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('floating.html');
    iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:150px;height:50px;border:none;z-index:2147483647;pointer-events:none;';
    shadow.appendChild(iframe);
    document.body.appendChild(root);
  }

  chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response) => {
    if (response && response.recording) {
      injectFloating();
    }
  });

  function getFullHTML() {
    // 너무 큰 HTML은 압축하거나 필요한 부분만 전송하도록 고려 가능하나, 
    // 일단 IndexedDB로 바로 저장하는 방식이 아니므로 메시지 크기 주의
    return document.documentElement.outerHTML;
  }

  function collectResources() {
    const resources = [];
    document.querySelectorAll('link, img, script, video, audio').forEach(el => {
      const url = el.src || el.href;
      if (url && url.startsWith('http')) {
        resources.push({ tag: el.tagName, url: url });
      }
    });
    return resources;
  }

  function sendSnapshot() {
    chrome.runtime.sendMessage({ action: "GET_STATUS" }, (response) => {
      if (response && response.recording) {
        chrome.runtime.sendMessage({
          action: "SAVE_SNAPSHOT",
          html: getFullHTML(),
          resources: collectResources()
        });
      }
    });
  }

  window.addEventListener('load', sendSnapshot);

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      sendSnapshot();
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  // 유저 상호작용 후 캡처 (클릭 등)
  window.addEventListener('click', () => setTimeout(sendSnapshot, 500));
})();
