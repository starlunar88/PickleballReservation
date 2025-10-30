// Firebase 설정
// 실제 Firebase 프로젝트 설정으로 교체하세요
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firebase 서비스 참조
const auth = firebase.auth();
const db = firebase.firestore();

// 인증 상태 변경 감지
auth.onAuthStateChanged((user) => {
    if (user) {
        // 사용자가 로그인한 경우
        showUserMenu(user);
        loadUserReservations(user.uid);
    } else {
        // 사용자가 로그아웃한 경우
        showAuthButtons();
        clearReservations();
    }
});

// 사용자 메뉴 표시
function showUserMenu(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    
    if (authButtons && userMenu && userName) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        userName.textContent = user.displayName || user.email;
    }
}

// 인증 버튼 표시
function showAuthButtons() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (authButtons && userMenu) {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// 예약 내역 로드
function loadUserReservations(userId) {
    const reservationsList = document.getElementById('reservations-list');
    
    if (!reservationsList) return;
    
    db.collection('reservations')
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
            reservationsList.innerHTML = '';
            
            if (snapshot.empty) {
                reservationsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <p>예약 내역이 없습니다</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach((doc) => {
                const reservation = doc.data();
                const reservationElement = createReservationElement(doc.id, reservation);
                reservationsList.appendChild(reservationElement);
            });
        });
}

// 예약 요소 생성
function createReservationElement(id, reservation) {
    const div = document.createElement('div');
    div.className = 'reservation-item';
    div.innerHTML = `
        <div class="reservation-info">
            <h4>${reservation.court} - ${reservation.date}</h4>
            <p>시간: ${reservation.time} | 예약일: ${new Date(reservation.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="reservation-actions">
            <button class="btn btn-danger" onclick="cancelReservation('${id}')">취소</button>
        </div>
    `;
    return div;
}

// 예약 취소
function cancelReservation(reservationId) {
    if (confirm('정말로 이 예약을 취소하시겠습니까?')) {
        db.collection('reservations').doc(reservationId).delete()
            .then(() => {
                showToast('예약이 취소되었습니다.', 'success');
            })
            .catch((error) => {
                console.error('예약 취소 오류:', error);
                showToast('예약 취소 중 오류가 발생했습니다.', 'error');
            });
    }
}

// 예약 내역 초기화
function clearReservations() {
    const reservationsList = document.getElementById('reservations-list');
    if (reservationsList) {
        reservationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>예약 내역이 없습니다</p>
            </div>
        `;
    }
}

// 예약 생성
function createReservation(reservationData) {
    const user = auth.currentUser;
    if (!user) {
        showToast('로그인이 필요합니다.', 'warning');
        return;
    }
    
    const reservation = {
        ...reservationData,
        userId: user.uid,
        userName: user.displayName || user.email,
        createdAt: new Date(),
        status: 'confirmed'
    };
    
    return db.collection('reservations').add(reservation);
}

// 토스트 알림 표시
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 로딩 표시/숨김
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}
