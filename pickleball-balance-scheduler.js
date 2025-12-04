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
        // 밸런스 조합 우선순위:
        // 1. (0,3) vs (1,2) - 최강+최약 vs 차강+차약 (완벽 밸런스) - 우선순위 1
        // 2. (0,2) vs (1,3) - 최강+차약 vs 차강+최약 (밸런스) - 우선순위 2
        // 3. (0,2) vs (1,2) - 최강+중간 vs 차강+중간 (밸런스, 중간 수준 플레이어 활용) - 우선순위 3
        // (0,1) vs (2,3) - 최강+차강 vs 차약+최약 조합은 밸런스가 깨지므로 제외
        // 
        // 참고: 4명 기준으로 인덱스는:
        // 0 = 최강 (1등), 1 = 차강 (2등), 2 = 차약 (3등, 중간), 3 = 최약 (4등)
        // "최강+중간 vs 차강+중간"의 의미를 다시 해석:
        // - 4명 기준: 최강(0), 차강(1), 차약(2=중간), 최약(3)
        // - "중간"을 차약(2)로 해석하면: (0,2) vs (1,2)는 불가능 (중복)
        // - 대안: 최강과 차강이 각각 비슷한 수준의 플레이어와 팀을 이루는 것
        //   → (0,2) vs (1,3) = 조합 2 (이미 포함)
        //   → (0,3) vs (1,2) = 조합 1 (이미 포함)
        // 
        // 하지만 더 다양한 조합을 위해, 조합 1의 변형을 추가 고려:
        // - (0,3) vs (1,2)의 변형: (0,2) vs (1,3) = 조합 2
        // - 또는 (0,1) vs (2,3)을 고려하지만 밸런스가 깨지므로 제외
        // 
        // 실제로 "최강+중간 vs 차강+중간"을 구현하려면:
        // - 최강(0) + 중간 수준(2) vs 차강(1) + 중간 수준(3) = 조합 2
        // - 또는 최강(0) + 중간 수준(평균) vs 차강(1) + 중간 수준(평균)
        //   → 하지만 4명만 있으므로, 중간 수준을 차약(2)와 최약(3)의 평균으로 해석
        //   → (0,2) vs (1,3) 또는 (0,3) vs (1,2) = 이미 포함됨
        // 
        // 따라서 현재 조합 1, 2가 "최강+중간 vs 차강+중간"의 의미를 모두 포함함
        // 하지만 사용자가 원하는 것은 아마도 더 다양한 조합이므로,
        // 조합 2의 변형을 추가로 고려할 수 있습니다:
        // 우선순위: "최강+중간 vs 차강+중간" 조합을 먼저 고려
        // 4명 기준: 0=최강, 1=차강, 2=차약(중간), 3=최약
        // "최강+중간 vs 차강+중간" = 최강(0) + 차약(2) vs 차강(1) + 최약(3) = (0,2) vs (1,3)
        const combinations = [
            { combo: [[0, 2], [1, 3]], priority: 1, name: '최강+중간 vs 차강+중간' }, // 최강+차약 vs 차강+최약 (최우선)
            { combo: [[0, 3], [1, 2]], priority: 2, name: '최강+최약 vs 차강+차약' }  // 완벽 밸런스
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
        for (const prevMatch of previousMatches) {
            const teamAIds = [prevMatch.teamA[0].userId, prevMatch.teamA[1].userId].sort().join(',');
            const teamBIds = [prevMatch.teamB[0].userId, prevMatch.teamB[1].userId].sort().join(',');
            previousCombinations.add(`${teamAIds}|${teamBIds}`);
            previousCombinations.add(`${teamBIds}|${teamAIds}`); // 역순도 추가
        }

        // 우선순위 순으로 정렬 (밸런스 조합 우선)
        combinations.sort((a, b) => a.priority - b.priority);

        for (const { combo, name, priority } of combinations) {
            // sortedPlayers 기준으로 조합 생성 (코트별 4명의 순위 기준)
            const teamA = [sortedPlayers[combo[0][0]], sortedPlayers[combo[0][1]]];
            const teamB = [sortedPlayers[combo[1][0]], sortedPlayers[combo[1][1]]];

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

            console.log(`    💰 조합 "${name}" (우선순위 ${priority}): 비용=${cost.toFixed(2)} (TeamA: ${teamA.map(p => p.userName).join('&')}, TeamB: ${teamB.map(p => p.userName).join('&')})`);

            // 우선순위가 더 높거나, 우선순위가 같고 비용이 더 낮으면 선택
            if (bestPairing === null || 
                priority < bestPairing.priority || 
                (priority === bestPairing.priority && cost < bestCost)) {
                bestCost = cost;
                bestPairing = { teamA, teamB, priority };
            }
        }

        // 모든 조합이 중복이면 비용이 가장 낮은 것 선택 (밸런스 페널티 고려)
        if (!bestPairing) {
            console.log(`    ⚠️ 모든 조합이 중복이므로 비용이 가장 낮은 조합 선택`);
            for (const { combo, name, priority } of combinations) {
                // sortedPlayers 기준으로 조합 생성 (코트별 4명의 순위 기준)
                const teamA = [sortedPlayers[combo[0][0]], sortedPlayers[combo[0][1]]];
                const teamB = [sortedPlayers[combo[1][0]], sortedPlayers[combo[1][1]]];
                const cost = this.calculateCost(teamA, teamB, globalSorted);
                console.log(`    💰 조합 "${name}" (우선순위 ${priority}): 비용=${cost.toFixed(2)} (TeamA: ${teamA.map(p => p.userName).join('&')}, TeamB: ${teamB.map(p => p.userName).join('&')})`);
                // 중복이므로 우선순위보다 비용만 고려
                if (bestPairing === null || cost < bestCost) {
                    bestCost = cost;
                    bestPairing = { teamA, teamB, priority };
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
                const priorityName = bestPairing.priority === 1 ? '최강+중간 vs 차강+중간' : '최강+최약 vs 차강+차약';
                console.log(`    ✅ 밸런스 조합 선택됨 (${priorityName}, 우선순위 ${bestPairing.priority})`);
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

            // 전체 풀 기준으로 직접 매칭 (코트별 정렬 없이)
            let teamA, teamB;
            if (roundNum === 5) {
                // 라운드 5: 전체 풀 기준 (Best + Worst) vs (2nd Best + 2nd Worst)
                // 코트 1: 1등(최강) + 8등(최약) vs 4등 + 5등
                // 코트 2: 2등(차강) + 7등(차약) vs 3등 + 6등
                if (court === 1) {
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
                if (court === 1) {
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
            console.log(`     전체 풀 순위: 코트 ${court} = ${validIndices.slice(0, 4).map(idx => `${idx+1}등:${allSortedPlayers[idx].userName}(${allSortedPlayers[idx].dupr})`).join(', ')}`);

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

        // 선택된 플레이어를 플레이 횟수 순으로 정렬 (같은 횟수면 DUPR 높은 순)
        // 최소 플레이 횟수 우선 선택이 제대로 적용되도록 보장
        const selectedPlayers = candidates.slice(0, neededCount).sort((a, b) => {
            if (a.playCount !== b.playCount) {
                return a.playCount - b.playCount;
            }
            // 같은 플레이 횟수일 때는 DUPR 높은 순으로 선택
            return (b.dupr || 0) - (a.dupr || 0);
        });
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

