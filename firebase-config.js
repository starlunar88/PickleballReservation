// Firebase 설정
// 실제 Firebase 프로젝트 설정으로 교체하세요
const firebaseConfig = {
  apiKey: "AIzaSyDfErowlP_mfHpTfrdkLogGWxKckfj-LFs",
  authDomain: "pickleballreservation-58bcb.firebaseapp.com",
  projectId: "pickleballreservation-58bcb",
  storageBucket: "pickleballreservation-58bcb.firebasestorage.app",
  messagingSenderId: "1000923785177",
  appId: "1:1000923785177:web:3ebd3e9528f6e5e6725bc8"
};
// Firebase 초기화
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase 초기화 성공!');
    console.log('프로젝트 ID:', firebaseConfig.projectId);
} catch (error) {
    console.error('Firebase 초기화 실패:', error);
}

// Firebase 서비스 참조 (전역 변수로만 설정 - app.js에서 사용)
window.auth = firebase.auth();
window.db = firebase.firestore();

// Firebase 연결 상태 확인
console.log('Firebase Auth 객체:', window.auth);
console.log('Firebase Firestore 객체:', window.db);

// 사용자 DUPR 가져오기
async function getUserDUPR(userId) {
    try {
        const userDoc = await window.db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.dupr || null;
        }
        return null;
    } catch (error) {
        console.error('DUPR 가져오기 오류:', error);
        return null;
    }
}

// 관리자 여부 확인
async function isAdmin(user) {
    try {
        // Firestore에서 관리자 목록 확인
        const adminDoc = await window.db.collection('admins').doc(user.uid).get();
        if (adminDoc.exists) {
            return adminDoc.data().isAdmin === true;
        }
        
        // 기본 관리자 이메일 (초기 설정용)
        const defaultAdminEmails = ['admin@pickleball.com', 'starlunar88@gmail.com'];
        if (defaultAdminEmails.includes(user.email)) {
            // 기본 관리자를 Firestore에 등록
            await window.db.collection('admins').doc(user.uid).set({
                email: user.email,
                isAdmin: true,
                addedAt: new Date(),
                addedBy: 'system'
            });
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('관리자 확인 오류:', error);
        return false;
    }
}

// 인증 상태 변경 감지
window.auth.onAuthStateChanged(async (user) => {
    if (user) {
        // 사용자가 로그인한 경우 users 컬렉션에 문서가 없으면 생성
        try {
            const userDoc = await window.db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                await window.db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName,
                    createdAt: new Date(),
                    dupr: null
                }, { merge: true });
                console.log('users 컬렉션에 사용자 문서 생성 완료 (onAuthStateChanged)');
            }
        } catch (error) {
            console.error('users 컬렉션 문서 확인/생성 오류:', error);
        }
        
        // 사용자가 로그인한 경우
        showUserMenu(user);
        loadUserReservations(user.uid);
    } else {
        // 사용자가 로그아웃한 경우
        window.adminStatus = false; // 관리자 상태 초기화
        showAuthButtons();
        clearReservations();
        
        // 로그아웃 후 현재 활성화된 탭 자동 새로고침
        setTimeout(() => {
            const reservationsTab = document.getElementById('reservations-tab');
            const matchesTab = document.getElementById('matches-tab');
            const recordsTab = document.getElementById('records-tab');
            
            if (reservationsTab && reservationsTab.classList.contains('active')) {
                // 예약 탭이 활성화되어 있으면 예약 현황 다시 로드
                if (typeof loadReservationsTimeline === 'function') {
                    loadReservationsTimeline().catch(err => console.error('예약 현황 다시 로드 오류:', err));
                }
            } else if (matchesTab && matchesTab.classList.contains('active')) {
                // 대진표 탭이 활성화되어 있으면 대진표 다시 로드
                if (typeof loadMatchesData === 'function') {
                    loadMatchesData().catch(err => console.error('대진표 다시 로드 오류:', err));
                }
            } else if (recordsTab && recordsTab.classList.contains('active')) {
                // 기록 탭이 활성화되어 있으면 기록 다시 로드
                if (typeof loadRecordsData === 'function') {
                    loadRecordsData().catch(err => console.error('기록 다시 로드 오류:', err));
                }
            }
        }, 300);
    }
});

// 사용자 메뉴 표시
async function showUserMenu(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const userDupr = document.getElementById('user-dupr');
    const adminSettingsBtn = document.getElementById('admin-settings-btn');
    const navUserInfo = document.getElementById('nav-user-info');
    
    if (authButtons && userMenu && userName) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        
        // users 컬렉션에서 사용자 이름 가져오기
        let userDisplayName = user.displayName;
        try {
            const userDoc = await window.db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                // users 컬렉션에서 이름 우선순위: displayName > name > email의 @ 앞부분
                userDisplayName = userData.displayName || userData.name || user.email?.split('@')[0] || user.email;
            } else {
                // users 컬렉션에 없으면 displayName 또는 이메일 사용
                userDisplayName = user.displayName || user.email?.split('@')[0] || user.email;
            }
        } catch (error) {
            console.error('사용자 정보 가져오기 오류:', error);
            // 에러 발생 시 기본값 사용
            userDisplayName = user.displayName || user.email?.split('@')[0] || user.email;
        }
        
        userName.textContent = userDisplayName;
        
        // DUPR 정보 가져오기
        const dupr = await getUserDUPR(user.uid);
        if (dupr && userDupr) {
            userDupr.textContent = `DUPR: ${dupr}`;
            userDupr.style.display = 'block';
        } else if (userDupr) {
            userDupr.style.display = 'none';
        }
        
        // 네비게이션 바에 사용자 정보 표시
        if (navUserInfo) {
            // DUPR 텍스트 제거하고 이름(점수) 형식으로 표시
            navUserInfo.textContent = dupr ? `${userDisplayName}(${dupr.toFixed(1)})` : userDisplayName;
            navUserInfo.style.display = 'inline';
        }
        
        // 관리자 버튼 표시 (async 처리)
        checkAdminStatus(user);
    }
}

