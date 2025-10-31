// Firebase 초기화 확인 및 전역 변수 설정
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        // firebase-config.js에서 이미 설정된 window.auth와 window.db 사용
        if (!window.auth) {
            window.auth = firebase.auth();
        }
        if (!window.db) {
            window.db = firebase.firestore();
        }
        console.log('✅ Firebase 전역 변수 설정 완료');
        return true;
    } else {
        console.error('❌ Firebase가 초기화되지 않았습니다');
        return false;
    }
}

// 전역 변수 참조 (firebase-config.js에서 설정된 window.auth, window.db 사용)
const auth = window.auth;
const db = window.db;

// 로딩 표시/숨김 함수 (firebase-config.js에 정의되어 있지만 중복 정의로 안전성 확보)
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

// 토스트 알림 표시 함수 (firebase-config.js에 정의되어 있지만 중복 정의로 안전성 확보)
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

// 예약 생성 함수 (firebase-config.js에 정의되어 있지만 중복 정의로 안전성 확보)
async function createReservation(reservationData) {
    // Firebase 초기화 확인
    if (!auth || !db) {
        if (!initializeFirebase()) {
            showToast('Firebase가 초기화되지 않았습니다.', 'error');
            return null;
        }
    }
    
    const user = auth.currentUser;
    if (!user) {
        showToast('로그인이 필요합니다.', 'warning');
        return null;
    }
    
    // 예약 데이터에 사용자 정보 추가 (이미 포함된 경우 중복 방지)
    const reservation = {
        ...reservationData,
        userId: reservationData.userId || user.uid,
        userName: reservationData.userName || user.displayName || user.email,
        userDupr: reservationData.userDupr || null,
        createdAt: reservationData.createdAt || new Date(),
        status: reservationData.status || 'pending' // 대기 상태로 시작
    };
    
    try {
        const docRef = await db.collection('reservations').add(reservation);
        console.log('Firestore에 예약 저장 완료:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('예약 저장 오류:', error);
        showToast('예약 저장 중 오류가 발생했습니다.', 'error');
        return null;
    }
}

// DOM 요소 참조
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const closeLogin = document.getElementById('close-login');
const closeSignup = document.getElementById('close-signup');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const getStartedBtn = document.getElementById('get-started-btn');
const reserveBtn = document.getElementById('reserve-btn');

// 모달 열기/닫기 이벤트 리스너
if (loginBtn) {
    loginBtn.addEventListener('click', () => openModal('login'));
}

if (signupBtn) {
    signupBtn.addEventListener('click', () => openModal('signup'));
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

if (closeLogin) {
    closeLogin.addEventListener('click', closeLoginModal);
}

if (closeSignup) {
    closeSignup.addEventListener('click', () => closeModal('signup'));
}

if (switchToSignup) {
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('login');
        openModal('signup');
    });
}

if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('signup');
        openModal('login');
    });
}

// 햄버거 메뉴 토글
if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : 'auto';
    });
}

// 햄버거 메뉴 외부 클릭 시 닫기
if (navMenu && hamburger) {
    document.addEventListener('click', (e) => {
        const clickedInside = navMenu.contains(e.target) || hamburger.contains(e.target);
        if (!clickedInside && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}

// 모달 외부 클릭 시 닫기 (회원가입과 DUPR 수정만)
window.addEventListener('click', (e) => {
    if (e.target === signupModal) {
        closeModal('signup');
    }
    if (e.target === document.getElementById('dupr-edit-modal')) {
        closeDuprEditModal();
    }
    // 로그인 모달은 외부 클릭으로 닫지 않음
});

// 로그인 폼 제출
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
}

// 회원가입 폼 제출
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSignup();
    });
}

// 시작하기 버튼
if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
        document.getElementById('reservation').scrollIntoView({ behavior: 'smooth' });
    });
}

// 예약 버튼
if (reserveBtn) {
    reserveBtn.addEventListener('click', handleReservation);
}

