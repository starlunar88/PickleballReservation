# 서버 측 자동 대진표 생성 설정 가이드

## 현재 문제점

현재 시스템은 **클라이언트 측(브라우저)에서만** 자동 대진표 생성이 작동합니다.
- 누군가 웹사이트에 접속해 있어야만 작동
- 브라우저를 닫으면 자동 실행 중단
- 접속자가 없으면 대진표가 생성되지 않음

## 해결 방법: Firebase Cloud Functions 사용

Firebase Cloud Functions의 Scheduled Functions를 사용하면 **서버 측에서 자동으로** 대진표를 생성할 수 있습니다.

## 설치 및 설정 방법

### 1. Firebase CLI 설치

```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인

```bash
firebase login
```

### 3. 프로젝트 초기화

```bash
firebase init functions
```

다음 옵션을 선택:
- **Use an existing project**: 기존 프로젝트 선택 (`pickleballreservation-58bcb`)
- **Language**: JavaScript
- **ESLint**: Yes (선택사항)
- **Install dependencies**: Yes

### 4. 함수 배포

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 5. 함수 확인

Firebase Console > Functions에서 `checkAndProcessReservations` 함수가 생성되었는지 확인합니다.

## 작동 방식

1. **자동 실행**: Firebase가 매 1분마다 함수를 자동으로 실행합니다.
2. **마감 시간 확인**: 각 시간 슬롯의 마감 시간을 확인합니다.
3. **대진표 생성**: 마감 시간이 지나면 자동으로 대진표를 생성합니다.

## 주의사항

### 대진표 생성 로직 구현 필요

현재 `functions/index.js`의 `generateMatchSchedule` 함수는 **간단한 예시만** 제공합니다.
실제 대진표 생성 로직을 구현하려면:

1. **옵션 1**: 클라이언트 측 코드(`app.js`의 `generateMatchSchedule`)를 서버 측으로 포팅
2. **옵션 2**: HTTP 호출로 클라이언트 측 함수를 트리거 (권장하지 않음)
3. **옵션 3**: `pickleball-balance-scheduler.js`를 Node.js 환경에서 사용 가능하도록 수정

### 비용 고려사항

- Firebase Cloud Functions는 **무료 할당량**이 있습니다:
  - 월 200만 함수 호출 (무료)
  - 매 1분마다 실행 = 하루 1,440회 = 월 약 43,200회
  - 무료 할당량 내에서 충분히 작동합니다.

### 대안: 실행 주기 조정

매 1분마다 실행하는 대신, 더 긴 주기로 조정할 수 있습니다:

```javascript
// 5분마다 실행
exports.checkAndProcessReservations = functions.pubsub
    .schedule('every 5 minutes')
    .timeZone('Asia/Seoul')
    .onRun(async (context) => {
        // ...
    });
```

또는 특정 시간에만 실행:

```javascript
// 매일 오전 8시, 12시, 16시에 실행
exports.checkAndProcessReservations = functions.pubsub
    .schedule('0 8,12,16 * * *')
    .timeZone('Asia/Seoul')
    .onRun(async (context) => {
        // ...
    });
```

## 테스트

### 로컬 테스트

```bash
firebase emulators:start --only functions
```

### 로그 확인

```bash
firebase functions:log
```

또는 Firebase Console > Functions > Logs에서 확인할 수 있습니다.

## 추가 개선 사항

1. **에러 알림**: 대진표 생성 실패 시 관리자에게 알림
2. **재시도 로직**: 실패 시 자동 재시도
3. **로깅**: 상세한 로그 기록

## 참고 자료

- [Firebase Cloud Functions 문서](https://firebase.google.com/docs/functions)
- [Scheduled Functions 가이드](https://firebase.google.com/docs/functions/schedule-functions)


