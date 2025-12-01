# Firebase 데이터베이스 확인 가이드

## 프로젝트 정보
- **프로젝트 ID**: `pickleballreservation-58bcb`
- **Firebase Console URL**: https://console.firebase.google.com/project/pickleballreservation-58bcb

---

## 1. Firestore Database 확인

### 접속 방법
1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `pickleballreservation-58bcb`
3. 좌측 메뉴에서 **Firestore Database** 클릭

### 확인할 컬렉션들

#### ✅ `settings` 컬렉션 확인
- **경로**: `settings/system`
- **확인 사항**:
  - 문서가 존재하는지 확인
  - 필드 확인:
    - `courtCount` (코트 수)
    - `timeSlots` (시간 슬롯 배열)
    - `closingTime` (마감 시간)
    - `playersPerCourt` (코트당 인원)
    - `gamesPerHour` (시간당 게임 수)

#### ✅ `users` 컬렉션 확인
- 사용자 문서들이 제대로 생성되어 있는지 확인

#### ✅ `reservations` 컬렉션 확인
- 예약 데이터가 제대로 저장되어 있는지 확인

#### ✅ `admins` 컬렉션 확인
- 관리자 문서가 존재하는지 확인

---

## 2. Firestore 보안 규칙 확인 및 수정

### 현재 문제
- `settings` 컬렉션에 대한 읽기 권한이 없어서 "Missing or insufficient permissions" 오류 발생

### 보안 규칙 확인 방법
1. Firebase Console > Firestore Database
2. 상단 탭에서 **규칙** 클릭
3. 현재 규칙 확인

### 권장 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 시스템 설정 - 모든 인증된 사용자가 읽기 가능, 관리자만 쓰기 가능
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // 사용자 컬렉션 - 자신의 문서만 읽기/쓰기 가능
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 예약 컬렉션 - 자신의 예약만 읽기/쓰기 가능
    match /reservations/{reservationId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.userId ||
         (exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true));
    }
    
    // 관리자 컬렉션 - 관리자만 읽기 가능
    match /admins/{adminId} {
      allow read: if request.auth != null && 
        (request.auth.uid == adminId ||
         (exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true));
      allow write: if false; // 관리자 문서는 코드에서만 생성
    }
    
    // 승인된 회원가입 목록 - 인증된 사용자가 읽기 가능
    match /approvedSignups/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // 대진표 관련 컬렉션들
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /matchRecords/{recordId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

### 보안 규칙 적용 방법
1. Firebase Console > Firestore Database > 규칙 탭
2. 위의 규칙을 복사하여 붙여넣기
3. **게시** 버튼 클릭
4. 규칙 검증 메시지 확인

---

## 3. Authentication 확인

### 확인 방법
1. Firebase Console > Authentication
2. **사용자** 탭에서 등록된 사용자 확인
3. **로그인 방법** 탭에서 이메일/비밀번호 방식이 활성화되어 있는지 확인

---

## 4. 데이터 직접 확인 방법

### 브라우저 콘솔에서 테스트
브라우저 개발자 도구(F12) 콘솔에서 다음 코드 실행:

```javascript
// 현재 사용자 확인
console.log('현재 사용자:', firebase.auth().currentUser);

// settings 문서 읽기 테스트
firebase.firestore().collection('settings').doc('system').get()
  .then(doc => {
    if (doc.exists) {
      console.log('✅ 설정 문서 존재:', doc.data());
    } else {
      console.log('⚠️ 설정 문서가 존재하지 않습니다');
    }
  })
  .catch(error => {
    console.error('❌ 오류:', error.code, error.message);
  });
```

---

## 5. 문제 해결 체크리스트

- [ ] Firestore Database가 생성되어 있는가?
- [ ] `settings/system` 문서가 존재하는가?
- [ ] 보안 규칙에 `settings` 컬렉션 읽기 권한이 있는가?
- [ ] Authentication이 활성화되어 있는가?
- [ ] 사용자가 로그인되어 있는가?
- [ ] 관리자 문서(`admins/{userId}`)가 존재하는가?

---

## 6. 빠른 해결 방법

### 방법 1: 보안 규칙 수정 (권장)
위의 보안 규칙을 적용하면 모든 인증된 사용자가 `settings` 컬렉션을 읽을 수 있습니다.

### 방법 2: settings 문서 직접 생성
Firebase Console에서 수동으로 `settings/system` 문서 생성:
```json
{
  "courtCount": 3,
  "timeSlots": [
    {"start": "09:00", "end": "10:00"},
    {"start": "10:00", "end": "11:00"},
    {"start": "11:00", "end": "12:00"},
    {"start": "12:00", "end": "13:00"},
    {"start": "13:00", "end": "14:00"},
    {"start": "14:00", "end": "15:00"},
    {"start": "15:00", "end": "16:00"},
    {"start": "16:00", "end": "17:00"},
    {"start": "17:00", "end": "18:00"},
    {"start": "18:00", "end": "19:00"},
    {"start": "19:00", "end": "20:00"}
  ],
  "closingTime": 60,
  "playersPerCourt": 4,
  "gamesPerHour": 8,
  "lastUpdated": "2025-01-XX"
}
```

---

## 참고
- 현재 코드는 권한 오류 시 기본 설정을 사용하도록 수정되어 있어, 보안 규칙이 없어도 앱은 동작합니다.
- 하지만 Firestore에서 실제 설정을 읽으려면 보안 규칙 수정이 필요합니다.

