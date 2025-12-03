/**
 * 피클볼 밸런스 모드 스케줄러 (Python 스크립트를 JavaScript로 변환)
 * 8라운드 경기 일정을 동적 플레이어 수와 DUPR 레이팅 기반으로 생성합니다.
 */

class PickleballBalanceScheduler {
    constructor(players, weightA = 10.0, weightB = 1.0) {
        /**
         * @param {Array} players - 플레이어 배열 [{userId, userName, dupr, internalRating?, score?}, ...]
         * @param {number} weightA - 파트너 중복 비용 가중치 (기본값: 10.0)
         * @param {number} weightB - DUPR 팀 차이 비용 가중치 (기본값: 1.0)
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
        this.totalRounds = 8;
        this.matches = [];
    }

    /**
     * 코트 수 계산: floor(총 플레이어 수 / 4)
     */
    getCourtCount() {
        return Math.floor(this.players.length / 4);
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
     * Cost = (Weight_A * Partner_Duplicate_Count) + (Weight_B * DUPR_Team_Diff) + (Weight_C * Balance_Penalty)
     * @param {Array} teamA - 팀 A 플레이어 배열
     * @param {Array} teamB - 팀 B 플레이어 배열
     * @param {Array} allSortedPlayers - DUPR 순으로 정렬된 전체 플레이어 풀 배열 (밸런스 페널티 계산용)
     */
    calculateCost(teamA, teamB, allSortedPlayers = null) {
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

        const cost = (this.weightA * partnerDuplicateCount) + (this.weightB * duprTeamDiff) + balancePenalty;
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

        // 코트별 플레이어를 DUPR 순으로 정렬 (로컬 정렬)
        const sortedPlayers = [...selectedPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));
        
        // 전체 플레이어 풀의 최강/차강 찾기 (allSortedPlayers가 제공된 경우)
        // allSortedPlayers가 없으면 코트별 정렬된 플레이어 사용
        const globalSorted = allSortedPlayers || sortedPlayers;

        let bestPairing = null;
        let bestCost = Infinity;

        // 4명 중 2명씩 선택하는 밸런스 조합만 고려
        // 밸런스 조합 우선순위:
        // 1. (0,3) vs (1,2) - 최강+최약 vs 차강+차약 (완벽 밸런스) - 우선순위 1
        // 2. (0,2) vs (1,3) - 최강+차약 vs 차강+최약 (밸런스) - 우선순위 2
        // (0,1) vs (2,3) - 최강+차강 vs 차약+최약 조합은 밸런스가 깨지므로 제외
        const combinations = [
            { combo: [[0, 3], [1, 2]], priority: 1, name: '최강+최약 vs 차강+차약' }, // 완벽 밸런스
            { combo: [[0, 2], [1, 3]], priority: 2, name: '최강+차약 vs 차강+최약' }  // 밸런스
        ];

        // 이전 경기 조합을 문자열로 변환하여 비교
        const previousCombinations = new Set();
        for (const prevMatch of previousMatches) {
            const teamAIds = [prevMatch.teamA[0].userId, prevMatch.teamA[1].userId].sort().join(',');
            const teamBIds = [prevMatch.teamB[0].userId, prevMatch.teamB[1].userId].sort().join(',');
            previousCombinations.add(`${teamAIds}|${teamBIds}`);
            previousCombinations.add(`${teamBIds}|${teamAIds}`); // 역순도 추가
        }

        // 우선순위 순으로 정렬 (밸런스 조합 우선)
        combinations.sort((a, b) => a.priority - b.priority);

        for (const { combo, name } of combinations) {
            const teamA = [selectedPlayers[combo[0][0]], selectedPlayers[combo[0][1]]];
            const teamB = [selectedPlayers[combo[1][0]], selectedPlayers[combo[1][1]]];

            // 이전 경기와 중복 확인
            const teamAIds = [teamA[0].userId, teamA[1].userId].sort().join(',');
            const teamBIds = [teamB[0].userId, teamB[1].userId].sort().join(',');
            const currentCombination = `${teamAIds}|${teamBIds}`;

            // 완전히 동일한 조합이면 스킵 (중복 방지)
            if (previousCombinations.has(currentCombination)) {
                console.log(`    ⚠️ 조합 "${name}" 스킵: 이전 경기와 중복`);
                continue;
            }

            // 비용 계산 (밸런스 페널티 포함, 전체 플레이어 풀의 최강/차강 기준)
            const cost = this.calculateCost(teamA, teamB, globalSorted);

            console.log(`    💰 조합 "${name}": 비용=${cost.toFixed(2)}`);

            if (cost < bestCost) {
                bestCost = cost;
                bestPairing = { teamA, teamB };
            }
        }

        // 모든 조합이 중복이면 비용이 가장 낮은 것 선택 (밸런스 페널티 고려)
        if (!bestPairing) {
            console.log(`    ⚠️ 모든 조합이 중복이므로 비용이 가장 낮은 조합 선택`);
            for (const { combo, name } of combinations) {
                const teamA = [selectedPlayers[combo[0][0]], selectedPlayers[combo[0][1]]];
                const teamB = [selectedPlayers[combo[1][0]], selectedPlayers[combo[1][1]]];
                const cost = this.calculateCost(teamA, teamB, globalSorted);
                console.log(`    💰 조합 "${name}": 비용=${cost.toFixed(2)}`);
                if (cost < bestCost) {
                    bestCost = cost;
                    bestPairing = { teamA, teamB };
                }
            }
        }

        if (bestPairing && globalSorted.length >= 2) {
            // 전체 플레이어 풀의 최강과 차강 확인
            const topPlayer = globalSorted[0];
            const secondPlayer = globalSorted[1];
            
            const bestTeamAIds = [bestPairing.teamA[0].userId, bestPairing.teamA[1].userId];
            const bestTeamBIds = [bestPairing.teamB[0].userId, bestPairing.teamB[1].userId];
            
            const topTwoInTeamA = bestTeamAIds.includes(topPlayer.userId) && bestTeamAIds.includes(secondPlayer.userId);
            const topTwoInTeamB = bestTeamBIds.includes(topPlayer.userId) && bestTeamBIds.includes(secondPlayer.userId);
            
            if (topTwoInTeamA || topTwoInTeamB) {
                console.warn(`    ⚠️ 경고: 최강(${topPlayer.userName}, DUPR:${topPlayer.dupr})과 차강(${secondPlayer.userName}, DUPR:${secondPlayer.dupr})이 같은 편에 배정됨!`);
            } else {
                console.log(`    ✅ 밸런스 조합 선택됨`);
            }
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

        // 각 코트별로 플레이어 할당
        for (let court = 1; court <= courtCount; court++) {
            const startIdx = (court - 1) * 4;
            const courtPlayers = selectedPlayers.slice(startIdx, startIdx + 4);

            if (courtPlayers.length < 4) {
                continue;
            }

            // DUPR 순으로 정렬
            const courtPlayersSorted = [...courtPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));

            let teamA, teamB;
            if (roundNum === 5) {
                // 라운드 5: (Best + Worst) vs (2nd Best + 2nd Worst)
                teamA = [courtPlayersSorted[0], courtPlayersSorted[3]];
                teamB = [courtPlayersSorted[1], courtPlayersSorted[2]];
            } else {
                // 라운드 6: 약간 다른 조합 (중복 방지)
                teamA = [courtPlayersSorted[0], courtPlayersSorted[2]];
                teamB = [courtPlayersSorted[1], courtPlayersSorted[3]];
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
     * Phase 3: 균형 및 공정 모드 (라운드 3, 4, 7, 8)
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

        console.log(`  📋 라운드 ${roundNum}: 최소 플레이 횟수 우선 선택 후 비용 함수 최적화 (${neededCount}명)`);
        console.log(`  📋 선택된 플레이어: ${selectedPlayers.map(p => `${p.userName}(${p.dupr}, ${p.playCount}회)`).join(', ')}`);
        if (sittingOut.length > 0) {
            console.log(`  📋 대기: ${sittingOut.map(p => `${p.userName}(${p.dupr}, ${p.playCount}회)`).join(', ')}`);
        }

        // 이전 모든 경기 조합 추적 (중복 방지)
        const previousMatches = [...this.matches];

        // 전체 선택된 플레이어를 DUPR 순으로 정렬 (밸런스 페널티 계산용)
        const allSortedPlayers = [...selectedPlayers].sort((a, b) => (b.dupr || 0) - (a.dupr || 0));

        // 각 코트별로 최적 페어링 찾기
        for (let court = 1; court <= courtCount; court++) {
            const startIdx = (court - 1) * 4;
            const courtPlayers = selectedPlayers.slice(startIdx, startIdx + 4);

            if (courtPlayers.length < 4) {
                continue;
            }

            // 최적 페어링 찾기 (이전 모든 경기 조합 고려, 전체 정렬된 플레이어 전달)
            const bestPairing = this.findBestPairing(courtPlayers, previousMatches, allSortedPlayers);

            console.log(`  🏓 코트 ${court}: ${bestPairing.teamA.map(p => p.userName).join(' & ')} vs ${bestPairing.teamB.map(p => p.userName).join(' & ')}`);
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

