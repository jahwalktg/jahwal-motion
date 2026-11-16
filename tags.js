/* 즉석 모션그래픽 — 찾기 낱말(꼬리표)과 상황별 흐름
   - TAGS: 장면 id → 찾는 말(이름·설명에 없는 말까지). 새 장면을 넣으면 여기에 한 줄.
   - SITUATIONS: 상황을 고르면 그 흐름 순서대로 장면을 보여 줌(①②③). 같은 장면이 여러 상황에 들어가도 됨.
   - SYN: 비슷한 말 묶음(어느 하나로 쳐도 같이 찾힘). */
(function () {
  var TAGS = {
    open: '오프닝 인트로 첫 화면 시작 행사명 제목 타이틀 로고 등장 개막',
    count: '카운트다운 숫자 5 4 3 2 1 시작 직전 잠시 후',
    steps: '식순 순서 일정 프로그램 진행 순서 차례 목차 절차 오늘의 순서',
    rite: '국민의례 국기 태극기 경례 맹세 애국가 묵념 기립 착석 의식 기념식 개회식',
    anthem: '애국가 가사 자막 노래 제창 국기 태극기 1절 4절',
    silence: '묵념 추모 순국선열 호국영령 기념식 추도',
    guests: '내빈 소개 귀빈 참석자 구청장 의원 운영위원 인사 소개',
    wait: '대기 화면 환영 입장 시작 전 빔 프로젝터 반복 로비 오신 것을 환영',
    safety: '안전 비상구 화장실 휴대폰 진동 촬영 안내 예절 시작 전 주의사항',
    lower: '자막 띠 이름표 소속 직함 발표자 하단 바 네임 인터뷰 영상 위 투명',
    call: '호명 이름 부르기 발표자 수상자 다음 순서 소개 카드',
    timer: '쉬는 시간 휴식 타이머 시계 카운트다운 분 초 브레이크 10분',
    ticker: '공지 흐르는 자막 롤링 안내 띠 뉴스 자막 주차 식사 설문',
    award: '시상 상장 수여 수상자 우수 표창 상 이름 시상식 수료식',
    roll: '명단 롤 엔딩 크레딧 수료자 참여자 후원자 이름 흐름 명단 발표',
    teams: '조 편성 조 나누기 모둠 팀 분임 그룹 워크숍 자리 배치',
    ptimer: '발표 타이머 발표 시간 모서리 작은 시계 카운트다운 토론 시간 제한',
    alert: '알림 5분 남았습니다 마무리 띄우기 팝업 투명 발표 중',
    ask: '질문 질의응답 Q&A 손 들기 QR 질문 폼 토론',
    quiz: '퀴즈 정답 공개 보기 OX 문제 교육 골든벨 두구두구',
    meal: '점심 식사 저녁 다과 간식 메뉴 식당 식권 시간 안내',
    shot: '단체 사진 촬영 기념 촬영 카메라 3 2 1 찰칵 사진 찍기',
    draw: '추첨 경품 행운권 룰렛 당첨 번호 뽑기 이벤트 선물',
    nums: '숫자 올라가기 카운트업 성과 실적 통계 수치 인원 매출 금액 보고',
    bars: '막대 그래프 비교 전후 연도별 사업단별 통계 차트 보고',
    photo: '사진 한 장 켄 번스 움직이는 사진 확대 소식지 현장 사진',
    chapter: '챕터 장 전환 목차 번호 제목 구역 발표 구성 섹션 간지',
    marker: '형광펜 강조 밑줄 핵심 문장 한 줄 하이라이트 중요',
    quote: '인용 소감 후기 참여자 말 이용자 목소리 따옴표 사례 인터뷰',
    check: '체크리스트 점검 확인 완료 준비 사항 체크 목록 할 일',
    pct: '퍼센트 달성률 비율 원형 그래프 도넛 만족도 취업률 목표',
    slides: '사진 여러 장 슬라이드쇼 앨범 현장 사진 돌아보기 넘김 갤러리',
    thanks: '감사합니다 마무리 끝 인사 설문 QR 폐회 종료',
    party: '축하 콘페티 폭죽 수료 개소 기념 생일 당선 환호 박수',
    qr: 'QR 큐알 설문 출석 신청 링크 주소 휴대폰 스캔 참여'
  };
  var SYN = [
    ['타이머', '시계', '시간 재기', '스톱워치'], ['QR', '큐알', 'qr코드', '큐알코드'], ['카운트다운', '카운트', '초읽기'],
    ['사진', '이미지', '포토'], ['자막', '글자 띠', '캡션'], ['시상', '수상', '표창', '상장'], ['국민의례', '국기에 대한 경례', '경례'],
    ['조 편성', '조편성', '팀 나누기', '모둠'], ['감사', '땡큐', '고맙습니다'], ['통계', '숫자', '수치', '실적'], ['설문', '만족도'],
    ['발표', '프레젠테이션', 'PPT', '피피티'], ['행사', '기념식', '개회식', '행사장'], ['교육', '강의', '연수', '워크숍']
  ];
  var SITUATIONS = [
    { id: 'event', icon: '🎪', name: '행사·기념식 한 바퀴', desc: '입장부터 폐회까지 순서대로', scenes: ['wait', 'safety', 'count', 'open', 'rite', 'guests', 'steps', 'lower', 'award', 'shot', 'draw', 'thanks'] },
    { id: 'edu', icon: '🎓', name: '교육·강의', desc: '강의 앞뒤와 쉬는 시간, 퀴즈', scenes: ['wait', 'open', 'chapter', 'marker', 'quote', 'quiz', 'timer', 'ptimer', 'alert', 'ask', 'qr', 'thanks'] },
    { id: 'report', icon: '📊', name: '성과 보고·발표', desc: 'PPT 안에서 숫자·비교·강조', scenes: ['chapter', 'nums', 'bars', 'pct', 'check', 'marker', 'quote', 'slides', 'photo', 'thanks'] },
    { id: 'cert', icon: '🏆', name: '수료식·시상식', desc: '호명·시상·명단·축하', scenes: ['open', 'rite', 'call', 'award', 'roll', 'party', 'shot', 'thanks'] },
    { id: 'workshop', icon: '👥', name: '워크숍·조별 활동', desc: '조 나누기와 시간 관리', scenes: ['steps', 'teams', 'ptimer', 'alert', 'timer', 'meal', 'ask', 'shot'] },
    { id: 'overlay', icon: '🎬', name: '영상·슬라이드 위에 얹기', desc: '배경을 「투명」으로 받아 GIF로', scenes: ['lower', 'ticker', 'alert', 'ptimer'] },
    { id: 'promo', icon: '📣', name: '소식·홍보·SNS', desc: '사진과 QR, 축하 인사', scenes: ['photo', 'slides', 'qr', 'party', 'quote', 'nums'] },
    { id: 'wait', icon: '⏳', name: '대기·쉬는 시간', desc: '빈 화면 대신 띄워 두기', scenes: ['wait', 'timer', 'meal', 'ticker', 'qr'] }
  ];
  window.MG.TAGS = TAGS; window.MG.SYN = SYN; window.MG.SITUATIONS = SITUATIONS;
})();
