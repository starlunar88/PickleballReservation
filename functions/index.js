/**
 * Firebase Cloud Functions를 사용한 서버 측 자동 대진표 생성
 * 
 * 설치 방법:
 * 1. npm install -g firebase-tools
 * 2. firebase login
 * 3. firebase init functions
 * 4. npm install --prefix functions
 * 5. firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PickleballBalanceScheduler = require('./pickleball-balance-scheduler');

admin.initializeApp();

/**
 * 매 1분마다 실행되는 스케줄 함수
 * 마감 시간 확인 및 대진표 자동 생성
 */
exports.checkAndProcessReservations = functions.pubsub
    .schedule('every 1 minutes')
    .timeZone('Asia/Seoul')
    .onRun(async (context) => {
        console.log('⏰ [서버] 주기적 예약 마감 시간 확인 시작...');
        
        try {
            const db = admin.firestore();
            
            // 시스템 설정 가져오기
            const settingsDoc = await db.collection('settings').doc('system').get();
            if (!settingsDoc.exists) {
                console.log('⚠️ 시스템 설정이 없습니다.');
                return null;
            }
            
            const settings = settingsDoc.data();
            const now = new Date();
            // 로컬 시간대 기준 날짜 사용
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const currentDate = `${year}-${month}-${day}`; // YYYY-MM-DD 형식 (로컬 시간대)
            
            // 오늘의 모든 시간 슬롯 확인
            for (const timeSlot of settings.timeSlots || []) {
                const slotStart = timeSlot.start;
                const slotEnd = timeSlot.end;
                const timeSlotKey = `${slotStart}-${slotEnd}`;
                
                // 마감 시간 계산 (게임 시작 시간에서 마감 시간(분) 전)
                const gameStartTime = new Date(`${currentDate}T${slotStart}:00`);
                const closingTime = new Date(gameStartTime.getTime() - (settings.closingTime * 60 * 1000));
                
                // 게임 시작 시간이 지난 경우 처리하지 않음
                if (now >= gameStartTime) {
                    console.log(`게임 시작 시간이 지나서 처리하지 않음: ${currentDate} ${timeSlotKey}`);
                    continue;
                }
                
                // 현재 시간이 마감 시간을 지났는지 확인
                if (now >= closingTime) {
                    console.log(`마감 시간 확인: ${currentDate} ${timeSlotKey}`);
                    await processTimeSlotReservations(db, currentDate, timeSlotKey, settings);
                }
            }
            
            console.log('✅ [서버] 예약 처리 완료');
            return null;
        } catch (error) {
            console.error('❌ [서버] 예약 처리 오류:', error);
            return null;
        }
    });

/**
 * 특정 시간 슬롯의 예약 처리 및 대진표 생성
 */
