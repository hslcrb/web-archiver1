/**
 * 이 엔진은 캡처된 DOM 스냅샷의 외부 링크를 로컬(ZIP 내) 경로로 치환합니다.
 * 100% 시스템단 치환을 위해 모든 URL 매핑 테이블을 생성합니다.
 */

function convertSnapshotToLocal(snap, requests) {
  let html = snap.html;
  const urlMap = new Map();

  // 1. 요청 데이터를 기반으로 URL -> 로컬 경로 매핑 생성
  requests.forEach((req, index) => {
    if (!req.body && !req.hasResponse) return; // body가 없는 요청은 제외
    
    const ext = getFileExtension(req.url, req.mimeType);
    const localPath = `resources/res_${index}${ext}`;
    urlMap.set(req.url, localPath);
    
    // URL 변형들도 매핑 (쿼리 파라미터 제거 등)
    const urlWithoutQuery = req.url.split('?')[0];
    if (urlWithoutQuery !== req.url) {
      urlMap.set(urlWithoutQuery, localPath);
    }
  });

  // 2. HTML 내의 모든 URL 치환 (정규식 및 DOM 파싱 병행)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const updateAttr = (selector, attr) => {
    doc.querySelectorAll(selector).forEach(el => {
      const originalUrl = el.getAttribute(attr);
      if (!originalUrl) return;
      
      // 절대 URL로 변환 시도
      let fullUrl = originalUrl;
      try {
        if (originalUrl.startsWith('http')) {
          fullUrl = originalUrl;
        } else if (originalUrl.startsWith('//')) {
          fullUrl = 'https:' + originalUrl;
        } else if (snap.url) {
          const baseUrl = new URL(snap.url);
          fullUrl = new URL(originalUrl, baseUrl.origin).href;
        }
      } catch (e) {
        // URL 파싱 실패 시 원본 사용
      }
      
      if (urlMap.has(fullUrl)) {
        el.setAttribute(attr, urlMap.get(fullUrl));
      } else if (urlMap.has(originalUrl)) {
        el.setAttribute(attr, urlMap.get(originalUrl));
      }
    });
  };

  updateAttr('link[href]', 'href');
  updateAttr('script[src]', 'src');
  updateAttr('img[src]', 'src');
  updateAttr('video[src]', 'src');
  updateAttr('audio[src]', 'src');
  updateAttr('source[src]', 'src');
  updateAttr('iframe[src]', 'src');

  // 3. 인라인 스타일 내 URL 치환
  doc.querySelectorAll('[style]').forEach(el => {
    let style = el.getAttribute('style');
    urlMap.forEach((localPath, url) => {
      style = style.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), localPath);
    });
    el.setAttribute('style', style);
  });
  
  return new XMLSerializer().serializeToString(doc);
}

function getFileExtension(url, mimeType) {
  // URL에서 확장자 추출
  const urlExt = url.split('?')[0].split('.').pop().toLowerCase();
  const validExts = ['html', 'css', 'js', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'woff', 'woff2', 'ttf', 'ico'];
  
  if (validExts.includes(urlExt)) {
    return '.' + urlExt;
  }
  
  // MIME 타입 기반 확장자
  const mimeMap = {
    'text/html': '.html',
    'text/css': '.css',
    'application/javascript': '.js',
    'application/json': '.json',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
    'font/woff': '.woff',
    'font/woff2': '.woff2',
    'font/ttf': '.ttf'
  };
  
  return mimeMap[mimeType] || '';
}

window.exportFullZip = async function(currentData) {
  const zip = new JSZip();
  const resourcesFolder = zip.folder("resources");

  // 리소스 저장 (body가 있는 것만)
  const validRequests = currentData.requests.filter(req => req.body);
  
  validRequests.forEach((req, index) => {
    try {
      const ext = getFileExtension(req.url, req.mimeType);
      const filename = `res_${currentData.requests.indexOf(req)}${ext}`;
      
      if (req.base64Encoded) {
        // Base64 디코딩
        const binaryString = atob(req.body);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        resourcesFolder.file(filename, bytes);
      } else {
        resourcesFolder.file(filename, req.body);
      }
    } catch(e) { 
      console.error(`리소스 저장 실패: ${req.url}`, e); 
    }
  });

  // 변환된 스냅샷 저장
  currentData.snapshots.forEach((snap, index) => {
    const convertedHtml = convertSnapshotToLocal(snap, currentData.requests);
    zip.file(`page_${index}.html`, convertedHtml);
  });

  // 메인 인덱스 파일 생성 (모든 페이지 링크 포함)
  let indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Archived Pages</title>
  <style>
    body { font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .page-list { list-style: none; padding: 0; }
    .page-item { 
      background: white; 
      padding: 15px; 
      margin-bottom: 10px; 
      border-radius: 8px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .page-item a { 
      color: #2196F3; 
      text-decoration: none; 
      font-size: 16px; 
      font-weight: bold;
    }
    .page-item a:hover { text-decoration: underline; }
    .page-time { color: #666; font-size: 14px; margin-top: 5px; }
    .stats { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>📦 Web Archive</h1>
  <div class="stats">
    <strong>총 ${currentData.snapshots.length}개 페이지</strong> | 
    ${validRequests.length}개 리소스 | 
    생성: ${new Date().toLocaleString('ko-KR')}
  </div>
  <ul class="page-list">`;
  
  currentData.snapshots.forEach((snap, index) => {
    indexHtml += `
    <li class="page-item">
      <a href="page_${index}.html">${snap.url || 'Page ' + (index + 1)}</a>
      <div class="page-time">${new Date(snap.timestamp).toLocaleString('ko-KR')}</div>
    </li>`;
  });
  
  indexHtml += `
  </ul>
</body>
</html>`;
  
  zip.file("index.html", indexHtml);

  return await zip.generateAsync({ type: "blob" });
}
