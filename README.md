# Excel Translation Service

GPT를 활용한 엑셀 파일 자동 번역 웹 서비스입니다. XLSX, CSV 파일을 업로드하면 선택한 언어로 자동 번역하여 다운로드할 수 있습니다.

## 주요 기능

- 📊 **다중 시트 지원**: 여러 시트가 있는 엑셀 파일 완벽 지원
- 🌍 **15개 언어 지원**: 한국어, 영어, 일본어, 중국어 등 15개 언어 간 번역
- 🔄 **실시간 진행 상황**: 번역 진행 상황을 실시간으로 확인
- 💾 **원본 형식 유지**: 열 순서, 데이터 구조, 스타일 유지
- 🎨 **자동 스타일링**: 번역된 엑셀 파일에 자동으로 스타일 적용
- 🔐 **안전한 API 키 관리**: 브라우저 로컬 스토리지에 API 키 저장

## 기술 스택

- **Backend**: FastAPI (Python 3.13)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: OpenAI GPT-4.1-mini
- **Excel Processing**: pandas, openpyxl
- **Encoding Detection**: chardet

## 프로젝트 구조

```
.
├── app/
│   ├── api/              # API 엔드포인트
│   │   └── routes.py
│   ├── core/             # 핵심 설정 및 프롬프트
│   │   ├── config.py
│   │   ├── exceptions.py
│   │   └── prompts.py    # GPT 프롬프트 중앙 관리
│   ├── models/           # 데이터 모델
│   │   └── schemas.py
│   ├── services/         # 비즈니스 로직
│   │   ├── converter.py  # Excel 변환
│   │   ├── file_handler.py
│   │   └── translator.py # GPT 번역
│   ├── utils/            # 유틸리티
│   │   ├── encoding.py
│   │   ├── log_handler.py
│   │   └── validators.py
│   └── main.py           # FastAPI 앱
├── static/               # 프론트엔드
│   ├── index.html
│   ├── settings.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       └── settings.js
├── temp/                 # 임시 파일 저장
├── .env                  # 환경 변수 (git에 커밋 안 됨)
├── .env.example          # 환경 변수 예제
├── requirements.txt      # Python 의존성
└── run.sh               # 실행 스크립트
```

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone <repository-url>
cd what-u-want
```

### 2. 가상 환경 생성 및 활성화

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. 의존성 설치

```bash
pip install -r requirements.txt
```

### 4. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 OpenAI API 키를 입력하세요:

```env
OPENAI_API_KEY=your_actual_api_key_here
```

> ⚠️ **중요**: `.env` 파일은 절대 Git에 커밋하지 마세요!

### 5. 서버 실행

```bash
# 방법 1: 스크립트 사용
chmod +x run.sh
./run.sh

# 방법 2: 직접 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. 브라우저에서 접속

```
http://localhost:8000
```

## 사용 방법

### 1. API 키 설정

- 우측 상단의 ⚙️ 설정 버튼 클릭
- OpenAI API 키 입력 및 저장
- API 키는 브라우저 로컬 스토리지에 안전하게 저장됩니다

### 2. 파일 번역

1. **파일 선택**: XLSX 또는 CSV 파일 업로드
2. **언어 선택**: 원본 언어와 번역할 언어 선택
3. **번역 시작**: "Translate" 버튼 클릭
4. **진행 상황 확인**: 실시간 로그로 번역 진행 상황 확인
5. **다운로드**: 번역 완료 후 자동으로 다운로드

## 지원 언어

- 🇰🇷 한국어 (Korean)
- 🇺🇸 영어 (English)
- 🇯🇵 일본어 (Japanese)
- 🇨🇳 중국어 (Chinese)
- 🇪🇸 스페인어 (Spanish)
- 🇫🇷 프랑스어 (French)
- 🇩🇪 독일어 (German)
- 🇷🇺 러시아어 (Russian)
- 🇵🇹 포르투갈어 (Portuguese)
- 🇮🇹 이탈리아어 (Italian)
- 🇸🇦 아랍어 (Arabic)
- 🇮🇳 힌디어 (Hindi)
- 🇹🇭 태국어 (Thai)
- 🇻🇳 베트남어 (Vietnamese)
- 🇮🇩 인도네시아어 (Indonesian)

## 주요 특징

### 청크 기반 번역

대용량 파일도 안정적으로 처리하기 위해 데이터를 5행씩 청크로 나누어 번역합니다:

- 토큰 제한 회피
- 완전한 번역 보장
- 진행 상황 실시간 추적

### JSON 기반 프롬프트

GPT에게 명확한 지시를 전달하기 위해 구조화된 JSON 프롬프트를 사용합니다:

```json
{
  "task": "translate",
  "source_language": "English",
  "target_language": "Korean",
  "rules": [...],
  "input_data": [...],
  "output_format": {...}
}
```

### 실시간 로그 스트리밍

Server-Sent Events (SSE)를 통해 번역 진행 상황을 실시간으로 확인할 수 있습니다.

## API 엔드포인트

### POST /api/translate

파일 번역 요청

**Parameters:**
- `file`: 업로드할 파일 (XLSX/CSV)
- `source_lang`: 원본 언어 코드
- `target_lang`: 번역할 언어 코드
- `api_key`: OpenAI API 키
- `session_id`: 로그 세션 ID (선택)

**Response:**
```json
{
  "filename": "translated_file.xlsx",
  "message": "Translation completed successfully"
}
```

### GET /api/logs/stream

실시간 로그 스트리밍 (SSE)

**Parameters:**
- `session_id`: 로그 세션 ID

### POST /api/logs/session

새 로그 세션 생성

**Response:**
```json
{
  "session_id": "uuid-string"
}
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 키 (필수) | - |
| `DEBUG` | 디버그 모드 | `False` |
| `HOST` | 서버 호스트 | `0.0.0.0` |
| `PORT` | 서버 포트 | `8000` |

## 보안 고려사항

### ✅ 안전한 부분

- API 키는 `.env` 파일에 저장 (Git에 커밋 안 됨)
- 클라이언트 측 API 키는 로컬 스토리지에만 저장
- 업로드된 파일은 `temp/` 디렉토리에 임시 저장 후 자동 삭제

### ⚠️ 주의사항

- `.env` 파일을 절대 Git에 커밋하지 마세요
- API 키를 코드에 하드코딩하지 마세요
- 프로덕션 환경에서는 HTTPS 사용을 권장합니다

## 문제 해결

### 번역이 잘리는 경우

- 청크 크기가 자동으로 조정됩니다 (현재 5행/청크)
- 매우 긴 텍스트가 있는 경우 청크 크기를 더 줄일 수 있습니다

### 열 순서가 바뀌는 경우

- 첫 번째 행의 열 순서를 기준으로 유지됩니다
- GPT 응답에서 `input_data` 배열만 추출합니다

### API 키 오류

- 설정 페이지에서 API 키가 올바르게 입력되었는지 확인
- OpenAI 계정에 충분한 크레딧이 있는지 확인

## 개발

### 테스트 실행

```bash
pytest tests/
```

### 코드 포맷팅

```bash
black app/
isort app/
```

### 타입 체크

```bash
mypy app/
```