// 모달 열기
function openModal(type) {
    const modal = type === 'login' ? loginModal : signupModal;
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// 모달 닫기
function closeModal(type) {
    const modal = type === 'login' ? loginModal : signupModal;
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 로그인 모달만 닫기 (X 버튼용)
function closeLoginModal() {
    if (loginModal) {
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 로그인 처리 (이메일/비밀번호 방식)
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const dupr = document.getElementById('login-dupr').value;
    
    if (!email || !password) {
        showToast('이메일과 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('유효한 이메일 주소를 입력해주세요.', 'error');
        return;
    }
    
    // DUPR 유효성 검사
    if (dupr && !isValidDUPR(dupr)) {
        showToast('DUPR은 2.0에서 8.0 사이의 값이어야 합니다.', 'error');
        return;
    }
    
    try {
        showLoading();
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // DUPR이 입력된 경우 Firestore에 저장
        if (dupr) {
            await updateUserDUPR(userCredential.user.uid, parseFloat(dupr));
        }
        
        showToast('로그인되었습니다!', 'success');
        closeLoginModal();
        loginForm.reset();
    } catch (error) {
        console.error('로그인 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        
        let errorMessage = '로그인 중 오류가 발생했습니다.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = '등록되지 않은 이메일입니다.';
                break;
            case 'auth/wrong-password':
                errorMessage = '비밀번호가 올바르지 않습니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일입니다.';
                break;
            case 'auth/user-disabled':
                errorMessage = '비활성화된 계정입니다.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = '이메일/비밀번호 인증이 비활성화되어 있습니다.';
                break;
            case 'auth/network-request-failed':
                errorMessage = '네트워크 오류가 발생했습니다.';
                break;
            case 'auth/invalid-api-key':
                errorMessage = 'Firebase API 키가 올바르지 않습니다.';
                break;
            case 'auth/project-not-found':
                errorMessage = 'Firebase 프로젝트를 찾을 수 없습니다.';
                break;
            default:
                errorMessage = `오류: ${error.message} (코드: ${error.code})`;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        hideLoading();
    }
}

// 회원가입 처리 (이메일 링크 방식)
async function handleSignup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    
    if (!name || !email) {
        showToast('이름과 이메일을 입력해주세요.', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('유효한 이메일 주소를 입력해주세요.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // 이메일 링크 전송 (회원가입용)
        const actionCodeSettings = {
            url: window.location.origin + window.location.pathname + '?mode=signup',
            handleCodeInApp: true,
        };
        
        await auth.sendSignInLinkToEmail(email, actionCodeSettings);
        
        // 사용자 정보를 localStorage에 저장
        localStorage.setItem('emailForSignIn', email);
        localStorage.setItem('userNameForSignIn', name);
        localStorage.setItem('isSignup', 'true');
        
        showToast('회원가입 링크가 이메일로 전송되었습니다! 이메일을 확인해주세요.', 'success');
        closeModal('signup');
        signupForm.reset();
        
    } catch (error) {
        console.error('회원가입 링크 전송 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        
        let errorMessage = '회원가입 링크 전송 중 오류가 발생했습니다.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일입니다.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = '이메일 링크 인증이 비활성화되어 있습니다.';
                break;
            case 'auth/network-request-failed':
                errorMessage = '네트워크 오류가 발생했습니다.';
                break;
            case 'auth/invalid-api-key':
                errorMessage = 'Firebase API 키가 올바르지 않습니다.';
                break;
            case 'auth/project-not-found':
                errorMessage = 'Firebase 프로젝트를 찾을 수 없습니다.';
                break;
            default:
                errorMessage = `오류: ${error.message} (코드: ${error.code})`;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        hideLoading();
    }
}

// 로그아웃 처리
async function logout() {
    try {
        await auth.signOut();
        showToast('로그아웃되었습니다.', 'success');
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showToast('로그아웃 중 오류가 발생했습니다.', 'error');
    }
}

// 예약 처리
async function handleReservation() {
    const court = document.getElementById('court-select').value;
    const date = document.getElementById('date-select').value;
    const timeSlot = document.getElementById('time-select').value;
    
    if (!court || !date || !timeSlot) {
        showToast('모든 필드를 선택해주세요.', 'error');
        return;
    }
    
    // 날짜 유효성 검사
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showToast('과거 날짜는 선택할 수 없습니다.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const user = auth.currentUser;
        if (!user) {
            showToast('로그인이 필요합니다.', 'warning');
            return;
        }
        
        // 중복 예약 확인
        const existingReservation = await db.collection('reservations')
            .where('userId', '==', user.uid)
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        
        if (!existingReservation.empty) {
            showToast('이미 예약된 시간입니다.', 'error');
            return;
        }
        
        // 예약 가능 여부 확인
        const availability = await checkReservationAvailability(date, timeSlot);
        
        if (!availability.available) {
            if (availability.isFull) {
                // 대기열에 추가할지 확인
                const addToWaitlistConfirm = confirm(
                    `${availability.reason}\n\n대기열에 추가하시겠습니까?`
                );
                
                if (addToWaitlistConfirm) {
                    await addToWaitlist(date, timeSlot);
                }
            } else {
                showToast(availability.reason, 'error');
            }
            return;
        }
        
        // 예약 생성
        const userDupr = await getUserDUPR(user.uid);
        const reservationData = {
            court: court,
            date: date,
            timeSlot: timeSlot,
            courtName: `코트 ${court.replace('court', '')}`,
            userDupr: userDupr
        };
        
        await createReservation(reservationData);
        showToast(`예약이 완료되었습니다! (${availability.current + 1}/${availability.max})`, 'success');
        
        // 폼 초기화
        document.getElementById('court-select').value = '';
        document.getElementById('date-select').value = '';
        document.getElementById('time-select').value = '';
        
    } catch (error) {
        console.error('예약 오류:', error);
        showToast('예약 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 스무스 스크롤
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 날짜 입력 필드에 최소 날짜 설정
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date-select');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
});

// 이메일 유효성 검사
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// DUPR 유효성 검사
function isValidDUPR(dupr) {
    const duprValue = parseFloat(dupr);
    return !isNaN(duprValue) && duprValue >= 2.0 && duprValue <= 8.0;
}

// DUPR 입력 실시간 유효성 검사
function validateDUPRInput(input) {
    const value = parseFloat(input.value);
    
    if (input.value === '') {
        input.style.borderColor = '#e9ecef';
        return;
    }
    
    if (isNaN(value) || value < 2.0 || value > 8.0) {
        input.style.borderColor = '#dc3545';
        input.setCustomValidity('DUPR은 2.0에서 8.0 사이의 값이어야 합니다.');
    } else {
        input.style.borderColor = '#28a745';
        input.setCustomValidity('');
    }
}

// 사용자 DUPR 업데이트
async function updateUserDUPR(userId, dupr) {
    try {
        await db.collection('users').doc(userId).set({
            dupr: dupr,
            updatedAt: new Date()
        }, { merge: true });
        console.log('DUPR 업데이트 성공:', dupr);
    } catch (error) {
        console.error('DUPR 업데이트 오류:', error);
        throw error;
    }
}

// 사용자 DUPR 가져오기
async function getUserDUPR(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data().dupr;
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
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (adminDoc.exists) {
            return adminDoc.data().isAdmin === true;
        }
        
        // 기본 관리자 이메일 (초기 설정용)
        const defaultAdminEmails = ['admin@pickleball.com', 'starlunar88@gmail.com'];
        if (defaultAdminEmails.includes(user.email)) {
            // 기본 관리자를 Firestore에 등록
            await db.collection('admins').doc(user.uid).set({
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

// 시스템 설정 가져오기
async function getSystemSettings() {
    try {
        if (!db) {
            console.error('Firestore가 초기화되지 않았습니다');
            throw new Error('Firestore가 초기화되지 않았습니다');
        }
        const settingsDoc = await db.collection('settings').doc('system').get();
        if (settingsDoc.exists) {
            return settingsDoc.data();
        }
        // 기본 설정 반환
        return {
            courtCount: 2,
            timeSlots: [
                { start: "09:00", end: "10:00" },
                { start: "10:00", end: "11:00" },
                { start: "11:00", end: "12:00" },
                { start: "12:00", end: "13:00" },
                { start: "13:00", end: "14:00" },
                { start: "14:00", end: "15:00" },
                { start: "15:00", end: "16:00" },
                { start: "16:00", end: "17:00" },
                { start: "17:00", end: "18:00" },
                { start: "18:00", end: "19:00" },
                { start: "19:00", end: "20:00" }
            ],
            closingTime: 60,
            playersPerCourt: 4,
            gamesPerHour: 4
        };
    } catch (error) {
        console.error('시스템 설정 가져오기 오류:', error);
        return null;
    }
}

// 시스템 설정 저장
async function saveSystemSettings(settings) {
    try {
        const dataToSave = {
            ...settings,
            lastUpdated: new Date()
        };
        
        await db.collection('settings').doc('system').set(dataToSave);
        
    } catch (error) {
        console.error('시스템 설정 저장 오류:', error);
        throw error;
    }
}

// 이메일 링크 확인 및 로그인 처리
function handleEmailLinkSignIn() {
    // URL에서 이메일 링크 확인
    if (!auth) {
        console.error('Firebase Auth가 초기화되지 않았습니다');
        return;
    }
    if (auth.isSignInWithEmailLink(window.location.href)) {
        let email = localStorage.getItem('emailForSignIn');
        let userName = localStorage.getItem('userNameForSignIn');
        let isSignup = localStorage.getItem('isSignup') === 'true';
        
        if (!email) {
            // 이메일이 localStorage에 없는 경우 사용자에게 입력 요청
            email = window.prompt('이메일 주소를 입력해주세요:');
        }
        
        if (email) {
            showLoading();
            
            auth.signInWithEmailLink(email, window.location.href)
                .then((result) => {
                    console.log('이메일 링크 로그인 성공:', result);
                    
                    if (isSignup) {
                        // 회원가입인 경우 사용자 이름 설정
                        if (userName && !result.user.displayName) {
                            return result.user.updateProfile({
                                displayName: userName
                            });
                        }
                    }
                })
                .then(() => {
                    if (isSignup) {
                        // 회원가입인 경우 비밀번호 설정 모달 표시
                        showPasswordSetupModal(email);
                        showToast('회원가입이 완료되었습니다! 비밀번호를 설정해주세요.', 'success');
                    } else {
                        // 로그인인 경우
                        showToast('로그인되었습니다!', 'success');
                    }
                    
                    // localStorage 정리
                    localStorage.removeItem('emailForSignIn');
                    localStorage.removeItem('userNameForSignIn');
                    localStorage.removeItem('isSignup');
                    
                    // URL에서 이메일 링크 파라미터 제거
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .catch((error) => {
                    console.error('이메일 링크 로그인 오류:', error);
                    let errorMessage = '이메일 링크 로그인 중 오류가 발생했습니다.';
                    
                    switch (error.code) {
                        case 'auth/invalid-email':
                            errorMessage = '유효하지 않은 이메일입니다.';
                            break;
                        case 'auth/invalid-action-code':
                            errorMessage = '유효하지 않거나 만료된 링크입니다.';
                            break;
                        case 'auth/expired-action-code':
                            errorMessage = '만료된 링크입니다. 다시 요청해주세요.';
                            break;
                        case 'auth/user-disabled':
                            errorMessage = '비활성화된 계정입니다.';
                            break;
                        default:
                            errorMessage = `오류: ${error.message}`;
                    }
                    
                    showToast(errorMessage, 'error');
                })
                .finally(() => {
                    hideLoading();
                });
        }
    }
}

// 비밀번호 설정 모달 표시
function showPasswordSetupModal(email) {
    const modal = document.getElementById('password-setup-modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 이메일 정보 표시
        const modalBody = modal.querySelector('.modal-body');
        const emailInfo = document.createElement('div');
        emailInfo.className = 'password-info';
        emailInfo.innerHTML = `<p><i class="fas fa-envelope"></i> ${email}로 회원가입이 완료되었습니다.</p>`;
        modalBody.insertBefore(emailInfo, modalBody.firstChild);
    }
}

// 비밀번호 설정 모달 닫기
function closePasswordSetupModal() {
    const modal = document.getElementById('password-setup-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 비밀번호 설정 처리
async function handlePasswordSetup() {
    const password = document.getElementById('setup-password').value;
    const confirmPassword = document.getElementById('setup-confirm-password').value;
    
    if (!password || !confirmPassword) {
        showToast('비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('비밀번호는 6자 이상이어야 합니다.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const user = auth.currentUser;
        if (!user) {
            showToast('사용자 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        // 비밀번호 설정
        await user.updatePassword(password);
        
        showToast('비밀번호가 설정되었습니다! 이제 이메일과 비밀번호로 로그인할 수 있습니다.', 'success');
        closePasswordSetupModal();
        
        // 폼 초기화
        document.getElementById('password-setup-form').reset();
        
    } catch (error) {
        console.error('비밀번호 설정 오류:', error);
        let errorMessage = '비밀번호 설정 중 오류가 발생했습니다.';
        
        switch (error.code) {
            case 'auth/weak-password':
                errorMessage = '비밀번호가 너무 약합니다.';
                break;
            case 'auth/requires-recent-login':
                errorMessage = '보안을 위해 다시 로그인해주세요.';
                break;
            default:
                errorMessage = `오류: ${error.message}`;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        hideLoading();
    }
}

// DUPR 수정 모달 열기
function openDuprEditModal() {
    const modal = document.getElementById('dupr-edit-modal');
    const currentDuprSpan = document.getElementById('current-dupr');
    const editDuprInput = document.getElementById('edit-dupr');
    
    if (modal && currentDuprSpan && editDuprInput) {
        // 현재 사용자의 DUPR 가져오기
        const user = auth.currentUser;
        if (user) {
            getUserDUPR(user.uid).then(dupr => {
                if (dupr) {
                    currentDuprSpan.textContent = dupr;
                    editDuprInput.value = dupr;
                } else {
                    currentDuprSpan.textContent = '설정되지 않음';
                    editDuprInput.value = '';
                }
            });
        }
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// DUPR 수정 모달 닫기
function closeDuprEditModal() {
    const modal = document.getElementById('dupr-edit-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// DUPR 수정 처리
async function handleDuprEdit() {
    const dupr = document.getElementById('edit-dupr').value;
    
    if (!dupr) {
        showToast('DUPR을 입력해주세요.', 'error');
        return;
    }
    
    if (!isValidDUPR(dupr)) {
        showToast('DUPR은 2.0에서 8.0 사이의 값이어야 합니다.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const user = auth.currentUser;
        if (!user) {
            showToast('사용자 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        await updateUserDUPR(user.uid, parseFloat(dupr));
        
        // 사용자 메뉴 업데이트
        await showUserMenu(user);
        
        showToast('DUPR이 업데이트되었습니다!', 'success');
        closeDuprEditModal();
        
    } catch (error) {
        console.error('DUPR 수정 오류:', error);
        showToast('DUPR 업데이트 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 관리자 설정 모달 열기
async function openAdminSettingsModal() {
    const modal = document.getElementById('admin-settings-modal');
    if (modal) {
        // UI 완전 초기화
        document.getElementById('court-count').value = '';
        document.getElementById('closing-time').value = '';
        
        // 시간 슬롯 컨테이너 완전 초기화
        const container = document.getElementById('time-slots-container');
        container.innerHTML = '';
        
        // 현재 설정 로드
        const settings = await getSystemSettings();
        
        if (settings) {
            // 설정값을 UI에 반영
            document.getElementById('court-count').value = settings.courtCount || 2;
            document.getElementById('closing-time').value = settings.closingTime || 60;
            
            // 시간 슬롯 로드
            console.log('로드할 시간 슬롯:', settings.timeSlots);
            if (settings.timeSlots && settings.timeSlots.length > 0) {
                settings.timeSlots.forEach((slot, index) => {
                    console.log(`시간 슬롯 ${index + 1} 추가:`, slot);
                    addTimeSlotItem(slot.start, slot.end, true); // isFromData = true
                });
            } else {
                // 기본 시간 슬롯 추가
                addTimeSlotItem('09:00', '10:00', true);
            }
        } else {
            // 설정이 없으면 기본값으로 초기화
            document.getElementById('court-count').value = 2;
            document.getElementById('closing-time').value = 60;
            addTimeSlotItem('09:00', '10:00');
        }
        
        // 관리자 목록 로드
        await loadAdminList();
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// 관리자 설정 모달 닫기
function closeAdminSettingsModal() {
    const modal = document.getElementById('admin-settings-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 시간 슬롯 아이템 추가
function addTimeSlotItem(start = '09:00', end = '10:00', isFromData = false) {
    const container = document.getElementById('time-slots-container');
    
    console.log(`addTimeSlotItem 호출: start=${start}, end=${end}, isFromData=${isFromData}`);
    
    // 데이터에서 로드하는 경우가 아니고, 컨테이너가 비어있지 않은 경우에만 자동 연속 설정
    if (!isFromData && container.children.length > 0) {
        const lastItem = container.lastElementChild;
        if (lastItem && lastItem.classList.contains('time-slot-item')) {
            const lastEndTime = lastItem.querySelector('.time-end').value;
            if (lastEndTime) {
                console.log(`자동 연속 설정: 마지막 종료시간=${lastEndTime}`);
                start = lastEndTime;
                // 1시간 후로 종료 시간 설정
                const [hours, minutes] = lastEndTime.split(':').map(Number);
                const endTime = new Date();
                endTime.setHours(hours, minutes);
                endTime.setHours(endTime.getHours() + 1);
                end = endTime.toTimeString().slice(0, 5);
                console.log(`자동 연속 설정 결과: start=${start}, end=${end}`);
            }
        }
    }
    
    console.log(`최종 시간 슬롯 생성: start=${start}, end=${end}`);
    
    const item = document.createElement('div');
    item.className = 'time-slot-item';
    item.innerHTML = `
        <div class="time-slot-inputs">
            <input type="time" class="form-control time-start" value="${start}" onchange="validateTimeSlot(this)">
            <span class="time-separator">~</span>
            <input type="time" class="form-control time-end" value="${end}" onchange="validateTimeSlot(this)">
        </div>
        <button type="button" class="btn btn-outline btn-small remove-time-slot" title="이 시간대 삭제">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(item);
    
    // 삭제 버튼 이벤트
    const removeBtn = item.querySelector('.remove-time-slot');
    removeBtn.addEventListener('click', () => {
        if (container.children.length > 1) {
            item.remove();
            if (!isFromData) {
                showToast('시간대가 삭제되었습니다.', 'info');
            }
        } else {
            showToast('최소 1개의 시간대는 유지해야 합니다.', 'warning');
        }
    });
    
    // 시간 유효성 검사
    validateTimeSlot(item.querySelector('.time-start'));
    validateTimeSlot(item.querySelector('.time-end'));
    
    if (!isFromData) {
        showToast('새 시간대가 추가되었습니다.', 'success');
    }
}

// 시간 슬롯 유효성 검사
function validateTimeSlot(input) {
    const timeSlotItem = input.closest('.time-slot-item');
    const startInput = timeSlotItem.querySelector('.time-start');
    const endInput = timeSlotItem.querySelector('.time-end');
    
    const startTime = startInput.value;
    const endTime = endInput.value;
    
    if (startTime && endTime) {
        if (startTime >= endTime) {
            showToast('종료 시간은 시작 시간보다 늦어야 합니다.', 'warning');
            endInput.value = '';
            endInput.focus();
            return false;
        }
        
        // 시간 겹침 검사
        const container = document.getElementById('time-slots-container');
        const allItems = container.querySelectorAll('.time-slot-item');
        
        for (let item of allItems) {
            if (item === timeSlotItem) continue;
            
            const otherStart = item.querySelector('.time-start').value;
            const otherEnd = item.querySelector('.time-end').value;
            
            if (otherStart && otherEnd) {
                if ((startTime < otherEnd && endTime > otherStart)) {
                    showToast('시간대가 겹치지 않도록 설정해주세요.', 'warning');
                    input.value = '';
                    input.focus();
                    return false;
                }
            }
        }
    }
    
    return true;
}

// 관리자 설정 저장
async function handleAdminSettings() {
    const courtCount = parseInt(document.getElementById('court-count').value);
    const closingTime = parseInt(document.getElementById('closing-time').value);
    
    // 시간 슬롯 수집
    const timeSlots = [];
    const timeSlotItems = document.querySelectorAll('.time-slot-item');
    
    for (let item of timeSlotItems) {
        const start = item.querySelector('.time-start').value;
        const end = item.querySelector('.time-end').value;
        
        if (start && end) {
            timeSlots.push({ start, end });
        }
    }
    
    if (timeSlots.length === 0) {
        showToast('최소 하나의 시간 슬롯을 설정해주세요.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const settings = {
            courtCount,
            timeSlots,
            closingTime,
            playersPerCourt: 4,
            gamesPerHour: 4
        };
        
        await saveSystemSettings(settings);
        
        // UI 새로고침
        await refreshUIAfterSettingsUpdate();
        
        showToast('관리자 설정이 저장되었습니다!', 'success');
        closeAdminSettingsModal();
        
    } catch (error) {
        console.error('관리자 설정 저장 오류:', error);
        showToast('설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 설정 업데이트 후 UI 새로고침
async function refreshUIAfterSettingsUpdate() {
    try {
        // 시간 슬롯 옵션 새로고침
        await loadTimeSlots();
        
        // 코트 옵션 새로고침
        await loadCourtOptions();
        
        // 예약 현황 새로고침 (관리자 대시보드가 열려있다면)
        const adminDashboard = document.getElementById('admin-dashboard-tab');
        if (adminDashboard && adminDashboard.classList.contains('active')) {
            await loadReservationsDashboard();
        }
        
    } catch (error) {
        console.error('UI 새로고침 오류:', error);
    }
}

// 비밀번호 설정 폼 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    const passwordSetupForm = document.getElementById('password-setup-form');
    if (passwordSetupForm) {
        passwordSetupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handlePasswordSetup();
        });
    }
    
    // DUPR 수정 모달 이벤트 리스너
    const duprEditForm = document.getElementById('dupr-edit-form');
    if (duprEditForm) {
        duprEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleDuprEdit();
        });
    }
    
    // DUPR 수정 버튼 이벤트 리스너
    const editDuprBtn = document.getElementById('edit-dupr-btn');
    if (editDuprBtn) {
        editDuprBtn.addEventListener('click', openDuprEditModal);
    }
    
    // DUPR 수정 모달 닫기 버튼
    const closeDuprEdit = document.getElementById('close-dupr-edit');
    if (closeDuprEdit) {
        closeDuprEdit.addEventListener('click', closeDuprEditModal);
    }
    
    // 관리자 설정 버튼
    const adminSettingsBtn = document.getElementById('admin-settings-btn');
    if (adminSettingsBtn) {
        adminSettingsBtn.addEventListener('click', async () => {
            await openAdminSettingsModal();
            await loadAssignmentTimeOptions();
        });
    }
    
    // 관리자 설정 모달 닫기 버튼
    const closeAdminSettings = document.getElementById('close-admin-settings');
    if (closeAdminSettings) {
        closeAdminSettings.addEventListener('click', closeAdminSettingsModal);
    }
    
    // 관리자 설정 폼
    const adminSettingsForm = document.getElementById('admin-settings-form');
    if (adminSettingsForm) {
        adminSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAdminSettings();
        });
    }
    
    // 시간 슬롯 추가 버튼
    const addTimeSlotBtn = document.getElementById('add-time-slot');
    if (addTimeSlotBtn) {
        addTimeSlotBtn.addEventListener('click', () => {
            addTimeSlotItem();
        });
    }
    
    // 랭킹 탭 버튼들
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // 관리자 팀 배정 관리
    const manualAssignmentBtn = document.getElementById('manual-assignment-btn');
    const viewAssignmentsBtn = document.getElementById('view-assignments-btn');
    const assignmentDate = document.getElementById('assignment-date');
    const assignmentTime = document.getElementById('assignment-time');
    const assignmentMode = document.getElementById('assignment-mode');
    
    if (manualAssignmentBtn) {
        manualAssignmentBtn.addEventListener('click', async () => {
            const date = assignmentDate.value;
            const timeSlot = assignmentTime.value;
            const mode = assignmentMode.value;
            
            if (!date || !timeSlot) {
                showToast('날짜와 시간을 선택해주세요.', 'error');
                return;
            }
            
            await manualTeamAssignment(date, timeSlot, mode);
        });
    }
    
    if (viewAssignmentsBtn) {
        viewAssignmentsBtn.addEventListener('click', async () => {
            const date = assignmentDate.value;
            const timeSlot = assignmentTime.value;
            
            if (!date || !timeSlot) {
                showToast('날짜와 시간을 선택해주세요.', 'error');
                return;
            }
            
            await viewTeamAssignments(date, timeSlot);
        });
    }
    
    // 관리자 설정 모달 열 때 시간 옵션 로드 (이미 위에서 처리됨)
    
    // 알림 버튼
    const notificationsBtn = document.getElementById('notifications-btn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', openNotificationsModal);
    }

    // 테스트용 시간대별 버튼 생성
    createTestButtons();
    
    // 새로고침 버튼 이벤트 리스너
    const refreshBtn = document.getElementById('refresh-timeline');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            try {
                showToast('데이터를 새로고침하는 중...', 'info');
                await loadReservationsTimeline();
                await checkAndShowMatchSchedule();
                showToast('새로고침 완료!', 'success');
            } catch (error) {
                console.error('새로고침 오류:', error);
                showToast('새로고침에 실패했습니다. 다시 시도해주세요.', 'error');
            }
        });
    }
    
    // 알림 모달 닫기
    const closeNotifications = document.getElementById('close-notifications');
    if (closeNotifications) {
        closeNotifications.addEventListener('click', closeNotificationsModal);
    }
    
    // 대시보드 탭 전환
    document.querySelectorAll('.dashboard-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchDashboardTab(tabName);
        });
    });
    
    // 상태 탭 전환
    document.querySelectorAll('.status-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchStatusTab(tabName);
        });
    });
    
    // 관리자 추가 버튼
    const addAdminBtn = document.getElementById('add-admin-btn');
    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', addAdmin);
    }
    
    // 관리자 이메일 입력 엔터키
    const adminEmailInput = document.getElementById('admin-email');
    if (adminEmailInput) {
        adminEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addAdmin();
            }
        });
    }
    
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// 로그아웃 처리
async function handleLogout() {
    try {
        showLoading();
        
        // Firebase 로그아웃
        await auth.signOut();
        
        // UI 초기화
        showAuthButtons();
        clearReservations();
        
        // 모든 모달 닫기
        closeAllModals();
        
        showToast('로그아웃되었습니다.', 'success');
        
        // 페이지를 메인 대시보드로 스크롤 (요소가 존재할 때만)
        const mainDashboard = document.getElementById('main-dashboard');
        if (mainDashboard) {
            mainDashboard.scrollIntoView({ behavior: 'smooth' });
        } else {
            // 메인 대시보드가 없으면 페이지 상단으로
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showToast('로그아웃 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 모든 모달 닫기
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// 탭 전환 기능
function switchMainTab(tabName) {
    console.log('메인 탭 전환:', tabName);
    
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.mobile-tab-btn, .desktop-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 모든 탭 컨텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    // 선택된 탭 컨텐츠 표시
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
        
        // 예약 탭으로 전환 시 강제로 예약 현황 로드
        if (tabName === 'reservations') {
            console.log('예약 탭 전환 - 예약 현황 강제 로드');
            
            // 모바일에서 여러 번 시도
            const tryLoadOnTabSwitch = async (attempt = 1) => {
                try {
                    await loadReservationsTimeline();
                    console.log(`탭 전환 시 예약 현황 로드 완료 (시도 ${attempt})`);
                } catch (error) {
                    console.error(`탭 전환 시 예약 현황 로드 실패 (시도 ${attempt}):`, error);
                    if (attempt < 3) {
                        setTimeout(() => tryLoadOnTabSwitch(attempt + 1), 500 * attempt);
                    }
                }
            };
            
            setTimeout(() => tryLoadOnTabSwitch(), 100);
        }
    }
    
    // 탭별 데이터 로드
    loadTabData(tabName);
}

// 탭별 데이터 로드
async function loadTabData(tabName) {
    switch(tabName) {
        case 'reservations':
            console.log('📱 예약 탭 데이터 로드 시작');
            await loadReservationsData();
            // 추가로 타임라인 강제 로드
            setTimeout(async () => {
                console.log('📱 예약 탭 추가 로드');
                await loadReservationsTimeline();
            }, 500);
            break;
        case 'rankings':
            await loadRankingsData();
            break;
        case 'matches':
            await loadMatchesData();
            break;
        case 'stats':
            await loadStatsData();
            // 탭 전환 시 팀 분석도 로드 (이미 loadStatsData에서 호출되지만, 확실하게)
            setTimeout(async () => {
                await loadTeamAnalysis();
            }, 500);
            break;
        case 'records':
            await loadRecordsData();
            break;
        case 'admin':
            await loadAdminData();
            break;
    }
}

// 대진표 데이터 로드
async function loadMatchesData() {
    try {
        console.log('📋 loadMatchesData 호출됨');
        // 현재 날짜로 대진표 로드
        const currentDate = window.currentDate || new Date().toISOString().slice(0, 10);
        console.log('📅 현재 날짜:', currentDate);
        await loadMatchesForDate(currentDate);
    } catch (error) {
        console.error('❌ 대진표 데이터 로드 오류:', error);
    }
}

// 특정 날짜의 대진표 로드
async function loadMatchesForDate(date) {
    try {
        console.log('📋 loadMatchesForDate 호출됨, 날짜:', date);
        
        const settings = await getSystemSettings();
        if (!settings || !settings.timeSlots) {
            console.log('⚠️ 설정 또는 시간 슬롯이 없습니다');
            return;
        }
        
        const matchesContainer = document.getElementById('match-schedule');
        if (!matchesContainer) {
            console.error('❌ match-schedule 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        console.log('✅ match-schedule 컨테이너 찾음');
        
        // Firebase 초기화 확인
        if (!window.db) {
            if (!initializeFirebase()) {
                console.error('❌ db 객체를 찾을 수 없습니다');
                return;
            }
        }
        
        const db = window.db || firebase.firestore();
        if (!db) {
            console.error('❌ db 객체를 찾을 수 없습니다');
            return;
        }
        
        console.log('✅ db 객체 확인됨');
        
        // 모든 시간대의 대진표를 표시
        let matchesHTML = '';
        let hasMatches = false;
        
        console.log('🕐 시간대 수:', settings.timeSlots.length);
        
        for (const timeSlot of settings.timeSlots) {
            const slotKey = `${timeSlot.start}-${timeSlot.end}`;
            console.log(`🔍 시간대 확인: ${slotKey}, 날짜: ${date}`);
            
            // 해당 시간대의 대진표 확인
            const existingMatches = await db.collection('matches')
                .where('date', '==', date)
                .where('timeSlot', '==', slotKey)
                .get();
            
            console.log(`📊 ${slotKey} 시간대 매치 수:`, existingMatches.size);
            
            if (!existingMatches.empty) {
                hasMatches = true;
                const matches = existingMatches.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`✅ ${slotKey} 시간대 매치 발견:`, matches.length);
                
                // 시간대별 섹션 헤더 추가
                matchesHTML += `
                    <div class="time-slot-section">
                        <div class="time-slot-header-compact">${timeSlot.start} ~ ${timeSlot.end}</div>
                        <div class="courts-container">
                `;
                
                // 코트별로 그룹화
                const courts = {};
                matches.forEach(match => {
                    const courtNum = match.courtNumber || 1;
                    if (!courts[courtNum]) {
                        courts[courtNum] = [];
                    }
                    courts[courtNum].push(match);
                });
                
                // 각 코트 내에서 경기 번호 순으로 정렬
                Object.keys(courts).forEach(courtNum => {
                    courts[courtNum].sort((a, b) => (a.roundNumber || 1) - (b.roundNumber || 1));
                });
                
                // 코트별로 렌더링 (1코트, 2코트 순서)
                Object.keys(courts).sort((a, b) => a - b).forEach(courtNum => {
                    const courtMatches = courts[courtNum];
                    
                    matchesHTML += `
                        <div class="court-column">
                            <div class="court-header-compact">${courtNum}코트</div>
                    `;
                    
                    // 각 코트의 경기 렌더링
                    courtMatches.forEach(match => {
                        // 팀 A 이름들을 배열로 (위아래 배치용)
                        const teamANames = match.teamA.map(p => p.userName);
                        // 팀 B 이름들을 배열로 (위아래 배치용)
                        const teamBNames = match.teamB.map(p => p.userName);
                        const scoreA = match.scoreA ?? '';
                        const scoreB = match.scoreB ?? '';
                        const isCompleted = match.status === 'completed';
                        const safeId = match.id.replace(/:/g, '_').replace(/\//g, '_');
                        const roundNum = match.roundNumber || 1;
                        const courtNum = match.courtNumber || 1;
                        
                        // 경기 시간 (저장된 값이 있으면 사용, 없으면 계산)
                        let gameStart, gameEnd;
                        if (match.gameStartTime && match.gameEndTime) {
                            gameStart = match.gameStartTime;
                            gameEnd = match.gameEndTime;
                        } else {
                            // 기존 계산 로직 (하위 호환성)
                            const timeSlotStart = timeSlot.start.split(':');
                            const startHour = parseInt(timeSlotStart[0]);
                            const startMin = parseInt(timeSlotStart[1]);
                            const minutesPerGame = 15;
                            const gameStartMinutes = (roundNum - 1) * minutesPerGame;
                            const totalStartMinutes = startHour * 60 + startMin + gameStartMinutes;
                            const gameStartHour = Math.floor(totalStartMinutes / 60);
                            const gameStartMin = totalStartMinutes % 60;
                            const totalEndMinutes = totalStartMinutes + minutesPerGame;
                            const gameEndHour = Math.floor(totalEndMinutes / 60);
                            const gameEndMin = totalEndMinutes % 60;
                            
                            gameStart = `${String(gameStartHour).padStart(2, '0')}:${String(gameStartMin).padStart(2, '0')}`;
                            gameEnd = `${String(gameEndHour).padStart(2, '0')}:${String(gameEndMin).padStart(2, '0')}`;
                        }
                    
                        matchesHTML += `
                            <div class="match-item-compact" data-match-id="${match.id}">
                                <div class="match-header-compact">
                                    <span class="match-info-compact">${roundNum}경기 ${gameStart} ~ ${gameEnd}</span>
                                </div>
                                <div class="match-teams-compact">
                                    <div class="team-compact">
                                        ${teamANames.map(name => `<div class="team-name-compact">${name}</div>`).join('')}
                                    </div>
                                    <span class="team-vs-compact">vs</span>
                                    <div class="team-compact">
                                        ${teamBNames.map(name => `<div class="team-name-compact">${name}</div>`).join('')}
                                    </div>
                                </div>
                                <div class="match-score-input-compact">
                                    <input type="number" class="score-input-compact" min="0" id="scoreA-${safeId}" placeholder="15" value="${scoreA !== null && scoreA !== undefined && scoreA !== '' ? scoreA : '15'}" ${isCompleted ? 'readonly' : ''}>
                                    <span class="score-separator-compact">-</span>
                                    <input type="number" class="score-input-compact" min="0" id="scoreB-${safeId}" placeholder="15" value="${scoreB !== null && scoreB !== undefined && scoreB !== '' ? scoreB : '15'}" ${isCompleted ? 'readonly' : ''}>
                                </div>
                                <button class="save-score-btn-compact ${isCompleted ? 'completed' : ''}" id="save-${safeId}" ${isCompleted ? '' : ''}>
                                    ${isCompleted ? '수정하기' : '경기 기록하기'}
                                </button>
                            </div>
                        `;
                    });
                    
                    matchesHTML += `
                        </div>
                    `;
                });
                
                // 시간대별 섹션 닫기
                matchesHTML += `
                        </div>
                    </div>
                `;
            }
        }
        
        console.log('📝 생성된 대진표 HTML 길이:', matchesHTML.length);
        console.log('📝 대진표 HTML 미리보기:', matchesHTML.substring(0, 500));
        console.log('🔍 hasMatches:', hasMatches);
        
        if (hasMatches && matchesHTML.length > 0) {
            console.log('✅ 대진표가 있음, HTML 삽입');
            console.log('📦 컨테이너:', matchesContainer);
            matchesContainer.innerHTML = matchesHTML;
            console.log('✅ HTML 삽입 완료');
            
            // 컴팩트 스타일 강제 적용
            setTimeout(() => {
                const timeSlotSections = matchesContainer.querySelectorAll('.time-slot-section');
                timeSlotSections.forEach(el => {
                    el.style.marginBottom = '8px';
                    el.style.paddingBottom = '4px';
                    el.style.borderBottom = '2px solid #e0e0e0';
                });
                
                const timeSlotHeaders = matchesContainer.querySelectorAll('.time-slot-header-compact');
                timeSlotHeaders.forEach(el => {
                    el.style.fontSize = '0.85rem';
                    el.style.fontWeight = '600';
                    el.style.color = '#667eea';
                    el.style.padding = '4px 8px';
                    el.style.marginBottom = '4px';
                    el.style.background = '#f0f4ff';
                    el.style.borderRadius = '4px';
                });
                
                const courtsContainers = matchesContainer.querySelectorAll('.courts-container');
                courtsContainers.forEach(el => {
                    el.style.display = 'flex';
                    el.style.gap = '2px';
                    el.style.width = '100%';
                    el.style.boxSizing = 'border-box';
                    el.style.borderLeft = '2px solid #e0e0e0';
                    el.style.borderRight = '2px solid #e0e0e0';
                });
                
                const courtColumns = matchesContainer.querySelectorAll('.court-column');
                courtColumns.forEach((el, index) => {
                    el.style.flex = '1';
                    el.style.minWidth = '0';
                    el.style.display = 'flex';
                    el.style.flexDirection = 'column';
                    el.style.padding = '0 6px';
                    el.style.height = '100%';
                    // 코트 사이 구분선 (첫 번째 코트에만)
                    if (index === 0 && courtColumns.length > 1) {
                        el.style.borderRight = '2px solid #667eea';
                    }
                });
                
                const courtHeaders = matchesContainer.querySelectorAll('.court-header-compact');
                courtHeaders.forEach(el => {
                    el.style.fontSize = '0.85rem';
                    el.style.fontWeight = '700';
                    el.style.color = '#667eea';
                    el.style.padding = '4px 8px';
                    el.style.marginBottom = '4px';
                    el.style.background = '#e8f0ff';
                    el.style.borderRadius = '6px';
                    el.style.textAlign = 'center';
                });
                
                const matchItems = matchesContainer.querySelectorAll('.match-item-compact');
                matchItems.forEach(el => {
                    el.style.padding = '4px';
                    el.style.marginBottom = '4px';
                    el.style.borderBottom = '1px solid #e0e0e0';
                    el.style.width = '100%';
                    el.style.boxSizing = 'border-box';
                    el.style.display = 'flex';
                    el.style.flexDirection = 'column';
                    el.style.gap = '4px';
                });
                
                const matchHeaders = matchesContainer.querySelectorAll('.match-header-compact');
                matchHeaders.forEach(el => {
                    el.style.padding = '2px 0';
                    el.style.marginBottom = '0';
                });
                
                const matchInfos = matchesContainer.querySelectorAll('.match-info-compact');
                matchInfos.forEach(el => {
                    el.style.fontSize = '0.7rem';
                    el.style.color = '#000';
                    el.style.fontWeight = '500';
                });
                
                const matchTeams = matchesContainer.querySelectorAll('.match-teams-compact');
                matchTeams.forEach(el => {
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    el.style.gap = '6px';
                    el.style.padding = '2px 0';
                    el.style.marginBottom = '0';
                });
                
                const teams = matchesContainer.querySelectorAll('.team-compact');
                teams.forEach(el => {
                    el.style.display = 'flex';
                    el.style.flexDirection = 'column';
                    el.style.alignItems = 'center';
                    el.style.gap = '2px';
                });
                
                const teamNames = matchesContainer.querySelectorAll('.team-name-compact');
                teamNames.forEach(el => {
                    el.style.fontSize = '0.75rem';
                    el.style.color = '#333';
                    el.style.fontWeight = '500';
                    el.style.textAlign = 'center';
                    el.style.whiteSpace = 'nowrap';
                });
                
                const teamVs = matchesContainer.querySelectorAll('.team-vs-compact');
                teamVs.forEach(el => {
                    el.style.fontSize = '0.7rem';
                    el.style.color = '#999';
                    el.style.fontWeight = '500';
                });
                
                const matchScoreInputs = matchesContainer.querySelectorAll('.match-score-input-compact');
                matchScoreInputs.forEach(el => {
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    el.style.gap = '8px';
                    el.style.padding = '4px 0';
                    el.style.marginBottom = '0';
                });
                
                const scoreInputs = matchesContainer.querySelectorAll('.score-input-compact');
                scoreInputs.forEach(el => {
                    el.style.width = '50px';
                    el.style.padding = '6px';
                    el.style.border = '1px solid #ccc';
                    el.style.borderRadius = '6px';
                    el.style.textAlign = 'center';
                    el.style.fontSize = '0.9rem';
                    el.style.fontWeight = '600';
                    el.style.background = 'white';
                    
                    // 스피너 제거 (위아래 화살표 제거)
                    el.style.webkitAppearance = 'none';
                    el.style.mozAppearance = 'textfield';
                    el.type = 'text';
                    el.setAttribute('inputmode', 'numeric');
                    el.setAttribute('pattern', '[0-9]*');
                    
                    // 숫자만 입력 허용
                    el.addEventListener('input', function(e) {
                        this.value = this.value.replace(/[^0-9]/g, '');
                    });
                    
                    // 클릭 시 초기화 (readonly가 아닌 경우)
                    if (!el.readOnly) {
                        // focus 이벤트: 15가 기본값이고 클릭하면 빈칸으로
                        el.addEventListener('focus', function() {
                            const originalValue = this.getAttribute('data-original-value') || '';
                            // 기본값 15일 때만 초기화
                            if (this.value === '15' || this.value === '' || (originalValue === '' && this.value === '15')) {
                                this.value = '';
                            }
                        });
                        
                        // blur 이벤트: 비어있으면 다시 15로
                        el.addEventListener('blur', function() {
                            if (!this.value || this.value === '') {
                                this.value = '15';
                            }
                        });
                    }
                });
                
                const scoreSeparators = matchesContainer.querySelectorAll('.score-separator-compact');
                scoreSeparators.forEach(el => {
                    el.style.fontSize = '1rem';
                    el.style.fontWeight = '600';
                    el.style.color = '#333';
                });
                
                const saveBtns = matchesContainer.querySelectorAll('.save-score-btn-compact');
                saveBtns.forEach(el => {
                    // 완료 상태인지 확인
                    const isCompleted = el.classList.contains('completed') || el.textContent.includes('수정');
                    
                    if (isCompleted) {
                        el.style.background = '#6c757d';
                        el.style.color = 'white';
                        
                        // 완료 상태면 입력 필드도 읽기 전용으로 설정
                        const btnId = el.id.replace('save-', '');
                        const scoreAInput = document.getElementById(`scoreA-${btnId}`);
                        const scoreBInput = document.getElementById(`scoreB-${btnId}`);
                        
                        if (scoreAInput) {
                            scoreAInput.readOnly = true;
                            scoreAInput.style.background = '#f5f5f5';
                            scoreAInput.style.cursor = 'not-allowed';
                        }
                        if (scoreBInput) {
                            scoreBInput.readOnly = true;
                            scoreBInput.style.background = '#f5f5f5';
                            scoreBInput.style.cursor = 'not-allowed';
                        }
                    } else {
                        el.style.background = '#667eea';
                        el.style.color = 'white';
                    }
                    
                    el.style.border = 'none';
                    el.style.padding = '10px';
                    el.style.borderRadius = '8px';
                    el.style.fontSize = '0.85rem';
                    el.style.fontWeight = '600';
                    el.style.cursor = 'pointer';
                    el.style.width = '100%';
                    el.style.marginTop = '4px';
                });
                
                console.log('✅ 컴팩트 스타일 적용 완료');
            }, 100);
            
            // 저장 버튼 이벤트 리스너 추가 (모든 버튼에 추가 - 상태에 따라 다르게 동작)
            const saveButtons = matchesContainer.querySelectorAll('.save-score-btn-compact');
            console.log('💾 저장 버튼 수:', saveButtons.length);
            saveButtons.forEach(btn => {
                // 기존 이벤트 리스너 제거를 위해 클론
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // 단일 이벤트 리스너로 모든 상태 처리
                newBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                        const safeId = newBtn.id.replace('save-', '');
                        const matchItem = newBtn.closest('.match-item-compact');
                        const matchId = matchItem ? matchItem.getAttribute('data-match-id') : null;
                        
                        if (!matchId) {
                            console.error('매치 ID를 찾을 수 없습니다');
                            showToast('매치 정보를 찾을 수 없습니다.', 'error');
                            return;
                        }
                        
                        const scoreAInput = document.getElementById(`scoreA-${safeId}`);
                        const scoreBInput = document.getElementById(`scoreB-${safeId}`);
                        
                        if (!scoreAInput || !scoreBInput) {
                            console.error('점수 입력 필드를 찾을 수 없습니다');
                            showToast('점수 입력 필드를 찾을 수 없습니다.', 'error');
                            return;
                        }
                        
                        // 버튼 상태 확인: completed 클래스가 있으면 수정 모드 전환, 없으면 저장 모드
                        const isCompleted = newBtn.classList.contains('completed');
                        
                        if (isCompleted) {
                            // 수정 모드로 전환 (readonly 해제)
                            console.log('수정 모드로 전환');
                            scoreAInput.readOnly = false;
                            scoreBInput.readOnly = false;
                            scoreAInput.style.background = 'white';
                            scoreBInput.style.background = 'white';
                            scoreAInput.style.cursor = 'text';
                            scoreBInput.style.cursor = 'text';
                            
                            newBtn.textContent = '경기 기록하기';
                            newBtn.style.background = '#667eea';
                            newBtn.style.color = 'white';
                            newBtn.classList.remove('completed');
                        } else {
                            // 저장 모드
                            console.log('💾 저장 버튼 클릭됨:', newBtn.id);
                            
                            const scoreA = Number(scoreAInput.value || 0);
                            const scoreB = Number(scoreBInput.value || 0);
                            
                            if (scoreA === 0 && scoreB === 0) {
                                showToast('점수를 입력해주세요.', 'warning');
                                return;
                            }
                            
                            // 동점 점수 차단
                            if (scoreA === scoreB) {
                                showToast('동점 점수는 입력할 수 없습니다. 한 팀이 반드시 이겨야 합니다.', 'warning');
                                return;
                            }
                            
                            console.log('점수 저장 시작:', { matchId, scoreA, scoreB });
                            
                            // 매치 찾기
                            const db = window.db || firebase.firestore();
                            if (!db) {
                                console.error('db 객체를 찾을 수 없습니다');
                                showToast('데이터베이스 연결 오류', 'error');
                                return;
                            }
                            
                            const matchDoc = await db.collection('matches').doc(matchId).get();
                            
                            if (!matchDoc.exists) {
                                console.error('매치를 찾을 수 없습니다:', matchId);
                                showToast('매치를 찾을 수 없습니다.', 'error');
                                return;
                            }
                            
                            console.log('매치 발견:', matchId);
                            
                            await saveMatchScore({ id: matchId, ...matchDoc.data() }, scoreA, scoreB);
                            
                            showToast('점수가 기록되었습니다.', 'success');
                            
                            // 버튼 상태 변경: 완료 상태로
                            newBtn.textContent = '수정하기';
                            newBtn.style.background = '#6c757d';
                            newBtn.style.color = 'white';
                            newBtn.classList.add('completed');
                            
                            // 입력 필드 읽기 전용으로 변경
                            scoreAInput.readOnly = true;
                            scoreBInput.readOnly = true;
                            scoreAInput.style.background = '#f5f5f5';
                            scoreBInput.style.background = '#f5f5f5';
                            scoreAInput.style.cursor = 'not-allowed';
                            scoreBInput.style.cursor = 'not-allowed';
                        }
                    } catch (error) {
                        console.error('점수 저장 오류:', error);
                        showToast('점수 저장 중 오류가 발생했습니다.', 'error');
                    }
                });
            });
        } else {
            matchesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>${date}에 생성된 대진표가 없습니다.</p>
                </div>
            `;
        }
        
        // 날짜 표시 업데이트
        const dateTimeDisplay = document.getElementById('match-date-time');
        if (dateTimeDisplay) {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
            dateTimeDisplay.textContent = formattedDate;
        }
        
    } catch (error) {
        console.error('대진표 로드 오류:', error);
        showToast('대진표를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 예약 데이터 로드
async function loadReservationsData() {
    try {
        // 예약 현황 로드
        await loadReservationsTimeline();
        
        // 현재 선택된 시간대에 대진표가 있는지 확인
        await checkAndShowMatchSchedule();
        
    } catch (error) {
        console.error('예약 데이터 로드 오류:', error);
    }
}

// 랭킹 데이터 로드
async function loadRankingsData() {
    try {
        await loadMedalCeremony();
        await loadTopPerformers();
    } catch (error) {
        console.error('랭킹 데이터 로드 오류:', error);
    }
}

// 통계 데이터 로드
async function loadStatsData() {
    try {
        await loadUserList();
        await loadGameStats();
        
        // 차트 렌더링을 위한 약간의 지연 (레이아웃이 완료된 후)
        setTimeout(async () => {
            const activePeriodBtn = document.querySelector('.stats-period-btn.active');
            const period = activePeriodBtn ? activePeriodBtn.getAttribute('data-period') : 'today';
            await loadTeamAnalysis(period);
        }, 300);
        
        await setupStatsEventListeners();
        
        // 창 크기 변경 시 차트 재그리기 (한 번만 추가)
        if (!window.statsResizeHandlerAdded) {
            window.statsResizeHandlerAdded = true;
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    const statsTab = document.getElementById('stats-tab');
                    if (statsTab && statsTab.classList.contains('active')) {
                        loadWinRateChart();
                        loadTeamAnalysis();
                    }
                }, 200);
            });
        }
    } catch (error) {
        console.error('통계 데이터 로드 오류:', error);
    }
}

// 통계 이벤트 리스너 설정
function setupStatsEventListeners() {
    // 기간 선택 버튼
    document.querySelectorAll('.stats-period-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelectorAll('.stats-period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const period = e.target.getAttribute('data-period');
            await loadGameStats(period);
            await loadWinRateChart(); // 개인 성장 분석 업데이트
            await loadTeamAnalysis(period); // 팀별 분석 업데이트
        });
    });
    
    // 개인 성장 분석 필터
    const userSelect = document.getElementById('growth-user-select');
    
    if (userSelect) {
        userSelect.addEventListener('change', async () => {
            await loadWinRateChart();
        });
    }
}

// 경기 통계 로드
async function loadGameStats(period = 'today') {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return;
        
        // 기간 계산
        const now = new Date();
        let startDate = new Date();
        
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week1':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'week2':
                startDate.setDate(now.getDate() - 14);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'all':
                startDate = new Date(0); // 모든 기간
                break;
        }
        
        // 게임 결과 가져오기
        const gameResultsSnapshot = await db.collection('gameResults').get();
        
        const gameResults = [];
        gameResultsSnapshot.forEach(doc => {
            const game = doc.data();
            const gameDate = game.recordedAt ? (game.recordedAt.toDate ? game.recordedAt.toDate() : new Date(game.recordedAt)) : new Date();
            
            if (period === 'all' || gameDate >= startDate) {
                gameResults.push({
                    ...game,
                    date: gameDate
                });
            }
        });
        
        // 통계 카드 업데이트
        await updateStatsCards(gameResults);
        
        // 승률 변화 추이 차트 로드
        await loadWinRateChart();
        
    } catch (error) {
        console.error('경기 통계 로드 오류:', error);
    }
}

// 통계 카드 업데이트
async function updateStatsCards(gameResults) {
    try {
        // 최대 연승/연패 계산
        const userStats = {};
        
        gameResults.forEach(game => {
            if (!game.winners || !game.losers) return;
            
            // 승자 통계
            game.winners.forEach(userId => {
                if (!userStats[userId]) {
                    userStats[userId] = {
                        wins: [],
                        losses: []
                    };
                }
                userStats[userId].wins.push(game.date);
            });
            
            // 패자 통계
            game.losers.forEach(userId => {
                if (!userStats[userId]) {
                    userStats[userId] = {
                        wins: [],
                        losses: []
                    };
                }
                userStats[userId].losses.push(game.date);
            });
        });
        
        // 최대 연승/연패 계산
        let maxConsecutiveWins = 0;
        let maxConsecutiveLosses = 0;
        let totalGames = gameResults.length;
        let recentWins = 0;
        let recentGames = 0;
        
        // 최근 10경기 승률 계산
        const sortedGames = [...gameResults].sort((a, b) => b.date - a.date).slice(0, 10);
        sortedGames.forEach(game => {
            if (game.winners && game.winners.length > 0) {
                recentWins += game.winners.length;
            }
            recentGames += (game.winners?.length || 0) + (game.losers?.length || 0);
        });
        
        // 각 사용자별 연승/연패 계산
        Object.keys(userStats).forEach(userId => {
            const stats = userStats[userId];
            const allGames = [...stats.wins.map(d => ({ date: d, won: true })), ...stats.losses.map(d => ({ date: d, won: false }))];
            allGames.sort((a, b) => a.date - b.date);
            
            let currentWins = 0;
            let currentLosses = 0;
            
            allGames.forEach(game => {
                if (game.won) {
                    currentWins++;
                    currentLosses = 0;
                    maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
                } else {
                    currentLosses++;
                    currentWins = 0;
                    maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
                }
            });
        });
        
        // 통계 카드 업데이트 (요소가 존재할 경우만)
        const maxConsecutiveWinsEl = document.getElementById('max-consecutive-wins');
        const maxConsecutiveLossesEl = document.getElementById('max-consecutive-losses');
        const totalGamesEl = document.getElementById('total-games');
        const recentWinRateEl = document.getElementById('recent-win-rate');
        
        if (maxConsecutiveWinsEl) maxConsecutiveWinsEl.textContent = maxConsecutiveWins;
        if (maxConsecutiveLossesEl) maxConsecutiveLossesEl.textContent = maxConsecutiveLosses;
        if (totalGamesEl) totalGamesEl.textContent = totalGames;
        
        const recentWinRate = recentGames > 0 ? Math.round((recentWins / recentGames) * 100) : 0;
        if (recentWinRateEl) recentWinRateEl.textContent = `${recentWinRate}%`;
        
    } catch (error) {
        console.error('통계 카드 업데이트 오류:', error);
    }
}

// 사용자 목록 로드
async function loadUserList() {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return;
        
        const userSelect = document.getElementById('growth-user-select');
        if (!userSelect) return;
        
        // 사용자 ID 수집 (matches와 gameResults 모두에서)
        const userIds = new Set();
        const userInfoMap = new Map(); // userId -> userName 매핑
        
        // 1. matches 컬렉션에서 사용자 ID 수집
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (match.teamA && Array.isArray(match.teamA)) {
                match.teamA.forEach(player => {
                    const userId = player.userId || player.id;
                    if (userId) {
                        userIds.add(userId);
                        // 이름도 함께 저장
                        if (player.userName && !userInfoMap.has(userId)) {
                            userInfoMap.set(userId, player.userName);
                        }
                    }
                });
            }
            if (match.teamB && Array.isArray(match.teamB)) {
                match.teamB.forEach(player => {
                    const userId = player.userId || player.id;
                    if (userId) {
                        userIds.add(userId);
                        // 이름도 함께 저장
                        if (player.userName && !userInfoMap.has(userId)) {
                            userInfoMap.set(userId, player.userName);
                        }
                    }
                });
            }
        });
        
        // 2. gameResults 컬렉션에서 사용자 ID 수집
        const gameResultsSnapshot = await db.collection('gameResults').get();
        gameResultsSnapshot.forEach(doc => {
            const game = doc.data();
            if (game.winners) game.winners.forEach(id => userIds.add(id));
            if (game.losers) game.losers.forEach(id => userIds.add(id));
        });
        
        // 사용자 이름 가져오기 및 드롭다운 채우기
        userSelect.innerHTML = '<option value="all">전체</option>';
        
        // 이름이 이미 있는 경우 우선 사용, 없으면 users 컬렉션에서 찾기
        for (const userId of userIds) {
            let userName = userInfoMap.get(userId); // matches에서 가져온 이름
            
            if (!userName) {
                // users 컬렉션에서 찾기
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userName = userData.displayName || userData.name || userData.email;
                }
            }
            
            // 여전히 이름이 없으면 reservations에서 찾기
            if (!userName) {
                const reservationsSnapshot = await db.collection('reservations')
                    .where('userId', '==', userId)
                    .limit(1)
                    .get();
                
                if (!reservationsSnapshot.empty) {
                    const reservation = reservationsSnapshot.docs[0].data();
                    userName = reservation.userName || reservation.name;
                }
            }
            
            // 최종적으로 이름이 없으면 userId 사용 (하지만 짧게 표시)
            if (!userName || userName.startsWith('test_') || userName.length > 30) {
                // userId가 너무 길거나 이상한 경우 건너뛰기
                continue;
            }
            
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = userName;
            userSelect.appendChild(option);
        }
        
        // 이름 순으로 정렬
        const options = Array.from(userSelect.options);
        options.sort((a, b) => {
            if (a.value === 'all') return -1;
            if (b.value === 'all') return 1;
            return a.textContent.localeCompare(b.textContent);
        });
        
        userSelect.innerHTML = '';
        options.forEach(option => userSelect.appendChild(option));
        
    } catch (error) {
        console.error('사용자 목록 로드 오류:', error);
    }
}

// 승률 변화 추이 차트 로드
async function loadWinRateChart() {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return;
        
        const userSelect = document.getElementById('growth-user-select');
        
        // 현재 선택된 기간 버튼 확인
        const activePeriodBtn = document.querySelector('.stats-period-btn.active');
        const selectedPeriod = activePeriodBtn ? activePeriodBtn.getAttribute('data-period') : 'today';
        
        const selectedUserId = userSelect?.value || 'all';
        
        // 기간 계산
        const now = new Date();
        let startDate = new Date();
        
        switch (selectedPeriod) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week1':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'week2':
                startDate.setDate(now.getDate() - 14);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'all':
                startDate = new Date(0);
                break;
        }
        
        // 게임 결과 가져오기
        const gameResultsSnapshot = await db.collection('gameResults').get();
        
        // matches 컬렉션에서도 데이터 가져오기
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        const gameResults = [];
        
        // matches 컬렉션 데이터 처리
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (!match.teamA || !match.teamB || !match.scoreA || !match.scoreB) return;
            
            const gameDate = match.recordedAt ? (match.recordedAt.toDate ? match.recordedAt.toDate() : new Date(match.recordedAt)) : new Date();
            
            if (selectedPeriod !== 'all' && gameDate < startDate) return;
            
            const aWins = match.scoreA > match.scoreB;
            const winners = aWins ? match.teamA : match.teamB;
            const losers = aWins ? match.teamB : match.teamA;
            
            const winnerIds = winners ? winners.map(p => p.userId || p.id).filter(id => id) : [];
            const loserIds = losers ? losers.map(p => p.userId || p.id).filter(id => id) : [];
            
            // 선택된 사용자 확인
            if (selectedUserId !== 'all') {
                const isInGame = winnerIds.includes(selectedUserId) || loserIds.includes(selectedUserId);
                if (!isInGame) return;
            }
            
            gameResults.push({
                winners: winnerIds,
                losers: loserIds,
                players: [...winnerIds, ...loserIds],
                date: gameDate
            });
        });
        
        // gameResults 컬렉션 데이터 처리
        gameResultsSnapshot.forEach(doc => {
            const game = doc.data();
            const gameDate = game.recordedAt ? (game.recordedAt.toDate ? game.recordedAt.toDate() : new Date(game.recordedAt)) : new Date();
            
            if (selectedPeriod !== 'all' && gameDate < startDate) return;
            if (!game.winners || !game.losers) return;
            
            // 이미 matches에서 처리한 데이터인지 확인 (중복 방지)
            const isDuplicate = gameResults.some(g => {
                const sameWinners = g.winners && g.winners.length === game.winners.length &&
                    g.winners.every(id => game.winners.includes(id));
                const sameLosers = g.losers && g.losers.length === game.losers.length &&
                    g.losers.every(id => game.losers.includes(id));
                return sameWinners && sameLosers && 
                    Math.abs(g.date.getTime() - gameDate.getTime()) < 60000; // 1분 이내
            });
            
            if (isDuplicate) return;
            
            // 선택된 사용자 확인
            if (selectedUserId !== 'all') {
                const isInGame = game.winners.includes(selectedUserId) || game.losers.includes(selectedUserId);
                if (!isInGame) return;
            }
            
            gameResults.push({
                ...game,
                date: gameDate
            });
        });
        
        // 날짜별 승률 계산
        const dateStats = {};
        
        gameResults.sort((a, b) => a.date - b.date).forEach((game, index) => {
            const dateKey = game.date.toISOString().split('T')[0];
            if (!dateStats[dateKey]) {
                dateStats[dateKey] = { wins: 0, total: 0 };
            }
            
            if (selectedUserId === 'all') {
                dateStats[dateKey].wins += game.winners?.length || 0;
                dateStats[dateKey].total += (game.winners?.length || 0) + (game.losers?.length || 0);
            } else {
                if (game.winners?.includes(selectedUserId)) {
                    dateStats[dateKey].wins++;
                    dateStats[dateKey].total++;
                } else if (game.losers?.includes(selectedUserId)) {
                    dateStats[dateKey].total++;
                }
            }
        });
        
        // 누적 승률 계산
        const sortedDates = Object.keys(dateStats).sort();
        const chartData = [];
        let cumulativeWins = 0;
        let cumulativeTotal = 0;
        
        sortedDates.forEach(date => {
            cumulativeWins += dateStats[date].wins;
            cumulativeTotal += dateStats[date].total;
            const winRate = cumulativeTotal > 0 ? (cumulativeWins / cumulativeTotal) * 100 : 0;
            
            chartData.push({
                date: date,
                winRate: winRate
            });
        });
        
        // 차트 그리기
        drawWinRateChart(chartData);
        
    } catch (error) {
        console.error('승률 변화 추이 차트 로드 오류:', error);
    }
}

// 승률 변화 추이 차트 그리기
function drawWinRateChart(data) {
    const canvas = document.getElementById('win-rate-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Canvas 크기 설정 (offsetWidth가 0이면 기본값 사용)
    const containerWidth = canvas.parentElement?.offsetWidth || 800;
    const containerHeight = 300;
    const width = canvas.width = containerWidth;
    const height = canvas.height = containerHeight;
    
    // 배경 지우기
    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) {
        // 배경을 흰색으로 설정
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 없습니다', width / 2, height / 2);
        return;
    }
    
    // 패딩
    const padding = { top: 40, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Y축 범위 (0-100%)
    const minY = 0;
    const maxY = 100;
    const yScale = chartHeight / (maxY - minY);
    
    // X축 범위
    const xScale = chartWidth / (data.length - 1 || 1);
    
    // 그리드 및 축 그리기
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Y축 그리드
    for (let i = 0; i <= 10; i++) {
        const y = padding.top + (i / 10) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // Y축 레이블
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - i * 10}%`, padding.left - 10, y + 4);
    }
    
    // X축 레이블
    const dateInterval = Math.max(1, Math.floor(data.length / 10));
    data.forEach((point, index) => {
        if (index % dateInterval === 0 || index === data.length - 1) {
            const x = padding.left + index * xScale;
            const date = new Date(point.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            
            ctx.fillStyle = '#666';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(dateStr, x, height - padding.bottom + 20);
            
            // X축 눈금
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
        }
    });
    
    // Y축 레이블 (회전시켜 세로로 표시하여 겹침 방지)
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('승률 (%)', 0, 0);
    ctx.restore();
    
    // 데이터 라인 그리기
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding.left + index * xScale;
        const y = padding.top + chartHeight - (point.winRate * yScale);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // 데이터 포인트 그리기
    ctx.fillStyle = '#667eea';
    data.forEach((point, index) => {
        const x = padding.left + index * xScale;
        const y = padding.top + chartHeight - (point.winRate * yScale);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 개인별 성과 로드
async function loadIndividualPerformance() {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return;
        
        const userStats = {};
        const userInfoMap = {}; // userId -> { userName, ... } 매핑
        
        // 1. matches 컬렉션에서 데이터 가져오기
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (!match.teamA || !match.teamB || !match.scoreA || !match.scoreB) return;
            
            const aWins = match.scoreA > match.scoreB;
            const winners = aWins ? match.teamA : match.teamB;
            const losers = aWins ? match.teamB : match.teamA;
            
            // 승자 처리
            if (winners && Array.isArray(winners)) {
                winners.forEach(player => {
                    const userId = player.userId || player.id;
                    if (!userId) return;
                    
                    if (!userStats[userId]) {
                        userStats[userId] = { wins: 0, total: 0 };
                    }
                    userStats[userId].wins++;
                    userStats[userId].total++;
                    
                    // 이름 정보 저장
                    if (player.userName && !userInfoMap[userId]) {
                        userInfoMap[userId] = player.userName;
                    }
                });
            }
            
            // 패자 처리
            if (losers && Array.isArray(losers)) {
                losers.forEach(player => {
                    const userId = player.userId || player.id;
                    if (!userId) return;
                    
                    if (!userStats[userId]) {
                        userStats[userId] = { wins: 0, total: 0 };
                    }
                    userStats[userId].total++;
                    
                    // 이름 정보 저장
                    if (player.userName && !userInfoMap[userId]) {
                        userInfoMap[userId] = player.userName;
                    }
                });
            }
        });
        
        // 2. gameResults 컬렉션에서 데이터 가져오기 (중복 방지)
        const matchesDocIds = new Set();
        matchesSnapshot.forEach(doc => {
            matchesDocIds.add(doc.id);
        });
        
        const gameResultsSnapshot = await db.collection('gameResults').get();
        
        gameResultsSnapshot.forEach(doc => {
            const game = doc.data();
            if (!game.winners || !game.losers) return;
            
            // matches에서 이미 처리한 경기인지 확인
            let matchIdFromTeamId = null;
            if (game.teamId) {
                const parts = game.teamId.split('_');
                if (parts.length >= 2) {
                    matchIdFromTeamId = parts.slice(0, -1).join('_');
                }
            }
            
            if (matchIdFromTeamId && matchesDocIds.has(matchIdFromTeamId)) {
                return; // 이미 matches에서 처리한 경기는 건너뛰기
            }
            
            game.winners.forEach(userId => {
                if (!userStats[userId]) {
                    userStats[userId] = { wins: 0, total: 0 };
                }
                userStats[userId].wins++;
                userStats[userId].total++;
            });
            
            game.losers.forEach(userId => {
                if (!userStats[userId]) {
                    userStats[userId] = { wins: 0, total: 0 };
                }
                userStats[userId].total++;
            });
        });
        
        // 사용자 이름 가져오기
        const rankings = [];
        const userIds = Object.keys(userStats);
        
        for (const userId of userIds) {
            const stats = userStats[userId];
            const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
            
            // 사용자 이름 가져오기 (여러 소스 확인)
            let userName = userInfoMap[userId]; // matches에서 가져온 이름 우선
            
            if (!userName) {
                // users 컬렉션에서 찾기
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userName = userData.displayName || userData.name || userData.email;
                }
            }
            
            // 여전히 이름이 없으면 reservations에서 찾기
            if (!userName) {
                const reservationsSnapshot = await db.collection('reservations')
                    .where('userId', '==', userId)
                    .limit(1)
                    .get();
                
                if (!reservationsSnapshot.empty) {
                    const reservation = reservationsSnapshot.docs[0].data();
                    userName = reservation.userName || reservation.name;
                }
            }
            
            // 최종적으로 이름이 없으면 건너뛰기 (또는 '알 수 없음' 표시하지 않음)
            if (!userName || userName.startsWith('test_') || userName.length > 30) {
                continue; // 이상한 이름은 건너뛰기
            }
            
            rankings.push({
                userId: userId,
                userName: userName,
                winRate: winRate,
                total: stats.total
            });
        }
        
        // 승률 TOP 5
        const top5WinRate = [...rankings].filter(r => r.total > 0).sort((a, b) => b.winRate - a.winRate).slice(0, 5);
        drawWinRateDonutChart(top5WinRate);
        
        // 참여 횟수 TOP 5
        const top5Participation = [...rankings].sort((a, b) => b.total - a.total).slice(0, 5);
        drawParticipationBarChart(top5Participation);
        
    } catch (error) {
        console.error('개인별 성과 로드 오류:', error);
    }
}

// 승률 TOP 5 도넛 차트 그리기
function drawWinRateDonutChart(data) {
    const canvas = document.getElementById('win-rate-donut-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Canvas 크기 설정
    const containerWidth = canvas.parentElement?.offsetWidth || 400;
    const containerHeight = 400;
    const width = canvas.width = containerWidth;
    const height = canvas.height = containerHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) {
        // 배경을 흰색으로 설정
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 없습니다', width / 2, height / 2);
        return;
    }
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = radius * 0.6;
    
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    
    let currentAngle = -Math.PI / 2;
    const total = data.reduce((sum, d) => sum + d.winRate, 0);
    
    // 도넛 차트 그리기
    data.forEach((item, index) => {
        const sliceAngle = (item.winRate / total) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        currentAngle += sliceAngle;
    });
    
    // 범례 그리기
    const legendX = width - 150;
    const legendY = 20;
    const legendItemHeight = 25;
    
    data.forEach((item, index) => {
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY + index * legendItemHeight, 15, 15);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.userName} (${item.winRate.toFixed(0)}%)`, legendX + 20, legendY + index * legendItemHeight + 12);
    });
}

// 참여 횟수 바 차트 그리기
function drawParticipationBarChart(data) {
    const canvas = document.getElementById('participation-bar-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Canvas 크기 설정
    const containerWidth = canvas.parentElement?.offsetWidth || 400;
    const containerHeight = 300;
    const width = canvas.width = containerWidth;
    const height = canvas.height = containerHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) {
        // 배경을 흰색으로 설정
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 없습니다', width / 2, height / 2);
        return;
    }
    
    const padding = { top: 20, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...data.map(d => d.total), 1);
    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.2;
    
    // 그리드 그리기
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxValue * (1 - i / 5)), padding.left - 10, y + 4);
    }
    
    // 바 차트 그리기
    data.forEach((item, index) => {
        const barHeight = (item.total / maxValue) * chartHeight;
        const x = padding.left + index * barWidth + barSpacing;
        const y = padding.top + chartHeight - barHeight;
        
        ctx.fillStyle = '#667eea';
        ctx.fillRect(x, y, barWidth - barSpacing * 2, barHeight);
        
        // 이름 레이블
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + (barWidth - barSpacing * 2) / 2, height - padding.bottom + 15);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(item.userName, 0, 0);
        ctx.restore();
        
        // 값 레이블
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.total, x + (barWidth - barSpacing * 2) / 2, y - 5);
    });
    
    // Y축 레이블
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('횟수', 0, 0);
    ctx.restore();
}

// 팀별 분석 로드
async function loadTeamAnalysis(period = null) {
    try {
        console.log('팀별 분석 로드 시작', period ? `(기간: ${period})` : '');
        const db = window.db || firebase.firestore();
        if (!db) {
            console.warn('팀별 분석: 데이터베이스가 없습니다');
            return;
        }
        
        // 기간 계산
        let startDate = null;
        if (period) {
            const now = new Date();
            startDate = new Date();
            
            switch (period) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week1':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'week2':
                    startDate.setDate(now.getDate() - 14);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'all':
                    startDate = new Date(0); // 모든 기간
                    break;
            }
        }
        
        const teamStats = {};
        const userInfoMap = {}; // userId -> userName 매핑
        
        // 1. matches 컬렉션에서 데이터 가져오기
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (!match.teamA || !match.teamB || !match.scoreA || !match.scoreB) return;
            
            // 기간 필터링 (loadTeamAnalysis 함수 내부)
            if (startDate !== null) {
                const matchDate = match.date ? (match.date.toDate ? match.date.toDate() : new Date(match.date)) : 
                                  match.recordedAt ? (match.recordedAt.toDate ? match.recordedAt.toDate() : new Date(match.recordedAt)) :
                                  doc.data().createdAt?.toDate?.() || new Date(0);
                if (period !== 'all' && matchDate < startDate) {
                    return; // 기간에 맞지 않으면 건너뛰기
                }
            }
            
            const aWins = match.scoreA > match.scoreB;
            const winners = aWins ? match.teamA : match.teamB;
            const losers = aWins ? match.teamB : match.teamA;
            
            // 팀A, 팀B에서 플레이어 ID 추출
            const getPlayerIds = (team) => {
                if (!team || !Array.isArray(team)) return [];
                return team.map(p => p.userId || p.id).filter(id => id);
            };
            
            const winnerIds = getPlayerIds(winners);
            const loserIds = getPlayerIds(losers);
            
            // 이름 정보 저장
            if (winners && Array.isArray(winners)) {
                winners.forEach(player => {
                    const userId = player.userId || player.id;
                    if (userId && player.userName && !userInfoMap[userId]) {
                        userInfoMap[userId] = player.userName;
                    }
                });
            }
            if (losers && Array.isArray(losers)) {
                losers.forEach(player => {
                    const userId = player.userId || player.id;
                    if (userId && player.userName && !userInfoMap[userId]) {
                        userInfoMap[userId] = player.userName;
                    }
                });
            }
            
            // 승자 팀 조합 (2명 팀만)
            if (winnerIds.length === 2) {
                const teamKey = winnerIds.sort().join(',');
                if (!teamStats[teamKey]) {
                    teamStats[teamKey] = { wins: 0, losses: 0, players: winnerIds };
                }
                teamStats[teamKey].wins++;
            }
            
            // 패자 팀 조합 (2명 팀만)
            if (loserIds.length === 2) {
                const teamKey = loserIds.sort().join(',');
                if (!teamStats[teamKey]) {
                    teamStats[teamKey] = { wins: 0, losses: 0, players: loserIds };
                }
                teamStats[teamKey].losses++;
            }
        });
        
        // 2. gameResults 컬렉션에서 데이터 가져오기 (중복 방지)
        const matchesDocIds = new Set();
        matchesSnapshot.forEach(doc => {
            matchesDocIds.add(doc.id);
        });
        
        const gameResultsSnapshot = await db.collection('gameResults').get();
        
        gameResultsSnapshot.forEach(doc => {
            const game = doc.data();
            if (!game.winners || !game.losers) return;
            
            // 기간 필터링 (loadTeamAnalysis 함수 내부)
            if (startDate !== null) {
                const gameDate = game.recordedAt ? (game.recordedAt.toDate ? game.recordedAt.toDate() : new Date(game.recordedAt)) : new Date();
                if (period !== 'all' && gameDate < startDate) {
                    return; // 기간에 맞지 않으면 건너뛰기
                }
            }
            
            // matches에서 이미 처리한 경기인지 확인
            let matchIdFromTeamId = null;
            if (game.teamId) {
                const parts = game.teamId.split('_');
                if (parts.length >= 2) {
                    matchIdFromTeamId = parts.slice(0, -1).join('_');
                }
            }
            
            if (matchIdFromTeamId && matchesDocIds.has(matchIdFromTeamId)) {
                return; // 이미 matches에서 처리한 경기는 건너뛰기
            }
            
            // 승자 팀 조합
            if (game.winners.length === 2) {
                const teamKey = game.winners.sort().join(',');
                if (!teamStats[teamKey]) {
                    teamStats[teamKey] = { wins: 0, losses: 0, players: game.winners };
                }
                teamStats[teamKey].wins++;
            }
            
            // 패자 팀 조합
            if (game.losers.length === 2) {
                const teamKey = game.losers.sort().join(',');
                if (!teamStats[teamKey]) {
                    teamStats[teamKey] = { wins: 0, losses: 0, players: game.losers };
                }
                teamStats[teamKey].losses++;
            }
        });
        
        // 팀 승률 계산
        const teamWinRates = [];
        
        // 사용자 이름 캐시
        const userNameCache = {};
        
        for (const teamKey of Object.keys(teamStats)) {
            const stats = teamStats[teamKey];
            const total = stats.wins + stats.losses;
            const winRate = total > 0 ? (stats.wins / total) * 100 : 0;
            
            // 사용자 이름 가져오기
            const playerNames = [];
            for (const userId of stats.players) {
                if (!userNameCache[userId]) {
                    // matches에서 가져온 이름 우선
                    let userName = userInfoMap[userId];
                    
                    if (!userName) {
                        // users 컬렉션에서 찾기
                        const userDoc = await db.collection('users').doc(userId).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            userName = userData.displayName || userData.name || userData.email;
                        }
                    }
                    
                    // 여전히 이름이 없으면 reservations에서 찾기
                    if (!userName) {
                        const reservationsSnapshot = await db.collection('reservations')
                            .where('userId', '==', userId)
                            .limit(1)
                            .get();
                        
                        if (!reservationsSnapshot.empty) {
                            const reservation = reservationsSnapshot.docs[0].data();
                            userName = reservation.userName || reservation.name;
                        }
                    }
                    
                    // 최종적으로 이름이 없으면 건너뛰기
                    if (!userName || userName.startsWith('test_') || userName.length > 30) {
                        userName = null;
                    }
                    
                    userNameCache[userId] = userName;
                }
                
                if (userNameCache[userId]) {
                    playerNames.push(userNameCache[userId]);
                }
            }
            
            // 두 플레이어 모두 이름이 있을 때만 추가
            if (playerNames.length === 2) {
                teamWinRates.push({
                    teamKey: teamKey,
                    players: stats.players,
                    playerNames: playerNames.join(', '),
                    winRate: winRate,
                    total: total
                });
            }
        }
        
        // 최강/최약 팀 조합
        const strongestTeams = [...teamWinRates]
            .filter(t => t.total >= 2) // 최소 2경기 이상
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 5);
        
        const weakestTeams = [...teamWinRates]
            .filter(t => t.total >= 2 && t.winRate < 50) // 최소 2경기 이상, 승률 50% 미만만
            .sort((a, b) => a.winRate - b.winRate)
            .slice(0, 5);
        
        console.log(`팀별 분석 완료 - 최강 팀: ${strongestTeams.length}개, 최약 팀: ${weakestTeams.length}개`);
        drawTeamBarChart(strongestTeams, 'strongest-teams-chart', '#43e97b');
        drawTeamBarChart(weakestTeams, 'weakest-teams-chart', '#ff6b6b');
        
    } catch (error) {
        console.error('팀별 분석 로드 오류:', error);
        // 오류 발생 시에도 빈 차트는 표시
        drawTeamBarChart([], 'strongest-teams-chart', '#43e97b');
        drawTeamBarChart([], 'weakest-teams-chart', '#ff6b6b');
    }
}

// 팀별 바 차트 그리기
function drawTeamBarChart(data, canvasId, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`팀별 차트: ${canvasId} 요소를 찾을 수 없습니다`);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Canvas 크기 설정 (고해상도 지원)
    const container = canvas.parentElement;
    let containerWidth = container ? container.offsetWidth : 500;
    // 컨테이너 너비 제한 (너무 넓어지지 않도록)
    containerWidth = Math.min(containerWidth, 550); // 너비 줄임 (600 -> 550)
    const containerHeight = 250; // 높이 줄임 (300 -> 250)
    const dpr = window.devicePixelRatio || 1;
    
    // 실제 캔버스 크기 (픽셀)
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    
    // CSS 크기 설정
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';
    
    // 컨텍스트 스케일 조정
    ctx.scale(dpr, dpr);
    
    const width = containerWidth;
    const height = containerHeight;
    
    ctx.clearRect(0, 0, width, height);
    
    if (data.length === 0) {
        // 배경을 흰색으로 설정
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 없습니다', width / 2, height / 2);
        return;
    }
    
    // 팀 이름 가로로 표시할 때 필요한 공간 계산
    ctx.font = '11px Arial';
    let maxNameWidth = 0;
    data.forEach(item => {
        const textWidth = ctx.measureText(item.playerNames).width;
        maxNameWidth = Math.max(maxNameWidth, textWidth);
    });
    
    // padding 계산 (팀 이름 가로 표시 공간 + 최소 여백)
    const padding = { 
        top: 15, 
        right: 60, // 오른쪽 여백 더 증가 (잘림 방지)
        bottom: 25, // 하단 여백 줄임
        left: Math.max(maxNameWidth + 10, 85) // 이름 너비 + 여백 (최소 85px, 최대 110px로 제한)
    };
    // 너무 넓지 않도록 최대값 제한
    padding.left = Math.min(padding.left, 110);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 차트 영역이 너무 작으면 경고
    if (chartWidth < 100 || chartHeight < 50) {
        console.warn('차트 영역이 너무 작습니다');
    }
    
    const maxValue = 100; // 승률이므로 최대 100%
    const barHeight = chartHeight / data.length;
    const barSpacing = barHeight * 0.15; // spacing 감소
    
    // 그리드 그리기 (20% 간격으로 여유있게)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // 그리드 라인 (20% 간격: 0%, 20%, 40%, 60%, 80%, 100%)
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (i / 5) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
    }
    
    // 퍼센테이지 레이블 (20% 간격으로 표시)
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (i / 5) * chartWidth;
        ctx.fillText(`${i * 20}%`, x, height - padding.bottom + 15);
    }
    
    // 바 차트 그리기
    data.forEach((item, index) => {
        // 막대 너비 계산 (차트 영역을 넘지 않도록 제한)
        // 0%일 때도 최소 1% 너비로 표시하여 막대가 보이도록 함
        let winRateForBar = item.winRate === 0 ? 1 : item.winRate;
        let barWidth = (winRateForBar / maxValue) * chartWidth;
        barWidth = Math.min(barWidth, chartWidth - 2); // 2px 여유
        // 0%일 때 최소 너비 보장 (약 4px 정도)
        if (item.winRate === 0) {
            barWidth = Math.max(barWidth, 4);
        }
        
        const x = padding.left;
        const y = padding.top + index * barHeight + barSpacing;
        const actualBarHeight = barHeight - barSpacing * 2;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, actualBarHeight);
        
        // 팀 이름 레이블 (가로로 표시, 한 줄)
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        // 이름이 너무 길면 자르기
        let displayName = item.playerNames;
        const maxNameDisplayWidth = padding.left - 15;
        if (ctx.measureText(displayName).width > maxNameDisplayWidth) {
            while (displayName.length > 0 && ctx.measureText(displayName + '...').width > maxNameDisplayWidth) {
                displayName = displayName.slice(0, -1);
            }
            displayName = displayName + '...';
        }
        ctx.fillText(displayName, padding.left - 5, y + actualBarHeight / 2 + 4);
        
        // 승률 레이블 (막대 오른쪽 또는 차트 영역 내)
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        const labelText = `${item.winRate.toFixed(0)}%`;
        const labelTextWidth = ctx.measureText(labelText).width;
        const labelX = x + barWidth + 8;
        const maxLabelX = padding.left + chartWidth - labelTextWidth - 5;
        
        // 레이블이 차트 영역을 벗어나면 막대 안에 표시
        if (labelX > maxLabelX) {
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(labelText, x + barWidth - 5, y + actualBarHeight / 2 + 4);
        } else {
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            ctx.fillText(labelText, Math.min(labelX, maxLabelX), y + actualBarHeight / 2 + 4);
        }
    });
}

// 기록 데이터 로드
async function loadRecordsData() {
    try {
        console.log('📝 기록 데이터 로드 시작');
        const recordsList = document.getElementById('records-list');
        if (!recordsList) {
            console.error('records-list 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        // 오늘 날짜로 기본 설정
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('record-start-date').value = today;
        document.getElementById('record-end-date').value = today;
        
        // 기본적으로 오늘 기록 로드
        await loadRecordsForPeriod('today');
        
    } catch (error) {
        console.error('기록 데이터 로드 오류:', error);
        const recordsList = document.getElementById('records-list');
        if (recordsList) {
            recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>기록을 불러올 수 없습니다</p></div>';
        }
    }
}

// 기간별 기록 로드
async function loadRecordsForPeriod(period) {
    try {
        const recordsList = document.getElementById('records-list');
        if (!recordsList) return;
        
        recordsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>기록을 불러오는 중...</p></div>';
        
        const db = window.db || firebase.firestore();
        if (!db) {
            console.error('db 객체를 찾을 수 없습니다');
            return;
        }
        
        let startDate = new Date();
        let endDate = new Date();
        
        // 기간 계산
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week1':
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week2':
                startDate.setDate(startDate.getDate() - 14);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'all':
                startDate = new Date(2020, 0, 1); // 과거 날짜
                endDate = new Date(2099, 11, 31); // 미래 날짜
                break;
        }
        
        const startDateStr = startDate.toISOString().slice(0, 10);
        const endDateStr = endDate.toISOString().slice(0, 10);
        
        // Firestore에서 완료된 매치 조회 (인덱스 없이 조회 후 클라이언트에서 필터링)
        let matchesSnapshot;
        if (period === 'all') {
            // 전체 조회 시 status 필터만 사용
            matchesSnapshot = await db.collection('matches')
                .where('status', '==', 'completed')
                .get();
        } else {
            // 인덱스 문제를 피하기 위해 status만 필터링하고 클라이언트에서 날짜 필터링
            matchesSnapshot = await db.collection('matches')
                .where('status', '==', 'completed')
                .get();
        }
        
        if (matchesSnapshot.empty) {
            recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>해당 기간의 기록이 없습니다</p></div>';
            return;
        }
        
        const matches = [];
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            // 점수가 있고, 완료된 상태만 포함
            if ((match.scoreA !== null && match.scoreA !== undefined && 
                match.scoreB !== null && match.scoreB !== undefined) &&
                match.status === 'completed') {
                // 기간 필터링 (period !== 'all'인 경우)
                if (period !== 'all') {
                    const matchDate = match.date || '';
                    if (matchDate < startDateStr || matchDate > endDateStr) {
                        return; // 기간 밖이면 제외
                    }
                }
                
                matches.push({
                    id: doc.id,
                    ...match
                });
            }
        });
        
        // 클라이언트 측에서 날짜와 시간으로 정렬
        matches.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }
            const timeA = a.timeSlot || '';
            const timeB = b.timeSlot || '';
            return timeB.localeCompare(timeA);
        });
        
        if (matches.length === 0) {
            recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>해당 기간의 기록이 없습니다</p></div>';
            return;
        }
        
        renderRecords(matches);
        
    } catch (error) {
        console.error('기간별 기록 로드 오류:', error);
        const recordsList = document.getElementById('records-list');
        if (recordsList) {
            recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>기록을 불러올 수 없습니다</p></div>';
        }
    }
}

