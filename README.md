# 피클볼 예약 시스템

피클볼 코트 예약을 위한 반응형 웹 애플리케이션입니다.

## 주요 기능

- 🔐 Firebase 인증 (회원가입/로그인)
- 📅 코트 예약 시스템
- 📱 완전한 반응형 디자인 (PC/Tablet/Mobile)
- 🎨 모던하고 직관적인 UI/UX
- 🔔 실시간 알림 시스템
- 📊 예약 내역 관리

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore)
- **Icons**: Font Awesome
- **Deployment**: GitHub Pages

## 설치 및 설정

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication 활성화 (이메일/비밀번호 방식)
3. Firestore Database 생성
4. 웹 앱 추가 및 설정 정보 복사

### 2. Firebase 설정 업데이트

`firebase-config.js` 파일에서 다음 정보를 실제 Firebase 프로젝트 설정으로 교체하세요:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 3. Firestore 보안 규칙 설정

Firebase Console > Firestore Database > 규칙에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 예약 컬렉션 규칙
    match /reservations/{reservationId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 사용법

### 회원가입/로그인
1. 우측 상단의 "회원가입" 또는 "로그인" 버튼 클릭
2. 필요한 정보 입력 후 제출

### 코트 예약
1. "예약하기" 섹션으로 스크롤
2. 코트, 날짜, 시간 선택
3. "예약하기" 버튼 클릭

### 예약 관리
1. "내 예약" 섹션에서 예약 내역 확인
2. 필요시 "취소" 버튼으로 예약 취소

## 반응형 디자인

- **Desktop (1024px+)**: 전체 기능이 한 화면에 표시
- **Tablet (768px-1023px)**: 적응형 그리드 레이아웃
- **Mobile (767px 이하)**: 햄버거 메뉴와 스택 레이아웃

## 파일 구조

```
PickleballReservation/
├── index.html          # 메인 HTML 파일
├── styles.css          # CSS 스타일시트
├── app.js             # 메인 JavaScript 로직
├── firebase-config.js # Firebase 설정 및 인증
└── README.md          # 프로젝트 문서
```

## 배포

GitHub Pages를 통한 자동 배포가 설정되어 있습니다:
- 메인 브랜치에 푸시 시 자동으로 https://starlunar88.github.io/PickleballReservation/ 에 배포됩니다.

## 주요 특징

### 보안
- Firebase Authentication을 통한 안전한 사용자 인증
- Firestore 보안 규칙을 통한 데이터 보호
- 클라이언트 사이드 입력 검증

### 사용자 경험
- 직관적인 네비게이션
- 실시간 피드백 (토스트 알림)
- 로딩 상태 표시
- 반응형 모달 시스템

### 성능
- 최적화된 CSS 애니메이션
- 효율적인 DOM 조작
- Firebase의 실시간 데이터베이스 활용

## 커스터마이징

### 색상 테마 변경
`styles.css` 파일에서 CSS 변수를 수정하여 색상 테마를 변경할 수 있습니다:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #28a745;
    --error-color: #dc3545;
}
```

### 코트 정보 수정
`index.html` 파일의 코트 선택 옵션을 수정하여 실제 코트 정보에 맞게 변경하세요.

## 문제 해결

### 일반적인 문제들

1. **Firebase 연결 오류**: `firebase-config.js`의 설정 정보가 올바른지 확인
2. **예약이 저장되지 않음**: Firestore 보안 규칙이 올바르게 설정되었는지 확인
3. **모바일에서 레이아웃 깨짐**: 뷰포트 메타 태그가 올바르게 설정되었는지 확인

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
