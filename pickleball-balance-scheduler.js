/**
 * 피클볼 밸런스 모드 스케줄러 (Python 스크립트를 JavaScript로 변환)
 * 8라운드 경기 일정을 동적 플레이어 수와 DUPR 레이팅 기반으로 생성합니다.
 */

class PickleballBalanceScheduler {
    constructor(players, weightA = 10.0, weightB = 1.0) {
        /**
         * @param {Array} players - 플레이어 배열 [{userId, userName, dupr}, ...]
         * @param {number} weightA - 파트너 중복 비용 가중치 (기본값: 10.0)
         * @param {number} weightB - DUPR 팀 차이 비용 가중치 (기본값: 1.0)
         */
        this.players = players.map(p => ({
            ...p,
            playCount: 0,
            partnerHistory: new Set()
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
     * Cost = (Weight_A * Partner_Duplicate_Count) + (Weight_B * DUPR_Team_Diff)
     */
    calculateCost(teamA, teamB) {
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

        const cost = (this.weightA * partnerDuplicateCount) + (this.weightB * duprTeamDiff);
        return cost;
    }

    /**
     * 선택된 플레이어들 중 최적의 페어링 찾기 (비용 함수 최소화)
     */
    findBestPairing(selectedPlayers) {
        if (selectedPlayers.length < 4) {
            throw new Error('최소 4명의 플레이어가 필요합니다.');
        }

        let bestPairing = null;
        let bestCost = Infinity;

        // 4명 중 2명씩 선택하는 모든 조합 (중복 제거)
        // 총 3가지 조합만 고려: (0,1) vs (2,3), (0,2) vs (1,3), (0,3) vs (1,2)
        const combinations = [
            [[0, 1], [2, 3]],
            [[0, 2], [1, 3]],
            [[0, 3], [1, 2]]
        ];

        for (const combo of combinations) {
            const teamA = [selectedPlayers[combo[0][0]], selectedPlayers[combo[0][1]]];
            const teamB = [selectedPlayers[combo[1][0]], selectedPlayers[combo[1][1]]];

            const cost = this.calculateCost(teamA, teamB);

            if (cost < bestCost) {
                bestCost = cost;
                bestPairing = { teamA, teamB };
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

        // 각 코트별로 최적 페어링 찾기
        for (let court = 1; court <= courtCount; court++) {
            const startIdx = (court - 1) * 4;
            const courtPlayers = selectedPlayers.slice(startIdx, startIdx + 4);

            if (courtPlayers.length < 4) {
                continue;
            }

            // 최적 페어링 찾기
            const bestPairing = this.findBestPairing(courtPlayers);

            const match = {
                round: roundNum,
                court: court,
                teamA: bestPairing.teamA,
                teamB: bestPairing.teamB,
                sittingOut: court === 1 ? sittingOut : []
            };
            matches.push(match);

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
                matches = this.generateRound1_2(roundNum);
            } else if (roundNum === 5 || roundNum === 6) {
                // Phase 2: High-Low 스플릿 모드
                matches = this.generateRound5_6(roundNum);
            } else {
                // Phase 3: 균형 및 공정 모드
                matches = this.generateRoundBalanced(roundNum);
            }

            this.matches.push(...matches);
        }

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
                court: match.court,
                teamA: match.teamA.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    dupr: p.dupr
                })),
                teamB: match.teamB.map(p => ({
                    userId: p.userId,
                    userName: p.userName,
                    dupr: p.dupr
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
                    dupr: player.dupr
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

