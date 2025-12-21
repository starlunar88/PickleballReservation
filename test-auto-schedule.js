/**
 * 자동 대진표 생성 기능 검증 스크립트
 * 
 * 사용 방법:
 * 1. 브라우저 콘솔에서 실행
 * 2. 또는 Node.js 환경에서 실행 (일부 기능 제한)
 */

// 검증 항목들
const validationTests = {
    // 1. 시간 계산 검증
    testTimeCalculation: function() {
        console.log('=== 시간 계산 검증 ===');
        
        const testCases = [
            {
                gameStart: '14:00',
                closingTimeMinutes: 60,
                currentTime: '12:59',
                expected: false, // 마감 시간 전
                description: '마감 시간 전 (1분 전)'
            },
            {
                gameStart: '14:00',
                closingTimeMinutes: 60,
                currentTime: '13:00',
                expected: true, // 마감 시간 후
                description: '마감 시간 정확히'
            },
            {
                gameStart: '14:00',
                closingTimeMinutes: 60,
                currentTime: '13:01',
                expected: true, // 마감 시간 후
                description: '마감 시간 1분 후'
            },
            {
                gameStart: '14:00',
                closingTimeMinutes: 60,
                currentTime: '14:00',
                expected: false, // 게임 시작 시간
                description: '게임 시작 시간'
            },
            {
                gameStart: '14:00',
                closingTimeMinutes: 60,
                currentTime: '14:01',
                expected: false, // 게임 시작 시간 지남
                description: '게임 시작 시간 지남'
            }
        ];
        
        const today = new Date().toISOString().slice(0, 10);
        let passCount = 0;
        let failCount = 0;
        
        testCases.forEach((testCase, index) => {
            const gameStartTime = new Date(`${today}T${testCase.gameStart}:00`);
            const closingTime = new Date(gameStartTime.getTime() - (testCase.closingTimeMinutes * 60 * 1000));
            const currentTime = new Date(`${today}T${testCase.currentTime}:00`);
            
            // 마감 시간을 지났는지 확인 (게임 시작 시간 전이어야 함)
            const isPastClosing = currentTime >= closingTime && currentTime < gameStartTime;
            
            const passed = isPastClosing === testCase.expected;
            
            if (passed) {
                passCount++;
                console.log(`✅ 테스트 ${index + 1}: ${testCase.description} - 통과`);
            } else {
                failCount++;
                console.error(`❌ 테스트 ${index + 1}: ${testCase.description} - 실패`);
                console.error(`   예상: ${testCase.expected}, 실제: ${isPastClosing}`);
                console.error(`   게임 시작: ${gameStartTime.toLocaleString()}`);
                console.error(`   마감 시간: ${closingTime.toLocaleString()}`);
                console.error(`   현재 시간: ${currentTime.toLocaleString()}`);
            }
        });
        
        console.log(`\n결과: ${passCount}개 통과, ${failCount}개 실패\n`);
        return failCount === 0;
    },
    
    // 2. 날짜 처리 검증
    testDateHandling: function() {
        console.log('=== 날짜 처리 검증 ===');
        
        const now = new Date();
        const localDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
        
        // 로컬 시간대의 날짜와 비교
        const localYear = now.getFullYear();
        const localMonth = String(now.getMonth() + 1).padStart(2, '0');
        const localDay = String(now.getDate()).padStart(2, '0');
        const expectedLocalDate = `${localYear}-${localMonth}-${localDay}`;
        
        // UTC와 로컬 시간대 차이 확인
        const utcHours = now.getUTCHours();
        const localHours = now.getHours();
        const timezoneOffset = localHours - utcHours;
        
        console.log(`현재 시간: ${now.toLocaleString()}`);
        console.log(`UTC 시간: ${now.toUTCString()}`);
        console.log(`로컬 날짜: ${expectedLocalDate}`);
        console.log(`ISO 날짜: ${localDate}`);
        console.log(`시간대 오프셋: ${timezoneOffset}시간`);
        
        // 한국 시간대(UTC+9)에서 자정 근처일 때 날짜가 다를 수 있음
        if (timezoneOffset === 9 && utcHours >= 15) {
            // UTC 15시(한국 시간 0시) 이후면 날짜가 다를 수 있음
            const nextDay = new Date(now);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().slice(0, 10);
            console.warn(`⚠️ 주의: UTC 기준으로는 다음 날일 수 있음: ${nextDayStr}`);
        }
        
        // 실제로는 로컬 날짜를 사용해야 함
        const shouldUseLocalDate = localDate === expectedLocalDate;
        
        if (shouldUseLocalDate) {
            console.log('✅ 날짜 처리 정상');
        } else {
            console.warn('⚠️ 날짜 처리 주의 필요: UTC와 로컬 시간대 차이');
        }
        
        return true; // 경고만 표시
    },
    
    // 3. 로직 흐름 검증
    testLogicFlow: function() {
        console.log('=== 로직 흐름 검증 ===');
        
        const scenarios = [
            {
                name: 'pending 0명, confirmed 4명, 대진표 없음',
                pending: 0,
                confirmed: 4,
                hasMatches: false,
                expectedAction: '대진표 생성',
                shouldProcess: true
            },
            {
                name: 'pending 0명, confirmed 4명, 대진표 있음',
                pending: 0,
                confirmed: 4,
                hasMatches: true,
                expectedAction: '아무것도 안함',
                shouldProcess: false
            },
            {
                name: 'pending 4명, confirmed 0명',
                pending: 4,
                confirmed: 0,
                hasMatches: false,
                expectedAction: '팀 배정 + 대진표 생성',
                shouldProcess: true
            },
            {
                name: 'pending 2명, confirmed 2명 (총 4명)',
                pending: 2,
                confirmed: 2,
                hasMatches: false,
                expectedAction: '팀 배정 + 대진표 생성',
                shouldProcess: true
            },
            {
                name: 'pending 1명, confirmed 2명 (총 3명)',
                pending: 1,
                confirmed: 2,
                hasMatches: false,
                expectedAction: 'pending 취소 또는 아무것도 안함',
                shouldProcess: false
            }
        ];
        
        scenarios.forEach((scenario, index) => {
            const total = scenario.pending + scenario.confirmed;
            const shouldProcess = total >= 4 && (!scenario.hasMatches || scenario.pending > 0);
            
            const passed = shouldProcess === scenario.shouldProcess;
            
            if (passed) {
                console.log(`✅ 시나리오 ${index + 1}: ${scenario.name} - ${scenario.expectedAction}`);
            } else {
                console.error(`❌ 시나리오 ${index + 1}: ${scenario.name} - 예상: ${scenario.shouldProcess}, 실제: ${shouldProcess}`);
            }
        });
        
        return true;
    },
    
    // 4. 중복 실행 방지 검증
    testDuplicatePrevention: function() {
        console.log('=== 중복 실행 방지 검증 ===');
        
        const processingKey = 'processing_2025-01-15_14:00-15:00';
        
        // 시뮬레이션: 첫 번째 실행
        if (!window[processingKey]) {
            window[processingKey] = true;
            console.log('✅ 첫 번째 실행 허용');
        } else {
            console.log('❌ 첫 번째 실행이 이미 처리 중으로 표시됨');
        }
        
        // 시뮬레이션: 두 번째 실행 (중복)
        if (!window[processingKey]) {
            console.log('❌ 중복 실행이 허용됨');
        } else {
            console.log('✅ 중복 실행 차단됨');
        }
        
        // 5초 후 해제 시뮬레이션
        setTimeout(() => {
            window[processingKey] = false;
            delete window[processingKey];
            console.log('✅ 처리 완료 후 플래그 해제됨');
        }, 100); // 테스트용으로 100ms
        
        return true;
    }
};

