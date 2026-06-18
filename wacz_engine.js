// WACZ (Web Archive Collection Zipped) 형식은 WARC 파일들을 포함하는 ZIP 파일입니다.
// 이 엔진은 메모리에 저장된 requests를 WARC 1.1 포맷으로 변환합니다.

function generateWARC(requests) {
  let warc = "WARC/1.1\r\n";
  const now = new Date().toISOString();

  requests.forEach(req => {
    if (!req.response) return;

    // WARC-Type: request
    warc += `WARC-Type: request\r\n`;
    warc += `WARC-Target-URI: ${req.url}\r\n`;
    warc += `WARC-Date: ${new Date(req.timestamp).toISOString()}\r\n`;
    warc += `Content-Type: application/http;msgtype=request\r\n`;
    // ... 요청 헤더 및 바디 추가 ...
    warc += `\r\n\r\n`;

    // WARC-Type: response
    warc += `WARC-Type: response\r\n`;
    warc += `WARC-Target-URI: ${req.url}\r\n`;
    warc += `WARC-Date: ${new Date(req.timestamp).toISOString()}\r\n`;
    warc += `Content-Type: application/http;msgtype=response\r\n`;
    // ... 응답 헤더 및 바디 추가 ...
    warc += `\r\n\r\n`;
  });

  return warc;
}

async function exportWACZ(currentData) {
  const zip = new JSZip();
  
  // 1. WARC 파일 생성
  const warcContent = generateWARC(currentData.requests);
  zip.folder("archive").file("data.warc", warcContent);
  
  // 2. datapackage.json (WACZ 메타데이터)
  const datapackage = {
    profile: "data-package",
    resources: [{ path: "archive/data.warc", profile: "data-resource" }]
  };
  zip.file("datapackage.json", JSON.stringify(datapackage, null, 2));

  // 3. pages/pages.jsonl (페이지 목록)
  const pages = currentData.snapshots.map(s => JSON.stringify({ url: s.url, title: s.url, ts: new Date(s.timestamp).toISOString() })).join('\n');
  zip.folder("pages").file("pages.jsonl", pages);

  return await zip.generateAsync({ type: "blob" });
}