// 커스텀 기간 기록 로드
async function loadRecordsForCustomPeriod() {
    try {
        const startDate = document.getElementById('record-start-date').value;
        const endDate = document.getElementById('record-end-date').value;
        
        if (!startDate || !endDate) {
            showToast('시작일과 종료일을 모두 선택해주세요.', 'warning');
            return;
        }
        
        const recordsList = document.getElementById('records-list');
        if (!recordsList) return;
        
        recordsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>기록을 불러오는 중...</p></div>';
        
        const db = window.db || firebase.firestore();
        if (!db) {
            console.error('db 객체를 찾을 수 없습니다');
            return;
        }
        
        // 인덱스 문제를 피하기 위해 status만 필터링하고 클라이언트에서 날짜 필터링
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        if (matchesSnapshot.empty) {
            recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>해당 기간의 기록이 없습니다</p></div>';
            return;
        }
        
        const matches = [];
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            // 점수가 있고, 완료된 상태만 포함
            if ((match.scoreA !== null && match.scoreA !== undefined && 
                match.scoreB !== null && match.scoreB !== undefined) &&
                match.status === 'completed') {
                // 날짜 필터링
                const matchDate = match.date || '';
                if (matchDate < startDate || matchDate > endDate) {
                    return; // 기간 밖이면 제외
                }
                
                matches.push({
                    id: doc.id,
                    ...match
                });
            }
        });
        
        // 클라이언트 측에서 날짜와 시간으로 정렬
        matches.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }
            const timeA = a.timeSlot || '';
            const timeB = b.timeSlot || '';
            return timeB.localeCompare(timeA);
        });
        
        if (matches.length === 0) {
            recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>해당 기간의 기록이 없습니다</p></div>';
            return;
        }
        
        renderRecords(matches);
        
    } catch (error) {
        console.error('커스텀 기간 기록 로드 오류:', error);
        showToast('기록을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 기록 카드 렌더링
function renderRecords(matches) {
    const recordsList = document.getElementById('records-list');
    if (!recordsList) return;
    
    if (matches.length === 0) {
        recordsList.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>기록이 없습니다</p></div>';
        return;
    }
    
    window.currentDisplayedRecords = matches;
    
    let recordsHTML = '';
    
    matches.forEach(match => {
        const matchDate = match.date;
        const timeSlot = match.timeSlot || '';
        const [startTime] = timeSlot.split('-');
        
        const dateObj = new Date(matchDate + 'T' + (startTime || '12:00'));
        const formattedDate = dateObj.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        const formattedTime = dateObj.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(' ', '');
        
        const teamANames = match.teamA ? match.teamA.map(p => p.userName || p.name || '알 수 없음').join(', ') : '알 수 없음';
        const teamBNames = match.teamB ? match.teamB.map(p => p.userName || p.name || '알 수 없음').join(', ') : '알 수 없음';
        
        const scoreA = match.scoreA ?? 0;
        const scoreB = match.scoreB ?? 0;
        
        recordsHTML += `
            <div class="record-card" data-match-id="${match.id}">
                <div class="record-header">
                    <div class="record-date-time">${formattedDate} ${formattedTime}</div>
                    <button class="record-delete-btn" data-match-id="${match.id}" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="record-teams">
                    <div class="record-team team-a">
                        <div class="team-icon team-a-icon">A</div>
                        <div class="team-info">
                            <div class="team-names">${teamANames}</div>
                            <div class="team-score score-a">${scoreA}</div>
                        </div>
                    </div>
                    <div class="record-team team-b">
                        <div class="team-icon team-b-icon">B</div>
                        <div class="team-info">
                            <div class="team-names">${teamBNames}</div>
                            <div class="team-score score-b">${scoreB}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    recordsList.innerHTML = recordsHTML;
    
    document.querySelectorAll('.record-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const matchId = btn.getAttribute('data-match-id');
            if (confirm('이 기록을 삭제하시겠습니까?')) {
                await deleteRecord(matchId);
            }
        });
    });
}

// 기록 삭제 (점수만 초기화, 대진표는 유지)
async function deleteRecord(matchId) {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return;
        
        // match 점수 초기화 (삭제가 아닌 초기화)
        const matchRef = db.collection('matches').doc(matchId);
        const matchDoc = await matchRef.get();
        
        if (!matchDoc.exists) {
            console.warn(`⚠️ 매치를 찾을 수 없습니다: ${matchId}`);
            showToast('매치를 찾을 수 없습니다.', 'error');
            return;
        }
        
        const matchData = matchDoc.data();
        const matchDate = matchData.date;
        
        // 점수 초기화 (매치 삭제가 아닌 점수만 초기화)
        const FieldValue = firebase.firestore.FieldValue;
        const updateData = {
            scoreA: null,
            scoreB: null,
            status: 'scheduled',
            recordedAt: FieldValue.delete() // 필드 삭제
        };
        
        await matchRef.update(updateData);
        console.log(`✅ 매치 점수 초기화 완료: ${matchId}`);
        
        // 관련 gameResults 삭제
        const gameResultsA = await db.collection('gameResults')
            .where('teamId', '==', `${matchId}_A`)
            .get();
        
        const gameResultsB = await db.collection('gameResults')
            .where('teamId', '==', `${matchId}_B`)
            .get();
        
        const batch = db.batch();
        gameResultsA.forEach(doc => batch.delete(doc.ref));
        gameResultsB.forEach(doc => batch.delete(doc.ref));
        
        if (!gameResultsA.empty || !gameResultsB.empty) {
            await batch.commit();
            console.log(`🔄 gameResults 삭제 및 점수 초기화: ${matchId} (${gameResultsA.size + gameResultsB.size}개)`);
        }
        
        showToast('기록이 초기화되었습니다.', 'success');
        
        // 기록 목록 새로고침
        const activePeriod = document.querySelector('.period-btn.active')?.getAttribute('data-period') || 'today';
        await loadRecordsForPeriod(activePeriod);
        
        // 대진표도 새로고침 (매치 삭제가 아닌 점수 초기화되었으므로 대진표에 계속 표시됨)
        const matchesTab = document.getElementById('matches-tab');
        if (matchesTab && matchesTab.classList.contains('active') && matchDate) {
            await loadMatchesForDate(matchDate);
        }
        
    } catch (error) {
        console.error('기록 삭제 오류:', error);
        showToast('기록 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 모든 기록 삭제
async function deleteAllRecords() {
    try {
        if (!confirm('모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }
        
        showLoading();
        
        const db = window.db || firebase.firestore();
        if (!db) return;
        
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        if (matchesSnapshot.empty) {
            showToast('삭제할 기록이 없습니다.', 'info');
            hideLoading();
            return;
        }
        
        // matches 삭제
        const batch = db.batch();
        matchesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // 모든 gameResults 삭제
        const gameResultsSnapshot = await db.collection('gameResults').get();
        const gameResultsBatch = db.batch();
        gameResultsSnapshot.forEach(doc => {
            gameResultsBatch.delete(doc.ref);
        });
        
        if (!gameResultsSnapshot.empty) {
            await gameResultsBatch.commit();
            console.log(`🗑️ 모든 gameResults 삭제: ${gameResultsSnapshot.size}개`);
        }
        
        showToast('모든 기록이 삭제되었습니다.', 'success');
        
        const activePeriod = document.querySelector('.period-btn.active')?.getAttribute('data-period') || 'today';
        await loadRecordsForPeriod(activePeriod);
        
        hideLoading();
        
    } catch (error) {
        console.error('모든 기록 삭제 오류:', error);
        showToast('기록 삭제 중 오류가 발생했습니다.', 'error');
        hideLoading();
    }
}

// CSV 내보내기
function exportRecordsToCSV(matches, filename = 'records.csv') {
    if (!matches || matches.length === 0) {
        showToast('내보낼 기록이 없습니다.', 'warning');
        return;
    }
    
    const headers = ['날짜', '시간', '팀A', '팀B', '팀A점수', '팀B점수'];
    const csvRows = [headers.join(',')];
    
    matches.forEach(match => {
        const matchDate = match.date;
        const timeSlot = match.timeSlot || '';
        const [startTime] = timeSlot.split('-');
        
        const dateObj = new Date(matchDate + 'T' + (startTime || '12:00'));
        const formattedDate = dateObj.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        const formattedTime = dateObj.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(' ', '');
        
        const teamANames = match.teamA ? match.teamA.map(p => p.userName || p.name || '알 수 없음').join(', ') : '알 수 없음';
        const teamBNames = match.teamB ? match.teamB.map(p => p.userName || p.name || '알 수 없음').join(', ') : '알 수 없음';
        
        const scoreA = match.scoreA ?? 0;
        const scoreB = match.scoreB ?? 0;
        
        const escapeCSV = (str) => {
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        
        csvRows.push([
            escapeCSV(formattedDate),
            escapeCSV(formattedTime),
            escapeCSV(teamANames),
            escapeCSV(teamBNames),
            escapeCSV(String(scoreA)),
            escapeCSV(String(scoreB))
        ].join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV 파일이 다운로드되었습니다.', 'success');
}

// 전체 기록 가져오기 (CSV 내보내기용)
async function getAllRecordsForExport() {
    try {
        const db = window.db || firebase.firestore();
        if (!db) {
            showToast('데이터베이스 연결 오류', 'error');
            return [];
        }
        
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        const matches = [];
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (match.scoreA !== null && match.scoreA !== undefined && 
                match.scoreB !== null && match.scoreB !== undefined) {
                matches.push({
                    id: doc.id,
                    ...match
                });
            }
        });
        
        matches.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }
            const timeA = a.timeSlot || '';
            const timeB = b.timeSlot || '';
            return timeB.localeCompare(timeA);
        });
        
        return matches;
    } catch (error) {
        console.error('전체 기록 조회 오류:', error);
        showToast('기록을 불러오는 중 오류가 발생했습니다.', 'error');
        return [];
    }
}

// 관리자 데이터 로드
async function loadAdminData() {
    try {
        await loadAdminStats();
        await loadAdminDashboard();
    } catch (error) {
        console.error('관리자 데이터 로드 오류:', error);
    }
}

// 예약 현황 타임라인 로드
async function loadReservationsTimeline() {
    console.log('=== 예약 현황 로드 시작 ===');
    console.log('현재 시간:', new Date().toLocaleString());
    console.log('User Agent:', navigator.userAgent);
    console.log('화면 크기:', window.innerWidth + 'x' + window.innerHeight);
    console.log('디바이스 픽셀 비율:', window.devicePixelRatio);
    
    const timeline = document.getElementById('reservations-timeline');
    if (!timeline) {
        console.error('❌ 타임라인 요소를 찾을 수 없습니다');
        console.log('사용 가능한 요소들:', document.querySelectorAll('[id*="reservation"]'));
        return;
    }
    console.log('✅ 타임라인 요소 찾음');
    
    // 로딩 상태 표시
    timeline.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>예약 현황을 불러오는 중...</p></div>';
    
    try {
        // Firebase 초기화 확인
        if (!initializeFirebase()) {
            console.error('❌ Firebase 초기화 실패');
            timeline.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Firebase 초기화 실패</p></div>';
            return;
        }
        
        // 전역 currentDate 변수 사용 (날짜 네비게이션에서 설정됨)
        const targetDate = window.currentDate || new Date().toISOString().slice(0, 10);
        console.log('📅 대상 날짜:', targetDate);
        
        // 시스템 설정 로드 (재시도 포함)
        let settings = null;
        let settingsAttempts = 0;
        const maxSettingsAttempts = 5;
        
        while (!settings && settingsAttempts < maxSettingsAttempts) {
            try {
                settings = await getSystemSettings();
                if (settings) {
                    console.log('✅ 시스템 설정 로드 성공 (시도 ' + (settingsAttempts + 1) + ')');
                } else {
                    console.log('⚠️ 시스템 설정이 null (시도 ' + (settingsAttempts + 1) + ')');
                }
            } catch (error) {
                console.error('❌ 시스템 설정 로드 오류 (시도 ' + (settingsAttempts + 1) + '):', error);
            }
            
            if (!settings) {
                settingsAttempts++;
                if (settingsAttempts < maxSettingsAttempts) {
                    console.log('⏳ 시스템 설정 재시도 중... (' + settingsAttempts + '/' + maxSettingsAttempts + ')');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        // 현재 선택된 날짜 표시
        updateSelectedInfo(targetDate, null);
        
        if (!settings) {
            timeline.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>설정을 불러올 수 없습니다</p></div>';
            return;
        }
        
        console.log('📋 시간 슬롯 수:', settings.timeSlots.length);
        let timelineHTML = '';
        
        for (const timeSlot of settings.timeSlots) {
            const slotKey = `${timeSlot.start}-${timeSlot.end}`;
            
            // 예약 수 확인
            console.log(`🔍 예약 조회 중: ${targetDate}, ${slotKey}`);
            let reservations = [];
            
            try {
                console.log('📡 Firestore 쿼리 시작...');
                const reservationsSnapshot = await db.collection('reservations')
                    .where('date', '==', targetDate)
                    .where('timeSlot', '==', slotKey)
                    .where('status', 'in', ['pending', 'confirmed'])
                    .get();
                
                console.log('📡 Firestore 쿼리 완료, 문서 수:', reservationsSnapshot.size);
                
                reservationsSnapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`👤 예약 발견: ${data.userName} (${data.status})`);
                    reservations.push({ id: doc.id, ...data });
                });
                
                console.log(`✅ ${slotKey} 시간대 예약 수: ${reservations.length}`);
            } catch (error) {
                console.error(`❌ ${slotKey} 시간대 예약 조회 오류:`, error);
                console.error('에러 상세:', error.message);
                // 에러가 발생해도 빈 배열로 계속 진행
                reservations = [];
            }
            
            // 만석 상태 제거 - 항상 예약 가능
            
            // 20분 전 마감 체크
            // 검증: 대진표 생성 버튼을 누르지 않아도, 게임 시작 시간 20분 전에 자동으로 마감됩니다.
            // 이는 예약을 막는 용도이며, 대진표 생성 버튼은 마감 후에만 표시됩니다.
            const now = new Date();
            
            // timeSlot 객체에서 직접 시작 시간 가져오기
            const startTime = timeSlot.start || '00:00';
            
            const gameStartTime = new Date(`${targetDate}T${startTime}:00`);
            const closingTime = new Date(gameStartTime.getTime() - 20 * 60 * 1000); // 20분 전
            const isClosed = now > closingTime;
            
            // 마감까지 남은 시간 계산 (분 단위)
            let timeUntilClosing = null;
            if (!isClosed && closingTime > now) {
                const diffMs = closingTime.getTime() - now.getTime();
                const diffMinutes = Math.floor(diffMs / (60 * 1000));
                timeUntilClosing = diffMinutes;
            }
            
            let statusClass, statusText;
            if (isClosed) {
                statusClass = 'closed';
                statusText = '마감';
            } else if (reservations.length > 0) {
                statusClass = 'partial';
                if (timeUntilClosing !== null && timeUntilClosing > 0) {
                    statusText = `${reservations.length}/8명 · ${timeUntilClosing}분 후 마감`;
                } else {
                    statusText = `${reservations.length}/8명`;
                }
            } else {
                statusClass = 'empty';
                if (timeUntilClosing !== null && timeUntilClosing > 0) {
                    statusText = `예약 가능 · ${timeUntilClosing}분 후 마감`;
                } else {
                    statusText = '예약 가능';
                }
            }
            
            timelineHTML += `
                <div class="timeline-item ${statusClass}" data-time-slot="${slotKey}" data-date="${targetDate}">
                    <div class="timeline-header">
                        <div class="timeline-time">
                            ${timeSlot.start} ~ ${timeSlot.end}
                        </div>
                        <div class="timeline-status">
                            <span class="status-badge ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                    <div class="timeline-players">
                        ${reservations.map(res => `
                            <div class="player-item">
                                <span class="player-name">${res.userName || '익명'}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="timeline-actions">
                        ${(() => {
                            const currentUser = firebase.auth().currentUser;
                            const userReservation = reservations.find(res => res.userId === currentUser?.uid);
                            
                            if (isClosed) {
                                return `<button class="timeline-reserve-btn" disabled>마감</button>`;
                            } else if (userReservation) {
                                return `<button class="timeline-cancel-btn" 
                                               data-time-slot="${slotKey}" 
                                               data-date="${targetDate}">
                                            취소하기
                                        </button>`;
                            } else {
                                return `<button class="timeline-reserve-btn" 
                                               data-time-slot="${slotKey}" 
                                               data-date="${targetDate}">
                                            예약하기
                                        </button>`;
                            }
                        })()}
                    </div>
                    <div class="timeline-match-schedule" id="match-schedule-${targetDate}-${slotKey.replace(/:/g, '-')}" style="display: none; margin-top: 12px;">
                        <!-- 대진표가 여기에 표시됩니다 -->
                    </div>
                </div>
            `;
        }
        
        console.log('🎨 타임라인 HTML 생성 완료, 길이:', timelineHTML.length);
        console.log('📝 생성된 HTML 미리보기:', timelineHTML.substring(0, 200) + '...');
        
        timeline.innerHTML = timelineHTML || '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>예약 현황이 없습니다</p></div>';
        
        console.log('✅ 타임라인 DOM 업데이트 완료');
        console.log('🔘 예약 버튼 수:', timeline.querySelectorAll('.timeline-reserve-btn').length);
        console.log('🔘 취소 버튼 수:', timeline.querySelectorAll('.timeline-cancel-btn').length);
        
        // 타임라인 예약 버튼 이벤트 리스너 추가
        timeline.querySelectorAll('.timeline-reserve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const timeSlot = e.target.getAttribute('data-time-slot');
                const date = e.target.getAttribute('data-date');
                await handleTimelineReservation(timeSlot, date);
            });
        });
        
        // 타임라인 취소 버튼 이벤트 리스너 추가
        timeline.querySelectorAll('.timeline-cancel-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const timeSlot = e.target.getAttribute('data-time-slot');
                const date = e.target.getAttribute('data-date');
                await handleCancelReservation(timeSlot, date);
            });
        });
        
        // 타임라인 아이템 클릭 이벤트 (시간대 선택)
        timeline.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                // 버튼 클릭은 제외
                if (e.target.classList.contains('timeline-reserve-btn') || 
                    e.target.classList.contains('timeline-cancel-btn')) {
                    return;
                }
                
                const timeSlot = item.getAttribute('data-time-slot');
                const date = item.getAttribute('data-date');
                
                // 선택된 시간대 저장
                window.selectedTimeSlot = timeSlot;
                window.currentDate = date;
                
                // 선택된 정보 업데이트
                updateSelectedInfo(date, timeSlot);
                
                // 대진표 확인 및 표시
                await checkAndShowMatchSchedule();
            });
        });
        
    } catch (error) {
        console.error('예약 현황 로드 오류:', error);
        timeline.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>데이터를 불러올 수 없습니다</p></div>';
    }
    
    // 마감 시간 실시간 업데이트 (1분마다)
    if (window.closingTimeUpdateInterval) {
        clearInterval(window.closingTimeUpdateInterval);
    }
    window.closingTimeUpdateInterval = setInterval(() => {
        // 예약 탭이 활성화되어 있을 때만 업데이트
        const reservationsTab = document.getElementById('reservations-tab');
        if (reservationsTab && reservationsTab.classList.contains('active')) {
            loadReservationsTimeline();
        }
    }, 60000); // 1분마다 업데이트
}

