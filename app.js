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
    const time = document.getElementById('time-select').value;
    
    if (!court || !date || !time) {
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
        
        // 중복 예약 확인
        const user = auth.currentUser;
        if (!user) {
            showToast('로그인이 필요합니다.', 'warning');
            return;
        }
        
        const existingReservation = await db.collection('reservations')
            .where('userId', '==', user.uid)
            .where('court', '==', court)
            .where('date', '==', date)
            .where('time', '==', time)
            .get();
        
        if (!existingReservation.empty) {
            showToast('이미 예약된 시간입니다.', 'error');
            return;
        }
        
        // 예약 생성
        const reservationData = {
            court: court,
            date: date,
            time: time,
            courtName: `코트 ${court.replace('court', '')}`
        };
        
        await createReservation(reservationData);
        showToast('예약이 완료되었습니다!', 'success');
        
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
function isAdmin(user) {
    // 임시로 특정 이메일을 관리자로 설정 (나중에 Firestore에서 관리)
    const adminEmails = ['admin@pickleball.com', 'starlunar88@gmail.com'];
    return adminEmails.includes(user.email);
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
        await db.collection('settings').doc('system').set({
            ...settings,
            lastUpdated: new Date()
        });
        console.log('시스템 설정 저장 완료:', settings);
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
        // 현재 설정 로드
        const settings = await getSystemSettings();
        if (settings) {
            document.getElementById('court-count').value = settings.courtCount;
            document.getElementById('closing-time').value = settings.closingTime;
            
            // 시간 슬롯 로드
            const container = document.getElementById('time-slots-container');
            container.innerHTML = '';
            
            settings.timeSlots.forEach(slot => {
                addTimeSlotItem(slot.start, slot.end);
            });
        }
        
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
function addTimeSlotItem(start = '09:00', end = '10:00') {
    const container = document.getElementById('time-slots-container');
    const item = document.createElement('div');
    item.className = 'time-slot-item';
    item.innerHTML = `
        <input type="time" class="form-control time-start" value="${start}">
        <span>~</span>
        <input type="time" class="form-control time-end" value="${end}">
        <button type="button" class="btn btn-outline btn-small remove-time-slot">삭제</button>
    `;
    
    // 삭제 버튼 이벤트
    item.querySelector('.remove-time-slot').addEventListener('click', () => {
        item.remove();
    });
    
    container.appendChild(item);
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
        showToast('관리자 설정이 저장되었습니다!', 'success');
        closeAdminSettingsModal();
        
    } catch (error) {
        console.error('관리자 설정 저장 오류:', error);
        showToast('설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
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
        adminSettingsBtn.addEventListener('click', openAdminSettingsModal);
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
});

// 페이지 로드 시 이메일 링크 확인
document.addEventListener('DOMContentLoaded', function() {
    handleEmailLinkSignIn();
});

// 페이지 로드 시 애니메이션
window.addEventListener('load', function() {
    const elements = document.querySelectorAll('.reservation-card');
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('fade-in');
        }, index * 100);
    });
});

// 스크롤 시 네비게이션 스타일 변경
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(102, 126, 234, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        navbar.style.backdropFilter = 'none';
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