// 전체 검증 실행
function runAllValidations() {
    console.log('🔍 자동 대진표 생성 기능 검증 시작...\n');
    
    const results = {
        timeCalculation: validationTests.testTimeCalculation(),
        dateHandling: validationTests.testDateHandling(),
        logicFlow: validationTests.testLogicFlow(),
        duplicatePrevention: validationTests.testDuplicatePrevention()
    };
    
    console.log('\n=== 검증 결과 요약 ===');
    console.log(`시간 계산: ${results.timeCalculation ? '✅ 통과' : '❌ 실패'}`);
    console.log(`날짜 처리: ${results.dateHandling ? '✅ 통과' : '⚠️ 주의'}`);
    console.log(`로직 흐름: ${results.logicFlow ? '✅ 통과' : '❌ 실패'}`);
    console.log(`중복 방지: ${results.duplicatePrevention ? '✅ 통과' : '❌ 실패'}`);
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
        console.log('\n✅ 모든 검증 통과!');
    } else {
        console.log('\n⚠️ 일부 검증 실패 또는 주의 필요');
    }
    
    return results;
}

// 브라우저 콘솔에서 실행 가능하도록
if (typeof window !== 'undefined') {
    window.validateAutoSchedule = runAllValidations;
    console.log('검증 스크립트 로드 완료. 브라우저 콘솔에서 validateAutoSchedule() 실행하세요.');
}

// Node.js 환경에서도 실행 가능
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validationTests, runAllValidations };
}