// 선택된 정보 업데이트
function updateSelectedInfo(date, timeSlot) {
    // selected-info 섹션이 제거되었으므로 함수는 동작하지 않음
    // 호출은 유지하되 아무 동작도 하지 않음 (기존 코드 호환성을 위해)
    return;
}

// 타임라인 예약 처리
async function handleTimelineReservation(timeSlot, date) {
    try {
        // 사용자 로그인 확인
        const user = auth.currentUser;
        if (!user) {
            showToast('로그인이 필요합니다.', 'warning');
            return;
        }
        
        // 코트 선택 (기본적으로 코트 1)
        const courtId = 'court1';
        
        // 예약 가능 여부 확인
        const availability = await checkReservationAvailability(date, timeSlot);
        if (!availability.available) {
            showToast(availability.reason, 'warning');
            return;
        }
        
        // 관리자가 아닌 경우에만 중복 예약 방지
        const isAdminUser = await isAdmin(user);
        if (!isAdminUser) {
            const existingReservation = await db.collection('reservations')
                .where('userId', '==', user.uid)
                .where('date', '==', date)
                .where('timeSlot', '==', timeSlot)
                .where('status', 'in', ['pending', 'confirmed'])
                .get();
                
            if (!existingReservation.empty) {
                showToast('이미 해당 시간대에 예약하셨습니다.', 'warning');
                return;
            }
        } else {
            console.log('관리자 예약 - 중복 예약 허용');
        }
        
        // 사용자 정보 가져오기
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // 예약 데이터 생성
        const reservationData = {
            userId: user.uid,
            userName: userData.name || user.displayName || '익명',
            userEmail: user.email,
            userDupr: userData.dupr || null,
            courtId: courtId,
            date: date,
            timeSlot: timeSlot,
            status: 'pending',
            createdAt: new Date(),
            isAdminReservation: isAdminUser // 관리자 예약 여부 표시
        };
        
        // 예약 생성
        console.log('예약 데이터 생성 중:', reservationData);
        const reservationId = await createReservation(reservationData);
        console.log('예약 생성 완료, ID:', reservationId);
        
        // 관리자 예약 시 다른 메시지 표시
        if (isAdminUser) {
            showToast('관리자 예약이 완료되었습니다! (중복 허용)', 'success');
        } else {
            showToast('예약이 완료되었습니다!', 'success');
        }
        
        // 선택된 정보 업데이트
        updateSelectedInfo(date, timeSlot);
        
        // 타임라인 새로고침 (타임라인에 버튼이 포함되어 있음)
        await loadReservationsTimeline();
        
    } catch (error) {
        console.error('타임라인 예약 오류:', error);
        showToast('예약 중 오류가 발생했습니다.', 'error');
    }
}

