/**
 * 피클볼 밸런스 모드 스케줄러 (Python 스크립트를 JavaScript로 변환)
 * 8라운드 경기 일정을 동적 플레이어 수와 DUPR 레이팅 기반으로 생성합니다.
 */

class PickleballBalanceScheduler {
    constructor(players, weightA = 10.0, weightB = 1.0, maxCourts = null) {
        /**
         * @param {Array} players - 플레이어 배열 [{userId, userName, dupr, internalRating?, score?}, ...]
         * @param {number} weightA - 파트너 중복 비용 가중치 (기본값: 10.0)
         * @param {number} weightB - DUPR 팀 차이 비용 가중치 (기본값: 1.0)
         * @param {number} maxCourts - 최대 코트 수 (null이면 자동 계산)
         */
        this.players = players.map(p => ({
            ...p,
            playCount: 0,
            partnerHistory: new Set(),
            dupr: p.dupr || 0,
            internalRating: p.internalRating || 0,
            score: p.score || 0
        }));
        this.weightA = weightA;
        this.weightB = weightB;
        this.maxCourts = maxCourts;
        this.totalRounds = 8;
        this.matches = [];
    }

    /**
     * 코트 수 계산: maxCourts가 설정되어 있으면 그것을 사용하고, 
     * 그렇지 않으면 floor(총 플레이어 수 / 4)와 maxCourts 중 작은 값 사용
     */
    getCourtCount() {
        const calculatedCourts = Math.floor(this.players.length / 4);
        if (this.maxCourts !== null && this.maxCourts !== undefined) {
            return Math.min(calculatedCourts, this.maxCourts);
        }
        return calculatedCourts;
    }

