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
    
    // 랭킹 탭 버튼들
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
});

// 페이지 로드 시 이메일 링크 확인
document.addEventListener('DOMContentLoaded', function() {
    handleEmailLinkSignIn();
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
        const maxReservations = settings.courtCount * settings.playersPerCourt;
        
        if (currentReservations >= maxReservations) {
            return { 
                available: false, 
                reason: `이 시간대는 만석입니다. (${currentReservations}/${maxReservations})`,
                isFull: true
            };
        }
        
        return { 
            available: true, 
            current: currentReservations, 
            max: maxReservations 
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
});

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
