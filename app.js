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
    }
    
    // 탭별 데이터 로드
    loadTabData(tabName);
}

// 탭별 데이터 로드
async function loadTabData(tabName) {
    switch(tabName) {
        case 'reservations':
            await loadReservationsData();
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
    const timeline = document.getElementById('reservations-timeline');
    if (!timeline) return;
    
    try {
        // 전역 currentDate 변수 사용 (날짜 네비게이션에서 설정됨)
        const targetDate = window.currentDate || new Date().toISOString().slice(0, 10);
        const settings = await getSystemSettings();
        
        // 현재 선택된 날짜 표시
        updateSelectedInfo(targetDate, null);
        
        if (!settings) {
            timeline.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>설정을 불러올 수 없습니다</p></div>';
            return;
        }
        
        let timelineHTML = '';
        
        for (const timeSlot of settings.timeSlots) {
            const slotKey = `${timeSlot.start}-${timeSlot.end}`;
            
            // 예약 수 확인
            console.log(`예약 조회 중: ${targetDate}, ${slotKey}`);
            const reservationsSnapshot = await db.collection('reservations')
                .where('date', '==', targetDate)
                .where('timeSlot', '==', slotKey)
                .where('status', 'in', ['pending', 'confirmed'])
                .get();
            
            const reservations = [];
            reservationsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`예약 발견: ${data.userName} (${data.status})`);
                reservations.push({ id: doc.id, ...data });
            });
            
            console.log(`${slotKey} 시간대 예약 수: ${reservations.length}`);
            
            const isFull = reservations.length >= 4;
            const statusClass = isFull ? 'full' : reservations.length > 0 ? 'partial' : 'empty';
            
            timelineHTML += `
                <div class="timeline-item ${statusClass}">
                    <div class="timeline-time">
                        <div class="time-start">${timeSlot.start}</div>
                        <div class="time-end">${timeSlot.end}</div>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-status">
                            <span class="status-badge ${statusClass}">
                                ${isFull ? '만석' : reservations.length > 0 ? `${reservations.length}/4명` : '예약 가능'}
                            </span>
                        </div>
                        <div class="timeline-players">
                            ${reservations.map(res => `
                                <div class="player-item">
                                    <span class="player-name">${res.userName || '익명'}</span>
                                    ${res.userDupr ? `<span class="player-dupr">DUPR: ${res.userDupr}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <button class="timeline-reserve-btn" 
                            data-time-slot="${slotKey}" 
                            data-date="${targetDate}"
                            ${isFull ? 'disabled' : ''}>
                        ${isFull ? '만석' : '예약하기'}
                    </button>
                </div>
            `;
        }
        
        timeline.innerHTML = timelineHTML || '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>예약 현황이 없습니다</p></div>';
        
        // 타임라인 예약 버튼 이벤트 리스너 추가
        timeline.querySelectorAll('.timeline-reserve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const timeSlot = e.target.getAttribute('data-time-slot');
                const date = e.target.getAttribute('data-date');
                await handleTimelineReservation(timeSlot, date);
            });
        });
        
    } catch (error) {
        console.error('예약 현황 로드 오류:', error);
        timeline.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>데이터를 불러올 수 없습니다</p></div>';
    }
}