// 예약 취소 처리
async function handleCancelReservation(timeSlot, date) {
    try {
        const user = auth.currentUser;
        if (!user) {
            showToast('로그인이 필요합니다.', 'warning');
            return;
        }
        
        // 사용자의 예약 찾기
        const reservationSnapshot = await db.collection('reservations')
            .where('userId', '==', user.uid)
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
            
        if (reservationSnapshot.empty) {
            showToast('취소할 예약이 없습니다.', 'warning');
            return;
        }
        
        // 예약 취소
        const batch = db.batch();
        reservationSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                status: 'cancelled',
                cancelledAt: new Date()
            });
        });
        
        await batch.commit();
        
        showToast('예약이 취소되었습니다.', 'success');
        
        // 타임라인 새로고침 (타임라인에 버튼이 포함되어 있음)
        await loadReservationsTimeline();
        
    } catch (error) {
        console.error('예약 취소 오류:', error);
        showToast('취소 중 오류가 발생했습니다.', 'error');
    }
}

// 예약 버튼 상태 업데이트 - 제거됨 (타임라인에 통합)
// loadReservationsTimeline() 호출로 대체됨

// 통계 차트 로드
async function loadStatsCharts() {
    const chartsContainer = document.getElementById('stats-charts');
    if (!chartsContainer) return;
    
    try {
        // 간단한 통계 차트 HTML 생성 (실제로는 Chart.js 등을 사용할 수 있음)
        chartsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-chart">
                    <h3>개인 승률</h3>
                    <div class="chart-placeholder">
                        <i class="fas fa-chart-pie"></i>
                        <p>승률 차트가 여기에 표시됩니다</p>
                    </div>
                </div>
                <div class="stat-chart">
                    <h3>팀 승률</h3>
                    <div class="chart-placeholder">
                        <i class="fas fa-chart-bar"></i>
                        <p>팀별 승률 차트가 여기에 표시됩니다</p>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('통계 차트 로드 오류:', error);
    }
}

// 관리자 통계 로드
async function loadAdminStats() {
    try {
        // 오늘 예약 수
        const today = new Date().toISOString().slice(0, 10);
        const todayReservations = await db.collection('reservations')
            .where('date', '==', today)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        
        // 총 사용자 수
        const totalUsers = await db.collection('users').get();
        
        // 총 게임 수
        const totalGames = await db.collection('gameResults').get();
        
        // UI 업데이트
        const todayReservationsEl = document.getElementById('admin-today-reservations');
        const totalUsersEl = document.getElementById('admin-total-users');
        const totalGamesEl = document.getElementById('admin-total-games');
        
        if (todayReservationsEl) todayReservationsEl.textContent = todayReservations.size;
        if (totalUsersEl) totalUsersEl.textContent = totalUsers.size;
        if (totalGamesEl) totalGamesEl.textContent = totalGames.size;
        
    } catch (error) {
        console.error('관리자 통계 로드 오류:', error);
    }
}

// 관리자 대시보드 로드
async function loadAdminDashboard() {
    const dashboardContent = document.getElementById('admin-dashboard-content');
    if (!dashboardContent) return;
    
    try {
        dashboardContent.innerHTML = `
            <div class="admin-dashboard-grid">
                <div class="dashboard-card">
                    <h3>최근 예약</h3>
                    <div class="recent-reservations">
                        <p>최근 예약 내역이 여기에 표시됩니다</p>
                    </div>
                </div>
                <div class="dashboard-card">
                    <h3>시스템 상태</h3>
                    <div class="system-status">
                        <div class="status-item">
                            <span class="status-label">데이터베이스</span>
                            <span class="status-value success">정상</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">인증 시스템</span>
                            <span class="status-value success">정상</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('관리자 대시보드 로드 오류:', error);
    }
}

// 페이지 로드 시 이메일 링크 확인
document.addEventListener('DOMContentLoaded', function() {
    handleEmailLinkSignIn();
    
    // 탭 버튼 이벤트 리스너
    document.querySelectorAll('.mobile-tab-btn, .desktop-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            switchMainTab(tabName);
            
            // 예약 현황 탭으로 전환 시 강제 재로딩
            if (tabName === 'reservations') {
                // 모바일에서 안정적인 로딩을 위해 약간의 지연
                setTimeout(async () => {
                    try {
                        await loadReservationsTimeline();
                        await checkAndShowMatchSchedule();
                    } catch (error) {
                        console.error('탭 전환 시 예약 현황 로드 오류:', error);
                        showToast('데이터 로드에 실패했습니다. 새로고침 버튼을 눌러주세요.', 'error');
                    }
                }, 50);
            }
            
            // 대진표 탭으로 전환 시 대진표 로드
            if (tabName === 'matches') {
                console.log('🎯 대진표 탭으로 전환, loadMatchesData 호출');
                setTimeout(async () => {
                    try {
                        console.log('⏰ 대진표 탭 전환 후 로드 시작');
                        await loadMatchesData();
                        console.log('✅ 대진표 탭 전환 후 로드 완료');
                    } catch (error) {
                        console.error('❌ 탭 전환 시 대진표 로드 오류:', error);
                        showToast('대진표 로드에 실패했습니다.', 'error');
                    }
                }, 50);
            }
            
            // 통계 탭으로 전환 시 팀별 분석 확실히 로드
            if (tabName === 'stats') {
                setTimeout(async () => {
                    try {
                        console.log('📊 통계 탭으로 전환, 팀별 분석 로드');
                        await loadTeamAnalysis();
                    } catch (error) {
                        console.error('통계 탭 전환 시 팀별 분석 로드 오류:', error);
                    }
                }, 600);
            }
        });
    });
    
    // 필터 버튼 이벤트 리스너
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const parent = e.currentTarget.closest('.ranking-filters, .stats-filters');
            if (parent) {
                parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            }
        });
    });
    
    // 날짜 네비게이션 이벤트 리스너
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    const refreshTimelineBtn = document.getElementById('refresh-timeline');
    const currentDateDisplay = document.getElementById('current-date-display');
    
    // 전역 currentDate 변수 설정
    if (!window.currentDate) {
        window.currentDate = new Date().toISOString().slice(0, 10);
    }
    
    // 현재 날짜 표시 업데이트 함수 (전역으로 사용 가능하도록)
    window.updateCurrentDateDisplay = function() {
        if (!currentDateDisplay) {
            console.warn('날짜 표시 요소를 찾을 수 없습니다');
            return;
        }
        
        const dateObj = new Date(window.currentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);
        
        const isToday = dateObj.getTime() === today.getTime();
        
        // 항상 날짜 형식으로 표시
        const formattedDate = dateObj.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
        currentDateDisplay.textContent = formattedDate;
        
        // Today 배지 표시/숨김 (date-navigation의 왼쪽에 배치)
        const dateNav = currentDateDisplay.parentElement;
        let todayBadge = dateNav.querySelector('.today-badge');
        if (isToday) {
            if (!todayBadge) {
                todayBadge = document.createElement('span');
                todayBadge.className = 'today-badge';
                todayBadge.textContent = 'Today';
                dateNav.insertBefore(todayBadge, dateNav.firstChild);
            }
            todayBadge.style.display = 'inline-block';
        } else {
            if (todayBadge) {
                todayBadge.style.display = 'none';
            }
        }
        
        // 타임라인 새로고침
        loadReservationsTimeline();
    };
    
    // 이전 날짜 버튼
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('이전 날짜 버튼 클릭됨');
            try {
                // currentDate가 없으면 오늘 날짜로 초기화
                if (!window.currentDate) {
                    window.currentDate = new Date().toISOString().slice(0, 10);
                }
                
                const dateObj = new Date(window.currentDate);
                dateObj.setDate(dateObj.getDate() - 1);
                window.currentDate = dateObj.toISOString().slice(0, 10);
                console.log('이전 날짜로 이동:', window.currentDate);
                
                if (window.updateCurrentDateDisplay) {
                    window.updateCurrentDateDisplay();
                } else {
                    console.error('updateCurrentDateDisplay 함수가 정의되지 않았습니다');
                    // 직접 타임라인 새로고침
                    loadReservationsTimeline();
                }
            } catch (error) {
                console.error('날짜 변경 오류:', error);
                showToast('날짜 변경 중 오류가 발생했습니다.', 'error');
            }
            return false;
        });
        console.log('이전 날짜 버튼 이벤트 리스너 등록 완료');
    } else {
        console.error('prev-day 버튼을 찾을 수 없습니다');
    }
    
    // 다음 날짜 버튼
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('다음 날짜 버튼 클릭됨');
            try {
                // currentDate가 없으면 오늘 날짜로 초기화
                if (!window.currentDate) {
                    window.currentDate = new Date().toISOString().slice(0, 10);
                }
                
                const dateObj = new Date(window.currentDate);
                dateObj.setDate(dateObj.getDate() + 1);
                window.currentDate = dateObj.toISOString().slice(0, 10);
                console.log('다음 날짜로 이동:', window.currentDate);
                
                if (window.updateCurrentDateDisplay) {
                    window.updateCurrentDateDisplay();
                } else {
                    console.error('updateCurrentDateDisplay 함수가 정의되지 않았습니다');
                    // 직접 타임라인 새로고침
                    loadReservationsTimeline();
                }
            } catch (error) {
                console.error('날짜 변경 오류:', error);
                showToast('날짜 변경 중 오류가 발생했습니다.', 'error');
            }
            return false;
        });
        console.log('다음 날짜 버튼 이벤트 리스너 등록 완료');
    } else {
        console.error('next-day 버튼을 찾을 수 없습니다');
    }
    
    // 새로고침 버튼
    if (refreshTimelineBtn) {
        refreshTimelineBtn.addEventListener('click', async () => {
            try {
                console.log('타임라인 새로고침 요청');
                showLoading();
                await loadReservationsTimeline();
                showToast('예약 현황이 새로고침되었습니다.', 'success');
            } catch (error) {
                console.error('타임라인 새로고침 오류:', error);
                showToast('새로고침 중 오류가 발생했습니다.', 'error');
            } finally {
                hideLoading();
            }
        });
    } else {
        console.warn('refresh-timeline 버튼을 찾을 수 없습니다');
    }
    
    // 초기 날짜 표시
    if (currentDateDisplay) {
        window.updateCurrentDateDisplay();
    } else {
        console.warn('current-date-display 요소를 찾을 수 없습니다');
    }
    
    // 대진표 탭 날짜 네비게이션 이벤트 리스너
    const matchesPrevDayBtn = document.getElementById('matches-prev-day');
    const matchesNextDayBtn = document.getElementById('matches-next-day');
    const matchesRefreshBtn = document.getElementById('refresh-matches');
    const matchesCurrentDateDisplay = document.getElementById('matches-current-date-display');
    
    // 대진표 탭 날짜 업데이트 함수
    window.updateMatchesDateDisplay = function() {
        if (!matchesCurrentDateDisplay) return;
        
        const dateObj = new Date(window.currentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);
        
        const isToday = dateObj.getTime() === today.getTime();
        
        // 항상 날짜 형식으로 표시
        const formattedDate = dateObj.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
        matchesCurrentDateDisplay.textContent = formattedDate;
        
        // Today 배지 표시/숨김 (date-navigation의 왼쪽에 배치)
        const dateNav = matchesCurrentDateDisplay.parentElement;
        let todayBadge = dateNav.querySelector('.today-badge');
        if (isToday) {
            if (!todayBadge) {
                todayBadge = document.createElement('span');
                todayBadge.className = 'today-badge';
                todayBadge.textContent = 'Today';
                dateNav.insertBefore(todayBadge, dateNav.firstChild);
            }
            todayBadge.style.display = 'inline-block';
        } else {
            if (todayBadge) {
                todayBadge.style.display = 'none';
            }
        }
        
        // 대진표 새로고침
        loadMatchesForDate(window.currentDate);
    };
    
    // 대진표 탭 이전 날짜 버튼
    if (matchesPrevDayBtn) {
        matchesPrevDayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                if (!window.currentDate) {
                    window.currentDate = new Date().toISOString().slice(0, 10);
                }
                const dateObj = new Date(window.currentDate);
                dateObj.setDate(dateObj.getDate() - 1);
                window.currentDate = dateObj.toISOString().slice(0, 10);
                window.updateMatchesDateDisplay();
            } catch (error) {
                console.error('대진표 탭 날짜 변경 오류:', error);
                showToast('날짜 변경 중 오류가 발생했습니다.', 'error');
            }
        });
    }
    
    // 대진표 탭 다음 날짜 버튼
    if (matchesNextDayBtn) {
        matchesNextDayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                if (!window.currentDate) {
                    window.currentDate = new Date().toISOString().slice(0, 10);
                }
                const dateObj = new Date(window.currentDate);
                dateObj.setDate(dateObj.getDate() + 1);
                window.currentDate = dateObj.toISOString().slice(0, 10);
                window.updateMatchesDateDisplay();
            } catch (error) {
                console.error('대진표 탭 날짜 변경 오류:', error);
                showToast('날짜 변경 중 오류가 발생했습니다.', 'error');
            }
        });
    }
    
    // 대진표 탭 새로고침 버튼
    if (matchesRefreshBtn) {
        matchesRefreshBtn.addEventListener('click', async () => {
            try {
                showLoading();
                await loadMatchesForDate(window.currentDate || new Date().toISOString().slice(0, 10));
                showToast('대진표가 새로고침되었습니다.', 'success');
            } catch (error) {
                console.error('대진표 새로고침 오류:', error);
                showToast('새로고침 중 오류가 발생했습니다.', 'error');
            } finally {
                hideLoading();
            }
        });
    }
    
    // 대진표 탭 초기 날짜 표시
    if (matchesCurrentDateDisplay) {
        window.updateMatchesDateDisplay();
    }
    
    // 하단 버튼 초기화 코드 제거됨 (타임라인에 통합)
    
    // 하단 버튼 이벤트 리스너 제거됨 (타임라인에 통합)
    
    // 기록 보기 탭 이벤트 리스너
    // 기간 선택 버튼들
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            // 모든 버튼 비활성화
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            // 클릭한 버튼 활성화
            btn.classList.add('active');
            
            const period = btn.getAttribute('data-period');
            await loadRecordsForPeriod(period);
        });
    });
    
    // 커스텀 기간 내보내기 버튼
    const exportCustomPeriodBtn = document.getElementById('export-custom-period');
    if (exportCustomPeriodBtn) {
        exportCustomPeriodBtn.addEventListener('click', async () => {
            try {
                await loadRecordsForCustomPeriod();
                const startDate = document.getElementById('record-start-date').value;
                const endDate = document.getElementById('record-end-date').value;
                
                if (window.currentDisplayedRecords && window.currentDisplayedRecords.length > 0) {
                    const filename = `records_${startDate}_${endDate}.csv`;
                    exportRecordsToCSV(window.currentDisplayedRecords, filename);
                } else {
                    showToast('내보낼 기록이 없습니다.', 'warning');
                }
            } catch (error) {
                console.error('커스텀 기간 내보내기 오류:', error);
                showToast('내보내기 중 오류가 발생했습니다.', 'error');
            }
        });
    }
    
    
    // 모든 기록 삭제 버튼
    const deleteAllRecordsBtn = document.getElementById('delete-all-records');
    if (deleteAllRecordsBtn) {
        deleteAllRecordsBtn.addEventListener('click', async () => {
            await deleteAllRecords();
        });
    }
});

// 시간 슬롯 로드
async function loadTimeSlots() {
    try {
        const settings = await getSystemSettings();
        if (!settings) return;
        
        const timeSelect = document.getElementById('time-select');
        if (!timeSelect) return;
        
        // 기존 옵션 제거 (첫 번째 옵션 제외)
        timeSelect.innerHTML = '<option value="">시간을 선택하세요</option>';
        
        // 시간 슬롯 추가
        settings.timeSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = `${slot.start}-${slot.end}`;
            option.textContent = `${slot.start} - ${slot.end}`;
            timeSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('시간 슬롯 로드 오류:', error);
    }
}

// 코트 옵션 로드
async function loadCourtOptions() {
    try {
        const settings = await getSystemSettings();
        if (!settings) return;
        
        const courtSelect = document.getElementById('court-select');
        if (!courtSelect) return;
        
        // 기존 옵션 제거 (첫 번째 옵션 제외)
        courtSelect.innerHTML = '<option value="">코트를 선택하세요</option>';
        
        // 코트 옵션 추가
        for (let i = 1; i <= settings.courtCount; i++) {
            const option = document.createElement('option');
            option.value = `court${i}`;
            option.textContent = `코트 ${i}`;
            courtSelect.appendChild(option);
        }
        
    } catch (error) {
        console.error('코트 옵션 로드 오류:', error);
    }
}

// 예약 가능 여부 확인
async function checkReservationAvailability(date, timeSlot) {
    try {
        const settings = await getSystemSettings();
        if (!settings) return { available: false, reason: '설정을 불러올 수 없습니다.' };
        
        // 해당 시간대의 예약 수 확인
        const reservationsSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        
        const currentReservations = reservationsSnapshot.size;
        
        // 만석 체크 제거 - 항상 예약 가능
        
        return { 
            available: true, 
            current: currentReservations, 
            max: 8 
        };
        
    } catch (error) {
        console.error('예약 가능 여부 확인 오류:', error);
        return { available: false, reason: '확인 중 오류가 발생했습니다.' };
    }
}

// 대기열에 추가
async function addToWaitlist(date, timeSlot) {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const waitlistData = {
            userId: user.uid,
            userName: user.displayName || user.email,
            userDupr: await getUserDUPR(user.uid),
            date: date,
            timeSlot: timeSlot,
            status: 'waitlist',
            createdAt: new Date()
        };
        
        await db.collection('waitlist').add(waitlistData);
        showToast('대기열에 추가되었습니다. 자리가 나면 알려드리겠습니다.', 'info');
        
    } catch (error) {
        console.error('대기열 추가 오류:', error);
        showToast('대기열 추가 중 오류가 발생했습니다.', 'error');
    }
}

// 내부 랭킹 시스템 함수들

// 사용자 내부 랭킹 가져오기
async function getUserInternalRating(userId) {
    try {
        const ratingDoc = await db.collection('userRatings').doc(userId).get();
        if (ratingDoc.exists) {
            return ratingDoc.data();
        }
        // 기본 랭킹 생성
        const defaultRating = {
            userId: userId,
            internalRating: 1000, // 기본 점수 1000
            gamesPlayed: 0,
            gamesWon: 0,
            winRate: 0,
            lastUpdated: new Date()
        };
        await db.collection('userRatings').doc(userId).set(defaultRating);
        return defaultRating;
    } catch (error) {
        console.error('내부 랭킹 가져오기 오류:', error);
        return null;
    }
}

// 게임 결과 기록
async function recordGameResult(teamId, gameResult) {
    try {
        const db = window.db || firebase.firestore();
        const auth = window.auth || firebase.auth();
        
        if (!db) {
            console.error('db 객체를 찾을 수 없습니다');
            return;
        }
        
        // teamId에서 match ID 추출 (형식: matchId_A 또는 matchId_B)
        const matchId = teamId ? teamId.replace(/_A$/, '').replace(/_B$/, '') : null;
        
        // 기존 gameResult 확인 및 삭제 (중복 방지)
        if (matchId) {
            const existingGameResults = await db.collection('gameResults')
                .where('teamId', '==', teamId)
                .get();
            
            if (!existingGameResults.empty) {
                // 기존 gameResults 삭제
                const batch = db.batch();
                existingGameResults.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`🔄 기존 gameResult 삭제: ${matchId} (${existingGameResults.size}개)`);
            }
        }
        
        const gameData = {
            teamId: teamId,
            date: gameResult.date,
            timeSlot: gameResult.timeSlot,
            courtNumber: gameResult.courtNumber || 1,
            gameNumber: gameResult.gameNumber || gameResult.roundNumber || 1,
            players: gameResult.players,
            winners: gameResult.winners, // 승자 팀의 플레이어 ID 배열
            losers: gameResult.losers,   // 패자 팀의 플레이어 ID 배열
            score: gameResult.score,     // 예: "11-9, 11-7"
            recordedAt: new Date(),
            recordedBy: auth && auth.currentUser ? auth.currentUser.uid : null
        };
        
        // 게임 결과 저장
        await db.collection('gameResults').add(gameData);
        
        // 각 플레이어의 랭킹 업데이트
        await updatePlayerRatings(gameResult.winners, gameResult.losers);
        
        showToast('게임 결과가 기록되었습니다!', 'success');
        
    } catch (error) {
        console.error('게임 결과 기록 오류:', error);
        showToast('게임 결과 기록 중 오류가 발생했습니다.', 'error');
    }
}

// 플레이어 랭킹 업데이트
async function updatePlayerRatings(winners, losers) {
    try {
        // 승자들의 랭킹 업데이트
        for (const winnerId of winners) {
            await updatePlayerRating(winnerId, true);
        }
        
        // 패자들의 랭킹 업데이트
        for (const loserId of losers) {
            await updatePlayerRating(loserId, false);
        }
        
    } catch (error) {
        console.error('플레이어 랭킹 업데이트 오류:', error);
    }
}

// 개별 플레이어 랭킹 업데이트
async function updatePlayerRating(userId, won) {
    try {
        const ratingRef = db.collection('userRatings').doc(userId);
        
        await db.runTransaction(async (transaction) => {
            const ratingDoc = await transaction.get(ratingRef);
            
            if (!ratingDoc.exists) {
                // 새로운 플레이어
                const newRating = {
                    userId: userId,
                    internalRating: 1000,
                    gamesPlayed: 1,
                    gamesWon: won ? 1 : 0,
                    winRate: won ? 100 : 0,
                    lastUpdated: new Date()
                };
                transaction.set(ratingRef, newRating);
            } else {
                // 기존 플레이어
                const currentData = ratingDoc.data();
                const newGamesPlayed = currentData.gamesPlayed + 1;
                const newGamesWon = currentData.gamesWon + (won ? 1 : 0);
                const newWinRate = (newGamesWon / newGamesPlayed) * 100;
                
                // ELO 시스템 기반 점수 계산
                const ratingChange = calculateRatingChange(currentData.internalRating, won);
                const newInternalRating = Math.max(500, Math.min(2000, currentData.internalRating + ratingChange));
                
                const updatedRating = {
                    ...currentData,
                    internalRating: newInternalRating,
                    gamesPlayed: newGamesPlayed,
                    gamesWon: newGamesWon,
                    winRate: newWinRate,
                    lastUpdated: new Date()
                };
                
                transaction.update(ratingRef, updatedRating);
            }
        });
        
    } catch (error) {
        console.error('개별 플레이어 랭킹 업데이트 오류:', error);
    }
}

// ELO 시스템 기반 점수 변화 계산
function calculateRatingChange(currentRating, won) {
    const K = 32; // K-팩터 (점수 변화량 조절)
    const expectedScore = 1 / (1 + Math.pow(10, (1000 - currentRating) / 400));
    const actualScore = won ? 1 : 0;
    
    return Math.round(K * (actualScore - expectedScore));
}

// 랭킹 순위 가져오기 (점수 기준: 승리 +10점, 패배 -5점)
async function getRankings(limit = 50) {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return [];
        
        // 사용자별 점수 계산 (승리 +10점, 패배 -5점)
        const userScores = {};
        const userInfoMap = {}; // userId -> userName 매핑 (matches/gameResults에서 수집)
        const processedMatches = new Set(); // 중복 방지를 위한 처리된 match ID 집합
        
        // 1. matches 컬렉션에서 완료된 경기 확인 (우선)
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        console.log(`🔍 랭킹 계산: matches 컬렉션에서 ${matchesSnapshot.size}개의 완료된 경기 발견`);
        
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (!match.teamA || !match.teamB || !match.scoreA || !match.scoreB) {
                console.warn(`⚠️ 매치 데이터 불완전: ${doc.id}`, {
                    hasTeamA: !!match.teamA,
                    hasTeamB: !!match.teamB,
                    hasScoreA: !!match.scoreA,
                    hasScoreB: !!match.scoreB
                });
                return;
            }
            
            const matchId = doc.id;
            processedMatches.add(matchId); // 처리된 match ID 저장
            
            const aWins = match.scoreA > match.scoreB;
            const winners = aWins ? match.teamA : match.teamB;
            const losers = aWins ? match.teamB : match.teamA;
            
            // 팀 구조 확인 및 디버깅
            if (!Array.isArray(winners) || !Array.isArray(losers)) {
                console.error(`❌ 매치 ${matchId}: 팀이 배열이 아님`, {
                    winners: winners,
                    losers: losers
                });
                return;
            }
            
            // 승자에게 +10점
            winners.forEach(player => {
                if (!player) {
                    console.warn(`⚠️ 매치 ${matchId}: 승자 배열에 null/undefined 있음`);
                    return;
                }
                
                const userId = player.userId || player.id;
                if (!userId) {
                    console.warn(`⚠️ 매치 ${matchId}: 플레이어에 userId 없음`, player);
                    return;
                }
                
                // 이름 정보 수집 (matches에서)
                if (!userInfoMap[userId] && player.userName) {
                    userInfoMap[userId] = player.userName;
                }
                
                if (!userScores[userId]) {
                    userScores[userId] = { 
                        score: 0, 
                        wins: 0, 
                        losses: 0,
                        totalGames: 0,
                        matchIds: new Set() // 각 사용자별 참여한 match ID 추적
                    };
                }
                
                // 이미 처리한 match인지 확인
                if (!userScores[userId].matchIds.has(matchId)) {
                    userScores[userId].score += 10;
                    userScores[userId].wins += 1;
                    userScores[userId].totalGames += 1;
                    userScores[userId].matchIds.add(matchId);
                    console.log(`✅ 승리: ${userId} (매치 ${matchId}) -> 점수: +10, 총 점수: ${userScores[userId].score}`);
                } else {
                    console.warn(`⚠️ 중복 경기 발견: ${userId} - 매치 ${matchId}`);
                }
            });
            
            // 패자에게 -5점 (최소 0점)
            losers.forEach(player => {
                if (!player) {
                    console.warn(`⚠️ 매치 ${matchId}: 패자 배열에 null/undefined 있음`);
                    return;
                }
                
                const userId = player.userId || player.id;
                if (!userId) {
                    console.warn(`⚠️ 매치 ${matchId}: 플레이어에 userId 없음`, player);
                    return;
                }
                
                // 이름 정보 수집 (matches에서)
                if (!userInfoMap[userId] && player.userName) {
                    userInfoMap[userId] = player.userName;
                }
                
                if (!userScores[userId]) {
                    userScores[userId] = { 
                        score: 0, 
                        wins: 0, 
                        losses: 0,
                        totalGames: 0,
                        matchIds: new Set()
                    };
                }
                
                // 이미 처리한 match인지 확인
                if (!userScores[userId].matchIds.has(matchId)) {
                    const oldScore = userScores[userId].score;
                    userScores[userId].score = Math.max(0, userScores[userId].score - 5);
                    userScores[userId].losses += 1;
                    userScores[userId].totalGames += 1;
                    userScores[userId].matchIds.add(matchId);
                    console.log(`❌ 패배: ${userId} (매치 ${matchId}) -> 점수: -5 (${oldScore} -> ${userScores[userId].score}), 총 점수: ${userScores[userId].score}`);
                } else {
                    console.warn(`⚠️ 중복 경기 발견: ${userId} - 매치 ${matchId}`);
                }
            });
        });
        
        console.log(`📊 matches 처리 완료: ${Object.keys(userScores).length}명의 사용자`);
        
        // 2. gameResults 컬렉션에서 확인 (matches에 없는 데이터만)
        // matches 컬렉션에서 모든 match ID 수집 (중복 방지)
        const matchesDocIds = new Set();
        matchesSnapshot.forEach(doc => {
            matchesDocIds.add(doc.id);
        });
        
        const gameResultsSnapshot = await db.collection('gameResults').get();
        const processedGameResults = new Set(); // 이미 처리한 gameResults ID
        
        console.log(`🔍 랭킹 계산: gameResults 컬렉션에서 ${gameResultsSnapshot.size}개의 게임 결과 발견`);
        
        let skippedCount = 0;
        let processedCount = 0;
        
        gameResultsSnapshot.forEach(doc => {
            const game = doc.data();
            if (!game.players || !game.winners || !game.losers) {
                console.warn(`⚠️ gameResult 데이터 불완전: ${doc.id}`, {
                    hasPlayers: !!game.players,
                    hasWinners: !!game.winners,
                    hasLosers: !!game.losers
                });
                return;
            }
            
            // gameResults의 teamId에서 match ID 추출 (형식: matchId_A 또는 matchId_B)
            let matchIdFromTeamId = null;
            if (game.teamId) {
                // teamId 형식: "matchId_A" 또는 "matchId_B" -> "matchId" 추출
                const parts = game.teamId.split('_');
                if (parts.length >= 2) {
                    matchIdFromTeamId = parts.slice(0, -1).join('_'); // 마지막 부분 제외
                }
            }
            
            // matches에서 이미 처리한 경기인지 확인
            if (matchIdFromTeamId && matchesDocIds.has(matchIdFromTeamId)) {
                skippedCount++;
                console.log(`⏭️ gameResult 건너뛰기: ${doc.id} (이미 matches에서 처리됨: ${matchIdFromTeamId})`);
                return; // 이미 matches에서 처리한 경기는 건너뛰기
            }
            
            // gameResults의 경우 고유한 gameResult ID로 추적
            const gameResultId = doc.id;
            
            // 이미 처리한 gameResult인지 확인 (전역 체크)
            if (processedGameResults.has(gameResultId)) {
                skippedCount++;
                return;
            }
            
            processedCount++;
            
            // 승자에게 +10점
            game.winners.forEach(userId => {
                if (!userId) return;
                
                if (!userScores[userId]) {
                    userScores[userId] = { 
                        score: 0, 
                        wins: 0, 
                        losses: 0,
                        totalGames: 0,
                        matchIds: new Set()
                    };
                }
                
                // 사용자별로 이미 처리한 gameResult인지 확인
                if (!userScores[userId].matchIds.has(gameResultId)) {
                    userScores[userId].score += 10;
                    userScores[userId].wins += 1;
                    userScores[userId].totalGames += 1;
                    userScores[userId].matchIds.add(gameResultId);
                    console.log(`✅ 승리 (gameResult): ${userId} (${gameResultId}) -> 점수: +10`);
                }
            });
            
            // 패자에게 -5점 (최소 0점)
            game.losers.forEach(userId => {
                if (!userId) return;
                
                if (!userScores[userId]) {
                    userScores[userId] = { 
                        score: 0, 
                        wins: 0, 
                        losses: 0,
                        totalGames: 0,
                        matchIds: new Set()
                    };
                }
                
                // 사용자별로 이미 처리한 gameResult인지 확인
                if (!userScores[userId].matchIds.has(gameResultId)) {
                    const oldScore = userScores[userId].score;
                    userScores[userId].score = Math.max(0, userScores[userId].score - 5);
                    userScores[userId].losses += 1;
                    userScores[userId].totalGames += 1;
                    userScores[userId].matchIds.add(gameResultId);
                    console.log(`❌ 패배 (gameResult): ${userId} (${gameResultId}) -> 점수: -5`);
                }
            });
            
            // 이 gameResult는 처리되었음을 표시
            processedGameResults.add(gameResultId);
        });
        
        console.log(`📊 gameResults 처리 완료: ${processedCount}개 처리, ${skippedCount}개 건너뜀`);
        
        // 사용자 정보 가져오기
        const rankings = [];
        const userIds = Object.keys(userScores);
        
        console.log(`📊 최종 랭킹 계산: ${userIds.length}명의 사용자`);
        
        for (const userId of userIds) {
            const userData = userScores[userId];
            
            // 모든 사용자 포함 (경기 수 제한 없음)
            console.log(`📈 사용자 ${userId}: ${userData.wins}승 ${userData.losses}패, 총 ${userData.totalGames}경기, 점수: ${userData.score}`);
            
            // 사용자 이름 찾기 (여러 소스에서 시도)
            let userName = null;
            
            // 1. matches/gameResults에서 수집한 이름 정보 우선 사용
            if (userInfoMap[userId]) {
                userName = userInfoMap[userId];
            }
            
            // 2. users 컬렉션에서 찾기 (더 철저하게)
            if (!userName) {
                try {
                    const userDoc = await db.collection('users').doc(userId).get();
                    if (userDoc.exists) {
                        const userDocData = userDoc.data();
                        // 여러 필드명 시도
                        userName = userDocData.displayName || 
                                   userDocData.name || 
                                   userDocData.userName ||
                                   userDocData.email?.split('@')[0] || // email의 @ 앞부분만
                                   userDocData.email || 
                                   null;
                        console.log(`📝 users 컬렉션에서 이름 찾음: ${userId} -> ${userName}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ users 컬렉션 조회 오류 (${userId}):`, error);
                }
            }
            
            // 3. reservations 컬렉션에서 최근 예약 찾기
            if (!userName) {
                try {
                    const reservationsSnapshot = await db.collection('reservations')
                        .where('userId', '==', userId)
                        .limit(10)
                        .get();
                    
                    if (!reservationsSnapshot.empty) {
                        // 가장 최근 예약 찾기 (클라이언트 측 정렬)
                        const reservations = [];
                        reservationsSnapshot.forEach(doc => {
                            const data = doc.data();
                            reservations.push({
                                userName: data.userName || data.name || null,
                                createdAt: data.createdAt || new Date(0)
                            });
                        });
                        
                        // 최신순으로 정렬
                        reservations.sort((a, b) => {
                            const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0));
                            const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0));
                            return dateB - dateA;
                        });
                        
                        if (reservations.length > 0 && reservations[0].userName) {
                            userName = reservations[0].userName;
                            console.log(`📝 reservations 컬렉션에서 이름 찾음: ${userId} -> ${userName}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ reservations 컬렉션 조회 오류 (${userId}):`, error);
                }
            }
            
            // 4. matches에서 직접 찾기 시도
            if (!userName) {
                try {
                    const matchesSnapshot = await db.collection('matches')
                        .where('status', '==', 'completed')
                        .limit(50)
                        .get();
                    
                    for (const matchDoc of matchesSnapshot.docs) {
                        const match = matchDoc.data();
                        const allPlayers = [...(match.teamA || []), ...(match.teamB || [])];
                        const player = allPlayers.find(p => (p.userId || p.id) === userId);
                        if (player && (player.userName || player.name)) {
                            userName = player.userName || player.name;
                            console.log(`📝 matches에서 이름 찾음: ${userId} -> ${userName}`);
                            break;
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ matches 컬렉션 조회 오류 (${userId}):`, error);
                }
            }
            
            // 이름 정리 (email에서 @ 제거, 공백 제거)
            if (userName) {
                // email 형식이면 @ 앞부분만 사용
                if (userName.includes('@')) {
                    userName = userName.split('@')[0];
                }
                // 공백 제거
                userName = userName.trim();
                // 빈 문자열 체크
                if (userName === '') {
                    userName = null;
                }
            }
            
            // 최종적으로 이름이 없거나 유효하지 않으면 '알 수 없음'으로 설정
            if (!userName || 
                userName.startsWith('test_') || 
                userName.length > 30 ||
                userName === '알 수 없음') {
                console.warn(`⚠️ 이름을 찾을 수 없음: ${userId} (최종: ${userName || 'null'})`);
                userName = '알 수 없음';
            } else {
                console.log(`✅ 최종 이름: ${userId} -> ${userName}`);
            }
            
            const winRate = userData.totalGames > 0 ? (userData.wins / userData.totalGames * 100) : 0;
            
            rankings.push({
                userId: userId,
                userName: userName,
                score: userData.score,
                wins: userData.wins,
                losses: userData.losses,
                totalGames: userData.totalGames,
                winRate: winRate
            });
        }
        
        // 점수 기준으로 정렬
        rankings.sort((a, b) => b.score - a.score);
        
        // 순위 추가
        rankings.forEach((ranking, index) => {
            ranking.rank = index + 1;
        });
        
        return rankings.slice(0, limit);
    } catch (error) {
        console.error('랭킹 가져오기 오류:', error);
        return [];
    }
}

