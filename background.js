let recording = false;
let sessionData = {
  requests: [],
  snapshots: [],
  startTime: null
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_RECORDING") {
    recording = true;
    sessionData = { requests: [], snapshots: [], startTime: Date.now() };
    startDebugger();
    sendResponse({ status: "started" });
  } else if (message.action === "STOP_RECORDING") {
    recording = false;
    stopDebugger();
    sendResponse({ status: "stopped", data: sessionData });
  } else if (message.action === "GET_STATUS") {
    sendResponse({ recording, requestCount: sessionData.requests.length });
  } else if (message.action === "SAVE_SNAPSHOT") {
    if (recording) {
      sessionData.snapshots.push({
        url: sender.tab.url,
        timestamp: Date.now(),
        html: message.html,
        resources: message.resources
      });
    }
  }
  return true;
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
    sessionData.requests.push({
      tabId: source.tabId,
      requestId: params.requestId,
      url: params.request.url,
      method: params.request.method,
      headers: params.request.headers,
      timestamp: params.wallTime * 1000,
      type: params.type
    });
  } else if (method === "Network.responseReceived") {
    const req = sessionData.requests.find(r => r.requestId === params.requestId);
    if (req) {
      req.response = params.response;
    }
  } else if (method === "Network.loadingFinished") {
    chrome.debugger.sendCommand(source, "Network.getResponseBody", { requestId: params.requestId }, (result) => {
      if (chrome.runtime.lastError) return;
      const req = sessionData.requests.find(r => r.requestId === params.requestId);
      if (req && result) {
        req.body = result.body;
        req.base64Encoded = result.base64Encoded;
      }
    });
  }
});
