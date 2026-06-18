import { initDB, saveToDB, clearDB, getAllFromDB } from './db.js';

let recording = false;
let requestCount = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_RECORDING") {
    recording = true;
    requestCount = 0;
    clearDB().then(() => {
      startDebugger();
      sendResponse({ status: "started" });
    });
    return true;
  } else if (message.action === "STOP_RECORDING") {
    recording = false;
    stopDebugger();
    sendResponse({ status: "stopped" });
    return true;
  } else if (message.action === "GET_STATUS") {
    sendResponse({ recording, requestCount });
    return true;
  } else if (message.action === "SAVE_SNAPSHOT") {
    if (recording) {
      saveToDB("snapshots", {
        url: sender.tab.url,
        timestamp: Date.now(),
        html: message.html
      });
    }
    return true;
  }
});

function startDebugger() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url.startsWith("http")) {
        chrome.debugger.attach({ tabId: tab.id }, "1.3", () => {
          if (chrome.runtime.lastError) return;
          chrome.debugger.sendCommand({ tabId: tab.id }, "Network.enable");
        });
      }
    });
  });
}

function stopDebugger() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.debugger.detach({ tabId: tab.id }, () => {
        if (chrome.runtime.lastError) return;
      });
    });
  });
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!recording) return;

  if (method === "Network.requestWillBeSent") {
    const req = {
      requestId: params.requestId,
      url: params.request.url,
      method: params.request.method,
      headers: params.request.headers,
      timestamp: params.wallTime * 1000,
      type: params.type
    };
    saveToDB("requests", req);
    requestCount++;
  } else if (method === "Network.loadingFinished") {
    chrome.debugger.sendCommand(source, "Network.getResponseBody", { requestId: params.requestId }, async (result) => {
      if (chrome.runtime.lastError || !result) return;
      
      // db.js의 함수를 사용하여 body 업데이트
      try {
        const db = await initDB();
        const tx = db.transaction("requests", "readwrite");
        const store = tx.objectStore("requests");
        const getReq = store.get(params.requestId);
        getReq.onsuccess = () => {
          const data = getReq.result;
          if (data) {
            data.body = result.body;
            data.base64Encoded = result.base64Encoded;
            store.put(data);
          }
        };
      } catch (e) {
        console.error("Error updating response body:", e);
      }
    });
  }
});