// 사용자 이름 가져오기
async function getUserName(userId) {
    try {
        const db = window.db || firebase.firestore();
        if (!db) return '알 수 없음';
        
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.displayName || userData.name || userData.email || '알 수 없음';
        }
        
        // users 컬렉션에 없으면 gameResults에서 찾기
        const gameResultsSnapshot = await db.collection('gameResults')
            .where('players', 'array-contains', userId)
            .limit(1)
            .get();
        
        if (!gameResultsSnapshot.empty) {
            const game = gameResultsSnapshot.docs[0].data();
            // winners나 losers에서 이름 찾기 시도
            return '알 수 없음';
        }
        
        return '알 수 없음';
    } catch (error) {
        console.error('사용자 이름 가져오기 오류:', error);
        return '알 수 없음';
    }
}

// 올림픽 메달 시상식 로드
async function loadMedalCeremony() {
    try {
        const podiumContainer = document.getElementById('podium-container');
        if (!podiumContainer) return;
        
        podiumContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>랭킹을 불러오는 중...</p></div>';
        
        const rankings = await getRankings(50);
        
        // 최소 3경기 이상 참여한 선수 중 상위 3명만
        const top3 = rankings.filter(r => r.totalGames >= 3).slice(0, 3);
        
        if (top3.length === 0) {
            podiumContainer.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>아직 메달 수여 조건을 만족하는 선수가 없습니다</p></div>';
            return;
        }
        
        // 1등, 2등, 3등 순서로 배치 (1등 중앙, 2등 왼쪽, 3등 오른쪽)
        let podiumHTML = '<div class="podium-wrapper">';
        
        if (top3.length >= 2) {
            // 2등 (왼쪽)
            podiumHTML += `
                <div class="podium-card second-place">
                    <div class="medal-icon">
                        <i class="fas fa-medal" style="color: #c0c0c0;"></i>
                        <span class="medal-number">2</span>
                    </div>
                    <div class="podium-name">${top3[1].userName}</div>
                    <div class="podium-score">${top3[1].score}점 (${top3[1].wins}/${top3[1].totalGames})</div>
                </div>
            `;
        }
        
        if (top3.length >= 1) {
            // 1등 (중앙)
            podiumHTML += `
                <div class="podium-card first-place">
                    <div class="medal-icon">
                        <i class="fas fa-medal" style="color: #ffd700;"></i>
                        <span class="medal-number">1</span>
                    </div>
                    <div class="podium-name">${top3[0].userName}</div>
                    <div class="podium-score">${top3[0].score}점 (${top3[0].wins}/${top3[0].totalGames})</div>
                </div>
            `;
        }
        
        if (top3.length >= 3) {
            // 3등 (오른쪽)
            podiumHTML += `
                <div class="podium-card third-place">
                    <div class="medal-icon">
                        <i class="fas fa-medal" style="color: #cd7f32;"></i>
                        <span class="medal-number">3</span>
                    </div>
                    <div class="podium-name">${top3[2].userName}</div>
                    <div class="podium-score">${top3[2].score}점 (${top3[2].wins}/${top3[2].totalGames})</div>
                </div>
            `;
        }
        
        podiumHTML += '</div>';
        podiumContainer.innerHTML = podiumHTML;
        
    } catch (error) {
        console.error('메달 시상식 로드 오류:', error);
        const podiumContainer = document.getElementById('podium-container');
        if (podiumContainer) {
            podiumContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>메달 시상식을 불러올 수 없습니다</p></div>';
        }
    }
}

// 최고 성과자 로드
async function loadTopPerformers() {
    try {
        const performersList = document.getElementById('performers-list');
        if (!performersList) return;
        
        performersList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>랭킹을 불러오는 중...</p></div>';
        
        const rankings = await getRankings(12);
        
        if (rankings.length === 0) {
            performersList.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>아직 랭킹 데이터가 없습니다</p></div>';
            return;
        }
        
        let performersHTML = '';
        
        rankings.forEach((ranking, index) => {
            const rank = index + 1;
            
            // 점수에 따른 계급 아이콘 결정
            let tierIcon = '';
            const score = ranking.score || 0;
            
            if (score >= 2500) {
                tierIcon = '<i class="fas fa-trophy" style="color: #764ba2;"></i>'; // GOAT
            } else if (score >= 1800) {
                tierIcon = '<i class="fas fa-medal" style="color: #ffd700;"></i>'; // 레전드
            } else if (score >= 1200) {
                tierIcon = '<i class="fas fa-medal" style="color: #c0c0c0;"></i>'; // 마스터
            } else if (score >= 800) {
                tierIcon = '<i class="fas fa-medal" style="color: #cd7f32;"></i>'; // 챔피언
            } else if (score >= 400) {
                tierIcon = '<i class="fas fa-star" style="color: #ffd700;"></i>'; // 프로
            } else if (score >= 30) {
                tierIcon = '<i class="fas fa-table-tennis" style="color: #ff69b4;"></i>'; // 플레이어
            } else {
                tierIcon = '<span style="font-size: 0.9rem; font-weight: 700; color: #666;">NEW</span>'; // 초보자
            }
            
            performersHTML += `
                <div class="performer-item">
                    <div class="performer-rank">${rank}</div>
                    <div class="performer-icon">
                        ${tierIcon}
                    </div>
                    <div class="performer-name">${ranking.userName}</div>
                    <div class="performer-score">${ranking.score}점</div>
                    <div class="performer-winrate">${ranking.winRate.toFixed(1)}%</div>
                    <div class="performer-record">(${ranking.wins}/${ranking.totalGames})</div>
                </div>
            `;
        });
        
        performersList.innerHTML = performersHTML;
        
    } catch (error) {
        console.error('최고 성과자 로드 오류:', error);
        const performersList = document.getElementById('performers-list');
        if (performersList) {
            performersList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>최고 성과자를 불러올 수 없습니다</p></div>';
        }
    }
}

// 사용자별 상세 통계 가져오기
async function getUserStats(userId) {
    try {
        const rating = await getUserInternalRating(userId);
        if (!rating) return null;
        
        // 최근 게임 결과 가져오기
        const recentGamesSnapshot = await db.collection('gameResults')
            .where('players', 'array-contains', userId)
            .orderBy('recordedAt', 'desc')
            .limit(10)
            .get();
        
        const recentGames = [];
        recentGamesSnapshot.forEach(doc => {
            const game = doc.data();
            const isWinner = game.winners.includes(userId);
            recentGames.push({
                date: game.date,
                timeSlot: game.timeSlot,
                courtNumber: game.courtNumber,
                won: isWinner,
                score: game.score
            });
        });
        
        return {
            ...rating,
            recentGames: recentGames
        };
        
    } catch (error) {
        console.error('사용자 통계 가져오기 오류:', error);
        return null;
    }
}

// 랭킹 UI 관련 함수들

// 전체 랭킹 로드
async function loadOverallRankings() {
    try {
        const rankingsList = document.getElementById('rankings-list');
        if (!rankingsList) return;
        
        rankingsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>랭킹을 불러오는 중...</p></div>';
        
        const rankings = await getRankings(20);
        
        if (rankings.length === 0) {
            rankingsList.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>아직 랭킹 데이터가 없습니다</p></div>';
            return;
        }
        
        rankingsList.innerHTML = '';
        
        for (let i = 0; i < rankings.length; i++) {
            const ranking = rankings[i];
            const rankingItem = createRankingItem(ranking, i + 1);
            rankingsList.appendChild(rankingItem);
        }
        
    } catch (error) {
        console.error('랭킹 로드 오류:', error);
        const rankingsList = document.getElementById('rankings-list');
        if (rankingsList) {
            rankingsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>랭킹을 불러올 수 없습니다</p></div>';
        }
    }
}

// 랭킹 아이템 생성
function createRankingItem(ranking, rank) {
    const div = document.createElement('div');
    div.className = `ranking-item ${rank <= 3 ? 'top-3' : ''}`;
    
    // 사용자 이름 가져오기 (실제로는 사용자 정보를 가져와야 함)
    const playerName = `플레이어 ${ranking.userId.substring(0, 8)}`;
    
    div.innerHTML = `
        <div class="rank-number">${rank}</div>
        <div class="player-info">
            <div class="player-name">${playerName}</div>
            <div class="player-stats">
                ${ranking.gamesPlayed}게임 | 승률 ${ranking.winRate.toFixed(1)}%
            </div>
        </div>
        <div class="rating-score">${ranking.internalRating}</div>
    `;
    
    return div;
}

// 내 통계 로드
async function loadMyStats() {
    try {
        const myStatsContent = document.getElementById('my-stats-content');
        if (!myStatsContent) return;
        
        const user = auth.currentUser;
        if (!user) {
            myStatsContent.innerHTML = '<div class="empty-state"><i class="fas fa-user-times"></i><p>로그인이 필요합니다</p></div>';
            return;
        }
        
        myStatsContent.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>통계를 불러오는 중...</p></div>';
        
        const stats = await getUserStats(user.uid);
        
        if (!stats) {
            myStatsContent.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>통계 데이터가 없습니다</p></div>';
            return;
        }
        
        myStatsContent.innerHTML = createMyStatsHTML(stats);
        
    } catch (error) {
        console.error('내 통계 로드 오류:', error);
        const myStatsContent = document.getElementById('my-stats-content');
        if (myStatsContent) {
            myStatsContent.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>통계를 불러올 수 없습니다</p></div>';
        }
    }
}

// 내 통계 HTML 생성
function createMyStatsHTML(stats) {
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.internalRating}</div>
                <div class="stat-label">내부 랭킹</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.gamesPlayed}</div>
                <div class="stat-label">총 게임 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.gamesWon}</div>
                <div class="stat-label">승리</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.winRate.toFixed(1)}%</div>
                <div class="stat-label">승률</div>
            </div>
        </div>
        
        <div class="recent-games">
            <h3>최근 게임 결과</h3>
            ${stats.recentGames.length > 0 ? 
                stats.recentGames.map(game => `
                    <div class="game-item">
                        <div class="game-info">
                            <div class="game-date">${game.date} ${game.timeSlot}</div>
                            <div class="game-details">코트 ${game.courtNumber} | ${game.score}</div>
                        </div>
                        <div class="game-result ${game.won ? 'won' : 'lost'}">
                            ${game.won ? '승리' : '패배'}
                        </div>
                    </div>
                `).join('') :
                '<p>최근 게임 결과가 없습니다</p>'
            }
        </div>
    `;
}

// 탭 전환
function switchTab(tabName) {
    // 모든 탭 버튼과 콘텐츠 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-rankings`).classList.add('active');
    
    // 해당 탭 데이터 로드
    if (tabName === 'overall') {
        loadOverallRankings();
    } else if (tabName === 'my-stats') {
        loadMyStats();
    }
}

// 팀 짜기 알고리즘 함수들

// 팀 짜기 모드 열거형
const TEAM_MODE = {
    RANDOM: 'random',
    BALANCED: 'balanced',
    GROUPED: 'grouped'
};

// 플레이어 정보 구조
class Player {
    constructor(userId, userName, dupr, internalRating) {
        this.userId = userId;
        this.userName = userName;
        this.dupr = dupr || 0;
        this.internalRating = internalRating || 1000;
        this.combinedScore = this.calculateCombinedScore();
    }
    
    calculateCombinedScore() {
        // DUPR과 내부 랭킹을 결합한 점수 (가중평균)
        const duprWeight = 0.6; // DUPR 가중치
        const internalWeight = 0.4; // 내부 랭킹 가중치
        
        // DUPR을 0-1000 스케일로 변환 (2.0-8.0 -> 0-1000)
        const duprScore = ((this.dupr - 2.0) / 6.0) * 1000;
        
        // 내부 랭킹을 0-1000 스케일로 변환 (500-2000 -> 0-1000)
        const internalScore = ((this.internalRating - 500) / 1500) * 1000;
        
        return (duprScore * duprWeight) + (internalScore * internalWeight);
    }
}

// 팀 정보 구조
class Team {
    constructor(players = []) {
        this.players = players;
        this.averageScore = this.calculateAverageScore();
        this.totalScore = this.calculateTotalScore();
    }
    
    calculateAverageScore() {
        if (this.players.length === 0) return 0;
        return this.players.reduce((sum, player) => sum + player.combinedScore, 0) / this.players.length;
    }
    
    calculateTotalScore() {
        return this.players.reduce((sum, player) => sum + player.combinedScore, 0);
    }
    
    addPlayer(player) {
        this.players.push(player);
        this.averageScore = this.calculateAverageScore();
        this.totalScore = this.calculateTotalScore();
    }
}

// 팀 짜기 메인 함수
async function createTeams(reservations, mode = TEAM_MODE.BALANCED) {
    try {
        // 플레이어 정보 수집
        const players = await collectPlayerInfo(reservations);
        
        if (players.length < 4) {
            throw new Error('최소 4명의 플레이어가 필요합니다.');
        }
        
        // 팀 짜기 모드에 따른 처리
        let teams;
        switch (mode) {
            case TEAM_MODE.RANDOM:
                teams = createRandomTeams(players);
                break;
            case TEAM_MODE.BALANCED:
                teams = createBalancedTeams(players);
                break;
            case TEAM_MODE.GROUPED:
                teams = createGroupedTeams(players);
                break;
            default:
                teams = createBalancedTeams(players);
        }
        
        return teams;
        
    } catch (error) {
        console.error('팀 짜기 오류:', error);
        throw error;
    }
}

// 플레이어 정보 수집
async function collectPlayerInfo(reservations) {
    const players = [];
    
    for (const reservation of reservations) {
        try {
            // 사용자 정보 가져오기
            const userDoc = await db.collection('users').doc(reservation.userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            // 내부 랭킹 가져오기
            const internalRating = await getUserInternalRating(reservation.userId);
            
            const player = new Player(
                reservation.userId,
                reservation.userName,
                reservation.userDupr || userData.dupr,
                internalRating ? internalRating.internalRating : 1000
            );
            
            players.push(player);
            
        } catch (error) {
            console.error(`플레이어 정보 수집 오류 (${reservation.userId}):`, error);
        }
    }
    
    return players;
}

// 1. 랜덤 모드 팀 짜기
function createRandomTeams(players) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const teams = [];
    
    for (let i = 0; i < shuffled.length; i += 4) {
        const teamPlayers = shuffled.slice(i, i + 4);
        if (teamPlayers.length === 4) {
            teams.push(new Team(teamPlayers));
        }
    }
    
    return teams;
}

// 2. 밸런스 모드 팀 짜기 (균형 맞추기)
function createBalancedTeams(players) {
    // 플레이어를 점수 순으로 정렬
    const sortedPlayers = [...players].sort((a, b) => b.combinedScore - a.combinedScore);
    
    const teams = [];
    const teamCount = Math.floor(sortedPlayers.length / 4);
    
    // 팀 초기화
    for (let i = 0; i < teamCount; i++) {
        teams.push(new Team());
    }
    
    // 스네이크 드래프트 방식으로 팀 배정
    for (let round = 0; round < 4; round++) {
        for (let i = 0; i < teamCount; i++) {
            const playerIndex = round * teamCount + i;
            if (playerIndex < sortedPlayers.length) {
                // 짝수 라운드는 순방향, 홀수 라운드는 역방향
                const teamIndex = round % 2 === 0 ? i : teamCount - 1 - i;
                teams[teamIndex].addPlayer(sortedPlayers[playerIndex]);
            }
        }
    }
    
    return teams;
}

// 3. 그룹별 모드 팀 짜기 (상위/하위 그룹)
function createGroupedTeams(players) {
    // 플레이어를 점수 순으로 정렬
    const sortedPlayers = [...players].sort((a, b) => b.combinedScore - a.combinedScore);
    
    const teams = [];
    const totalPlayers = sortedPlayers.length;
    const teamCount = Math.floor(totalPlayers / 4);
    
    // 상위 그룹과 하위 그룹으로 나누기
    const midPoint = Math.floor(totalPlayers / 2);
    const upperGroup = sortedPlayers.slice(0, midPoint);
    const lowerGroup = sortedPlayers.slice(midPoint);
    
    // 각 그룹 내에서 팀 짜기
    const upperTeams = createTeamsFromGroup(upperGroup, Math.ceil(teamCount / 2));
    const lowerTeams = createTeamsFromGroup(lowerGroup, Math.floor(teamCount / 2));
    
    // 팀들을 합치기
    teams.push(...upperTeams, ...lowerTeams);
    
    return teams;
}

// 그룹 내에서 팀 생성
function createTeamsFromGroup(players, teamCount) {
    const teams = [];
    
    // 팀 초기화
    for (let i = 0; i < teamCount; i++) {
        teams.push(new Team());
    }
    
    // 스네이크 드래프트 방식으로 팀 배정
    for (let round = 0; round < Math.ceil(players.length / teamCount); round++) {
        for (let i = 0; i < teamCount; i++) {
            const playerIndex = round * teamCount + i;
            if (playerIndex < players.length) {
                // 짝수 라운드는 순방향, 홀수 라운드는 역방향
                const teamIndex = round % 2 === 0 ? i : teamCount - 1 - i;
                teams[teamIndex].addPlayer(players[playerIndex]);
            }
        }
    }
    
    return teams.filter(team => team.players.length > 0);
}

// 팀 밸런스 점수 계산
function calculateTeamBalance(teams) {
    if (teams.length < 2) return 0;
    
    const averages = teams.map(team => team.averageScore);
    const maxAvg = Math.max(...averages);
    const minAvg = Math.min(...averages);
    
    // 밸런스 점수 (낮을수록 균형이 좋음)
    return maxAvg - minAvg;
}

// 팀 짜기 결과 검증
function validateTeamCreation(teams, originalPlayerCount) {
    const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
    
    if (totalPlayers !== originalPlayerCount) {
        throw new Error('팀 생성 후 플레이어 수가 일치하지 않습니다.');
    }
    
    // 모든 팀이 4명인지 확인
    const invalidTeams = teams.filter(team => team.players.length !== 4);
    if (invalidTeams.length > 0) {
        console.warn(`${invalidTeams.length}개 팀이 4명이 아닙니다.`);
    }
    
    return true;
}

