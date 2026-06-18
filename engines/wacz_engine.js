// WACZ (Web Archive Collection Zipped) 형식은 WARC 파일들을 포함하는 ZIP 파일입니다.
// 이 엔진은 메모리에 저장된 requests를 WARC 1.1 포맷으로 변환합니다.

function generateWARC(requests) {
  let warcRecords = [];
  
  requests.forEach((req, index) => {
    // WARC 레코드 ID 생성
    const recordId = `<urn:uuid:${generateUUID()}>`;
    const timestamp = new Date(req.timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    // Request 레코드 생성
    let requestHeader = '';
    requestHeader += `WARC/1.1\r\n`;
    requestHeader += `WARC-Type: request\r\n`;
    requestHeader += `WARC-Record-ID: ${recordId}\r\n`;
    requestHeader += `WARC-Target-URI: ${req.url}\r\n`;
    requestHeader += `WARC-Date: ${timestamp}\r\n`;
    requestHeader += `Content-Type: application/http;msgtype=request\r\n`;
    
    // HTTP 요청 재구성
    let httpRequest = `${req.method} ${new URL(req.url).pathname} HTTP/1.1\r\n`;
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        httpRequest += `${key}: ${value}\r\n`;
      }
    }
    httpRequest += `\r\n`;
    
    const requestBody = new TextEncoder().encode(httpRequest);
    requestHeader += `Content-Length: ${requestBody.length}\r\n`;
    requestHeader += `\r\n`;
    
    warcRecords.push(requestHeader + httpRequest + '\r\n\r\n');
    
    // Response 레코드 생성 (body가 있는 경우)
    if (req.body) {
      const responseRecordId = `<urn:uuid:${generateUUID()}>`;
      
      let responseHeader = '';
      responseHeader += `WARC/1.1\r\n`;
      responseHeader += `WARC-Type: response\r\n`;
      responseHeader += `WARC-Record-ID: ${responseRecordId}\r\n`;
      responseHeader += `WARC-Target-URI: ${req.url}\r\n`;
      responseHeader += `WARC-Date: ${timestamp}\r\n`;
      responseHeader += `WARC-Concurrent-To: ${recordId}\r\n`;
      responseHeader += `Content-Type: application/http;msgtype=response\r\n`;
      
      // HTTP 응답 재구성
      let httpResponse = `HTTP/1.1 200 OK\r\n`;
      httpResponse += `Content-Type: ${inferContentType(req.url, req.type)}\r\n`;
      
      // Body 처리
      let responseBody;
      try {
        if (req.base64Encoded) {
          // Base64 디코딩
          const binaryString = atob(req.body);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          responseBody = bytes;
        } else {
          responseBody = new TextEncoder().encode(req.body);
        }
      } catch (e) {
        console.warn(`Body 처리 실패 for ${req.url}:`, e);
        responseBody = new Uint8Array(0);
      }
      
      httpResponse += `Content-Length: ${responseBody.length}\r\n`;
      httpResponse += `\r\n`;
      
      const httpResponseHeader = new TextEncoder().encode(httpResponse);
      const totalLength = httpResponseHeader.length + responseBody.length;
      
      responseHeader += `Content-Length: ${totalLength}\r\n`;
      responseHeader += `\r\n`;
      
      // 헤더 + HTTP 응답 헤더 + 바디 결합
      warcRecords.push(responseHeader + httpResponse);
      warcRecords.push(responseBody);
      warcRecords.push('\r\n\r\n');
    }
  });
  
  return warcRecords;
}

function generateUUID() {
  // 간단한 UUID v4 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function inferContentType(url, type) {
  // URL 기반 Content-Type 추론
  const ext = url.split('.').pop().split('?')[0].toLowerCase();
  const mimeTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'xml': 'application/xml'
  };
  
  // type 필드 기반 추론
  const typeMap = {
    'Document': 'text/html',
    'Stylesheet': 'text/css',
    'Script': 'application/javascript',
    'Image': 'image/*',
    'Font': 'font/*',
    'XHR': 'application/json',
    'Fetch': 'application/json'
  };
  
  return mimeTypes[ext] || typeMap[type] || 'application/octet-stream';
}

window.exportWACZ = async function(currentData) {
  const zip = new JSZip();
  
  // 1. WARC 파일 생성
  const warcRecords = generateWARC(currentData.requests);
  
  // WARC 내용을 Blob으로 결합
  const warcBlob = new Blob(warcRecords, { type: 'application/warc' });
  zip.folder("archive").file("data.warc", warcBlob);
  
  // 2. datapackage.json (WACZ 메타데이터)
  const datapackage = {
    profile: "data-package",
    title: "Web Archive",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    resources: [
      { 
        path: "archive/data.warc", 
        stats: {
          size: warcBlob.size,
          records: currentData.requests.length
        }
      }
    ],
    mainPageUrl: currentData.snapshots.length > 0 ? currentData.snapshots[0].url : "",
    pages: currentData.snapshots.length
  };
  zip.file("datapackage.json", JSON.stringify(datapackage, null, 2));

  // 3. pages/pages.jsonl (페이지 목록)
  const pages = currentData.snapshots.map(s => JSON.stringify({ 
    url: s.url, 
    title: s.url, 
    ts: new Date(s.timestamp).toISOString(),
    timestamp: s.timestamp
  })).join('\n');
  zip.folder("pages").file("pages.jsonl", pages);
  
  // 4. indexes/index.cdx (선택적, 검색 최적화)
  let cdxLines = [];
  currentData.requests.forEach(req => {
    const urlKey = req.url.replace(/^https?:\/\//, '');
    const timestamp = new Date(req.timestamp).toISOString().replace(/[-:T.Z]/g, '');
    cdxLines.push(`${urlKey} ${timestamp} ${req.url}`);
  });
  zip.folder("indexes").file("index.cdx", cdxLines.join('\n'));

  return await zip.generateAsync({ type: "blob" });
}
