// Firebase 전역 변수
let auth, db;

// Firebase 초기화 확인 및 전역 변수 설정
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('✅ Firebase 전역 변수 설정 완료');
        return true;
    } else {
        console.error('❌ Firebase가 초기화되지 않았습니다');
        return false;
    }
}

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
        case 'stats':
            await loadStatsData();
            break;
        case 'admin':
            await loadAdminData();
            break;
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
        await loadOverallRankings();
    } catch (error) {
        console.error('랭킹 데이터 로드 오류:', error);
    }
}

// 통계 데이터 로드
async function loadStatsData() {
    try {
        await loadStatsCharts();
    } catch (error) {
        console.error('통계 데이터 로드 오류:', error);
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
            const now = new Date();
            
            // timeSlot 객체에서 직접 시작 시간 가져오기
            const startTime = timeSlot.start || '00:00';
            
            const gameStartTime = new Date(`${targetDate}T${startTime}:00`);
            const closingTime = new Date(gameStartTime.getTime() - 20 * 60 * 1000); // 20분 전
            const isClosed = now > closingTime;
            
            let statusClass, statusText;
            if (isClosed) {
                statusClass = 'closed';
                statusText = '마감';
            } else if (reservations.length > 0) {
                statusClass = 'partial';
                statusText = `${reservations.length}/8명`;
            } else {
                statusClass = 'empty';
                statusText = '예약 가능';
            }
            
            timelineHTML += `
                <div class="timeline-item ${statusClass}" data-time-slot="${slotKey}" data-date="${targetDate}">
                    <div class="timeline-header">
                        <div class="timeline-time">
                            <div class="time-start">${timeSlot.start}</div>
                            <div class="time-end">${timeSlot.end}</div>
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
        
        // 타임라인 새로고침
        await loadReservationsTimeline();
        
        // 버튼 상태 업데이트
        updateReservationButtons(timeSlot, date);
        
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
        
        // 타임라인 새로고침
        await loadReservationsTimeline();
        
        // 버튼 상태 업데이트
        updateReservationButtons(timeSlot, date);
        
    } catch (error) {
        console.error('예약 취소 오류:', error);
        showToast('취소 중 오류가 발생했습니다.', 'error');
    }
}

// 예약 버튼 상태 업데이트 - 제거됨 (타임라인에 통합)

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
        
        if (isToday) {
            currentDateDisplay.textContent = '오늘';
        } else {
            const formattedDate = dateObj.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });
            currentDateDisplay.textContent = formattedDate;
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
    
    // 하단 버튼 초기화 코드 제거됨 (타임라인에 통합)
    
    // 하단 버튼 이벤트 리스너 제거됨 (타임라인에 통합)
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
        const gameData = {
            teamId: teamId,
            date: gameResult.date,
            timeSlot: gameResult.timeSlot,
            courtNumber: gameResult.courtNumber,
            gameNumber: gameResult.gameNumber,
            players: gameResult.players,
            winners: gameResult.winners, // 승자 팀의 플레이어 ID 배열
            losers: gameResult.losers,   // 패자 팀의 플레이어 ID 배열
            score: gameResult.score,     // 예: "11-9, 11-7"
            recordedAt: new Date(),
            recordedBy: auth.currentUser.uid
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

// 랭킹 순위 가져오기
async function getRankings(limit = 50) {
    try {
        const rankingsSnapshot = await db.collection('userRatings')
            .orderBy('internalRating', 'desc')
            .limit(limit)
            .get();
        
        const rankings = [];
        rankingsSnapshot.forEach((doc, index) => {
            const data = doc.data();
            rankings.push({
                rank: index + 1,
                userId: data.userId,
                internalRating: data.internalRating,
                gamesPlayed: data.gamesPlayed,
                gamesWon: data.gamesWon,
                winRate: data.winRate
            });
        });
        
        return rankings;
    } catch (error) {
        console.error('랭킹 가져오기 오류:', error);
        return [];
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

// 테스트용 시간대별 버튼 생성
async function createTestButtons() {
    try {
        const settings = await getSystemSettings();
        if (!settings) return;
        
        const container = document.getElementById('test-buttons-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        settings.timeSlots.forEach(slot => {
            const timeSlot = `${slot.start}-${slot.end}`;
            const timeGroup = document.createElement('div');
            timeGroup.className = 'test-time-group';
            
            timeGroup.innerHTML = `
                <div class="test-time-label">${slot.start}-${slot.end}</div>
                <div class="test-time-buttons">
                    <button class="btn btn-outline add-random-btn" data-time-slot="${timeSlot}" title="무작위 예약자 추가">
                        무작위 추가
                    </button>
                    <button class="btn btn-primary force-generate-btn" data-time-slot="${timeSlot}" title="강제 대진표 생성">
                        대진표 생성
                    </button>
                </div>
            `;
            
            container.appendChild(timeGroup);
        });
        
        // 이벤트 리스너 추가
        addTestButtonEventListeners();
        
    } catch (error) {
        console.error('테스트 버튼 생성 오류:', error);
    }
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
    
    // 대진표 강제 생성 버튼들
    document.querySelectorAll('.force-generate-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const timeSlot = e.target.getAttribute('data-time-slot');
                const date = window.currentDate || new Date().toISOString().slice(0, 10);
                
                // 강제 대진표 생성 (마감 여부 무시)
                await generateMatchSchedule(date, timeSlot);
                
                // 대진표 표시 (인덱스 오류 방지를 위해 단순화)
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
                }
            } catch (error) {
                console.error('강제 대진표 생성 오류:', error);
                showToast('대진표 생성 중 오류', 'error');
            }
        });
    });
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
async function generateMatchSchedule(date, timeSlot) {
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
        const players = reservations.map(r => ({ userId: r.userId, userName: r.userName }));
        if (players.length < 4) {
            showToast('최소 4명이 필요합니다.', 'error');
            return;
        }
        const settings = await getSystemSettings();
        const courtCount = Math.max(1, settings?.courtCount || 2);
        const rounds = Math.max(1, settings?.gamesPerHour || 4); // 4경기 (15분 단위)

        const schedule = buildMatchSchedule(players, courtCount, rounds);

        const batch = db.batch();
        schedule.forEach(match => {
            const matchId = `${date}_${timeSlot}_R${match.round}_C${match.court}`;
            const ref = db.collection('matches').doc(matchId);
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
                createdAt: new Date()
            });
        });
        await batch.commit();
        
        // 생성된 대진표 표시
        await renderMatchSchedule(schedule.map(match => ({
            id: `${date}_${timeSlot}_R${match.round}_C${match.court}`,
            ...match,
            date,
            timeSlot,
            roundNumber: match.round,
            courtNumber: match.court,
            scoreA: null,
            scoreB: null,
            status: 'scheduled'
        })), date, timeSlot);
        
        showToast('대진표가 생성되었습니다.', 'success');
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

// 매치 스케줄 빌드 (간단 로테이션, 2코트 지원)
function buildMatchSchedule(players, courtCount, rounds) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const queue = [...shuffled];
    const schedule = [];
    for (let r = 1; r <= rounds; r++) {
        for (let c = 1; c <= courtCount; c++) {
            if (queue.length < 4) break;
            const group = queue.splice(0, 4);
            // 사용된 인원은 맨 뒤로 이동하여 다음 라운드에 로테이션
            queue.push(...group);
            const p = pairingPatterns[(r - 1) % pairingPatterns.length];
            const teamA = [group[p[0]], group[p[1]]];
            const teamB = [group[p[2]], group[p[3]]];
            schedule.push({ round: r, court: c, teamA, teamB });
        }
    }
    return schedule;
}

// 대진표 렌더링
async function renderMatchSchedule(matches, date, timeSlot) {
    try {
        const scheduleSection = document.getElementById('match-schedule-section');
        const scheduleContainer = document.getElementById('match-schedule');
        const dateTimeDisplay = document.getElementById('match-date-time');
        
        if (!scheduleSection || !scheduleContainer) return;
        
        // 날짜/시간 표시
        if (dateTimeDisplay) {
            const [startTime] = timeSlot.split('-');
            dateTimeDisplay.textContent = `${date} ${startTime}-${timeSlot.split('-')[1]}`;
        }
        
        if (matches.length === 0) {
            scheduleContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>대진표가 없습니다.</p>
                </div>
            `;
            scheduleSection.style.display = 'block';
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
            
            const startTime = timeSlot.split('-')[0];
            const roundStartTime = new Date(`2000-01-01T${startTime}:00`);
            roundStartTime.setMinutes(roundStartTime.getMinutes() + (parseInt(roundNum) - 1) * 15);
            const timeStr = roundStartTime.toTimeString().slice(0, 5);
            
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
        
        scheduleSection.style.display = 'block';
        
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
            courtNumber: match.courtNumber,
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
