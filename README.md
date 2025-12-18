# Prompt Lab (프롬프트 랩)

**Prompt Lab**은 사용자가 다양한 상황별 프롬프트를 학습하고 생성할 수 있는 인터랙티브 웹 애플리케이션입니다. 관리자는 그룹(계정)을 관리하고 프롬프트 DB를 구축할 수 있습니다.

## ✨ 주요 기능 (Key Features)

### 1. 🤖 AI 프롬프트 생성 (AI Image Generation)
- **멀티모달 지원**: 텍스트 주제뿐만 아니라 **이미지**를 업로드하여 AI가 이를 분석하고 교육용 프롬프트를 자동 생성합니다.
- **최신 모델**: Google **Gemini 1.5 Flash** 모델을 사용하여 빠르고 정확한 결과를 제공합니다.
- **자동 저장**: 생성된 프롬프트는 즉시 데이터베이스에 저장되어 목록에서 바로 확인할 수 있습니다.

### 2. 🛡️ 관리자 대시보드 (Admin Dashboard)
- **그룹 관리 (CRUD)**:
    - 새로운 그룹(계정)을 추가, 수정, 삭제할 수 있습니다.
    - **표시 이름 한글화**: `business`, `public` 등의 ID 대신 `비즈니스`, `공공기관` 등 친숙한 한글 이름으로 표시됩니다.
- **보안 기능**:
    - 비밀번호 확인 시 **눈 모양 아이콘(👁️)**을 사용하여 숨김/표시를 토글할 수 있습니다.

### 3. 📚 학습 및 실습 (Learn & Practice)
- **단계별 학습**: 초급, 중급, 고급 난이도별로 프롬프트를 학습할 수 있습니다.
- **다양한 분야**: 비즈니스, 공공기관, 학교(초/중/고/대), 일반 성인 등 대상별 커리큘럼을 제공합니다.
- **편의 기능**:
    - **페이징(Pagination)**: 프롬프트 목록을 페이지 단위로 탐색할 수 있습니다.
    - **대량 등록**: JSON 형식 또는 AI 생성을 통해 프롬프트를 일괄 등록할 수 있습니다.

## 🚀 시작하기 (Getting Started)

### 설치 및 실행

```bash
npm install
npm run dev
```

### 환경 변수 (.env)

프로젝트 루트에 `.env` 파일을 생성하고 다음 키를 설정해야 합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key (Optional)
```

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: CSS Modules / Global CSS
- **AI**: Google Generative AI (Gemini), OpenAI API
- **Icons**: Lucide React