    /**
     * DUPR 순으로 정렬된 플레이어 리스트 반환 (내림차순)
     */
    getSortedPlayersByDupr(players = null) {
        if (players === null) {
            players = this.players;
        }
        return [...players].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));
    }

    /**
     * 최소 플레이 횟수를 가진 플레이어들 반환 (동점 시 랜덤)
     */
    getPlayersByLowestPlayCount(players = null) {
        if (players === null) {
            players = this.players;
        }

        if (players.length === 0) {
            return [];
        }

        const minPlayCount = Math.min(...players.map(p => p.playCount));
        const candidates = players.filter(p => p.playCount === minPlayCount);

        // 동점 시 랜덤 셔플
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        return shuffled;
    }

    /**
     * 비용 함수 계산
     * Cost = (Weight_A * Partner_Duplicate_Count) + (Weight_B * DUPR_Team_Diff) + (Weight_C * Balance_Penalty) + (Weight_D * Opponent_Diversity)
     * @param {Array} teamA - 팀 A 플레이어 배열
     * @param {Array} teamB - 팀 B 플레이어 배열
     * @param {Array} allSortedPlayers - DUPR 순으로 정렬된 전체 플레이어 풀 배열 (밸런스 페널티 계산용)
     * @param {Array} previousMatches - 이전 경기 배열 (상대 다양성 계산용)
     */
    calculateCost(teamA, teamB, allSortedPlayers = null, previousMatches = []) {
        // 파트너 중복 횟수 계산
        let partnerDuplicateCount = 0;
        const allPlayers = [...teamA, ...teamB];
        
        for (const player of allPlayers) {
            const partner = teamA.includes(player) 
                ? (teamA[0] === player ? teamA[1] : teamA[0])
                : (teamB[0] === player ? teamB[1] : teamB[0]);
            
            if (player.partnerHistory.has(partner.userId)) {
                partnerDuplicateCount++;
            }
        }

        // DUPR 팀 차이 계산
        const teamADupr = (teamA[0].dupr + teamA[1].dupr) / 2;
        const teamBDupr = (teamB[0].dupr + teamB[1].dupr) / 2;
        const duprTeamDiff = Math.abs(teamADupr - teamBDupr);

        // 밸런스 페널티 계산 (전체 플레이어 풀의 최강+차강 같은 편에 있으면 페널티)
        let balancePenalty = 0;
        if (allSortedPlayers && allSortedPlayers.length >= 2) {
            // 전체 플레이어 풀에서 최강과 차강 찾기
            const topPlayer = allSortedPlayers[0];
            const secondPlayer = allSortedPlayers[1];
            
            // 최강과 차강이 같은 팀에 있는지 확인
            const topTwoInTeamA = teamA.some(p => p.userId === topPlayer.userId) && 
                                  teamA.some(p => p.userId === secondPlayer.userId);
            const topTwoInTeamB = teamB.some(p => p.userId === topPlayer.userId) && 
                                  teamB.some(p => p.userId === secondPlayer.userId);
            
            if (topTwoInTeamA || topTwoInTeamB) {
                // 최강과 차강이 같은 편에 있으면 큰 페널티 부여
                balancePenalty = 1000; // 매우 큰 페널티로 밸런스 조합 우선
            }
        }

        // 상대 다양성 보너스 계산 (이전에 만난 적이 없는 상대와 만나면 보너스)
        let diversityBonus = 0;
        if (previousMatches.length > 0) {
            // 각 플레이어가 이전에 만난 상대 추적
            const opponentHistory = new Map();
            for (const match of previousMatches) {
                const matchPlayers = [...match.teamA, ...match.teamB];
                for (const player of matchPlayers) {
                    if (!opponentHistory.has(player.userId)) {
                        opponentHistory.set(player.userId, new Set());
                    }
                    const opponents = matchPlayers.filter(p => p.userId !== player.userId);
                    opponents.forEach(opp => opponentHistory.get(player.userId).add(opp.userId));
                }
            }
            
            // 현재 조합에서 새로운 상대를 만나는 플레이어 수 계산
            let newOpponentCount = 0;
            for (const player of allPlayers) {
                const opponents = allPlayers.filter(p => p.userId !== player.userId);
                const playerOpponentHistory = opponentHistory.get(player.userId) || new Set();
                const newOpponents = opponents.filter(opp => !playerOpponentHistory.has(opp.userId));
                newOpponentCount += newOpponents.length;
            }
            // 다양성 보너스 (음수로 적용하여 비용 감소)
            diversityBonus = -0.5 * newOpponentCount;
        }

        const cost = (this.weightA * partnerDuplicateCount) + (this.weightB * duprTeamDiff) + balancePenalty + diversityBonus;
        return cost;
    }

    /**
     * 선택된 플레이어들 중 최적의 페어링 찾기 (비용 함수 최소화)
     * @param {Array} selectedPlayers - 선택된 플레이어 배열 (코트별 4명)
     * @param {Array} previousMatches - 이전 경기 배열 (중복 방지용)
     * @param {Array} allSortedPlayers - 전체 플레이어 풀의 DUPR 순 정렬 배열 (밸런스 페널티 계산용)
     */
    findBestPairing(selectedPlayers, previousMatches = [], allSortedPlayers = null) {
        if (selectedPlayers.length < 4) {
            throw new Error('최소 4명의 플레이어가 필요합니다.');
        }

        // 코트별 플레이어를 DUPR 순으로 정렬 (로컬 정렬, 조합 인덱스용)
        const sortedPlayers = [...selectedPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));
        
        // 전체 플레이어 풀의 최강/차강 찾기 (allSortedPlayers가 제공된 경우)
        // allSortedPlayers가 없으면 코트별 정렬된 플레이어 사용
        const globalSorted = allSortedPlayers || sortedPlayers;
        
        // 디버깅: 코트별 정렬과 전체 정렬 비교
        if (allSortedPlayers && allSortedPlayers.length >= 2) {
            console.log(`    🔍 코트별 정렬: ${sortedPlayers.map(p => `${p.userName}(${p.dupr})`).join(', ')}`);
            console.log(`    🔍 전체 정렬(상위 2명): ${globalSorted.slice(0, 2).map(p => `${p.userName}(${p.dupr})`).join(', ')}`);
        }

        let bestPairing = null;
        let bestCost = Infinity;

        // 4명 중 2명씩 선택하는 밸런스 조합만 고려
        // 4명 기준 인덱스: 0=최강(1등), 1=차강(2등), 2=차약(3등), 3=최약(4등)
        // 가능한 조합 (밸런스가 좋은 순서):
        // 1. (0,3) vs (1,2) - 최강+최약 vs 차강+차약 (완벽 밸런스) - 우선순위 1
        // 2. (0,2) vs (1,3) - 최강+차약 vs 차강+최약 (밸런스) - 우선순위 2
        const combinations = [
            { combo: [[0, 3], [1, 2]], priority: 1, name: '최강+최약 vs 차강+차약' },  // 완벽 밸런스
            { combo: [[0, 2], [1, 3]], priority: 2, name: '최강+차약 vs 차강+최약' }   // 밸런스
        ];
        
        // 중복 제거: 조합 3은 조합 2와 중복될 수 있으므로, 실제로는 다른 조합을 의미
        // "최강+중간 vs 차강+중간"을 다시 해석하면:
        // - 최강(0) + 중간(2) vs 차강(1) + 중간(2)는 불가능 (중간이 중복)
        // - 최강(0) + 중간(2) vs 차강(1) + 중간(3)은 조합 2와 동일
        // 
        // 따라서 "최강+중간 vs 차강+중간"은 다음과 같이 해석:
        // - 최강(0) + 차약(2) vs 차강(1) + 차약(2)는 불가능
        // - 대신: 최강(0) + 차약(2) vs 차강(1) + 최약(3) = 조합 2
        // 
        // 새로운 해석: "최강+중간 vs 차강+중간"을 (0,1.5) vs (1,1.5)로 생각하면
        // 실제로는 (0,2) vs (1,2) 또는 (0,3) vs (1,3)을 의미할 수 있음
        // 하지만 4명만 있으므로, "중간"을 차약(2)로 해석하면:
        // - (0,2) vs (1,2)는 불가능 (2가 중복)
        // 
        // 따라서 "최강+중간 vs 차강+중간"은 이미 조합 2에 포함됨
        // 하지만 사용자가 원하는 것은 아마도 더 다양한 조합일 수 있으므로,
        // 추가 조합을 고려해보겠습니다.

        // 이전 경기 조합을 문자열로 변환하여 비교
        const previousCombinations = new Set();
        const previousPartnerPairs = new Set(); // 파트너 쌍 추적 (중복 방지)
        
        for (const prevMatch of previousMatches) {
            // 전체 팀 조합 추적
            const teamAIds = [prevMatch.teamA[0].userId, prevMatch.teamA[1].userId].sort().join(',');
            const teamBIds = [prevMatch.teamB[0].userId, prevMatch.teamB[1].userId].sort().join(',');
            previousCombinations.add(`${teamAIds}|${teamBIds}`);
            previousCombinations.add(`${teamBIds}|${teamAIds}`); // 역순도 추가
            
            // 파트너 쌍 추적 (같은 파트너와 다시 만나는 것 방지)
            previousPartnerPairs.add(teamAIds);
            previousPartnerPairs.add(teamBIds);
        }

        // 우선순위 순으로 정렬 (밸런스 조합 우선)
        combinations.sort((a, b) => a.priority - b.priority);

        // 모든 조합을 평가하여 파트너 중복이 없는 조합을 우선적으로 선택
        const evaluatedCombinations = [];
        
        for (const { combo, name, priority } of combinations) {
            // sortedPlayers 기준으로 조합 생성 (코트별 4명의 순위 기준)
            const teamA = [sortedPlayers[combo[0][0]], sortedPlayers[combo[0][1]]];
            const teamB = [sortedPlayers[combo[1][0]], sortedPlayers[combo[1][1]]];

            // 이전 경기와 중복 확인
            const teamAIds = [teamA[0].userId, teamA[1].userId].sort().join(',');
            const teamBIds = [teamB[0].userId, teamB[1].userId].sort().join(',');
            const currentCombination = `${teamAIds}|${teamBIds}`;

            // 파트너 중복 확인
            const hasPartnerDuplicate = previousPartnerPairs.has(teamAIds) || previousPartnerPairs.has(teamBIds);
            
            // 완전히 동일한 조합이면 스킵 (중복 방지)
            const isExactDuplicate = previousCombinations.has(currentCombination);

            // 비용 계산 (밸런스 페널티 포함, 전체 플레이어 풀의 최강/차강 기준, 상대 다양성 고려)
            const cost = this.calculateCost(teamA, teamB, globalSorted, previousMatches);
            
            // 파트너 중복이 있으면 비용에 추가 페널티 부여 (더 강하게)
            const adjustedCost = hasPartnerDuplicate ? cost + (this.weightA * 10) : cost;

            evaluatedCombinations.push({
                teamA,
                teamB,
                name,
                priority,
                cost: adjustedCost,
                originalCost: cost,
                isExactDuplicate,
                hasPartnerDuplicate
            });

            if (isExactDuplicate) {
                console.log(`    ⚠️ 조합 "${name}" 스킵: 이전 경기와 완전 중복`);
            } else {
                const duplicateStatus = hasPartnerDuplicate ? ' (파트너 중복)' : '';
                console.log(`    💰 조합 "${name}" (우선순위 ${priority}): 비용=${adjustedCost.toFixed(2)}${duplicateStatus} (TeamA: ${teamA.map(p => p.userName).join('&')}, TeamB: ${teamB.map(p => p.userName).join('&')})`);
            }
        }

        // 파트너 중복이 없는 조합을 우선적으로 선택
        const nonDuplicateCombinations = evaluatedCombinations.filter(c => !c.isExactDuplicate && !c.hasPartnerDuplicate);
        const duplicateCombinations = evaluatedCombinations.filter(c => !c.isExactDuplicate && c.hasPartnerDuplicate);
        const exactDuplicateCombinations = evaluatedCombinations.filter(c => c.isExactDuplicate);

        // 1순위: 파트너 중복 없는 조합 중 최선
        if (nonDuplicateCombinations.length > 0) {
            nonDuplicateCombinations.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.cost - b.cost;
            });
            bestPairing = {
                teamA: nonDuplicateCombinations[0].teamA,
                teamB: nonDuplicateCombinations[0].teamB,
                priority: nonDuplicateCombinations[0].priority
            };
            bestCost = nonDuplicateCombinations[0].cost;
        }
        // 2순위: 파트너 중복 있지만 완전 중복은 아닌 조합
        else if (duplicateCombinations.length > 0) {
            duplicateCombinations.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.cost - b.cost;
            });
            bestPairing = {
                teamA: duplicateCombinations[0].teamA,
                teamB: duplicateCombinations[0].teamB,
                priority: duplicateCombinations[0].priority
            };
            bestCost = duplicateCombinations[0].cost;
            console.log(`    ⚠️ 파트너 중복이 있지만 최선의 조합 선택`);
        }
        // 3순위: 모든 조합이 완전 중복인 경우 (최후의 수단)
        else if (exactDuplicateCombinations.length > 0) {
            exactDuplicateCombinations.sort((a, b) => a.cost - b.cost);
            bestPairing = {
                teamA: exactDuplicateCombinations[0].teamA,
                teamB: exactDuplicateCombinations[0].teamB,
                priority: exactDuplicateCombinations[0].priority
            };
            bestCost = exactDuplicateCombinations[0].cost;
            console.log(`    ⚠️ 모든 조합이 완전 중복이므로 비용이 가장 낮은 조합 선택`);
        }

        if (bestPairing && globalSorted.length >= 2) {
            // 전체 플레이어 풀의 최강과 차강 확인
            const topPlayer = globalSorted[0];
            const secondPlayer = globalSorted[1];
            
            const bestTeamAIds = [bestPairing.teamA[0].userId, bestPairing.teamA[1].userId].sort();
            const bestTeamBIds = [bestPairing.teamB[0].userId, bestPairing.teamB[1].userId].sort();
            
            const topTwoInTeamA = bestTeamAIds.includes(topPlayer.userId) && bestTeamAIds.includes(secondPlayer.userId);
            const topTwoInTeamB = bestTeamBIds.includes(topPlayer.userId) && bestTeamBIds.includes(secondPlayer.userId);
            
            // 선택된 조합의 이름 찾기 (순서 무관하게 비교)
            const selectedCombo = evaluatedCombinations.find(c => {
                const cTeamAIds = [c.teamA[0].userId, c.teamA[1].userId].sort();
                const cTeamBIds = [c.teamB[0].userId, c.teamB[1].userId].sort();
                return (cTeamAIds[0] === bestTeamAIds[0] && cTeamAIds[1] === bestTeamAIds[1] && 
                        cTeamBIds[0] === bestTeamBIds[0] && cTeamBIds[1] === bestTeamBIds[1]) ||
                       (cTeamAIds[0] === bestTeamBIds[0] && cTeamAIds[1] === bestTeamBIds[1] && 
                        cTeamBIds[0] === bestTeamAIds[0] && cTeamBIds[1] === bestTeamAIds[1]);
            });
            const comboName = selectedCombo ? selectedCombo.name : `우선순위 ${bestPairing.priority}`;
            
            if (topTwoInTeamA || topTwoInTeamB) {
                console.warn(`    ⚠️ 경고: 최강(${topPlayer.userName}, DUPR:${topPlayer.dupr})과 차강(${secondPlayer.userName}, DUPR:${secondPlayer.dupr})이 같은 편에 배정됨!`);
            } else {
                const duplicateStatus = selectedCombo && selectedCombo.hasPartnerDuplicate ? ' (파트너 중복 있음)' : '';
                console.log(`    ✅ 밸런스 조합 선택됨 (${comboName}, 우선순위 ${bestPairing.priority}${duplicateStatus})`);
            }
        }

        // bestPairing에서 priority 제거 (반환 형식 유지)
        if (bestPairing) {
            return { teamA: bestPairing.teamA, teamB: bestPairing.teamB };
        }
        
        return bestPairing;
    }

    /**
     * Phase 1: 경쟁 모드 (라운드 1 & 2)
     */
    generateRound1_2(roundNum) {
        const matches = [];
        const courtCount = this.getCourtCount();
        const sortedPlayers = this.getSortedPlayersByDupr();

        // 상위 4*C명 선택
        const topPlayersCount = 4 * courtCount;
        const selectedPlayers = sortedPlayers.slice(0, topPlayersCount);
        const sittingOut = sortedPlayers.slice(topPlayersCount);

        console.log(`  📋 라운드 ${roundNum}: 상위 ${topPlayersCount}명 선택 (DUPR 순)`);
        console.log(`  📋 선택된 플레이어: ${selectedPlayers.map(p => `${p.userName}(${p.dupr})`).join(', ')}`);
        if (sittingOut.length > 0) {
            console.log(`  📋 대기: ${sittingOut.map(p => `${p.userName}(${p.dupr})`).join(', ')}`);
        }

        // 각 코트별로 플레이어 할당
        for (let court = 1; court <= courtCount; court++) {
            const startIdx = (court - 1) * 4;
            const courtPlayers = selectedPlayers.slice(startIdx, startIdx + 4);

            if (courtPlayers.length < 4) {
                continue;
            }

            let teamA, teamB;
            if (roundNum === 1) {
                // 라운드 1: (Rank 1 & 4) vs (Rank 2 & 3)
                teamA = [courtPlayers[0], courtPlayers[3]];
                teamB = [courtPlayers[1], courtPlayers[2]];
            } else {
                // 라운드 2: (Rank 1 & 3) vs (Rank 2 & 4)
                teamA = [courtPlayers[0], courtPlayers[2]];
                teamB = [courtPlayers[1], courtPlayers[3]];
            }

            console.log(`  🏓 코트 ${court}: ${teamA.map(p => p.userName).join(' & ')} vs ${teamB.map(p => p.userName).join(' & ')}`);

            const match = {
                round: roundNum,
                court: court,
                teamA: teamA,
                teamB: teamB,
                sittingOut: court === 1 ? sittingOut : []
            };
            matches.push(match);

            // 플레이어 통계 업데이트
            for (const player of courtPlayers) {
                player.playCount++;
                const partner = teamA.includes(player)
                    ? (teamA[0] === player ? teamA[1] : teamA[0])
                    : (teamB[0] === player ? teamB[1] : teamB[0]);
                player.partnerHistory.add(partner.userId);
            }
        }

        return matches;
    }

    /**
     * Phase 2: High-Low 스플릿 모드 (라운드 5 & 6)
     */
    generateRound5_6(roundNum) {
        const matches = [];
        const courtCount = this.getCourtCount();

        // 최소 플레이 횟수를 가진 플레이어들 우선 선택
        let candidates = this.getPlayersByLowestPlayCount();

        // 필요한 만큼 선택 (4*C명)
        const neededCount = 4 * courtCount;
        if (candidates.length < neededCount) {
            // 부족하면 다음 최소 플레이 횟수 플레이어 추가
            const remainingPlayers = this.players.filter(p => !candidates.includes(p));
            remainingPlayers.sort((a, b) => {
                if (a.playCount !== b.playCount) {
                    return a.playCount - b.playCount;
                }
                return (b.dupr || 0) - (a.dupr || 0);
            });
            candidates = [...candidates, ...remainingPlayers.slice(0, neededCount - candidates.length)];
        }

        const selectedPlayers = candidates.slice(0, neededCount);
        const sittingOut = this.players.filter(p => !selectedPlayers.includes(p));

        console.log(`  📋 라운드 ${roundNum}: 최소 플레이 횟수 우선 선택 (${neededCount}명)`);
        console.log(`  📋 선택된 플레이어: ${selectedPlayers.map(p => `${p.userName}(${p.dupr}, ${p.playCount}회)`).join(', ')}`);
        if (sittingOut.length > 0) {
            console.log(`  📋 대기: ${sittingOut.map(p => `${p.userName}(${p.dupr}, ${p.playCount}회)`).join(', ')}`);
        }

        // 전체 선택된 플레이어를 DUPR 순으로 정렬 (전체 풀 기준)
        const allSortedPlayers = [...selectedPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));
        console.log(`  📋 전체 풀 DUPR 순: ${allSortedPlayers.map((p, idx) => `${idx+1}등:${p.userName}(${p.dupr})`).join(', ')}`);

        // 각 코트별로 전체 풀 기준으로 플레이어 할당
        // 코트 1: 1등, 4등, 5등, 8등
        // 코트 2: 2등, 3등, 6등, 7등
        // 코트 3: (있다면) 9등, 12등, 13등, 16등 등
        for (let court = 1; court <= courtCount; court++) {
            // 전체 풀 기준으로 코트별 플레이어 선택
            // 코트 1: 인덱스 0, 3, 4, 7 (1등, 4등, 5등, 8등)
            // 코트 2: 인덱스 1, 2, 5, 6 (2등, 3등, 6등, 7등)
            // 코트 3: 인덱스 8, 9, 10, 11 (9등, 10등, 11등, 12등) - 3코트일 때 12명 기준
            // 코트 4 이상: 동일한 패턴 반복 (13등, 16등, 17등, 20등 등)
            const courtIndices = [];
            if (court === 1) {
                // 코트 1: 1등, 4등, 5등, 8등
                courtIndices.push(0, 3, 4, 7);
            } else if (court === 2) {
                // 코트 2: 2등, 3등, 6등, 7등
                courtIndices.push(1, 2, 5, 6);
            } else if (court === 3) {
                // 코트 3: 9등, 10등, 11등, 12등 (3코트일 때 12명 기준)
                courtIndices.push(8, 9, 10, 11);
            } else {
                // 코트 4 이상: 8명 단위 패턴 반복
                // 코트 4: 13등, 16등, 17등, 20등 (baseIdx=12, 8명 단위)
                // 코트 5: 14등, 15등, 18등, 19등 (baseIdx=16, 8명 단위)
                // 패턴: 8명 단위로 나누어서 코트 1,2 패턴 반복
                const groupBaseIdx = Math.floor((court - 1) / 2) * 8; // 8명 단위 그룹의 시작 인덱스
                const groupCourt = ((court - 1) % 2) + 1; // 그룹 내 코트 번호 (1 또는 2)
                
                if (groupCourt === 1) {
                    // 그룹 내 코트 1: baseIdx, baseIdx+3, baseIdx+4, baseIdx+7
                    courtIndices.push(groupBaseIdx, groupBaseIdx + 3, groupBaseIdx + 4, groupBaseIdx + 7);
                } else {
                    // 그룹 내 코트 2: baseIdx+1, baseIdx+2, baseIdx+5, baseIdx+6
                    courtIndices.push(groupBaseIdx + 1, groupBaseIdx + 2, groupBaseIdx + 5, groupBaseIdx + 6);
                }
            }
            
            // 인덱스가 범위를 벗어나지 않도록 필터링
            const validIndices = courtIndices.filter(idx => idx < allSortedPlayers.length);
            if (validIndices.length < 4) {
                // 부족하면 순차적으로 채우기
                let currentIdx = (court - 1) * 4;
                while (validIndices.length < 4 && currentIdx < allSortedPlayers.length) {
                    if (!validIndices.includes(currentIdx)) {
                        validIndices.push(currentIdx);
                    }
                    currentIdx++;
                }
            }
            
            const courtPlayers = validIndices.slice(0, 4).map(idx => allSortedPlayers[idx]);

            if (courtPlayers.length < 4) {
                continue;
            }

            // 코트별 선택된 플레이어를 DUPR 순으로 정렬
            const sortedCourtPlayers = [...courtPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));
            
            // 전체 풀 기준으로 직접 매칭 (코트별 정렬 없이)
            let teamA, teamB;
            if (roundNum === 5) {
                // 라운드 5: 전체 풀 기준 (Best + Worst) vs (2nd Best + 2nd Worst)
                // 코트 1: 1등(최강) + 8등(최약) vs 4등 + 5등
                // 코트 2: 2등(차강) + 7등(차약) vs 3등 + 6등
                if (courtCount === 1) {
                    // 코트 1개일 때: 선택된 4명 기준으로 밸런스 조합
                    // sortedCourtPlayers[0]=최강, [1]=차강, [2]=차약, [3]=최약
                    teamA = [sortedCourtPlayers[0], sortedCourtPlayers[3]]; // 최강 + 최약
                    teamB = [sortedCourtPlayers[1], sortedCourtPlayers[2]]; // 차강 + 차약
                } else if (court === 1) {
                    // 코트 1: 인덱스 0(1등), 3(4등), 4(5등), 7(8등)
                    teamA = [allSortedPlayers[0], allSortedPlayers[7]]; // 최강 + 최약
                    teamB = [allSortedPlayers[3], allSortedPlayers[4]]; // 4등 + 5등
                } else if (court === 2) {
                    // 코트 2: 인덱스 1(2등), 2(3등), 5(6등), 6(7등)
                    teamA = [allSortedPlayers[1], allSortedPlayers[6]]; // 차강 + 차약
                    teamB = [allSortedPlayers[2], allSortedPlayers[5]]; // 3등 + 6등
                } else if (court === 3) {
                    // 코트 3: 9등(최강) + 12등(최약) vs 10등 + 11등
                    teamA = [allSortedPlayers[8], allSortedPlayers[11]]; // 9등 + 12등
                    teamB = [allSortedPlayers[9], allSortedPlayers[10]]; // 10등 + 11등
                } else {
                    // 코트 4 이상: 8명 단위 패턴 반복
                    // 코트 4: 13등 + 20등 vs 16등 + 17등 (groupBaseIdx=12, groupCourt=1)
                    // 코트 5: 14등 + 19등 vs 15등 + 18등 (groupBaseIdx=16, groupCourt=2)
                    const groupBaseIdx = Math.floor((court - 1) / 2) * 8; // 8명 단위 그룹의 시작 인덱스
                    const groupCourt = ((court - 1) % 2) + 1; // 그룹 내 코트 번호 (1 또는 2)
                    
                    if (groupCourt === 1) {
                        // 그룹 내 코트 1: groupBaseIdx(최강) + groupBaseIdx+7(최약) vs groupBaseIdx+3 + groupBaseIdx+4
                        teamA = [allSortedPlayers[groupBaseIdx], allSortedPlayers[groupBaseIdx + 7]];
                        teamB = [allSortedPlayers[groupBaseIdx + 3], allSortedPlayers[groupBaseIdx + 4]];
                    } else {
                        // 그룹 내 코트 2: groupBaseIdx+1(차강) + groupBaseIdx+6(차약) vs groupBaseIdx+2 + groupBaseIdx+5
                        teamA = [allSortedPlayers[groupBaseIdx + 1], allSortedPlayers[groupBaseIdx + 6]];
                        teamB = [allSortedPlayers[groupBaseIdx + 2], allSortedPlayers[groupBaseIdx + 5]];
                    }
                }
                console.log(`  🏓 코트 ${court}: 전체 풀 기준 High-Low 스플릿 (최강+최약 vs 중간)`);
            } else {
                // 라운드 6: 약간 다른 조합 (중복 방지)
                // 코트 1: 1등(최강) + 5등 vs 4등 + 8등(최약)
                // 코트 2: 2등(차강) + 6등 vs 3등 + 7등(차약)
                if (courtCount === 1) {
                    // 코트 1개일 때: 선택된 4명 기준으로 밸런스 조합 (라운드 5와 다른 조합)
                    // sortedCourtPlayers[0]=최강, [1]=차강, [2]=차약, [3]=최약
                    teamA = [sortedCourtPlayers[0], sortedCourtPlayers[2]]; // 최강 + 차약
                    teamB = [sortedCourtPlayers[1], sortedCourtPlayers[3]]; // 차강 + 최약
                } else if (court === 1) {
                    // 코트 1: 인덱스 0(1등), 3(4등), 4(5등), 7(8등)
                    teamA = [allSortedPlayers[0], allSortedPlayers[4]]; // 최강 + 5등
                    teamB = [allSortedPlayers[3], allSortedPlayers[7]]; // 4등 + 최약
                } else if (court === 2) {
                    // 코트 2: 인덱스 1(2등), 2(3등), 5(6등), 6(7등)
                    teamA = [allSortedPlayers[1], allSortedPlayers[5]]; // 차강 + 6등
                    teamB = [allSortedPlayers[2], allSortedPlayers[6]]; // 3등 + 차약
                } else if (court === 3) {
                    // 코트 3: 9등(최강) + 11등 vs 10등 + 12등(최약)
                    teamA = [allSortedPlayers[8], allSortedPlayers[10]]; // 9등 + 11등
                    teamB = [allSortedPlayers[9], allSortedPlayers[11]]; // 10등 + 12등
                } else {
                    // 코트 4 이상: 8명 단위 패턴 반복
                    // 코트 4: 13등 + 17등 vs 16등 + 20등 (groupBaseIdx=12, groupCourt=1)
                    // 코트 5: 14등 + 18등 vs 15등 + 19등 (groupBaseIdx=16, groupCourt=2)
                    const groupBaseIdx = Math.floor((court - 1) / 2) * 8; // 8명 단위 그룹의 시작 인덱스
                    const groupCourt = ((court - 1) % 2) + 1; // 그룹 내 코트 번호 (1 또는 2)
                    
                    if (groupCourt === 1) {
                        // 그룹 내 코트 1: groupBaseIdx(최강) + groupBaseIdx+4 vs groupBaseIdx+3 + groupBaseIdx+7(최약)
                        teamA = [allSortedPlayers[groupBaseIdx], allSortedPlayers[groupBaseIdx + 4]];
                        teamB = [allSortedPlayers[groupBaseIdx + 3], allSortedPlayers[groupBaseIdx + 7]];
                    } else {
                        // 그룹 내 코트 2: groupBaseIdx+1(차강) + groupBaseIdx+5 vs groupBaseIdx+2 + groupBaseIdx+6(차약)
                        teamA = [allSortedPlayers[groupBaseIdx + 1], allSortedPlayers[groupBaseIdx + 5]];
                        teamB = [allSortedPlayers[groupBaseIdx + 2], allSortedPlayers[groupBaseIdx + 6]];
                    }
                }
                console.log(`  🏓 코트 ${court}: 전체 풀 기준 High-Low 스플릿 (변형)`);
            }

            console.log(`  🏓 코트 ${court}: ${teamA.map(p => p.userName).join(' & ')} vs ${teamB.map(p => p.userName).join(' & ')}`);
            if (courtCount === 1) {
                console.log(`     코트별 순위: ${sortedCourtPlayers.map((p, idx) => `${idx+1}등:${p.userName}(${p.dupr})`).join(', ')}`);
            } else {
                console.log(`     전체 풀 순위: 코트 ${court} = ${validIndices.slice(0, 4).map(idx => `${idx+1}등:${allSortedPlayers[idx].userName}(${allSortedPlayers[idx].dupr})`).join(', ')}`);
            }

            const match = {
                round: roundNum,
                court: court,
                teamA: teamA,
                teamB: teamB,
                sittingOut: court === 1 ? sittingOut : []
            };
            matches.push(match);

            // 플레이어 통계 업데이트
            for (const player of courtPlayers) {
                player.playCount++;
                const partner = teamA.includes(player)
                    ? (teamA[0] === player ? teamA[1] : teamA[0])
                    : (teamB[0] === player ? teamB[1] : teamB[0]);
                player.partnerHistory.add(partner.userId);
            }
        }

        return matches;
    }

    /**
     * Phase 3: 균형 및 공정 모드 (라운드 3, 4, 7, 8)
     * 전체 풀 기준으로 매칭하여 더 다양한 조합 생성
     */
    generateRoundBalanced(roundNum) {
        const matches = [];
        const courtCount = this.getCourtCount();

        // 최소 플레이 횟수를 가진 플레이어들 우선 선택
        let candidates = this.getPlayersByLowestPlayCount();

        // 필요한 만큼 선택 (4*C명)
        const neededCount = 4 * courtCount;
        if (candidates.length < neededCount) {
            // 부족하면 다음 최소 플레이 횟수 플레이어 추가
            const remainingPlayers = this.players.filter(p => !candidates.includes(p));
            remainingPlayers.sort((a, b) => {
                if (a.playCount !== b.playCount) {
                    return a.playCount - b.playCount;
                }
                return (b.dupr || 0) - (a.dupr || 0);
            });
            candidates = [...candidates, ...remainingPlayers.slice(0, neededCount - candidates.length)];
        }

        const selectedPlayers = candidates.slice(0, neededCount);
        const sittingOut = this.players.filter(p => !selectedPlayers.includes(p));

        console.log(`  📋 라운드 ${roundNum}: 최소 플레이 횟수 우선 선택 후 전체 풀 기준 비용 함수 최적화 (${neededCount}명)`);
        console.log(`  📋 선택된 플레이어: ${selectedPlayers.map(p => `${p.userName}(${p.dupr}, ${p.playCount}회)`).join(', ')}`);
        if (sittingOut.length > 0) {
            console.log(`  📋 대기: ${sittingOut.map(p => `${p.userName}(${p.dupr}, ${p.playCount}회)`).join(', ')}`);
        }

        // 이전 모든 경기 조합 추적 (중복 방지)
        const previousMatches = [...this.matches];

        // 전체 선택된 플레이어를 DUPR 순으로 정렬 (전체 풀 기준)
        const allSortedPlayers = [...selectedPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));
        console.log(`  📋 전체 풀 DUPR 순: ${allSortedPlayers.map((p, idx) => `${idx+1}등:${p.userName}(${p.dupr})`).join(', ')}`);

        // 각 코트별로 전체 풀 기준으로 플레이어 할당 후 최적 페어링 찾기
        for (let court = 1; court <= courtCount; court++) {
            // 전체 풀 기준으로 코트별 플레이어 선택 (라운드별로 다른 패턴)
            const courtIndices = this.getCourtIndicesForBalancedRound(court, courtCount, roundNum, allSortedPlayers.length);
            
            // 인덱스가 범위를 벗어나지 않도록 필터링
            const validIndices = courtIndices.filter(idx => idx < allSortedPlayers.length);
            if (validIndices.length < 4) {
                // 부족하면 순차적으로 채우기
                let currentIdx = (court - 1) * 4;
                while (validIndices.length < 4 && currentIdx < allSortedPlayers.length) {
                    if (!validIndices.includes(currentIdx)) {
                        validIndices.push(currentIdx);
                    }
                    currentIdx++;
                }
            }
            
            const courtPlayers = validIndices.slice(0, 4).map(idx => allSortedPlayers[idx]);

            if (courtPlayers.length < 4) {
                continue;
            }

            // 최적 페어링 찾기 (이전 모든 경기 조합 고려, 전체 정렬된 플레이어 전달)
            const bestPairing = this.findBestPairing(courtPlayers, previousMatches, allSortedPlayers);

            console.log(`  🏓 코트 ${court}: ${bestPairing.teamA.map(p => p.userName).join(' & ')} vs ${bestPairing.teamB.map(p => p.userName).join(' & ')}`);
            console.log(`     전체 풀 순위: 코트 ${court} = ${validIndices.slice(0, 4).map(idx => `${idx+1}등:${allSortedPlayers[idx].userName}(${allSortedPlayers[idx].dupr})`).join(', ')}`);
            console.log(`     파트너 중복: ${bestPairing.teamA.map(p => {
                const partner = bestPairing.teamA[0] === p ? bestPairing.teamA[1] : bestPairing.teamA[0];
                return p.partnerHistory.has(partner.userId) ? '✓' : '✗';
            }).join(', ')}`);

            const match = {
                round: roundNum,
                court: court,
                teamA: bestPairing.teamA,
                teamB: bestPairing.teamB,
                sittingOut: court === 1 ? sittingOut : []
            };
            matches.push(match);
            previousMatches.push(match); // 같은 라운드 내 다른 코트에서도 중복 방지

            // 플레이어 통계 업데이트
            for (const player of courtPlayers) {
                player.playCount++;
                const partner = bestPairing.teamA.includes(player)
                    ? (bestPairing.teamA[0] === player ? bestPairing.teamA[1] : bestPairing.teamA[0])
                    : (bestPairing.teamB[0] === player ? bestPairing.teamB[1] : bestPairing.teamB[0]);
                player.partnerHistory.add(partner.userId);
            }
        }

        return matches;
    }

    /**
     * 균형 모드 라운드별 코트 인덱스 계산 (라운드별로 다른 패턴 적용)
     * @param {number} court - 코트 번호 (1부터 시작)
     * @param {number} courtCount - 전체 코트 수
     * @param {number} roundNum - 라운드 번호 (3, 4, 7, 8)
     * @param {number} totalPlayers - 전체 플레이어 수
     * @returns {Array<number>} 코트별 플레이어 인덱스 배열
     */
    getCourtIndicesForBalancedRound(court, courtCount, roundNum, totalPlayers) {
        const courtIndices = [];
        
        if (roundNum === 3) {
            // 라운드 3: 최강+최약 vs 차강+차약 패턴 (라운드 5와 유사하지만 비용 함수로 최적화)
            // 코트 1: 1등, 4등, 5등, 8등
            // 코트 2: 2등, 3등, 6등, 7등
            if (court === 1) {
                courtIndices.push(0, 3, 4, 7);
            } else if (court === 2) {
                courtIndices.push(1, 2, 5, 6);
            } else if (court === 3) {
                courtIndices.push(8, 9, 10, 11);
            } else {
                const groupBaseIdx = Math.floor((court - 1) / 2) * 8;
                const groupCourt = ((court - 1) % 2) + 1;
                if (groupCourt === 1) {
                    courtIndices.push(groupBaseIdx, groupBaseIdx + 3, groupBaseIdx + 4, groupBaseIdx + 7);
                } else {
                    courtIndices.push(groupBaseIdx + 1, groupBaseIdx + 2, groupBaseIdx + 5, groupBaseIdx + 6);
                }
            }
        } else if (roundNum === 4) {
            // 라운드 4: 최강+차약 vs 차강+최약 패턴 (라운드 6와 유사하지만 비용 함수로 최적화)
            // 코트 1: 1등, 4등, 5등, 8등 (라운드 3과 동일하지만 비용 함수로 다른 조합 선택)
            // 코트 2: 2등, 3등, 6등, 7등
            if (court === 1) {
                courtIndices.push(0, 3, 4, 7);
            } else if (court === 2) {
                courtIndices.push(1, 2, 5, 6);
            } else if (court === 3) {
                courtIndices.push(8, 9, 10, 11);
            } else {
                const groupBaseIdx = Math.floor((court - 1) / 2) * 8;
                const groupCourt = ((court - 1) % 2) + 1;
                if (groupCourt === 1) {
                    courtIndices.push(groupBaseIdx, groupBaseIdx + 3, groupBaseIdx + 4, groupBaseIdx + 7);
                } else {
                    courtIndices.push(groupBaseIdx + 1, groupBaseIdx + 2, groupBaseIdx + 5, groupBaseIdx + 6);
                }
            }
        } else if (roundNum === 7) {
            // 라운드 7: 최강+5등 vs 4등+최약 패턴 (다양성 증가)
            // 코트 1: 1등, 3등, 6등, 8등
            // 코트 2: 2등, 4등, 5등, 7등
            if (court === 1) {
                courtIndices.push(0, 2, 5, 7);
            } else if (court === 2) {
                courtIndices.push(1, 3, 4, 6);
            } else if (court === 3) {
                courtIndices.push(8, 10, 11, 9);
            } else {
                const groupBaseIdx = Math.floor((court - 1) / 2) * 8;
                const groupCourt = ((court - 1) % 2) + 1;
                if (groupCourt === 1) {
                    courtIndices.push(groupBaseIdx, groupBaseIdx + 2, groupBaseIdx + 5, groupBaseIdx + 7);
                } else {
                    courtIndices.push(groupBaseIdx + 1, groupBaseIdx + 3, groupBaseIdx + 4, groupBaseIdx + 6);
                }
            }
        } else if (roundNum === 8) {
            // 라운드 8: 최강+6등 vs 3등+최약 패턴 (다양성 증가)
            // 코트 1: 1등, 2등, 7등, 8등
            // 코트 2: 3등, 4등, 5등, 6등
            if (court === 1) {
                courtIndices.push(0, 1, 6, 7);
            } else if (court === 2) {
                courtIndices.push(2, 3, 4, 5);
            } else if (court === 3) {
                courtIndices.push(8, 9, 10, 11);
            } else {
                const groupBaseIdx = Math.floor((court - 1) / 2) * 8;
                const groupCourt = ((court - 1) % 2) + 1;
                if (groupCourt === 1) {
                    courtIndices.push(groupBaseIdx, groupBaseIdx + 1, groupBaseIdx + 6, groupBaseIdx + 7);
                } else {
                    courtIndices.push(groupBaseIdx + 2, groupBaseIdx + 3, groupBaseIdx + 4, groupBaseIdx + 5);
                }
            }
        }
        
        return courtIndices;
    }

    /**
     * 전체 8라운드 일정 생성
     */
    generateSchedule() {
        this.matches = [];

        for (let roundNum = 1; roundNum <= this.totalRounds; roundNum++) {
            let matches;
            if (roundNum === 1 || roundNum === 2) {
                // Phase 1: 경쟁 모드
                console.log(`🎯 라운드 ${roundNum}: 경쟁 모드 (Phase 1)`);
                matches = this.generateRound1_2(roundNum);
            } else if (roundNum === 5 || roundNum === 6) {
                // Phase 2: High-Low 스플릿 모드
                console.log(`🎯 라운드 ${roundNum}: High-Low 스플릿 모드 (Phase 2)`);
                matches = this.generateRound5_6(roundNum);
            } else {
                // Phase 3: 균형 및 공정 모드
                console.log(`🎯 라운드 ${roundNum}: 균형 및 공정 모드 (Phase 3)`);
                matches = this.generateRoundBalanced(roundNum);
            }

            console.log(`✅ 라운드 ${roundNum} 생성 완료: ${matches.length}경기`);
            this.matches.push(...matches);
        }

        console.log(`📊 전체 일정 생성 완료: 총 ${this.matches.length}경기`);
        return this.matches;
    }

    /**
     * 웹 애플리케이션 형식으로 변환 (buildMatchSchedule 반환 형식에 맞춤)
     */
    toWebFormat() {
        const schedule = [];
        const unassignedPlayers = [];

        for (const match of this.matches) {
            // sittingOut은 첫 번째 코트의 것만 사용
            if (match.court === 1 && match.sittingOut.length > 0) {
                unassignedPlayers.push(...match.sittingOut);
            }

            schedule.push({
                round: match.round,
                roundNumber: match.round, // 기존 시스템 호환성
                court: match.court,
                teamA: match.teamA.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    dupr: p.dupr || 0,
                    internalRating: p.internalRating || 0,
                    score: p.score || 0
                })),
                teamB: match.teamB.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    dupr: p.dupr || 0,
                    internalRating: p.internalRating || 0,
                    score: p.score || 0
                }))
            });
        }

        // 중복 제거
        const uniqueUnassigned = [];
        const seen = new Set();
        for (const player of unassignedPlayers) {
            if (!seen.has(player.userId)) {
                seen.add(player.userId);
                uniqueUnassigned.push({
                    userId: player.userId,
                    userName: player.userName,
                    dupr: player.dupr || 0,
                    internalRating: player.internalRating || 0,
                    score: player.score || 0
                });
            }
        }

        return {
            schedule: schedule,
            unassignedPlayers: uniqueUnassigned
        };
    }
}

// 전역으로 내보내기 (웹에서 사용 가능하도록)
if (typeof window !== 'undefined') {
    window.PickleballBalanceScheduler = PickleballBalanceScheduler;
}