// 관리자 상태 확인
async function checkAdminStatus(user) {
    try {
        const adminSettingsBtn = document.getElementById('admin-settings-btn');
        const adminMenuItems = document.querySelectorAll('.admin-only');
        
        const isUserAdmin = await isAdmin(user);
        
        // window.adminStatus에 저장 (다른 함수에서 사용)
        window.adminStatus = isUserAdmin;
        
        // 관리자 버튼 표시
        if (isUserAdmin && adminSettingsBtn) {
            adminSettingsBtn.style.display = 'inline-block';
        } else if (adminSettingsBtn) {
            adminSettingsBtn.style.display = 'none';
        }
        
        // 관리자 메뉴 표시
        if (isUserAdmin) {
            adminMenuItems.forEach(item => {
                item.style.display = 'block';
            });
        } else {
            adminMenuItems.forEach(item => {
                item.style.display = 'none';
            });
        }
        
        // 로그인 후 현재 활성화된 탭 자동 새로고침
        setTimeout(() => {
            const reservationsTab = document.getElementById('reservations-tab');
            const matchesTab = document.getElementById('matches-tab');
            const recordsTab = document.getElementById('records-tab');
            
            if (reservationsTab && reservationsTab.classList.contains('active')) {
                // 예약 탭이 활성화되어 있으면 예약 현황 다시 로드
                if (typeof loadReservationsTimeline === 'function') {
                    loadReservationsTimeline().catch(err => console.error('예약 현황 다시 로드 오류:', err));
                }
            } else if (matchesTab && matchesTab.classList.contains('active')) {
                // 대진표 탭이 활성화되어 있으면 대진표 다시 로드
                if (typeof loadMatchesData === 'function') {
                    loadMatchesData().catch(err => console.error('대진표 다시 로드 오류:', err));
                }
            } else if (recordsTab && recordsTab.classList.contains('active')) {
                // 기록 탭이 활성화되어 있으면 기록 다시 로드
                if (typeof loadRecordsData === 'function') {
                    loadRecordsData().catch(err => console.error('기록 다시 로드 오류:', err));
                }
            }
        }, 300);
        
    } catch (error) {
        console.error('관리자 상태 확인 오류:', error);
        window.adminStatus = false;
    }
}

// 인증 버튼 표시
function showAuthButtons() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (authButtons && userMenu) {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        
        // 네비게이션 바 사용자 정보 숨기기
        const navUserInfo = document.getElementById('nav-user-info');
        if (navUserInfo) {
            navUserInfo.style.display = 'none';
        }
    }
}

// 예약 내역 로드
function loadUserReservations(userId) {
    const reservationsList = document.getElementById('reservations-list');
    
    if (!reservationsList) return;
    
    db.collection('reservations')
        .where('userId', '==', userId)
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
    
    // 상태에 따른 스타일 클래스
    const statusClass = reservation.status === 'confirmed' ? 'confirmed' : 
                       reservation.status === 'pending' ? 'pending' : 'cancelled';
    
    // 상태 텍스트
    const statusText = reservation.status === 'confirmed' ? '확정' :
                      reservation.status === 'pending' ? '대기중' : '취소됨';
    
    div.innerHTML = `
        <div class="reservation-info">
            <h4>${reservation.courtName || reservation.court} - ${reservation.date}</h4>
            <p>시간: ${reservation.timeSlot || reservation.time} | 예약일: ${new Date(reservation.createdAt).toLocaleDateString()}</p>
            <p class="reservation-status ${statusClass}">상태: ${statusText}</p>
            ${reservation.userDupr ? `<p class="reservation-dupr">DUPR: ${reservation.userDupr}</p>` : ''}
        </div>
        <div class="reservation-actions">
            ${reservation.status !== 'cancelled' ? 
                `<button class="btn btn-danger" onclick="cancelReservation('${id}')">취소</button>` : 
                '<span class="cancelled-text">취소됨</span>'
            }
        </div>
    `;
    return div;
}

// 예약 취소
function cancelReservation(reservationId) {
    if (confirm('정말로 이 예약을 취소하시겠습니까?')) {
        window.db.collection('reservations').doc(reservationId).delete()
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
async function createReservation(reservationData) {
    const user = window.auth.currentUser;
    if (!user) {
        showToast('로그인이 필요합니다.', 'warning');
        return null;
    }
    
    const reservation = {
        ...reservationData,
        userId: user.uid,
        userName: user.displayName || user.email,
        userDupr: reservationData.userDupr || null,
        createdAt: new Date(),
        status: 'pending' // 대기 상태로 시작
    };
    
    try {
        const docRef = await window.db.collection('reservations').add(reservation);
        console.log('Firestore에 예약 저장 완료:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('예약 저장 오류:', error);
        showToast('예약 저장 중 오류가 발생했습니다.', 'error');
        return null;
    }
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