async function processTimeSlotReservations(db, date, timeSlot, settings) {
    try {
        // 예약 가져오기
        const pendingSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', '==', 'pending')
            .get();
        
        const confirmedSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', '==', 'confirmed')
            .get();
        
        const totalReservations = pendingSnapshot.size + confirmedSnapshot.size;
        
        if (totalReservations < 4) {
            console.log(`예약자 수 부족: ${date} ${timeSlot} (총 ${totalReservations}명)`);
            return;
        }
        
        // 기존 대진표 확인
        const existingMatches = await db.collection('matches')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .get();
        
        const [slotStart] = timeSlot.split('-');
        const gameStartTime = new Date(`${date}T${slotStart}:00`);
        const closingTime = new Date(gameStartTime.getTime() - (settings.closingTime * 60 * 1000));
        const now = new Date();
        
        // 마감 시간 전이면 대진표 재생성
        if (now < closingTime) {
            if (!existingMatches.empty) {
                console.log(`📅 [서버] 마감 시간 전 - 대진표 재생성: ${date} ${timeSlot}`);
                const batch = db.batch();
                existingMatches.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            await generateMatchSchedule(db, date, timeSlot, settings);
            console.log(`✅ [서버] 대진표 자동 재생성 완료: ${date} ${timeSlot}`);
        } else {
            // 마감 시간 후: 대진표가 없으면 생성
            if (existingMatches.empty) {
                console.log(`📅 [서버] 마감 시간 후 - 대진표 생성: ${date} ${timeSlot}`);
                await generateMatchSchedule(db, date, timeSlot, settings);
                console.log(`✅ [서버] 대진표 자동 생성 완료: ${date} ${timeSlot}`);
            }
        }
    } catch (error) {
        console.error(`❌ [서버] 시간 슬롯 처리 오류 (${date} ${timeSlot}):`, error);
    }
}

/**
 * 코트 수 계산 헬퍼 함수
 */
function calculateCourtCount(playerCount, maxCourts = 3) {
    if (playerCount < 4) {
        return 1;
    } else if (playerCount < 8) {
        return 1;
    } else if (playerCount < 12) {
        return 2;
    } else {
        return Math.min(3, maxCourts);
    }
}

/**
 * 사용자 점수 계산 (간단 버전 - 서버 측에서는 기본 점수만 사용)
 */
async function calculateUserScores(db) {
    try {
        const userScores = {};
        const matchesSnapshot = await db.collection('matches')
            .where('status', '==', 'completed')
            .get();
        
        matchesSnapshot.forEach(doc => {
            const match = doc.data();
            if (!match.teamA || !match.teamB || !match.scoreA || !match.scoreB) {
                return;
            }
            
            const aWins = match.scoreA > match.scoreB;
            const winners = aWins ? match.teamA : match.teamB;
            const losers = aWins ? match.teamB : match.teamA;
            
            if (!Array.isArray(winners) || !Array.isArray(losers)) return;
            
            winners.forEach(player => {
                const userId = player.userId || player.id;
                if (!userId) return;
                if (!userScores[userId]) {
                    userScores[userId] = { score: 0, wins: 0, losses: 0 };
                }
                userScores[userId].score += 10;
                userScores[userId].wins += 1;
            });
            
            losers.forEach(player => {
                const userId = player.userId || player.id;
                if (!userId) return;
                if (!userScores[userId]) {
                    userScores[userId] = { score: 0, wins: 0, losses: 0 };
                }
                userScores[userId].score = Math.max(0, userScores[userId].score - 5);
                userScores[userId].losses += 1;
            });
        });
        
        return userScores;
    } catch (error) {
        console.error('점수 계산 오류:', error);
        return {};
    }
}

/**
 * 대진표 생성 (서버 측)
 */
async function generateMatchSchedule(db, date, timeSlot, settings) {
    try {
        console.log(`📅 [서버] 대진표 생성 시작: date=${date}, timeSlot=${timeSlot}`);
        
        // 예약자 정보 가져오기
        const reservationsSnapshot = await db.collection('reservations')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();
        
        if (reservationsSnapshot.empty) {
            console.log('예약자가 없습니다.');
            return;
        }
        
        const reservations = [];
        reservationsSnapshot.forEach(doc => {
            reservations.push({ id: doc.id, ...doc.data() });
        });
        
        // 플레이어 정보 수집
        const players = [];
        const userScores = await calculateUserScores(db);
        
        // 배정 실패 이력 조회 (우선순위 확인)
        const unassignedHistory = await db.collection('unassigned_players')
            .where('resolved', '==', false)
            .get();
        
        const userPriorityMap = {};
        unassignedHistory.forEach(doc => {
            const data = doc.data();
            const userId = data.userId;
            if (!userPriorityMap[userId] || userPriorityMap[userId] < data.priority) {
                userPriorityMap[userId] = data.priority;
            }
        });
        
        for (const res of reservations) {
            let dupr = res.userDupr || 0;
            let internalRating = 1000; // 기본값
            let gameScore = 0;
            
            // 사용자 정보 조회
            try {
                const userDoc = await db.collection('users').doc(res.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.score !== undefined) {
                        internalRating = userData.score || 1000;
                    }
                }
            } catch (error) {
                console.warn(`사용자 ${res.userId} 정보 조회 실패:`, error);
            }
            
            // 게임 점수 가져오기
            if (userScores[res.userId]) {
                gameScore = userScores[res.userId].score || 0;
            }
            
            players.push({
                userId: res.userId,
                userName: res.userName,
                dupr: dupr,
                internalRating: internalRating,
                score: gameScore,
                priority: userPriorityMap[res.userId] || 0
            });
        }
        
        // 우선순위 정렬
        players.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return 0;
        });
        
        if (players.length < 4) {
            console.log('플레이어 수가 부족합니다 (최소 4명 필요).');
            return;
        }
        
        const maxCourts = settings?.courtCount || 3;
        const playerCount = players.length;
        const courtCount = calculateCourtCount(playerCount, maxCourts);
        const playersToUse = players;
        
        console.log(`📊 [서버] 코트 배정: 예약자 ${playerCount}명, 최대 코트: ${maxCourts}, 실제 배정 코트: ${courtCount}`);
        
        // 기존 대진표 삭제
        const existingMatches = await db.collection('matches')
            .where('date', '==', date)
            .where('timeSlot', '==', timeSlot)
            .get();
        
        if (!existingMatches.empty) {
            const deleteBatch = db.batch();
            existingMatches.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });
            await deleteBatch.commit();
            console.log('기존 대진표 삭제 완료:', existingMatches.size, '개');
        }
        
        // 밸런스 모드 스케줄러 사용
        let schedule, unassignedPlayers;
        
        try {
            console.log('🎯 [서버] 새로운 밸런스 모드 스케줄러 사용');
            const scheduler = new PickleballBalanceScheduler(playersToUse, 10.0, 1.0, maxCourts);
            scheduler.generateSchedule();
            const webFormat = scheduler.toWebFormat();
            schedule = webFormat.schedule;
            unassignedPlayers = webFormat.unassignedPlayers;
            console.log(`✅ [서버] 밸런스 모드 스케줄러로 생성 완료: ${schedule.length}경기`);
        } catch (error) {
            console.error('❌ [서버] 스케줄러 오류:', error);
            throw error;
        }
        
        if (schedule.length === 0) {
            console.error('❌ 생성된 경기가 없습니다!');
            return;
        }
        
        // 배정되지 않은 플레이어 처리
        if (unassignedPlayers.length > 0) {
            console.log(`배정되지 않은 플레이어 ${unassignedPlayers.length}명`);
            
            const existingUnassigned = await db.collection('unassigned_players')
                .where('date', '==', date)
                .where('timeSlot', '==', timeSlot)
                .get();
            
            if (!existingUnassigned.empty) {
                const deleteBatch = db.batch();
                existingUnassigned.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });
                await deleteBatch.commit();
            }
            
            // 배정 실패 정보 저장
            const unassignedBatch = db.batch();
            const allUnresolvedHistory = await db.collection('unassigned_players')
                .where('resolved', '==', false)
                .get();
            
            const maxPriorityMap = {};
            allUnresolvedHistory.forEach(doc => {
                const data = doc.data();
                const userId = data.userId;
                if (!maxPriorityMap[userId] || maxPriorityMap[userId] < data.priority) {
                    maxPriorityMap[userId] = data.priority;
                }
            });
            
            unassignedPlayers.forEach((player, index) => {
                const priority = (maxPriorityMap[player.userId] || 0) + 1;
                const unassignedRef = db.collection('unassigned_players').doc();
                unassignedBatch.set(unassignedRef, {
                    userId: player.userId,
                    userName: player.userName,
                    date: date,
                    timeSlot: timeSlot,
                    priority: priority,
                    resolved: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await unassignedBatch.commit();
        }
        
        // 배정 성공한 플레이어들의 우선순위 기록 해결 처리
        if (schedule.length > 0) {
            const assignedPlayerIds = new Set();
            schedule.forEach(match => {
                match.teamA.forEach(p => assignedPlayerIds.add(p.userId));
                match.teamB.forEach(p => assignedPlayerIds.add(p.userId));
            });
            
            const assignedUnassignedHistory = await db.collection('unassigned_players')
                .where('resolved', '==', false)
                .get();
            
            const updateBatch = db.batch();
            assignedUnassignedHistory.forEach(doc => {
                const data = doc.data();
                if (assignedPlayerIds.has(data.userId)) {
                    updateBatch.update(doc.ref, {
                        resolved: true,
                        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                        resolvedDate: date,
                        resolvedTimeSlot: timeSlot
                    });
                }
            });
            
            if (assignedUnassignedHistory.size > 0) {
                await updateBatch.commit();
            }
        }
        
        // 대진표 저장
        const [startHour, startMin] = timeSlot.split('-')[0].split(':').map(Number);
        const batch = db.batch();
        
        schedule.forEach(match => {
            const matchId = `${date}_${timeSlot}_R${match.round}_C${match.court}`;
            const ref = db.collection('matches').doc(matchId);
            
            const gameStartTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
            const endHour = (startHour + 1) % 24;
            const gameEndTime = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
            
            batch.set(ref, {
                matchId,
                date,
                timeSlot,
                roundNumber: match.roundNumber || match.round,
                courtNumber: match.court,
                teamA: match.teamA.map(p => ({
                    ...p,
                    score: p.score || 0,
                    internalRating: p.internalRating || 0
                })),
                teamB: match.teamB.map(p => ({
                    ...p,
                    score: p.score || 0,
                    internalRating: p.internalRating || 0
                })),
                scoreA: null,
                scoreB: null,
                status: 'scheduled',
                gameStartTime,
                gameEndTime,
                teamMode: 'balanced',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        console.log(`✅ [서버] 대진표 저장 완료: ${schedule.length}개 경기`);
        
    } catch (error) {
        console.error('❌ [서버] 대진표 생성 오류:', error);
        throw error;
    }
}
