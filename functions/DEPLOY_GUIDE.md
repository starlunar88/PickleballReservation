# Firebase Cloud Functions 배포 가이드

## 서버 측 자동 대진표 생성 기능 배포

이 가이드는 Firebase Cloud Functions를 사용하여 서버 측에서 완전히 자동으로 대진표를 생성하는 기능을 배포하는 방법을 설명합니다.

## 사전 요구사항

1. Node.js 설치 (v18 이상)
2. Firebase CLI 설치
3. Firebase 프로젝트 설정

## 설치 단계

### 1. Firebase CLI 설치

```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인

```bash
firebase login
```

### 3. 프로젝트 초기화

프로젝트 루트 디렉토리에서 실행:

```bash
firebase init functions
```

다음 옵션을 선택:
- **Use an existing project**: 기존 프로젝트 선택 (`pickleballreservation-58bcb`)
- **Language**: JavaScript
- **ESLint**: Yes (선택사항)
- **Install dependencies**: Yes

### 4. 의존성 설치

```bash
cd functions
npm install
cd ..
```

### 5. 함수 배포

```bash
firebase deploy --only functions
```

또는 특정 함수만 배포:

```bash
firebase deploy --only functions:checkAndProcessReservations
```

## 함수 확인

배포 후 Firebase Console에서 확인:
1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `pickleballreservation-58bcb`
3. Functions 메뉴 클릭
4. `checkAndProcessReservations` 함수 확인

## 로그 확인

함수 실행 로그 확인:

```bash
firebase functions:log
```

또는 Firebase Console > Functions > Logs에서 확인

## 테스트

### 로컬 테스트

```bash
firebase emulators:start --only functions
```

### 수동 트리거 테스트

Firebase Console > Functions에서 함수를 수동으로 트리거할 수 있습니다.

## 함수 실행 주기 변경

기본값은 1분마다 실행됩니다. 변경하려면 `functions/index.js`에서 수정:

```javascript
// 5분마다 실행
exports.checkAndProcessReservations = functions.pubsub
    .schedule('every 5 minutes')
    .timeZone('Asia/Seoul')
    .onRun(async (context) => {
        // ...
    });
```

## 비용 고려사항

- Firebase Cloud Functions 무료 할당량:
  - 월 200만 함수 호출 (무료)
  - 매 1분마다 실행 = 하루 1,440회 = 월 약 43,200회
  - 무료 할당량 내에서 충분히 작동

## 문제 해결

### 함수가 실행되지 않는 경우

1. Firebase Console에서 함수 상태 확인
2. 로그에서 에러 확인
3. 시스템 설정(`settings/system`) 확인
4. Firestore 보안 규칙 확인

### 대진표가 생성되지 않는 경우

1. 예약자 수 확인 (최소 4명 필요)
2. 마감 시간 확인
3. 로그에서 에러 메시지 확인

## 주의사항

- 함수는 **서버 측에서만** 실행됩니다
- 클라이언트 측 코드(`app.js`)는 그대로 유지됩니다
- 서버 측과 클라이언트 측 모두 작동하므로 중복 실행 방지 로직이 포함되어 있습니다

## 추가 개선 사항

1. 에러 알림 기능 추가
2. 재시도 로직 강화
3. 상세한 로깅
4. 성능 모니터링

