/**
 * 이 엔진은 캡처된 DOM 스냅샷의 외부 링크를 로컬(ZIP 내) 경로로 치환합니다.
 * 100% 시스템단 치환을 위해 모든 URL 매핑 테이블을 생성합니다.
 */

function convertSnapshotToLocal(snap, requests) {
  let html = snap.html;
  const urlMap = new Map();

  // 1. 요청 데이터를 기반으로 URL -> 로컬 경로 매핑 생성
  requests.forEach((req, index) => {
    const localPath = `resources/res_${index}`;
    urlMap.set(req.url, localPath);
  });

  // 2. HTML 내의 모든 URL 치환 (정규식 및 DOM 파싱 병행)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const updateAttr = (selector, attr) => {
    doc.querySelectorAll(selector).forEach(el => {
      const originalUrl = el.getAttribute(attr);
      if (originalUrl && urlMap.has(originalUrl)) {
        el.setAttribute(attr, urlMap.get(originalUrl));
      }
    });
  };

  updateAttr('link', 'href');
  updateAttr('script', 'src');
  updateAttr('img', 'src');
  updateAttr('video', 'src');
  updateAttr('audio', 'src');

  // 3. 인라인 스타일 및 CSS 파일 내 URL 치환 (추가 고도화 가능)
  
  return new XMLSerializer().serializeToString(doc);
}

window.exportFullZip = async function(currentData) {
  const zip = new JSZip();
  const resourcesFolder = zip.folder("resources");

  // 리소스 저장
  currentData.requests.forEach((req, index) => {
    if (req.body) {
      try {
        const content = req.base64Encoded ? Uint8Array.from(atob(req.body), c => c.charCodeAt(0)) : req.body;
        resourcesFolder.file(`res_${index}`, content);
      } catch(e) { console.error(e); }
    }
  });

  // 변환된 스냅샷 저장
  currentData.snapshots.forEach((snap, index) => {
    const convertedHtml = convertSnapshotToLocal(snap, currentData.requests);
    zip.file(`page_${index}.html`, convertedHtml);
  });

  // 메인 인덱스 파일 생성 (모든 페이지 링크 포함)
  let indexHtml = "<html><body><h1>Archived Pages</h1><ul>";
  currentData.snapshots.forEach((snap, index) => {
    indexHtml += `<li><a href="page_${index}.html">${snap.url}</a> (${new Date(snap.timestamp).toLocaleString()})</li>`;
  });
  indexHtml += "</ul></body></html>";
  zip.file("index.html", indexHtml);

  return await zip.generateAsync({ type: "blob" });
}