// 선택된 정보 업데이트
function updateSelectedInfo(date, timeSlot) {
    const selectedInfo = document.getElementById('selected-info');
    const selectedDate = document.getElementById('selected-date');
    const selectedTime = document.getElementById('selected-time');
    
    if (selectedInfo && selectedDate) {
        // 날짜 포맷팅
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
        
        selectedDate.textContent = formattedDate;
        
        if (timeSlot) {
            selectedTime.textContent = timeSlot.replace('-', ' - ');
            selectedInfo.style.display = 'block';
        } else {
            selectedInfo.style.display = 'none';
        }
    }
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
            createdAt: new Date()
        };
        
        // 예약 생성
        console.log('예약 데이터 생성 중:', reservationData);
        const reservationId = await createReservation(reservationData);
        console.log('예약 생성 완료, ID:', reservationId);
        
        showToast('예약이 완료되었습니다!', 'success');
        
        // 선택된 정보 업데이트
        updateSelectedInfo(date, timeSlot);
        
        // 타임라인 새로고침
        await loadReservationsTimeline();
        
    } catch (error) {
        console.error('타임라인 예약 오류:', error);
        showToast('예약 중 오류가 발생했습니다.', 'error');
    }
}

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
    const currentDateDisplay = document.getElementById('current-date-display');
    
    // 전역 currentDate 변수 설정
    window.currentDate = new Date().toISOString().slice(0, 10);
    
    // 현재 날짜 표시 업데이트
    function updateCurrentDateDisplay() {
        const dateObj = new Date(window.currentDate);
        const today = new Date();
        const isToday = dateObj.toDateString() === today.toDateString();
        
        if (isToday) {
            currentDateDisplay.textContent = '오늘';
        } else {
            currentDateDisplay.textContent = dateObj.toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });
        }
        
        // 타임라인 새로고침
        loadReservationsTimeline();
    }
    
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', () => {
            const dateObj = new Date(window.currentDate);
            dateObj.setDate(dateObj.getDate() - 1);
            window.currentDate = dateObj.toISOString().slice(0, 10);
            updateCurrentDateDisplay();
        });
    }
    
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', () => {
            const dateObj = new Date(window.currentDate);
            dateObj.setDate(dateObj.getDate() + 1);
            window.currentDate = dateObj.toISOString().slice(0, 10);
            updateCurrentDateDisplay();
        });
    }
    
    // 초기 날짜 표시
    updateCurrentDateDisplay();
    
    // 예약/취소 버튼 이벤트 리스너
    const makeReservationBtn = document.getElementById('make-reservation-btn');
    const cancelReservationBtn = document.getElementById('cancel-reservation-btn');
    
    if (makeReservationBtn) {
        makeReservationBtn.addEventListener('click', async () => {
            const selectedTimeSlot = document.getElementById('selected-time')?.textContent;
            const selectedDate = window.currentDate;
            
            if (selectedTimeSlot && selectedDate) {
                const timeSlot = selectedTimeSlot.replace(' - ', '-');
                await handleTimelineReservation(timeSlot, selectedDate);
            } else {
                showToast('시간을 선택해주세요.', 'warning');
            }
        });
    }
    
    if (cancelReservationBtn) {
        cancelReservationBtn.addEventListener('click', async () => {
            // 취소 로직 구현
            showToast('취소 기능은 준비 중입니다.', 'info');
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

// 예약 상태 확인 및 업데이트
async function updateReservationStatus() {
    try {
        const now = new Date();
        const currentDate = now.toISOString().slice(0, 10);
        
        // 오늘의 모든 예약 상태 업데이트
        const reservationsSnapshot = await db.collection('reservations')
            .where('date', '==', currentDate)
            .where('status', '==', 'pending')
            .get();
        
        const batch = db.batch();
        let updatedCount = 0;
        
        reservationsSnapshot.forEach(doc => {
            const reservation = doc.data();
            const timeSlot = reservation.timeSlot;
            
            if (timeSlot) {
                const [startTime] = timeSlot.split('-');
                const gameStartTime = new Date(`${currentDate}T${startTime}:00`);
                
                // 게임 시작 시간이 지났으면 자동 취소
                if (now > gameStartTime) {
                    batch.update(doc.ref, {
                        status: 'cancelled',
                        cancellationReason: 'game_started',
                        cancelledAt: new Date()
                    });
                    updatedCount++;
                }
            }
        });
        
        if (updatedCount > 0) {
            await batch.commit();
            console.log(`${updatedCount}건의 예약이 자동 취소되었습니다.`);
        }
        
    } catch (error) {
        console.error('예약 상태 업데이트 오류:', error);
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
    
    // 자동 예약 처리 시작
    startAutoProcessing();
});

// 자동 예약 처리 시작
function startAutoProcessing() {
    // 페이지 로드 시 즉시 한 번 실행
    checkAndProcessReservations();
    updateReservationStatus();
    
    // 5분마다 예약 상태 확인 및 처리
    setInterval(() => {
        checkAndProcessReservations();
        updateReservationStatus();
    }, 5 * 60 * 1000); // 5분 = 5 * 60 * 1000ms
    
    // 1분마다 예약 상태 업데이트 (더 자주 체크)
    setInterval(() => {
        updateReservationStatus();
    }, 1 * 60 * 1000); // 1분 = 1 * 60 * 1000ms
    
    console.log('자동 예약 처리 시스템이 시작되었습니다.');
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
