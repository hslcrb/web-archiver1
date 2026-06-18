# 📦 Web Archiver Pro

완벽한 웹 브라우징 아카이빙 도구 - Chrome 확장 프로그램

## 🌟 주요 기능

### 1. 실시간 웹 브라우징 녹화
- 모든 HTTP/HTTPS 요청 캡처
- DOM 스냅샷 자동 저장
- 리소스(이미지, CSS, JS) 완전 수집
- Chrome Debugger API를 활용한 네트워크 모니터링

### 2. 다양한 내보내기 형식
- **ZIP 포맷**: HTML/CSS/JS 완전 패키징
  - 외부 링크를 로컬 경로로 자동 변환
  - 오프라인 완전 재생 가능
  
- **WACZ 포맷**: Web Archive Collection (표준 아카이브 형식)
  - WARC 1.1 기반
  - datapackage.json 메타데이터 포함
  - pages.jsonl 페이지 목록

### 3. 내장 WACZ 플레이어
- 완전 자체 구현된 아카이브 뷰어
- 브라우저 같은 네비게이션 (뒤로/앞으로)
- 페이지 목록 사이드바
- 리소스 자동 주입 및 Data URL 변환
- 오프라인 완전 재생

### 4. 사용자 친화적 UI
- 팝업 컨트롤: 빠른 녹화 시작/중지
- 플로팅 위젯: 페이지 내 실시간 상태 표시
  - 드래그 가능
  - 녹화/중지 버튼
  - 실시간 요청 카운트
- 데이터 관리 페이지: 수집된 데이터 확인 및 내보내기

## 📂 프로젝트 구조

```
web-archiver1/
├── manifest.json              # 확장 프로그램 매니페스트
├── background.js              # Service Worker (백그라운드 작업)
├── content.js                 # Content Script (페이지 주입)
│
├── icons/                     # 확장 프로그램 아이콘
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── libs/                      # 외부 라이브러리
│   └── jszip.min.js          # ZIP 파일 생성
│
├── engines/                   # 데이터 처리 엔진
│   ├── db.js                 # IndexedDB 관리
│   ├── conversion_engine.js  # ZIP 변환 엔진
│   └── wacz_engine.js        # WACZ 변환 엔진
│
└── pages/                     # UI 페이지
    ├── popup.html/js         # 확장 프로그램 팝업
    ├── floating.html/js      # 페이지 내 플로팅 컨트롤
    ├── index.html/js         # 데이터 관리 페이지
    └── player.html/js        # WACZ 플레이어
```

## 🚀 설치 방법

### 1. 개발자 모드로 로드

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 이 프로젝트 폴더 선택

### 2. 아이콘 생성 (필요시)

아이콘이 없거나 재생성이 필요한 경우:

```bash
python3 generate_icons.py
```

## 📖 사용 방법

### 녹화 시작

1. 확장 프로그램 아이콘 클릭
2. "녹화 시작" 버튼 클릭
3. 웹 페이지 탐색 시작
4. 우측 하단에 플로팅 위젯이 표시됨

### 녹화 중

- 모든 페이지 이동 자동 추적
- 리소스 자동 수집
- 실시간 요청 카운트 표시
- 플로팅 위젯에서 직접 중지 가능

### 녹화 중지 및 내보내기

1. "녹화 중지" 버튼 클릭
2. "데이터 내보내기" 클릭
3. 내보내기 형식 선택:
   - **HTML/CSS/JS ZIP 내보내기**: 완전한 오프라인 패키지
   - **WACZ 내보내기**: 표준 아카이브 형식

### WACZ 플레이어 사용

1. 데이터 관리 페이지에서 "📦 WACZ 플레이어 열기" 클릭
2. "WACZ 파일 열기" 버튼으로 아카이브 로드
3. 페이지 목록에서 원하는 페이지 선택
4. 브라우저처럼 자유롭게 탐색

## 🔧 기술 스택

- **Chrome Extension Manifest V3**
- **Chrome Debugger API**: 네트워크 요청 캡처
- **IndexedDB**: 로컬 데이터 저장
- **JSZip**: ZIP/WACZ 파일 생성 및 파싱
- **DOMParser & XMLSerializer**: HTML 처리
- **Shadow DOM**: 페이지 간섭 없는 UI 주입

## 🎯 주요 특징

### 완전한 오프라인 재생
- 모든 리소스를 Data URL로 변환
- 외부 의존성 제거
- 인터넷 없이도 완벽한 재생

### 메모리 최적화
- IndexedDB를 활용한 효율적인 저장
- 대용량 데이터 처리 지원
- 점진적 로딩

### 보안 고려
- Content Security Policy 준수
- 사용자 데이터 로컬 저장
- 외부 전송 없음

## 📝 권한 설명

- `debugger`: 네트워크 요청 캡처
- `storage`: 확장 프로그램 설정 저장
- `tabs`: 탭 정보 접근
- `activeTab`: 현재 탭 상호작용
- `scripting`: Content Script 주입
- `downloads`: 파일 다운로드
- `webNavigation`: 페이지 이동 추적
- `<all_urls>`: 모든 웹사이트에서 동작

## 🐛 알려진 제한사항

- Chrome Debugger API는 한 번에 하나의 확장 프로그램만 사용 가능
- 매우 큰 페이지(수백 MB)의 경우 처리 시간이 소요될 수 있음
- JavaScript 실행 결과는 캡처되지 않음 (정적 상태만 저장)

## 🔮 향후 계획

- [ ] WARC 파일 완전 지원
- [ ] 증분 아카이빙 (변경사항만 저장)
- [ ] 클라우드 동기화
- [ ] 전체 텍스트 검색
- [ ] 북마크 및 태그 기능
- [ ] 스케줄링된 자동 아카이빙

## 📄 라이선스

이 프로젝트는 개인 및 교육 목적으로 자유롭게 사용할 수 있습니다.

## 🤝 기여

버그 리포트, 기능 제안, Pull Request 환영합니다!

## 📧 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 이슈를 생성해주세요.

---

**Web Archiver Pro** - 웹을 영원히 보존하세요 📦✨