// 최적 팀 조합 찾기 (밸런스 모드 개선)
function findOptimalTeams(players, maxIterations = 100) {
    let bestTeams = null;
    let bestBalance = Infinity;
    
    for (let i = 0; i < maxIterations; i++) {
        const teams = createBalancedTeams(players);
        const balance = calculateTeamBalance(teams);
        
        if (balance < bestBalance) {
            bestBalance = balance;
            bestTeams = teams;
        }
    }
    
    return bestTeams || createBalancedTeams(players);
}

// 팀 배정 결과 저장
async function saveTeamAssignments(date, timeSlot, teams, mode) {
    try {
        const batch = db.batch();
        
        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            const teamId = `${date}_${timeSlot}_team_${i + 1}`;
            
            // 팀 정보 저장
            const teamData = {
                teamId: teamId,
                date: date,
                timeSlot: timeSlot,
                courtNumber: i + 1,
                gameNumber: 1, // 첫 번째 게임
                players: team.players.map(player => ({
                    userId: player.userId,
                    userName: player.userName,
                    dupr: player.dupr,
                    internalRating: player.internalRating,
                    combinedScore: player.combinedScore
                })),
                averageScore: team.averageScore,
                totalScore: team.totalScore,
                mode: mode,
                createdAt: new Date(),
                status: 'active'
            };
            
            const teamRef = db.collection('teams').doc(teamId);
            batch.set(teamRef, teamData);
            
            // 각 플레이어의 예약 상태를 'confirmed'로 업데이트
            for (const player of team.players) {
                const reservationQuery = await db.collection('reservations')
                    .where('userId', '==', player.userId)
                    .where('date', '==', date)
                    .where('timeSlot', '==', timeSlot)
                    .where('status', '==', 'pending')
                    .get();
                
                reservationQuery.forEach(doc => {
                    batch.update(doc.ref, {
                        status: 'confirmed',
                        teamId: teamId,
                        gameNumber: 1,
                        assignedAt: new Date()
                    });
                });
            }
        }
        
        await batch.commit();
        console.log('팀 배정 결과 저장 완료:', teams.length, '개 팀');
        
    } catch (error) {
        console.error('팀 배정 결과 저장 오류:', error);
        throw error;
    }
}

// 팀 배정 결과 가져오기
async function getTeamAssignments(date, timeSlot) {
    try {
        const teamsSnapshot = await db.collection('teams')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .orderBy('courtNumber')
            .get();
        
        const teams = [];
        teamsSnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });
        
        return teams;
        
    } catch (error) {
        console.error('팀 배정 결과 가져오기 오류:', error);
        return [];
    }
}

// 팀 배정 UI 생성
function createTeamAssignmentUI(teams) {
    const container = document.createElement('div');
    container.className = 'team-assignments';
    
    teams.forEach((team, index) => {
        const teamElement = document.createElement('div');
        teamElement.className = 'team-card';
        teamElement.innerHTML = `
            <div class="team-header">
                <h3>코트 ${team.courtNumber}</h3>
                <div class="team-stats">
                    <span class="team-score">평균 점수: ${team.averageScore.toFixed(1)}</span>
                </div>
            </div>
            <div class="team-players">
                ${team.players.map(player => `
                    <div class="player-card">
                        <div class="player-name">${player.userName}</div>
                        <div class="player-scores">
                            <span class="dupr">DUPR: ${player.dupr || 'N/A'}</span>
                            <span class="internal">내부: ${player.internalRating}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(teamElement);
    });
    
    return container;
}

// 팀 배정 모드 선택 UI
function createTeamModeSelector() {
    const container = document.createElement('div');
    container.className = 'team-mode-selector';
    container.innerHTML = `
        <h3>팀 짜기 모드 선택</h3>
        <div class="mode-options">
            <label class="mode-option">
                <input type="radio" name="teamMode" value="random" checked>
                <div class="mode-card">
                    <i class="fas fa-random"></i>
                    <h4>랜덤 모드</h4>
                    <p>완전 무작위로 팀을 구성합니다</p>
                </div>
            </label>
            <label class="mode-option">
                <input type="radio" name="teamMode" value="balanced">
                <div class="mode-card">
                    <i class="fas fa-balance-scale"></i>
                    <h4>밸런스 모드</h4>
                    <p>DUPR과 내부 랭킹을 고려하여 균형을 맞춥니다</p>
                </div>
            </label>
            <label class="mode-option">
                <input type="radio" name="teamMode" value="grouped">
                <div class="mode-card">
                    <i class="fas fa-layer-group"></i>
                    <h4>그룹별 모드</h4>
                    <p>상위/하위 그룹으로 나누어 팀을 구성합니다</p>
                </div>
            </label>
        </div>
    `;
    
    return container;
}

// 예약 마감 및 자동 팀 배정 시스템

// 마감 시간 확인 및 자동 팀 배정
async function checkAndProcessReservations() {
    try {
        const settings = await getSystemSettings();
        if (!settings) return;
        
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM 형식
        const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD 형식
        
        // 오늘의 모든 시간 슬롯 확인
        for (const timeSlot of settings.timeSlots) {
            const slotStart = timeSlot.start;
            const slotEnd = timeSlot.end;
            
            // 마감 시간 계산 (게임 시작 1시간 전)
            const gameStartTime = new Date(`${currentDate}T${slotStart}:00`);
            const closingTime = new Date(gameStartTime.getTime() - (settings.closingTime * 60 * 1000));
            
            // 현재 시간이 마감 시간을 지났는지 확인
            if (now >= closingTime) {
                await processTimeSlotReservations(currentDate, `${slotStart}-${slotEnd}`);
            }
        }
        
    } catch (error) {
        console.error('예약 처리 오류:', error);
    }
}

// 특정 시간 슬롯의 예약 처리
async function processTimeSlotReservations(date, timeSlot) {
    try {
        // 이미 처리된 시간 슬롯인지 확인
        const processedKey = `processed_${date}_${timeSlot}`;
        const isProcessed = localStorage.getItem(processedKey);
        
        if (isProcessed) {
            console.log(`이미 처리된 시간 슬롯: ${date} ${timeSlot}`);
            return;
        }
        
        // 해당 시간 슬롯의 예약 가져오기
        const reservationsSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', '==', 'pending')
            .get();
        
        if (reservationsSnapshot.empty) {
            console.log(`처리할 예약이 없음: ${date} ${timeSlot}`);
            localStorage.setItem(processedKey, 'true');
            return;
        }
        
        const reservations = [];
        reservationsSnapshot.forEach(doc => {
            reservations.push({ id: doc.id, ...doc.data() });
        });
        
        // 최소 4명 이상인지 확인
        if (reservations.length < 4) {
            console.log(`예약자 수 부족 (${reservations.length}명): ${date} ${timeSlot}`);
            
            // 예약 취소 처리
            await cancelInsufficientReservations(reservations, date, timeSlot);
            localStorage.setItem(processedKey, 'true');
            return;
        }
        
        // 기본 팀 짜기 모드 (밸런스 모드)
        const teams = await createTeams(reservations, TEAM_MODE.BALANCED);
        
        // 팀 배정 결과 저장
        await saveTeamAssignments(date, timeSlot, teams, TEAM_MODE.BALANCED);
        
        // 처리 완료 표시
        localStorage.setItem(processedKey, 'true');
        
        // 알림 전송
        await sendTeamAssignmentNotifications(reservations, teams, date, timeSlot);
        
        console.log(`팀 배정 완료: ${date} ${timeSlot} - ${teams.length}개 팀`);
        
    } catch (error) {
        console.error(`시간 슬롯 처리 오류 (${date} ${timeSlot}):`, error);
    }
}

// 예약자 수 부족 시 취소 처리
async function cancelInsufficientReservations(reservations, date, timeSlot) {
    try {
        const batch = db.batch();
        
        for (const reservation of reservations) {
            const reservationRef = db.collection('reservations').doc(reservation.id);
            batch.update(reservationRef, {
                status: 'cancelled',
                cancellationReason: 'insufficient_players',
                cancelledAt: new Date()
            });
        }
        
        await batch.commit();
        
        // 취소 알림 전송
        for (const reservation of reservations) {
            await sendCancellationNotification(reservation, date, timeSlot);
        }
        
        console.log(`예약 취소 완료: ${reservations.length}건`);
        
    } catch (error) {
        console.error('예약 취소 처리 오류:', error);
    }
}

// 팀 배정 알림 전송
async function sendTeamAssignmentNotifications(reservations, teams, date, timeSlot) {
    try {
        // 각 플레이어에게 팀 배정 결과 알림
        for (const team of teams) {
            for (const player of team.players) {
                const playerReservation = reservations.find(r => r.userId === player.userId);
                if (playerReservation) {
                    await sendTeamAssignmentNotification(player, team, date, timeSlot);
                }
            }
        }
        
    } catch (error) {
        console.error('팀 배정 알림 전송 오류:', error);
    }
}

// 개별 팀 배정 알림 전송
async function sendTeamAssignmentNotification(player, team, date, timeSlot) {
    try {
        // 알림 데이터 저장
        const notificationData = {
            userId: player.userId,
            type: 'team_assignment',
            title: '팀 배정 완료!',
            message: `${date} ${timeSlot} 게임의 팀이 배정되었습니다. 코트 ${team.courtNumber}에 배정되었습니다.`,
            data: {
                date: date,
                timeSlot: timeSlot,
                teamId: team.teamId,
                courtNumber: team.courtNumber,
                teammates: team.players.map(p => p.userName)
            },
            createdAt: new Date(),
            read: false
        };
        
        await db.collection('notifications').add(notificationData);
        
        // 토스트 알림 (현재 사용자가 해당 플레이어인 경우)
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === player.userId) {
            showToast(`팀 배정 완료! 코트 ${team.courtNumber}에 배정되었습니다.`, 'success');
        }
        
    } catch (error) {
        console.error('개별 팀 배정 알림 전송 오류:', error);
    }
}

// 취소 알림 전송
async function sendCancellationNotification(reservation, date, timeSlot) {
    try {
        const notificationData = {
            userId: reservation.userId,
            type: 'reservation_cancelled',
            title: '예약 취소',
            message: `${date} ${timeSlot} 예약이 취소되었습니다. (예약자 수 부족)`,
            data: {
                date: date,
                timeSlot: timeSlot,
                reason: 'insufficient_players'
            },
            createdAt: new Date(),
            read: false
        };
        
        await db.collection('notifications').add(notificationData);
        
        // 토스트 알림 (현재 사용자인 경우)
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === reservation.userId) {
            showToast('예약이 취소되었습니다. (예약자 수 부족)', 'warning');
        }
        
    } catch (error) {
        console.error('취소 알림 전송 오류:', error);
    }
}

// 수동 팀 배정 (관리자용)
async function manualTeamAssignment(date, timeSlot, mode = TEAM_MODE.BALANCED) {
    try {
        showLoading();
        
        // 해당 시간 슬롯의 예약 가져오기
        const reservationsSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        
        if (reservationsSnapshot.empty) {
            showToast('처리할 예약이 없습니다.', 'warning');
            return;
        }
        
        const reservations = [];
        reservationsSnapshot.forEach(doc => {
            reservations.push({ id: doc.id, ...doc.data() });
        });
        
        if (reservations.length < 4) {
            showToast('최소 4명의 플레이어가 필요합니다.', 'error');
            return;
        }
        
        // 팀 생성
        const teams = await createTeams(reservations, mode);
        
        // 팀 배정 결과 저장
        await saveTeamAssignments(date, timeSlot, teams, mode);
        
        // 알림 전송
        await sendTeamAssignmentNotifications(reservations, teams, date, timeSlot);
        
        showToast(`팀 배정이 완료되었습니다! (${teams.length}개 팀)`, 'success');
        
        return teams;
        
    } catch (error) {
        console.error('수동 팀 배정 오류:', error);
        showToast('팀 배정 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 예약 상태 확인 및 업데이트 (자동 취소 제거)
async function updateReservationStatus() {
    // 자동 취소 기능 제거 - 예약은 수동으로만 취소 가능
    console.log('예약 상태 확인 완료 (자동 취소 비활성화)');
}

// DOM 로드 시 즉시 예약 현황 로딩
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM 로드 완료 - 예약 현황 로드 시작');
    
    // Firebase 초기화 확인
    if (!initializeFirebase()) {
        console.error('Firebase 초기화 실패 - 2초 후 재시도');
        setTimeout(() => {
            if (initializeFirebase()) {
                loadReservationsTimeline();
            } else {
                console.error('Firebase 초기화 재시도 실패');
            }
        }, 2000);
        return;
    }
    
    if (!window.currentDate) window.currentDate = new Date().toISOString().slice(0, 10);
    
    // 모달 확인 버튼 이벤트 리스너 설정
    const confirmBtn = document.getElementById('confirm-match-schedule-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const date = window.matchScheduleModalDate;
            const timeSlot = window.matchScheduleModalTimeSlot;
            const selectedMode = document.querySelector('input[name="teamMode"]:checked')?.value || 'random';
            
            if (!date || !timeSlot) {
                showToast('날짜와 시간대 정보가 없습니다.', 'error');
                return;
            }
            
            closeMatchScheduleOptionsModal();
            
            try {
                showLoading();
                await generateMatchSchedule(date, timeSlot, selectedMode);
                
                // 타임라인 새로고침
                await loadReservationsTimeline();
                
                // 현재 대진표 탭이 활성화되어 있으면 새로고침
                const matchesTab = document.getElementById('matches-tab');
                if (matchesTab && matchesTab.classList.contains('active')) {
                    const currentDate = window.currentDate || new Date().toISOString().slice(0, 10);
                    await loadMatchesForDate(currentDate);
                }
            } catch (error) {
                console.error('대진표 생성 오류:', error);
                showToast('대진표 생성 중 오류', 'error');
            } finally {
                hideLoading();
            }
        });
    }
    
    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('match-schedule-options-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeMatchScheduleOptionsModal();
            }
        });
    }
    
    // 모바일에서 여러 번 재시도 (더 강화된 재시도 로직)
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryLoadReservations = async () => {
        try {
            console.log(`=== 재시도 ${retryCount + 1}/${maxRetries} ===`);
            console.log('네트워크 상태:', navigator.onLine ? '온라인' : '오프라인');
            console.log('Firebase 상태:', typeof firebase !== 'undefined' ? '로드됨' : '로드 안됨');
            console.log('DB 상태:', db ? '초기화됨' : '초기화 안됨');
            console.log('Auth 상태:', auth ? '초기화됨' : '초기화 안됨');
            
            // 네트워크 상태 확인
            if (!navigator.onLine) {
                throw new Error('인터넷 연결을 확인해주세요');
            }
            
            // Firebase 연결 상태 확인
            if (!db) {
                // Firebase 재초기화 시도
                if (!initializeFirebase()) {
                    throw new Error('Firebase 데이터베이스가 초기화되지 않았습니다');
                }
            }
            
            await loadReservationsTimeline();
            console.log(`✅ 예약 현황 로드 성공 (시도 ${retryCount + 1})`);
        } catch (error) {
            console.error(`❌ 예약 현황 로드 실패 (시도 ${retryCount + 1}):`, error);
            console.error('오류 상세:', error.message);
            console.error('오류 스택:', error.stack);
            retryCount++;
            
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 지수 백오프, 최대 5초
                console.log(`⏳ ${delay}ms 후 재시도...`);
                setTimeout(tryLoadReservations, delay);
            } else {
                console.error('❌ 최대 재시도 횟수 초과');
                // 사용자에게 수동 새로고침 안내
                if (!navigator.onLine) {
                    showToast('인터넷 연결을 확인하고 새로고침 버튼을 눌러주세요.', 'error');
                } else {
                    showToast('데이터 로드에 실패했습니다. 새로고침 버튼을 눌러주세요.', 'error');
                }
            }
        }
    };
    
    // 약간의 지연 후 시작 (모바일에서 DOM이 완전히 준비될 때까지)
    setTimeout(tryLoadReservations, 100);
});

// 네트워크 상태 변화 감지
window.addEventListener('online', () => {
    console.log('네트워크 연결됨 - 예약 현황 재로드');
    showToast('인터넷 연결이 복구되었습니다.', 'success');
    loadReservationsTimeline();
});

window.addEventListener('offline', () => {
    console.log('네트워크 연결 끊김');
    showToast('인터넷 연결이 끊어졌습니다.', 'warning');
});

// 자동 갱신 제거 - 새로고침 버튼으로만 갱신

// 페이지 로드 시 애니메이션
window.addEventListener('load', function() {
    const elements = document.querySelectorAll('.reservation-card');
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('fade-in');
        }, index * 100);
    });
    
    // 시간 슬롯과 코트 옵션 로드
    loadTimeSlots();
    loadCourtOptions();
    
    // 자동 예약 처리 시작
    startAutoProcessing();
});

// 모바일 확대/축소 방지
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
});

document.addEventListener('gestureend', function (e) {
    e.preventDefault();
});

// 더블탭 줌 방지
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// 멀티터치 핀치줌 방지 (iOS)
document.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Ctrl+Wheel 줌 방지 (Desktop/Android Chrome)
document.addEventListener('wheel', function (e) {
    if (e.ctrlKey) e.preventDefault();
}, { passive: false });

// 자동 예약 처리 시작 (수동 갱신으로 변경)
function startAutoProcessing() {
    // 페이지 로드 시 즉시 한 번 실행
    checkAndProcessReservations();
    updateReservationStatus();
    
    console.log('수동 갱신 모드로 설정되었습니다. 새로고침 버튼을 사용하세요.');
}

// 관리자용 팀 배정 관리 함수들

// 배정 시간 옵션 로드
async function loadAssignmentTimeOptions() {
    try {
        const settings = await getSystemSettings();
        if (!settings) return;
        
        const assignmentTime = document.getElementById('assignment-time');
        if (!assignmentTime) return;
        
        // 기존 옵션 제거 (첫 번째 옵션 제외)
        assignmentTime.innerHTML = '<option value="">시간을 선택하세요</option>';
        
        // 시간 슬롯 추가
        settings.timeSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = `${slot.start}-${slot.end}`;
            option.textContent = `${slot.start} - ${slot.end}`;
            assignmentTime.appendChild(option);
        });
        
        // 오늘 날짜로 기본 설정
        const assignmentDate = document.getElementById('assignment-date');
        if (assignmentDate) {
            const today = new Date().toISOString().slice(0, 10);
            assignmentDate.value = today;
        }
        
    } catch (error) {
        console.error('배정 시간 옵션 로드 오류:', error);
    }
}


// 예약 마감 확인 (요청: 20분 전 마감)
function isPastClosing(date, timeSlot, closingMinutes = 20) {
    try {
        const [start] = timeSlot.split('-');
        const target = new Date(`${date}T${start}:00`);
        const cutoff = new Date(target.getTime() - closingMinutes * 60000);
        return new Date() >= cutoff;
    } catch (e) {
        return true;
    }
}

// 테스트용 시간대별 버튼 생성 - 제거됨
async function createTestButtons() {
    // 기능 제거됨
    return;
}

// 테스트 버튼 이벤트 리스너 추가
function addTestButtonEventListeners() {
    // 무작위 추가 버튼들
    document.querySelectorAll('.add-random-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const timeSlot = e.target.getAttribute('data-time-slot');
                const date = window.currentDate || new Date().toISOString().slice(0, 10);
                
                await addRandomReservation(date, timeSlot);
                await loadReservationsTimeline();
                await checkAndShowMatchSchedule();
            } catch (error) {
                console.error('무작위 예약자 추가 오류:', error);
                showToast('무작위 예약 추가 중 오류', 'error');
            }
        });
    });
    
    // 대진표 강제 생성 버튼들 (타임라인 버튼 포함)
    document.querySelectorAll('.force-generate-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const timeSlot = e.target.closest('.force-generate-btn').getAttribute('data-time-slot');
                const date = e.target.closest('.force-generate-btn').getAttribute('data-date') || 
                             window.currentDate || new Date().toISOString().slice(0, 10);
                
                if (!timeSlot) {
                    console.error('시간대 정보가 없습니다');
                    return;
                }
                
                // 모달 열기 (옵션 선택)
                openMatchScheduleOptionsModal(date, timeSlot);
                
                // 대진표 표시
                const existingMatches = await db.collection('matches')
                    .where('date', '==', date)
                    .where('timeSlot', '==', timeSlot)
                    .get();
                
                if (!existingMatches.empty) {
                    const matches = existingMatches.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    matches.sort((a, b) => {
                        if (a.roundNumber !== b.roundNumber) {
                            return a.roundNumber - b.roundNumber;
                        }
                        return a.courtNumber - b.courtNumber;
                    });
                    await renderMatchSchedule(matches, date, timeSlot);
                } else {
                    showToast('대진표 생성 후 데이터를 찾을 수 없습니다.', 'warning');
                }
            } catch (error) {
                console.error('강제 대진표 생성 오류:', error);
                showToast('대진표 생성 중 오류', 'error');
            } finally {
                hideLoading();
            }
        });
    });
}

