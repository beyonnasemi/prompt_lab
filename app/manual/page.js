export default function ManualPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>사용 가이드</h1>

            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#2563eb' }}>1. 학습 시작하기</h2>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
                    <p>1. 메인 화면에서 본인에 해당하는 <strong>대상 그룹</strong>(예: 비즈니스, 대학 등)을 선택하세요.</p>
                    <p>2. 관리자로부터 전달받은 <strong>비밀번호</strong>를 입력하여 로그인합니다.</p>
                    <p>3. 상단의 <strong>난이도 탭</strong>(초급/중급/고급)을 눌러 수준에 맞는 프롬프트를 확인합니다.</p>
                </div>
            </section>

            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#2563eb' }}>2. 프롬프트 실습</h2>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
                    <p>1. 마음에 드는 주제의 카드에서 <strong>[프롬프트 복사]</strong> 버튼을 클릭합니다.</p>
                    <p>2. 사용 중인 LLM 서비스(ChatGPT, Gemini, Claude 등)의 채팅창에 <strong>붙여넣기</strong>(Ctrl+V) 합니다.</p>
                    <p>3. AI의 답변을 확인하고, <strong>[예상 답변 확인하기]</strong>를 눌러 비교해봅니다.</p>
                </div>
            </section>

            <section>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#16a34a' }}>관리자 기능</h2>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
                    <p>우측 상단의 <strong>[관리자]</strong> 메뉴를 통해 프롬프트를 등록, 수정, 삭제할 수 있습니다.</p>
                    <p>JSON 포맷을 활용한 <strong>대량 등록</strong> 기능도 지원합니다.</p>
                </div>
            </section>
        </div>
    );
}
