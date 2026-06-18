// WACZ Player - 완전 자체 구현
class WACZPlayer {
  constructor() {
    this.archive = null;
    this.pages = [];
    this.resources = new Map();
    this.currentPage = null;
    this.history = [];
    this.historyIndex = -1;
    this.urlMap = new Map();
    
    this.initUI();
    this.bindEvents();
  }
  
  initUI() {
    this.elements = {
      fileInput: document.getElementById('fileInput'),
      loadFileBtn: document.getElementById('loadFileBtn'),
      loading: document.getElementById('loading'),
      sidebar: document.getElementById('sidebar'),
      contentArea: document.getElementById('contentArea'),
      emptyState: document.getElementById('emptyState'),
      viewerFrame: document.getElementById('viewerFrame'),
      pageList: document.getElementById('pageList'),
      urlBar: document.getElementById('urlBar'),
      statusText: document.getElementById('statusText'),
      statsText: document.getElementById('statsText'),
      backBtn: document.getElementById('backBtn'),
      forwardBtn: document.getElementById('forwardBtn'),
      toggleSidebar: document.getElementById('toggleSidebar'),
      goBtn: document.getElementById('goBtn'),
      dropZone: document.getElementById('dropZone')
    };
  }
  
  bindEvents() {
    // 파일 입력 이벤트
    this.elements.fileInput.addEventListener('change', (e) => this.loadFile(e));
    
    // 파일 열기 버튼
    this.elements.loadFileBtn.addEventListener('click', () => {
      this.elements.fileInput.click();
    });
    
    // 드래그 앤 드롭 이벤트
    this.setupDragAndDrop();
    
    // 네비게이션 이벤트
    this.elements.toggleSidebar.addEventListener('click', () => this.toggleSidebar());
    this.elements.backBtn.addEventListener('click', () => this.navigateBack());
    this.elements.forwardBtn.addEventListener('click', () => this.navigateForward());
    this.elements.goBtn.addEventListener('click', () => this.navigateToURL());
    this.elements.urlBar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.navigateToURL();
    });
  }
  
  setupDragAndDrop() {
    const dropZone = this.elements.dropZone;
    const contentArea = this.elements.contentArea;
    
    // 드래그 오버 이벤트
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      contentArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // 드래그 엔터
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });
    
    // 드래그 리브
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });
    
    // 드롭 이벤트
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.loadFileFromDrop(files[0]);
      }
    });
    
    // 전체 영역에도 드롭 적용 (파일이 로드된 후)
    contentArea.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.loadFileFromDrop(files[0]);
      }
    });
  }
  
  showLoading(show = true) {
    this.elements.loading.classList.toggle('active', show);
  }
  
  toggleSidebar() {
    const isActive = this.elements.sidebar.classList.toggle('active');
    this.elements.contentArea.classList.toggle('with-sidebar', isActive);
  }
  
  async loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    await this.processFile(file);
  }
  
  async loadFileFromDrop(file) {
    if (!file) return;
    
    // 파일 타입 체크
    const validTypes = ['.wacz', '.zip'];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.some(type => fileName.endsWith(type));
    
    if (!isValid) {
      alert('WACZ 또는 ZIP 파일만 지원됩니다.');
      return;
    }
    
    await this.processFile(file);
  }
  
  async processFile(file) {
    this.showLoading(true);
    this.elements.statusText.textContent = '파일 로딩 중...';
    
    try {
      // JSZip으로 아카이브 열기
      const arrayBuffer = await file.arrayBuffer();
      this.archive = await JSZip.loadAsync(arrayBuffer);
      
      // WACZ 구조 파싱
      await this.parseArchive();
      
      // UI 업데이트
      this.renderPageList();
      this.elements.emptyState.style.display = 'none';
      this.elements.viewerFrame.style.display = 'block';
      
      // 첫 페이지 로드
      if (this.pages.length > 0) {
        this.loadPage(this.pages[0]);
      }
      
      this.elements.statusText.textContent = '준비됨';
      this.elements.statsText.textContent = `${this.pages.length}개 페이지, ${this.resources.size}개 리소스`;
      
    } catch (error) {
      console.error('파일 로딩 실패:', error);
      alert('WACZ 파일을 로드하는데 실패했습니다: ' + error.message);
      this.elements.statusText.textContent = '오류 발생';
    } finally {
      this.showLoading(false);
    }
  }
  
  async parseArchive() {
    this.pages = [];
    this.resources.clear();
    this.urlMap.clear();
    
    // datapackage.json 파싱 (WACZ 메타데이터)
    try {
      const datapackageFile = this.archive.file('datapackage.json');
      if (datapackageFile) {
        const content = await datapackageFile.async('string');
        const datapackage = JSON.parse(content);
        console.log('Datapackage:', datapackage);
      }
    } catch (e) {
      console.warn('datapackage.json 파싱 실패:', e);
    }
    
    // pages.jsonl 파싱 (페이지 목록)
    try {
      const pagesFile = this.archive.file('pages/pages.jsonl') || 
                       this.archive.file('pages.jsonl');
      if (pagesFile) {
        const content = await pagesFile.async('string');
        const lines = content.trim().split('\n');
        this.pages = lines.map(line => JSON.parse(line));
      }
    } catch (e) {
      console.warn('pages.jsonl 파싱 실패:', e);
    }
    
    // WARC 파일 파싱 또는 리소스 폴더 스캔
    const files = Object.keys(this.archive.files);
    
    // HTML 페이지들 찾기
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    if (htmlFiles.length > 0 && this.pages.length === 0) {
      // pages.jsonl이 없는 경우, HTML 파일들로 페이지 목록 생성
      htmlFiles.forEach(filepath => {
        this.pages.push({
          url: filepath,
          title: filepath,
          ts: new Date().toISOString()
        });
      });
    }
    
    // 모든 파일을 리소스로 등록
    for (const filepath of files) {
      if (!this.archive.files[filepath].dir) {
        this.resources.set(filepath, this.archive.files[filepath]);
        
        // URL 매핑 생성
        const filename = filepath.split('/').pop();
        this.urlMap.set(filename, filepath);
      }
    }
    
    console.log(`파싱 완료: ${this.pages.length}개 페이지, ${this.resources.size}개 리소스`);
  }
  
  renderPageList() {
    this.elements.pageList.innerHTML = '';
    
    this.pages.forEach((page, index) => {
      const li = document.createElement('li');
      li.className = 'page-item';
      li.innerHTML = `
        <div class="page-url">${this.escapeHtml(page.url || page.title)}</div>
        <div class="page-time">${this.formatDate(page.ts || page.timestamp)}</div>
      `;
      li.addEventListener('click', () => {
        this.loadPage(page);
        document.querySelectorAll('.page-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
      });
      this.elements.pageList.appendChild(li);
    });
  }
  
  async loadPage(page) {
    this.showLoading(true);
    
    try {
      // 페이지 HTML 찾기
      let htmlContent = null;
      let pageFile = null;
      
      // 여러 가능한 경로 시도
      const possiblePaths = [
        page.url,
        page.url?.replace(/^https?:\/\//, ''),
        `page_${this.pages.indexOf(page)}.html`,
        `pages/page_${this.pages.indexOf(page)}.html`
      ];
      
      for (const path of possiblePaths) {
        if (!path) continue;
        pageFile = this.resources.get(path) || this.archive.file(path);
        if (pageFile) {
          htmlContent = await pageFile.async('string');
          break;
        }
      }
      
      if (!htmlContent) {
        throw new Error('페이지 파일을 찾을 수 없습니다');
      }
      
      // HTML 처리 및 리소스 주입
      const processedHTML = await this.processHTML(htmlContent);
      
      // iframe에 로드
      const blob = new Blob([processedHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.elements.viewerFrame.src = url;
      
      // 상태 업데이트
      this.currentPage = page;
      this.elements.urlBar.value = page.url || page.title;
      
      // 히스토리 관리
      if (this.historyIndex === -1 || this.history[this.historyIndex] !== page) {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(page);
        this.historyIndex = this.history.length - 1;
      }
      
      this.updateNavigationButtons();
      this.elements.statusText.textContent = '페이지 로드 완료';
      
    } catch (error) {
      console.error('페이지 로드 실패:', error);
      alert('페이지를 로드하는데 실패했습니다: ' + error.message);
      this.elements.statusText.textContent = '페이지 로드 실패';
    } finally {
      this.showLoading(false);
    }
  }
  
  async processHTML(html) {
    // HTML 내의 리소스 참조를 Data URL로 변환
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 이미지 처리
    const images = doc.querySelectorAll('img[src]');
    for (const img of images) {
      const src = img.getAttribute('src');
      const dataURL = await this.getResourceDataURL(src);
      if (dataURL) img.setAttribute('src', dataURL);
    }
    
    // CSS 처리
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      const css = await this.getResourceText(href);
      if (css) {
        const style = doc.createElement('style');
        style.textContent = css;
        link.replaceWith(style);
      }
    }
    
    // JavaScript 처리 (보안상 실행 안함)
    const scripts = doc.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = script.getAttribute('src');
      const js = await this.getResourceText(src);
      if (js) {
        const inlineScript = doc.createElement('script');
        inlineScript.textContent = `// Script from: ${src}\n${js}`;
        script.replaceWith(inlineScript);
      }
    }
    
    return new XMLSerializer().serializeToString(doc);
  }
  
  async getResourceDataURL(path) {
    if (!path) return null;
    
    // 상대 경로 처리
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    
    // 여러 가능한 경로 시도
    const possiblePaths = [
      cleanPath,
      `resources/${cleanPath}`,
      this.urlMap.get(cleanPath)
    ].filter(Boolean);
    
    for (const p of possiblePaths) {
      const resource = this.resources.get(p) || this.archive.file(p);
      if (resource) {
        try {
          const blob = await resource.async('blob');
          const mimeType = this.getMimeType(p);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn(`리소스 로드 실패: ${p}`, e);
        }
      }
    }
    
    return null;
  }
  
  async getResourceText(path) {
    if (!path) return null;
    
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    const possiblePaths = [
      cleanPath,
      `resources/${cleanPath}`,
      this.urlMap.get(cleanPath)
    ].filter(Boolean);
    
    for (const p of possiblePaths) {
      const resource = this.resources.get(p) || this.archive.file(p);
      if (resource) {
        try {
          return await resource.async('string');
        } catch (e) {
          console.warn(`리소스 로드 실패: ${p}`, e);
        }
      }
    }
    
    return null;
  }
  
  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'html': 'text/html',
      'txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  navigateBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.loadPage(this.history[this.historyIndex]);
      this.updateNavigationButtons();
    }
  }
  
  navigateForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.loadPage(this.history[this.historyIndex]);
      this.updateNavigationButtons();
    }
  }
  
  navigateToURL() {
    const url = this.elements.urlBar.value.trim();
    if (!url) return;
    
    const page = this.pages.find(p => p.url === url || p.title === url);
    if (page) {
      this.loadPage(page);
    } else {
      alert('해당 URL의 페이지를 찾을 수 없습니다');
    }
  }
  
  updateNavigationButtons() {
    this.elements.backBtn.disabled = this.historyIndex <= 0;
    this.elements.forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR');
  }
}

// 초기화
const player = new WACZPlayer();