// 대진표 생성 옵션 모달 열기
function openMatchScheduleOptionsModal(date, timeSlot) {
    window.matchScheduleModalDate = date;
    window.matchScheduleModalTimeSlot = timeSlot;
    const modal = document.getElementById('match-schedule-options-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 대진표 생성 옵션 모달 닫기
function closeMatchScheduleOptionsModal() {
    const modal = document.getElementById('match-schedule-options-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.matchScheduleModalDate = null;
    window.matchScheduleModalTimeSlot = null;
}

// 무작위 한국어 이름 생성 (간단 버전)
function generateRandomKoreanName() {
    const lastNames = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권'];
    const first1 = ['도','서','예','지','하','민','준','유','시','아','태','윤','수','해','나'];
    const first2 = ['현','연','원','린','빈','후','율','라','진','솔','우','온','별','원','라'];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fn = first1[Math.floor(Math.random() * first1.length)] + first2[Math.floor(Math.random() * first2.length)];
    return ln + fn;
}

// 테스트용: 무작위 예약 추가 (로그인 필요 없음, 테스트 플래그 포함)
async function addRandomReservation(date, timeSlot) {
    const randomId = 'test_' + Math.random().toString(36).slice(2, 10);
    const name = generateRandomKoreanName();
    const dupr = Number((2 + Math.random() * 6).toFixed(1));
    const reservation = {
        userId: randomId,
        userName: name,
        userDupr: dupr,
        date,
        timeSlot,
        status: 'pending',
        createdAt: new Date(),
        isAdminReservation: true,
        isTestData: true
    };
    try {
        await db.collection('reservations').add(reservation);
        showToast(`무작위 예약자 추가: ${name} (DUPR ${dupr})`, 'success');
    } catch (error) {
        console.error('테스트 예약 추가 오류:', error);
        showToast('테스트 예약 추가 실패', 'error');
    }
}

// 대진표 확인 및 표시
async function checkAndShowMatchSchedule() {
    try {
        const currentDate = window.currentDate || new Date().toISOString().slice(0, 10);
        const selectedTimeSlot = window.selectedTimeSlot;
        
        if (!selectedTimeSlot) return;
        
        // 20분 전 마감 확인 (테스트 모드에서는 무시)
        // 검증: 대진표 생성 버튼을 누르지 않아도, 게임 시작 20분 전에 마감됩니다.
        // 마감 전에는 대진표를 숨기고, 마감 후에만 대진표를 생성/표시할 수 있습니다.
        const isTestMode = document.getElementById('test-time-select')?.value;
        if (!isTestMode && !isPastClosing(currentDate, selectedTimeSlot, 20)) {
            hideMatchSchedule();
            return;
        }
        
        // 기존 대진표 확인 (인덱스 오류 방지를 위해 단순화)
        const existingMatches = await db.collection('matches')
            .where('date', '==', currentDate)
            .where('timeSlot', '==', selectedTimeSlot)
            .get();
        
        if (existingMatches.empty) {
            // 대진표가 없으면 생성
            await generateMatchSchedule(currentDate, selectedTimeSlot);
        } else {
            // 기존 대진표 표시 (클라이언트에서 정렬)
            const matches = existingMatches.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            matches.sort((a, b) => {
                if (a.roundNumber !== b.roundNumber) {
                    return a.roundNumber - b.roundNumber;
                }
                return a.courtNumber - b.courtNumber;
            });
            await renderMatchSchedule(matches, currentDate, selectedTimeSlot);
        }
        
    } catch (error) {
        console.error('대진표 확인 오류:', error);
    }
}

// 스케줄 생성
async function generateMatchSchedule(date, timeSlot, teamMode = 'random') {
    try {
        showLoading();
        // 예약 수집
        const reservationsSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        if (reservationsSnapshot.empty) {
            showToast('해당 시간에 예약된 인원이 없습니다.', 'warning');
            return;
        }
        const reservations = [];
        reservationsSnapshot.forEach(doc => reservations.push({ id: doc.id, ...doc.data() }));
        
        // 플레이어 정보 수집 (DUPR 및 내부 점수 포함)
        const players = [];
        for (const res of reservations) {
            let dupr = res.userDupr || 0;
            let internalRating = 1000; // 기본값
            
            // 내부 점수 조회 시도 (사용자 문서에서)
            try {
                const userDoc = await db.collection('users').doc(res.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    // 점수 시스템에서 점수 가져오기
                    if (userData.score !== undefined) {
                        internalRating = userData.score || 1000;
                    }
                }
            } catch (error) {
                console.warn(`사용자 ${res.userId} 정보 조회 실패:`, error);
            }
            
            players.push({
                userId: res.userId,
                userName: res.userName,
                dupr: dupr,
                internalRating: internalRating
            });
        }
        
        if (players.length < 4) {
            showToast('최소 4명이 필요합니다.', 'error');
            return;
        }
        
        // 예약자 수에 따라 코트 수 동적 결정
        // 4-5명: 1코트, 6-8명: 1코트, 9-12명: 2코트, 13-16명: 2코트, 17-20명: 3코트...
        const playerCount = players.length;
        let courtCount = 1;
        if (playerCount >= 9 && playerCount <= 12) {
            courtCount = 2;
        } else if (playerCount >= 13 && playerCount <= 16) {
            courtCount = 2;
        } else if (playerCount >= 17 && playerCount <= 20) {
            courtCount = 3;
        } else if (playerCount >= 21 && playerCount <= 24) {
            courtCount = 3;
        } else if (playerCount >= 25) {
            courtCount = Math.ceil(playerCount / 8); // 8명당 1코트
        }
        
        // 기존 대진표 확인 및 삭제
        const existingMatches = await db.collection('matches')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .get();
        
        // 기존 대진표 삭제 (같은 날짜, 같은 시간대) - 재생성 전 완전 삭제
        if (!existingMatches.empty) {
            const deleteBatch = db.batch();
            existingMatches.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });
            await deleteBatch.commit();
            console.log('기존 대진표 삭제 완료:', existingMatches.size, '개');
        }
        
        const settings = await getSystemSettings();
        const rounds = Math.max(1, settings?.gamesPerHour || 4); // 4경기 (15분 단위)

        // teamMode에 따라 대진표 생성
        const schedule = buildMatchSchedule(players, courtCount, rounds, {}, teamMode);
        
        console.log(`대진표 생성: ${playerCount}명, ${courtCount}코트, ${schedule.length}경기`);

        // 시간대 시작 시간 파싱
        const [startHour, startMin] = timeSlot.split('-')[0].split(':').map(Number);
        
        const batch = db.batch();
        schedule.forEach(match => {
            const matchId = `${date}_${timeSlot}_R${match.round}_C${match.court}`;
            const ref = db.collection('matches').doc(matchId);
            
            // 각 경기의 시간 계산 (15분 단위로 증가)
            const minutesPerGame = 15;
            const gameStartMinutes = (match.round - 1) * minutesPerGame;
            const totalStartMinutes = startHour * 60 + startMin + gameStartMinutes;
            const gameStartHour = Math.floor(totalStartMinutes / 60);
            const gameStartMin = totalStartMinutes % 60;
            const totalEndMinutes = totalStartMinutes + minutesPerGame;
            const gameEndHour = Math.floor(totalEndMinutes / 60);
            const gameEndMin = totalEndMinutes % 60;
            
            const gameStartTime = `${String(gameStartHour).padStart(2, '0')}:${String(gameStartMin).padStart(2, '0')}`;
            const gameEndTime = `${String(gameEndHour).padStart(2, '0')}:${String(gameEndMin).padStart(2, '0')}`;
            
            batch.set(ref, {
                matchId,
                date,
                timeSlot,
                roundNumber: match.round,
                courtNumber: match.court,
                teamA: match.teamA,
                teamB: match.teamB,
                scoreA: null,
                scoreB: null,
                status: 'scheduled',
                gameStartTime, // 게임 시작 시간
                gameEndTime,   // 게임 종료 시간
                createdAt: new Date()
            });
        });
        await batch.commit();
        
        showToast('대진표가 재생성되었습니다.', 'success');
    } catch (error) {
        console.error('스케줄 생성 오류:', error);
        showToast('스케줄 생성 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 4명 내 조합 패턴 (4라운드)
const pairingPatterns = [
    [0,1,2,3], // 1,2 vs 3,4
    [0,2,1,3], // 1,3 vs 2,4
    [0,3,1,2], // 1,4 vs 2,3
    [1,2,0,3]  // 2,3 vs 1,4 (변형)
];

// 매치 스케줄 빌드 (간단 로테이션, 동적 코트 지원, 코트 배정 유지)
function buildMatchSchedule(players, courtCount, rounds, playerCourtMap = {}, teamMode = 'random') {
    // Player 객체로 변환
    const playerObjects = players.map(p => new Player(
        p.userId,
        p.userName,
        p.dupr || 0,
        p.internalRating || 1000
    ));
    
    // 플레이어를 코트별로 분류
    const courtPlayers = {};
    const unassignedPlayers = [];
    
    // 이미 배정된 플레이어는 해당 코트로 배정
    playerObjects.forEach(player => {
        const assignedCourt = playerCourtMap[player.userId];
        if (assignedCourt && assignedCourt <= courtCount) {
            if (!courtPlayers[assignedCourt]) {
                courtPlayers[assignedCourt] = [];
            }
            courtPlayers[assignedCourt].push(player);
        } else {
            unassignedPlayers.push(player);
        }
    });
    
    // teamMode에 따라 미배정 플레이어를 코트별로 분배
    if (teamMode === 'grouped') {
        // 그룹 모드: 잘하는 사람과 못하는 사람을 코트별로 분배
        const sortedPlayers = [...unassignedPlayers].sort((a, b) => b.combinedScore - a.combinedScore);
        const midPoint = Math.floor(sortedPlayers.length / 2);
        
        // 상위 그룹을 1코트부터, 하위 그룹을 마지막 코트부터 배정
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            let court;
            if (i < midPoint) {
                // 잘하는 사람 - 1코트부터 배정
                court = (i % Math.min(courtCount, Math.ceil(sortedPlayers.length / 2))) + 1;
            } else {
                // 못하는 사람 - 마지막 코트부터 배정
                const lowerIndex = i - midPoint;
                court = courtCount - (lowerIndex % Math.min(courtCount, Math.ceil(sortedPlayers.length / 2)));
                if (court < 1) court = 1;
            }
            
            if (!courtPlayers[court]) {
                courtPlayers[court] = [];
            }
            courtPlayers[court].push(player);
        }
    } else if (teamMode === 'balanced') {
        // 밸런스 모드: 점수 순으로 정렬하여 균등 분배
        const sortedPlayers = [...unassignedPlayers].sort((a, b) => b.combinedScore - a.combinedScore);
        sortedPlayers.forEach((player, index) => {
            // 스네이크 드래프트 방식으로 분배
            const row = Math.floor(index / courtCount);
            const col = row % 2 === 0 ? (index % courtCount) : (courtCount - 1 - (index % courtCount));
            const court = col + 1;
            
            if (!courtPlayers[court]) {
                courtPlayers[court] = [];
            }
            courtPlayers[court].push(player);
        });
    } else {
        // 랜덤 모드: 무작위로 균등 분배
        const shuffled = [...unassignedPlayers].sort(() => Math.random() - 0.5);
        shuffled.forEach((player, index) => {
            const court = (index % courtCount) + 1;
            if (!courtPlayers[court]) {
                courtPlayers[court] = [];
            }
            courtPlayers[court].push(player);
        });
    }
    
    const schedule = [];
    
    // 각 코트별로 라운드별 경기 생성
    for (let c = 1; c <= courtCount; c++) {
        const courtPlayerList = [...(courtPlayers[c] || [])];
        
        if (courtPlayerList.length < 4) {
            // 이 코트에 4명 미만이면 스킵
            continue;
        }
        
        // teamMode에 따라 코트별 팀 구성
        let teams = [];
        if (teamMode === 'balanced') {
            // 밸런스 모드: 잘하는 사람과 못하는 사람을 같은 편에 배치
            const sortedPlayers = [...courtPlayerList].sort((a, b) => b.combinedScore - a.combinedScore);
            // 스네이크 드래프트로 팀 구성
            for (let i = 0; i < sortedPlayers.length; i += 4) {
                const fourPlayers = sortedPlayers.slice(i, i + 4);
                if (fourPlayers.length === 4) {
                    teams.push([fourPlayers[0], fourPlayers[3], fourPlayers[1], fourPlayers[2]]);
                }
            }
        } else if (teamMode === 'grouped') {
            // 그룹 모드: 각 코트 내에서 랜덤
            const shuffled = [...courtPlayerList].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffled.length; i += 4) {
                const fourPlayers = shuffled.slice(i, i + 4);
                if (fourPlayers.length === 4) {
                    teams.push(fourPlayers);
                }
            }
        } else {
            // 랜덤 모드: 무작위 섞기
            const shuffled = [...courtPlayerList].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffled.length; i += 4) {
                const fourPlayers = shuffled.slice(i, i + 4);
                if (fourPlayers.length === 4) {
                    teams.push(fourPlayers);
                }
            }
        }
        
        // 각 팀에서 라운드별 경기 생성
        for (let r = 1; r <= rounds; r++) {
            const teamIndex = (r - 1) % teams.length;
            if (teamIndex >= teams.length) continue;
            const fourPlayers = teams[teamIndex];
            
            const p = pairingPatterns[(r - 1) % pairingPatterns.length];
            const teamA = [{ userId: fourPlayers[p[0]].userId, userName: fourPlayers[p[0]].userName },
                          { userId: fourPlayers[p[1]].userId, userName: fourPlayers[p[1]].userName }];
            const teamB = [{ userId: fourPlayers[p[2]].userId, userName: fourPlayers[p[2]].userName },
                          { userId: fourPlayers[p[3]].userId, userName: fourPlayers[p[3]].userName }];
            schedule.push({ round: r, court: c, teamA, teamB });
        }
    }
    
    return schedule;
}

// 대진표 렌더링
async function renderMatchSchedule(matches, date, timeSlot) {
    try {
        // 타임라인 항목 내부의 대진표 영역 찾기
        const safeSlotKey = timeSlot.replace(/:/g, '-');
        const matchScheduleDiv = document.getElementById(`match-schedule-${date}-${safeSlotKey}`);
        
        // 기존 별도 섹션도 확인 (하위 호환성)
        const scheduleSection = document.getElementById('match-schedule-section');
        const scheduleContainer = matchScheduleDiv || document.getElementById('match-schedule');
        
        if (!scheduleContainer) {
            console.warn('대진표 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        if (matches.length === 0) {
            scheduleContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>대진표가 없습니다.</p>
                </div>
            `;
            if (matchScheduleDiv) {
                matchScheduleDiv.style.display = 'block';
            } else if (scheduleSection) {
                scheduleSection.style.display = 'block';
            }
            return;
        }
        
        // 라운드별로 그룹화
        const rounds = {};
        matches.forEach(match => {
            if (!rounds[match.roundNumber]) {
                rounds[match.roundNumber] = [];
            }
            rounds[match.roundNumber].push(match);
        });
        
        scheduleContainer.innerHTML = '';
        
        // 각 라운드 렌더링
        Object.keys(rounds).sort((a, b) => a - b).forEach(roundNum => {
            const roundMatches = rounds[roundNum];
            const roundDiv = document.createElement('div');
            roundDiv.className = 'match-round';
            
            // 라운드의 첫 번째 매치에서 시간 정보 가져오기
            const firstMatch = roundMatches[0];
            let timeStr = '';
            if (firstMatch.gameStartTime && firstMatch.gameEndTime) {
                timeStr = `${firstMatch.gameStartTime} ~ ${firstMatch.gameEndTime}`;
            } else {
                // 하위 호환성: 계산으로 시간 결정
                const startTime = timeSlot.split('-')[0];
                const roundStartTime = new Date(`2000-01-01T${startTime}:00`);
                roundStartTime.setMinutes(roundStartTime.getMinutes() + (parseInt(roundNum) - 1) * 15);
                const endTime = new Date(roundStartTime);
                endTime.setMinutes(endTime.getMinutes() + 15);
                timeStr = `${roundStartTime.toTimeString().slice(0, 5)} ~ ${endTime.toTimeString().slice(0, 5)}`;
            }
            
            roundDiv.innerHTML = `
                <h3>${timeStr} - ${roundNum}경기 (15분)</h3>
                <div class="round-matches"></div>
            `;
            
            const roundMatchesContainer = roundDiv.querySelector('.round-matches');
            
            roundMatches.forEach(match => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'match-item';
                
                const teamALabel = match.teamA.map(p => p.userName).join(', ');
                const teamBLabel = match.teamB.map(p => p.userName).join(', ');
                const scoreA = match.scoreA ?? '';
                const scoreB = match.scoreB ?? '';
                const isCompleted = match.status === 'completed';
                
                // 안전한 ID 생성 (콜론을 언더스코어로 변경)
                const safeId = match.id.replace(/:/g, '_');
                
                matchDiv.innerHTML = `
                    <div class="match-teams">
                        <div class="team">${teamALabel}</div>
                        <div class="team vs">vs</div>
                        <div class="team">${teamBLabel}</div>
                    </div>
                    <div class="match-score">
                        <input type="number" class="score-input" min="0" id="scoreA-${safeId}" placeholder="0" value="${scoreA}" ${isCompleted ? 'readonly' : ''}>
                        <span class="score-separator">:</span>
                        <input type="number" class="score-input" min="0" id="scoreB-${safeId}" placeholder="0" value="${scoreB}" ${isCompleted ? 'readonly' : ''}>
                        <button class="save-score-btn" id="save-${safeId}" ${isCompleted ? 'disabled' : ''}>
                            ${isCompleted ? '완료' : '저장'}
                        </button>
                        <span class="match-status ${isCompleted ? 'completed' : 'pending'}">
                            ${isCompleted ? '완료' : '대기'}
                        </span>
                    </div>
                `;
                
                roundMatchesContainer.appendChild(matchDiv);
                
                // 저장 버튼 이벤트
                const saveBtn = matchDiv.querySelector(`#save-${safeId}`);
                if (saveBtn && !isCompleted) {
                    saveBtn.addEventListener('click', async () => {
                        const scoreA = Number(document.getElementById(`scoreA-${safeId}`).value || 0);
                        const scoreB = Number(document.getElementById(`scoreB-${safeId}`).value || 0);
                        await saveMatchScore(match, scoreA, scoreB);
                    });
                }
            });
            
            scheduleContainer.appendChild(roundDiv);
        });
        
        // 타임라인 항목 내부에 표시
        if (matchScheduleDiv) {
            matchScheduleDiv.style.display = 'block';
        } else if (scheduleSection) {
            scheduleSection.style.display = 'block';
        }
        
    } catch (error) {
        console.error('대진표 렌더링 오류:', error);
        showToast('대진표를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 대진표 숨기기
function hideMatchSchedule() {
    const scheduleSection = document.getElementById('match-schedule-section');
    if (scheduleSection) {
        scheduleSection.style.display = 'none';
    }
}

// 점수 저장 및 결과 기록
async function saveMatchScore(match, scoreA, scoreB) {
    try {
        if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) {
            showToast('점수를 올바르게 입력하세요.', 'error');
            return;
        }
        const db = window.db || firebase.firestore();
        if (!db) {
            showToast('데이터베이스 연결 오류', 'error');
            return;
        }
        const ref = db.collection('matches').doc(match.id);
        await ref.update({ scoreA, scoreB, status: 'completed', recordedAt: new Date() });

        // 승패 판정 및 개인 기록 저장
        const aWins = scoreA > scoreB;
        const winners = aWins ? match.teamA : match.teamB;
        const losers = aWins ? match.teamB : match.teamA;

        // 기존 recordGameResult API 재사용 (teamId는 match 기반 가짜 아이디)
        await recordGameResult(`${match.id}_A`, {
            date: match.date,
            timeSlot: match.timeSlot,
            courtNumber: match.courtNumber || match.court || 1,
            gameNumber: match.roundNumber || match.round || 1,
            winners: winners.map(p => p.userId),
            losers: losers.map(p => p.userId),
            score: `${scoreA}-${scoreB}`,
            players: [...match.teamA, ...match.teamB].map(p => p.userId)
        });

        showToast('점수가 저장되었습니다.', 'success');
        
        // 대진표 다시 렌더링
        await checkAndShowMatchSchedule();
        
    } catch (error) {
        console.error('점수 저장 오류:', error);
        showToast('점수 저장 중 오류가 발생했습니다.', 'error');
    }
}

// 팀 배정 결과 보기
async function viewTeamAssignments(date, timeSlot) {
    try {
        showLoading();
        
        const teams = await getTeamAssignments(date, timeSlot);
        
        if (teams.length === 0) {
            showToast('해당 시간대에 배정된 팀이 없습니다.', 'info');
            return;
        }
        
        // 팀 배정 결과 모달 표시
        showTeamAssignmentsModal(teams, date, timeSlot);
        
    } catch (error) {
        console.error('팀 배정 결과 보기 오류:', error);
        showToast('팀 배정 결과를 불러올 수 없습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 팀 배정 결과 모달 표시
function showTeamAssignmentsModal(teams, date, timeSlot) {
    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('team-assignments-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 생성
    const modal = document.createElement('div');
    modal.id = 'team-assignments-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const teamAssignmentsUI = createTeamAssignmentUI(teams);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header">
                <h2>팀 배정 결과 - ${date} ${timeSlot}</h2>
                <span class="close" id="close-team-assignments">&times;</span>
            </div>
            <div class="modal-body">
                ${teamAssignmentsUI.outerHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 닫기 버튼 이벤트
    const closeBtn = document.getElementById('close-team-assignments');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });
    }
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    });
}

// 예약 현황 대시보드 (관리자용)
async function getReservationDashboard(date) {
    try {
        const settings = await getSystemSettings();
        if (!settings) return null;
        
        const dashboard = {
            date: date,
            timeSlots: [],
            totalReservations: 0,
            totalPlayers: 0,
            assignedTeams: 0
        };
        
        for (const timeSlot of settings.timeSlots) {
            const slotKey = `${timeSlot.start}-${timeSlot.end}`;
            
            // 예약 수 확인
            const reservationsSnapshot = await db.collection('reservations')
                .where('date', '==', date)
                .where('timeSlot', '==', slotKey)
                .where('status', 'in', ['pending', 'confirmed'])
                .get();
            
            // 팀 배정 수 확인
            const teamsSnapshot = await db.collection('teams')
                .where('date', '==', date)
                .where('timeSlot', '==', slotKey)
                .get();
            
            const slotData = {
                timeSlot: slotKey,
                reservations: reservationsSnapshot.size,
                players: reservationsSnapshot.size,
                teams: teamsSnapshot.size,
                status: reservationsSnapshot.size >= 4 ? 'ready' : 'insufficient'
            };
            
            dashboard.timeSlots.push(slotData);
            dashboard.totalReservations += slotData.reservations;
            dashboard.totalPlayers += slotData.players;
            dashboard.assignedTeams += slotData.teams;
        }
        
        return dashboard;
        
    } catch (error) {
        console.error('예약 현황 대시보드 오류:', error);
        return null;
    }
}

// 알림 시스템 함수들

// 알림 모달 열기
async function openNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 알림 로드
        await loadNotifications();
    }
}

// 알림 모달 닫기
function closeNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 알림 로드
async function loadNotifications() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        const notificationsList = document.getElementById('notifications-list');
        if (!notificationsList) return;
        
        notificationsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>알림을 불러오는 중...</p></div>';
        
        // 사용자 알림 가져오기
        const notificationsSnapshot = await db.collection('notifications')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        if (notificationsSnapshot.empty) {
            notificationsList.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>알림이 없습니다</p></div>';
            return;
        }
        
        const notifications = [];
        notificationsSnapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        // 알림 UI 생성
        notificationsList.innerHTML = '';
        notifications.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });
        
        // 알림 카운트 업데이트
        updateNotificationCount(notifications.filter(n => !n.read).length);
        
    } catch (error) {
        console.error('알림 로드 오류:', error);
        const notificationsList = document.getElementById('notifications-list');
        if (notificationsList) {
            notificationsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>알림을 불러올 수 없습니다</p></div>';
        }
    }
}

// 알림 요소 생성
function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.read ? '' : 'unread'}`;
    
    const iconClass = getNotificationIcon(notification.type);
    const timeAgo = getTimeAgo(notification.createdAt.toDate());
    
    div.innerHTML = `
        <div class="notification-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${timeAgo}</div>
        </div>
        <div class="notification-actions">
            ${!notification.read ? '<button onclick="markAsRead(\'' + notification.id + '\')" title="읽음 처리"><i class="fas fa-check"></i></button>' : ''}
            <button onclick="deleteNotification(\'' + notification.id + '\')" title="삭제"><i class="fas fa-trash"></i></button>
        </div>
    `;
    
    return div;
}

// 알림 타입별 아이콘
function getNotificationIcon(type) {
    switch (type) {
        case 'team_assignment':
            return 'fas fa-users';
        case 'reservation_cancelled':
            return 'fas fa-times-circle';
        case 'reservation_confirmed':
            return 'fas fa-check-circle';
        default:
            return 'fas fa-bell';
    }
}

// 시간 경과 표시
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
}

// 알림 읽음 처리
async function markAsRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true,
            readAt: new Date()
        });
        
        // UI 업데이트
        await loadNotifications();
        
    } catch (error) {
        console.error('알림 읽음 처리 오류:', error);
    }
}

// 알림 삭제
async function deleteNotification(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).delete();
        
        // UI 업데이트
        await loadNotifications();
        
    } catch (error) {
        console.error('알림 삭제 오류:', error);
    }
}

// 알림 카운트 업데이트
function updateNotificationCount(count) {
    const badge = document.getElementById('notification-count');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// 대시보드 관련 함수들

// 대시보드 탭 전환
function switchDashboardTab(tabName) {
    // 모든 탭 버튼과 콘텐츠 비활성화
    document.querySelectorAll('.dashboard-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.dashboard-content .tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-dashboard`).classList.add('active');
    
    // 해당 탭 데이터 로드
    if (tabName === 'reservations') {
        loadReservationsDashboard();
    } else if (tabName === 'teams') {
        loadTeamsDashboard();
    }
}

// 예약 현황 대시보드 로드
async function loadReservationsDashboard() {
    try {
        const content = document.getElementById('reservations-dashboard-content');
        if (!content) return;
        
        content.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>데이터를 불러오는 중...</p></div>';
        
        const today = new Date().toISOString().slice(0, 10);
        const dashboard = await getReservationDashboard(today);
        
        if (!dashboard) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>데이터를 불러올 수 없습니다</p></div>';
            return;
        }
        
        // 통계 업데이트
        document.getElementById('today-reservations').textContent = dashboard.totalReservations;
        document.getElementById('today-players').textContent = dashboard.totalPlayers;
        document.getElementById('today-teams').textContent = dashboard.assignedTeams;
        
        // 시간 슬롯별 현황 표시
        content.innerHTML = dashboard.timeSlots.map(slot => `
            <div class="time-slot-card ${slot.status}">
                <div class="time-slot-header">
                    <div class="time-slot-title">${slot.timeSlot}</div>
                    <div class="time-slot-status ${slot.status}">
                        ${slot.status === 'ready' ? '준비완료' : '예약자 부족'}
                    </div>
                </div>
                <div class="time-slot-stats">
                    <div class="time-slot-stat">
                        <div class="time-slot-stat-value">${slot.reservations}</div>
                        <div class="time-slot-stat-label">예약</div>
                    </div>
                    <div class="time-slot-stat">
                        <div class="time-slot-stat-value">${slot.players}</div>
                        <div class="time-slot-stat-label">플레이어</div>
                    </div>
                    <div class="time-slot-stat">
                        <div class="time-slot-stat-value">${slot.teams}</div>
                        <div class="time-slot-stat-label">팀</div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('예약 현황 대시보드 로드 오류:', error);
        const content = document.getElementById('reservations-dashboard-content');
        if (content) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>데이터를 불러올 수 없습니다</p></div>';
        }
    }
}

// 팀 배정 대시보드 로드
async function loadTeamsDashboard() {
    try {
        const content = document.getElementById('teams-dashboard-content');
        if (!content) return;
        
        content.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>데이터를 불러오는 중...</p></div>';
        
        const today = new Date().toISOString().slice(0, 10);
        const settings = await getSystemSettings();
        
        if (!settings) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>설정을 불러올 수 없습니다</p></div>';
            return;
        }
        
        // 오늘의 모든 팀 배정 가져오기
        const teamsSnapshot = await db.collection('teams')
            .where('date', '==', today)
            .orderBy('timeSlot')
            .get();
        
        if (teamsSnapshot.empty) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>오늘 배정된 팀이 없습니다</p></div>';
            return;
        }
        
        const teams = [];
        teamsSnapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });
        
        // 팀 배정 결과 표시
        const teamAssignmentsUI = createTeamAssignmentUI(teams);
        content.innerHTML = teamAssignmentsUI.outerHTML;
        
    } catch (error) {
        console.error('팀 배정 대시보드 로드 오류:', error);
        const content = document.getElementById('teams-dashboard-content');
        if (content) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>데이터를 불러올 수 없습니다</p></div>';
        }
    }
}

// 스크롤 시 네비게이션 스타일 변경 및 랭킹 로드
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(102, 126, 234, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        navbar.style.backdropFilter = 'none';
    }
    
    // 랭킹 섹션이 보이면 랭킹 로드
    const rankingsSection = document.getElementById('rankings');
    if (rankingsSection) {
        const rect = rankingsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            // 랭킹 섹션이 화면에 보이면 전체 랭킹 로드
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'overall') {
                loadOverallRankings();
            }
        }
    }
    
    // 대시보드 섹션이 보이면 대시보드 로드
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection && dashboardSection.style.display !== 'none') {
        const rect = dashboardSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            // 대시보드 섹션이 화면에 보이면 예약 현황 로드
            const activeTab = document.querySelector('.dashboard-tabs .tab-btn.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'reservations') {
                loadReservationsDashboard();
            }
        }
    }
});

// 햄버거 메뉴 애니메이션
if (hamburger) {
    hamburger.addEventListener('click', function() {
        this.classList.toggle('active');
    });
}

// 모바일 메뉴 링크 클릭 시 메뉴 닫기
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
});

// ESC 키로 모달 닫기 (로그인 모달 제외)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (signupModal.style.display === 'block') {
            closeModal('signup');
        }
        if (document.getElementById('dupr-edit-modal').style.display === 'block') {
            closeDuprEditModal();
        }
    }
});

// 폼 유효성 검사
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            input.style.borderColor = '#e9ecef';
        }
    });
    
    return isValid;
}

// 실시간 폼 유효성 검사
document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('blur', function() {
        if (this.hasAttribute('required') && !this.value.trim()) {
            this.style.borderColor = '#dc3545';
        } else {
            this.style.borderColor = '#e9ecef';
        }
    });
    
    input.addEventListener('input', function() {
        if (this.style.borderColor === 'rgb(220, 53, 69)') {
            this.style.borderColor = '#e9ecef';
        }
    });
});

// 관리자 관리 함수들

// 관리자 목록 로드
async function loadAdminList() {
    try {
        const adminList = document.getElementById('admin-list');
        if (!adminList) return;
        
        adminList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>관리자 목록을 불러오는 중...</p></div>';
        
        const adminsSnapshot = await db.collection('admins')
            .orderBy('addedAt', 'desc')
            .get();
        
        if (adminsSnapshot.empty) {
            adminList.innerHTML = '<div class="empty-state"><i class="fas fa-user-shield"></i><p>등록된 관리자가 없습니다</p></div>';
            return;
        }
        
        const admins = [];
        adminsSnapshot.forEach(doc => {
            admins.push({ id: doc.id, ...doc.data() });
        });
        
        adminList.innerHTML = '';
        admins.forEach(admin => {
            const adminElement = createAdminElement(admin);
            adminList.appendChild(adminElement);
        });
        
    } catch (error) {
        console.error('관리자 목록 로드 오류:', error);
        const adminList = document.getElementById('admin-list');
        if (adminList) {
            adminList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>관리자 목록을 불러올 수 없습니다</p></div>';
        }
    }
}

// 관리자 요소 생성
function createAdminElement(admin) {
    const div = document.createElement('div');
    div.className = 'admin-item';
    
    const addedDate = admin.addedAt ? admin.addedAt.toDate().toLocaleDateString() : '알 수 없음';
    const addedBy = admin.addedBy === 'system' ? '시스템' : admin.addedBy;
    
    div.innerHTML = `
        <div class="admin-info">
            <div class="admin-email">${admin.email}</div>
            <div class="admin-meta">추가일: ${addedDate} | 추가자: ${addedBy}</div>
        </div>
        <div class="admin-actions">
            <span class="admin-status ${admin.isAdmin ? 'active' : 'inactive'}">
                ${admin.isAdmin ? '활성' : '비활성'}
            </span>
            <button class="remove-admin-btn" onclick="removeAdmin('${admin.id}', '${admin.email}')">
                <i class="fas fa-trash"></i> 제거
            </button>
        </div>
    `;
    
    return div;
}

// 관리자 추가
async function addAdmin() {
    try {
        const emailInput = document.getElementById('admin-email');
        const email = emailInput.value.trim();
        
        if (!email) {
            showToast('이메일 주소를 입력해주세요.', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showToast('유효한 이메일 주소를 입력해주세요.', 'error');
            return;
        }
        
        // 사용자 ID 찾기 (이메일로)
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();
        
        if (usersSnapshot.empty) {
            showToast('해당 이메일로 가입된 사용자가 없습니다.', 'error');
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        
        // 이미 관리자인지 확인
        const adminDoc = await db.collection('admins').doc(userId).get();
        if (adminDoc.exists) {
            showToast('이미 관리자로 등록된 사용자입니다.', 'warning');
            return;
        }
        
        // 관리자 추가
        const currentUser = auth.currentUser;
        await db.collection('admins').doc(userId).set({
            email: email,
            isAdmin: true,
            addedAt: new Date(),
            addedBy: currentUser ? currentUser.email : 'unknown'
        });
        
        showToast('관리자가 추가되었습니다.', 'success');
        emailInput.value = '';
        
        // 관리자 목록 새로고침
        await loadAdminList();
        
    } catch (error) {
        console.error('관리자 추가 오류:', error);
        showToast('관리자 추가 중 오류가 발생했습니다.', 'error');
    }
}

// 관리자 제거
async function removeAdmin(adminId, email) {
    try {
        if (!confirm(`정말로 ${email}의 관리자 권한을 제거하시겠습니까?`)) {
            return;
        }
        
        await db.collection('admins').doc(adminId).delete();
        
        showToast('관리자 권한이 제거되었습니다.', 'success');
        
        // 관리자 목록 새로고침
        await loadAdminList();
        
    } catch (error) {
        console.error('관리자 제거 오류:', error);
        showToast('관리자 제거 중 오류가 발생했습니다.', 'error');
    }
}

// 이메일 유효성 검사
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
