/* ============================================================
   PADEL TOURNAMENT PLATFORM — script.js
   Local Tournament & Match Engine
   ============================================================
   TABLE OF CONTENTS:
   1. CONSTANTS & STORAGE KEYS
   2. MATCH ENGINE (State, Points, Games, Sets, Tiebreak)
   3. UNDO / REDO HISTORY SYSTEM
   4. MATCH STORAGE & LOGGING
   5. PLAYER MANAGEMENT (CRUD)
   6. TOURNAMENT ENGINE (Americano, Mexicano, Courts, Plate)
   7. TOURNAMENT STORAGE
   8. UI RENDERERS (Home, Match, Standings, Setup)
   9. UI DIALOGS & WIZARDS (Modals, Toasts, Match & Tourney Setup)
   10. SYSTEM HELPERS (Haptic, Confetti, Theme)
   11. APPLICATION ROUTING & INITIALIZATION
   ============================================================ */

'use strict';

/* ============================================================
   1. CONSTANTS & STORAGE KEYS
   ============================================================ */
const POINT_SEQ      = ['0', '15', '30', '40'];
const GAMES_TO_SET   = 6;
const TIEBREAK_GAMES = 6;   // 6-6 triggers tiebreak
const TIEBREAK_WIN   = 7;   // First to 7 (lead by 2)
const SUPERTB_WIN    = 10;  // First to 10 (lead by 2)
const MIN_LEAD       = 2;
const SETS_TO_WIN    = 2;   // Best of 3 sets
const MAX_UNDO       = 50;

const LS = {
    MATCH:      'pt_match',
    PLAYERS:    'pt_players',
    MATCH_LOG:  'pt_match_log',
    TOURNAMENT: 'pt_tournament',
};


/* ============================================================
   2. MATCH ENGINE (State, Points, Games, Sets, Tiebreak)
   ============================================================ */
let matchState   = createEmptyMatch();
let matchHistory = [];

/**
 * Creates default state object for a fresh match.
 */
function createEmptyMatch() {
    return {
        pointsA:          0,
        pointsB:          0,
        gamesA:           0,
        gamesB:           0,
        setsA:            0,
        setsB:            0,
        setHistory:       [],
        tiebreakMode:     false,   // false | 'tiebreak' | 'supertiebreak'
        tbPointsA:        0,
        tbPointsB:        0,
        serverTeam:       'A',
        totalGamesPlayed: 0,
        status:           'idle',  // 'idle' | 'active' | 'finished'
        winner:           null,
        config: {
            teamA:         'Team A',
            teamB:         'Team B',
            goldenPoint:   true,
            superTiebreak: true,
        }
    };
}

function cloneMatch(s) {
    return JSON.parse(JSON.stringify(s));
}

/**
 * Score point for Team A or Team B.
 */
function scorePoint(team) {
    if (matchState.status !== 'active') return;
    saveSnapshot();

    if (matchState.tiebreakMode) {
        scoreTbPoint(team);
    } else {
        scoreRegularPoint(team);
    }

    renderMatchPage();
    saveMatch();
}

function scoreRegularPoint(team) {
    const s     = matchState;
    const other = team === 'A' ? 'B' : 'A';
    const myPts = team === 'A' ? s.pointsA : s.pointsB;
    const thPts = other === 'A' ? s.pointsA : s.pointsB;

    // Golden Point (No-Ad): At 40-40, next point wins the game
    if (s.config.goldenPoint && myPts === 3 && thPts === 3) {
        winGame(team);
        return;
    }

    // Normal 40 winning point
    if (myPts === 3 && thPts < 3) {
        winGame(team);
        return;
    }

    if (team === 'A') s.pointsA++;
    else s.pointsB++;
}

function scoreTbPoint(team) {
    const s      = matchState;
    const target = s.tiebreakMode === 'supertiebreak' ? SUPERTB_WIN : TIEBREAK_WIN;

    if (team === 'A') s.tbPointsA++;
    else s.tbPointsB++;

    const pA = s.tbPointsA;
    const pB = s.tbPointsB;

    if ((pA >= target || pB >= target) && Math.abs(pA - pB) >= MIN_LEAD) {
        winGame(pA > pB ? 'A' : 'B');
    } else {
        // Service rotation: after 1st point, then every 2 points
        const total = pA + pB;
        if (total === 1 || total % 2 === 1) {
            matchState.serverTeam = matchState.serverTeam === 'A' ? 'B' : 'A';
        }
    }
}

function winGame(team) {
    const s = matchState;
    s.pointsA = 0;
    s.pointsB = 0;

    if (team === 'A') s.gamesA++;
    else s.gamesB++;

    s.totalGamesPlayed++;
    rotateService();
    checkChangeEnds(s.totalGamesPlayed);
    checkSetWin();
}

function checkSetWin() {
    const s  = matchState;
    const gA = s.gamesA;
    const gB = s.gamesB;

    // 6-6 Triggers Tiebreak
    if (gA === TIEBREAK_GAMES && gB === TIEBREAK_GAMES) {
        const setNum = s.setsA + s.setsB + 1;
        enterTiebreak(setNum === 3 && s.config.superTiebreak ? 'supertiebreak' : 'tiebreak');
        return;
    }

    const winner = (gA >= GAMES_TO_SET && gA - gB >= MIN_LEAD) ? 'A'
                 : (gB >= GAMES_TO_SET && gB - gA >= MIN_LEAD) ? 'B'
                 : null;

    if (winner) winSet(winner);
}

function winSet(team) {
    const s = matchState;
    s.setHistory.push({ a: s.gamesA, b: s.gamesB });
    s.tiebreakMode = false;
    s.tbPointsA    = 0;
    s.tbPointsB    = 0;

    if (team === 'A') s.setsA++;
    else s.setsB++;

    s.gamesA = 0;
    s.gamesB = 0;

    if (s.setsA >= SETS_TO_WIN || s.setsB >= SETS_TO_WIN) {
        finishMatch(team);
    }
}

function finishMatch(team) {
    matchState.status = 'finished';
    matchState.winner = team;
    saveMatch();
    showConfetti();
    haptic([80, 40, 80, 40, 80]);
    const name = team === 'A' ? matchState.config.teamA : matchState.config.teamB;
    showToast(`🏆 ${name} Wins!`, 'success', 3000);
    renderMatchPage();
}

function enterTiebreak(mode) {
    matchState.tiebreakMode = mode;
    matchState.tbPointsA    = 0;
    matchState.tbPointsB    = 0;
    const label = mode === 'supertiebreak' ? '🔥 Super Tiebreak! First to 10' : '⚡ Tiebreak! First to 7';
    showToast(label, 'warning', 2000);
    haptic([30, 20, 30]);
}

function rotateService() {
    matchState.serverTeam = matchState.serverTeam === 'A' ? 'B' : 'A';
}

function checkChangeEnds(totalGames) {
    if (totalGames % 2 === 1) {
        haptic([50, 30, 50, 30, 50]);
        showModal('🔄 Change Ends!', 'Players switch sides. Ready to continue?', 'Ready ✓', false, false);
    }
}

function getPointLabels() {
    const s = matchState;
    if (s.tiebreakMode) return { a: String(s.tbPointsA), b: String(s.tbPointsB) };
    const pA = s.pointsA;
    const pB = s.pointsB;
    if (pA === 3 && pB === 3) {
        return s.config.goldenPoint ? { a: 'GP', b: 'GP' } : { a: '40', b: '40' };
    }
    return { a: POINT_SEQ[pA] || '0', b: POINT_SEQ[pB] || '0' };
}


/* ============================================================
   3. UNDO / REDO HISTORY SYSTEM
   ============================================================ */
function saveSnapshot() {
    matchHistory.push(cloneMatch(matchState));
    if (matchHistory.length > MAX_UNDO) matchHistory.shift();
}

function undo() {
    if (!matchHistory.length) {
        showToast('Nothing to undo', 'warning');
        return;
    }
    matchState = matchHistory.pop();
    haptic(40);
    showToast('↩ Undone');
    renderMatchPage();
    saveMatch();
}

function canUndo() {
    return matchHistory.length > 0;
}


/* ============================================================
   4. MATCH STORAGE & LOGGING
   ============================================================ */
function saveMatch() {
    try {
        localStorage.setItem(LS.MATCH, JSON.stringify({ state: matchState, history: matchHistory }));
    } catch (e) {
        console.error('Failed to save match:', e);
    }
}

function loadMatch() {
    try {
        const d = JSON.parse(localStorage.getItem(LS.MATCH) || 'null');
        if (!d) return false;
        matchState   = d.state   || createEmptyMatch();
        matchHistory = d.history || [];
        return true;
    } catch (e) {
        return false;
    }
}

function getMatchLog() {
    try {
        return JSON.parse(localStorage.getItem(LS.MATCH_LOG) || '[]');
    } catch (e) {
        return [];
    }
}

function appendMatchLog() {
    const s = matchState;
    if (s.status !== 'finished') return;
    const log = getMatchLog();
    log.unshift({
        id:         `m_${Date.now()}`,
        teamA:      s.config.teamA,
        teamB:      s.config.teamB,
        winner:     s.winner === 'A' ? s.config.teamA : s.config.teamB,
        setsA:      s.setsA,
        setsB:      s.setsB,
        setHistory: s.setHistory,
        date:       new Date().toISOString()
    });
    try {
        localStorage.setItem(LS.MATCH_LOG, JSON.stringify(log.slice(0, 50)));
    } catch (e) {}
}

function clearMatchLog() {
    localStorage.removeItem(LS.MATCH_LOG);
}

function startNewMatch(cfg = {}) {
    matchState   = createEmptyMatch();
    matchHistory = [];
    Object.assign(matchState.config, {
        teamA:         cfg.teamA         || 'Team A',
        teamB:         cfg.teamB         || 'Team B',
        goldenPoint:   cfg.goldenPoint   !== false,
        superTiebreak: cfg.superTiebreak !== false,
    });
    matchState.serverTeam = cfg.firstServer || 'A';
    matchState.status     = 'active';
    saveMatch();
    renderMatchPage();
    showToast('🎾 Match started!', 'success');
    navigateTo('match');
}


/* ============================================================
   5. PLAYER MANAGEMENT (CRUD)
   ============================================================ */
function getPlayers() {
    try {
        return JSON.parse(localStorage.getItem(LS.PLAYERS) || '[]');
    } catch (e) {
        return [];
    }
}

function savePlayers(arr) {
    try {
        localStorage.setItem(LS.PLAYERS, JSON.stringify(arr));
    } catch (e) {}
}

function addPlayer(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const players = getPlayers();
    if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return null;
    const player = { id: `p_${Date.now()}`, name: trimmed };
    players.push(player);
    savePlayers(players);
    return player;
}

function deletePlayer(id) {
    savePlayers(getPlayers().filter(p => p.id !== id));
}

function updatePlayer(id, name) {
    const players = getPlayers();
    const p = players.find(p => p.id === id);
    if (p) {
        p.name = name.trim();
        savePlayers(players);
    }
}


/* ============================================================
   6. TOURNAMENT ENGINE (Americano, Mexicano, Courts, Plate)
   ============================================================ */
let T = createEmptyTournament();

function createEmptyTournament() {
    return {
        id:           null,
        name:         '',
        format:       'americano',
        status:       'setup',
        createdAt:    null,
        players:      [],
        courts:       [],
        matches:      [],
        plateBracket: [],
        currentRound: 0,
        totalRounds:  0,
        config: {
            courtsCount:    2,
            roundsCount:    4,
            pointsPerMatch: 21,
            plateBracket:   true,
        }
    };
}

function getPlayerName(id) {
    return T.players.find(p => p.id === id)?.name
        || getPlayers().find(p => p.id === id)?.name
        || id;
}

function getTeamLabel(ids) {
    return ids.map(id => getPlayerName(id)).join(' & ');
}

function initCourts(count) {
    T.courts = Array.from({ length: count }, (_, i) => ({
        id:          `court_${i+1}`,
        name:        `Court ${i+1}`,
        status:      'available', // 'available' | 'in_use' | 'maintenance'
        matchId:     null,
        totalPlayed: 0,
    }));
}

function assignCourt(matchId) {
    const court = T.courts.find(c => c.status === 'available');
    if (!court) {
        showToast('⚠️ No courts available!', 'warning');
        return null;
    }
    court.status  = 'in_use';
    court.matchId = matchId;
    const m = findMatch(matchId);
    if (m) {
        m.courtId   = court.id;
        m.courtName = court.name;
        m.status    = 'in_progress';
        m.startedAt = new Date().toISOString();
    }
    saveTournament();
    renderTournamentPage();
    return court;
}

function releaseCourt(courtId) {
    const court = T.courts.find(c => c.id === courtId);
    if (!court) return;
    court.totalPlayed++;
    court.status  = 'available';
    court.matchId = null;
    saveTournament();
}

function autoAssignCourts(matches) {
    for (const m of matches) {
        if (m.status === 'pending') {
            if (!assignCourt(m.id)) break;
        }
    }
}

function getCourtsInfo() {
    return {
        all:         T.courts,
        available:   T.courts.filter(c => c.status === 'available').length,
        inUse:       T.courts.filter(c => c.status === 'in_use').length,
        maintenance: T.courts.filter(c => c.status === 'maintenance').length,
    };
}

function makeMatch({ round, phase, teamA, teamB }) {
    return {
        id:          `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        round,
        phase,
        teamA:       [...teamA],
        teamB:       [...teamB],
        courtId:     null,
        courtName:   null,
        scoreA:      0,
        scoreB:      0,
        winnerId:    null,
        status:      'pending',
        startedAt:   null,
        completedAt: null,
    };
}

function findMatch(id) {
    return T.matches.find(m => m.id === id) || T.plateBracket.find(m => m.id === id) || null;
}

function getRoundMatches(round) {
    return T.matches.filter(m => m.round === round);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildRelMap(players) {
    const m = {};
    players.forEach(p => {
        m[p.id] = {};
        players.forEach(q => { if (q.id !== p.id) m[p.id][q.id] = 0; });
    });
    return m;
}

function incrRel(map, a, b) {
    if (!map[a]) map[a] = {};
    if (!map[b]) map[b] = {};
    map[a][b] = (map[a][b] || 0) + 1;
    map[b][a] = (map[b][a] || 0) + 1;
}

/* ── Americano Draw Generation ───────────────────────────── */
function generateAmericanoDraw(players, courtsCount, roundsCount) {
    if (players.length < 4) throw new Error('Need at least 4 players');
    const matchesPerRound = Math.min(Math.floor(players.length / 4), courtsCount);
    const partnerMap  = buildRelMap(players);
    const opponentMap = buildRelMap(players);
    const allRounds   = [];

    for (let r = 0; r < roundsCount; r++) {
        const roundMatches = generateOneRound(players, matchesPerRound, partnerMap, opponentMap, r + 1);
        roundMatches.forEach(m => {
            incrRel(partnerMap, m.teamA[0], m.teamA[1]);
            incrRel(partnerMap, m.teamB[0], m.teamB[1]);
            [m.teamA[0], m.teamA[1]].forEach(a =>
                [m.teamB[0], m.teamB[1]].forEach(b => incrRel(opponentMap, a, b))
            );
        });
        allRounds.push(roundMatches);
    }
    return allRounds;
}

function generateOneRound(players, matchCount, pMap, oMap, round) {
    const matches = [];
    const used    = new Set();
    const ids     = shuffle(players.map(p => p.id));

    for (let m = 0; m < matchCount; m++) {
        const avail = ids.filter(id => !used.has(id));
        if (avail.length < 4) break;

        const group = bestGroupOfFour(avail, pMap);
        if (!group) break;
        const [p1, p2, p3, p4] = group;

        const pairings = [
            { a: [p1, p2], b: [p3, p4] },
            { a: [p1, p3], b: [p2, p4] },
            { a: [p1, p4], b: [p2, p3] },
        ];
        const best = pairings.reduce((acc, cur) => {
            const score = pairingPenalty(cur.a, cur.b, pMap, oMap);
            return score < acc.score ? { ...cur, score } : acc;
        }, { ...pairings[0], score: Infinity });

        matches.push(makeMatch({ round, phase: 'americano', teamA: best.a, teamB: best.b }));
        group.forEach(id => used.add(id));
    }
    return matches;
}

function bestGroupOfFour(available, pMap) {
    const cands = available.slice(0, 12);
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < cands.length - 3; i++)
    for (let j = i + 1; j < cands.length - 2; j++)
    for (let k = j + 1; k < cands.length - 1; k++)
    for (let l = k + 1; l < cands.length; l++) {
        const g = [cands[i], cands[j], cands[k], cands[l]];
        let score = 0;
        for (let a = 0; a < 4; a++)
            for (let b = a + 1; b < 4; b++)
                score += (pMap[g[a]]?.[g[b]] || 0);
        if (score < bestScore) {
            bestScore = score;
            best = g;
        }
        if (bestScore === 0) return best;
    }
    return best;
}

function pairingPenalty(tA, tB, pMap, oMap) {
    const [a1, a2] = tA;
    const [b1, b2] = tB;
    const partner  = ((pMap[a1]?.[a2] || 0) + (pMap[b1]?.[b2] || 0)) * 10;
    const opponent = ([a1, a2].flatMap(a => [b1, b2].map(b => oMap[a]?.[b] || 0)).reduce((s, v) => s + v, 0)) * 5;
    return partner + opponent;
}

/* ── Mexicano Draw Generation ────────────────────────────── */
function generateMexicanoDraw(players, courtsCount, round, pMap) {
    const sorted = [...players].sort((a, b) =>
        b.points !== a.points ? b.points - a.points : (b.wins - b.losses) - (a.wins - a.losses)
    );
    const matchCount = Math.min(Math.floor(players.length / 4), courtsCount);
    const matches = [];

    for (let m = 0; m < matchCount; m++) {
        const base = m * 4;
        if (base + 3 >= sorted.length) break;
        const [p1, p2, p3, p4] = [sorted[base].id, sorted[base+1].id, sorted[base+2].id, sorted[base+3].id];
        const oMap = buildRelMap(players);
        const pairings = [
            { a: [p1, p2], b: [p3, p4] },
            { a: [p1, p3], b: [p2, p4] },
            { a: [p1, p4], b: [p2, p3] },
        ];
        const best = pairings.reduce((acc, cur) => {
            const score = pairingPenalty(cur.a, cur.b, pMap, oMap);
            return score < acc.score ? { ...cur, score } : acc;
        }, { ...pairings[0], score: Infinity });
        matches.push(makeMatch({ round, phase: 'mexicano', teamA: best.a, teamB: best.b }));
    }
    return matches;
}

/* ── Plate Bracket (Consolation) ─────────────────────────── */
function generatePlateBracket(round1Matches) {
    const losers = round1Matches
        .filter(m => m.status === 'completed' && m.winnerId)
        .map(m => m.winnerId === 'A' ? m.teamB : m.teamA);

    if (losers.length < 2) return [];
    const shuffled = shuffle(losers);
    const plates   = [];

    for (let i = 0; i + 1 < shuffled.length; i += 2) {
        const m = makeMatch({ round: 1, phase: 'plate', teamA: shuffled[i], teamB: shuffled[i+1] });
        plates.push(m);
        T.plateBracket.push(m);
    }
    saveTournament();
    return plates;
}

function completePlateMatch(matchId, sA, sB) {
    const m = T.plateBracket.find(x => x.id === matchId);
    if (!m) return;
    if (m.courtId) {
        const c = T.courts.find(x => x.id === m.courtId);
        if (c) m.courtName = c.name;
    }
    m.scoreA      = sA;
    m.scoreB      = sB;
    m.winnerId    = sA > sB ? 'A' : sB > sA ? 'B' : null;
    m.status      = 'completed';
    m.completedAt = new Date().toISOString();
    if (m.courtId) releaseCourt(m.courtId);
    saveTournament();
}

function recordResult(matchId, sA, sB) {
    const m = findMatch(matchId);
    if (!m) return;

    if (m.courtId) {
        const c = T.courts.find(x => x.id === m.courtId);
        if (c) m.courtName = c.name;
    }

    const total = T.config.pointsPerMatch;
    m.scoreA      = sA;
    m.scoreB      = Math.max(sB, total - sA);
    m.winnerId    = m.scoreA > m.scoreB ? 'A' : m.scoreB > m.scoreA ? 'B' : null;
    m.status      = 'completed';
    m.completedAt = new Date().toISOString();

    // Update Player Standings
    const updP = (id, pts, conceded, won) => {
        const p = T.players.find(x => x.id === id);
        if (!p) return;
        p.points    = (p.points    || 0) + pts;
        p.pointDiff = (p.pointDiff || 0) + (pts - conceded);
        p.wins      = (p.wins      || 0) + (won ? 1 : 0);
        p.losses    = (p.losses    || 0) + (won ? 0 : 1);
    };

    const winA = m.scoreA > m.scoreB;
    m.teamA.forEach(id => updP(id, m.scoreA, m.scoreB, winA));
    m.teamB.forEach(id => updP(id, m.scoreB, m.scoreA, !winA));

    if (m.courtId) releaseCourt(m.courtId);

    const allDone = getRoundMatches(m.round).every(x => x.status === 'completed');
    if (allDone) onRoundComplete(m.round);

    saveTournament();
}

function onRoundComplete(round) {
    if (round === 1 && T.config.plateBracket) {
        generatePlateBracket(getRoundMatches(1));
        showToast('🏅 Consolation Bracket open!', 'success');
    }

    const next = round + 1;
    if (next <= T.totalRounds) {
        T.currentRound = next;

        if (T.format === 'mexicano') {
            const pMap = buildRelMap(T.players);
            T.matches.filter(m => m.status === 'completed').forEach(m => {
                incrRel(pMap, m.teamA[0], m.teamA[1]);
                incrRel(pMap, m.teamB[0], m.teamB[1]);
            });
            const nextMatches = generateMexicanoDraw(T.players, T.config.courtsCount, next, pMap);
            nextMatches.forEach(m => T.matches.push(m));
            autoAssignCourts(nextMatches);
        } else {
            autoAssignCourts(getRoundMatches(next));
        }
        showToast(`🎾 Round ${next} starts!`, 'success');
    } else {
        T.status = 'finished';
        showToast('🏆 Tournament complete!', 'success', 3000);
        showConfetti();
    }
    saveTournament();
    renderTournamentPage();
}

function getTournamentStandings() {
    return [...T.players].sort((a, b) => {
        if (b.points    !== a.points)    return b.points    - a.points;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        return (b.wins || 0) - (a.wins || 0);
    });
}

function createAndStartTournament(cfg) {
    T = createEmptyTournament();
    T.id        = `t_${Date.now()}`;
    T.name      = cfg.name || 'Padel Open';
    T.format    = cfg.format || 'americano';
    T.status    = 'active';
    T.createdAt = new Date().toISOString();

    Object.assign(T.config, {
        courtsCount:    cfg.courtsCount    || 2,
        roundsCount:    cfg.roundsCount    || 4,
        pointsPerMatch: cfg.pointsPerMatch || 21,
        plateBracket:   cfg.plateBracket   !== false,
    });

    T.players = getPlayers().map(p => ({ ...p, points: 0, wins: 0, losses: 0, pointDiff: 0 }));

    if (T.players.length < 4) {
        showToast('Need at least 4 players!', 'warning');
        return;
    }

    initCourts(T.config.courtsCount);
    T.totalRounds  = T.config.roundsCount;
    T.currentRound = 1;

    if (T.format === 'americano') {
        const rounds = generateAmericanoDraw(T.players, T.config.courtsCount, T.config.roundsCount);
        T.matches    = rounds.flat();
    } else {
        const pMap   = buildRelMap(T.players);
        T.matches    = generateMexicanoDraw(T.players, T.config.courtsCount, 1, pMap);
    }

    autoAssignCourts(getRoundMatches(1));
    saveTournament();
    showToast(`🎾 ${T.name} started!`, 'success');
    navigateTo('standings');
}


/* ============================================================
   7. TOURNAMENT STORAGE
   ============================================================ */
function saveTournament() {
    try {
        localStorage.setItem(LS.TOURNAMENT, JSON.stringify(T));
    } catch (e) {}
}

function loadTournament() {
    try {
        const d = JSON.parse(localStorage.getItem(LS.TOURNAMENT) || 'null');
        if (d) T = d;
        return !!d;
    } catch (e) {
        return false;
    }
}


/* ============================================================
   8. UI RENDERERS (Home, Match, Standings, Setup)
   ============================================================ */

/* ── 8.1 HOME PAGE ───────────────────────────────────────── */
function renderHomePage() {
    const el = document.getElementById('home-content');
    if (!el) return;

    const hasTournament = T.status === 'active' && T.id;
    const log = getMatchLog();

    el.innerHTML = `
        <div class="empty-state" style="padding-top:24px;">
            <div class="empty-state-icon">🎾</div>
            <div class="empty-state-title">Padel Tournament</div>
            <div class="empty-state-text">Local scoring & tournament management</div>
        </div>

        <div class="flex flex-col gap-sm" style="margin-top:8px;">
            <button class="btn btn-primary btn-lg btn-block" onclick="showMatchSetup()">
                ⚡ Quick Match
            </button>
            ${hasTournament ? `
            <button class="btn btn-warning btn-lg btn-block" onclick="navigateTo('standings')">
                📊 Continue: ${T.name} · Round ${T.currentRound}/${T.totalRounds}
            </button>` : ''}
            <button class="btn btn-outline btn-lg btn-block" onclick="showTournamentSetup()">
                🏆 New Tournament
            </button>
        </div>

        ${log.length ? `
        <div style="margin-top:28px;">
            <div class="section-title">Recent Matches</div>
            ${log.slice(0, 3).map(m => `
            <div class="card" style="margin-bottom:8px;">
                <div class="flex flex-between" style="align-items:center;">
                    <div style="font-size:14px;font-weight:600;">${m.teamA} vs ${m.teamB}</div>
                    <span class="badge badge-accent">🏆 ${m.winner}</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                    ${m.setHistory.map(s => `${s.a}–${s.b}`).join(', ')} &bull;
                    ${new Date(m.date).toLocaleDateString('en-GB')}
                </div>
            </div>`).join('')}
            ${log.length > 3 ? `<button class="btn btn-ghost btn-sm btn-block" onclick="navigateTo('match')">See all →</button>` : ''}
        </div>` : ''}
    `;
}

/* ── 8.2 MATCH PAGE ──────────────────────────────────────── */
function renderMatchPage() {
    const el = document.getElementById('match-content');
    if (!el) return;

    const s = matchState;

    if (s.status === 'idle') {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚡</div>
                <div class="empty-state-title">No Active Match</div>
                <div class="empty-state-text">Start a quick match to begin scoring.</div>
                <button class="btn btn-primary btn-lg" onclick="showMatchSetup()">+ New Match</button>
            </div>`;

        const log = getMatchLog();
        if (log.length) {
            el.innerHTML += `
            <div style="margin-top:24px;">
                <div class="section-title">Match History</div>
                ${log.map(m => `
                <div class="card" style="margin-bottom:8px;">
                    <div class="flex flex-between" style="align-items:center;">
                        <div style="font-size:14px;font-weight:600;">${m.teamA} vs ${m.teamB}</div>
                        <span class="badge badge-accent">🏆 ${m.winner}</span>
                    </div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                        ${m.setHistory.map(x => `${x.a}–${x.b}`).join(' ')} &bull;
                        ${new Date(m.date).toLocaleDateString('en-GB')}
                    </div>
                </div>`).join('')}
                <button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px;" onclick="confirmClearLog()">
                    🗑 Clear History
                </button>
            </div>`;
        }
        return;
    }

    const { a: labelA, b: labelB } = getPointLabels();
    const svcA = s.serverTeam === 'A' ? ' 🎾' : '';
    const svcB = s.serverTeam === 'B' ? ' 🎾' : '';

    const setHist = s.setHistory.map(h => `<span class="set-badge">${h.a}–${h.b}</span>`).join('');

    let modeBadge = '';
    if (s.tiebreakMode === 'tiebreak')      modeBadge = '<span class="badge badge-warning">⚡ Tiebreak</span>';
    if (s.tiebreakMode === 'supertiebreak') modeBadge = '<span class="badge badge-danger">🔥 Super TB</span>';
    if (!s.tiebreakMode && s.pointsA === 3 && s.pointsB === 3 && s.config.goldenPoint) {
        modeBadge = '<span class="badge badge-gold">👑 Punto de Oro</span>';
    }

    const isFinished = s.status === 'finished';

    el.innerHTML = `
        <div class="set-history">${setHist}${modeBadge}</div>

        <div class="scoreboard">
            <!-- Team A -->
            <div class="team-panel ${s.winner === 'A' ? 'winner' : ''}">
                <div class="team-name">${s.config.teamA}${svcA}</div>
                <div class="score-sets">${s.setsA}</div>
                <div class="score-games">${s.tiebreakMode ? s.tbPointsA : s.gamesA}</div>
                <div class="score-points">${labelA}</div>
                ${!isFinished ? `
                <div class="score-controls">
                    <button class="btn-score-add" onclick="scorePoint('A')">+1</button>
                    <button class="btn-score-sub" onclick="undo()">−1</button>
                </div>` : ''}
            </div>

            <!-- Divider Labels -->
            <div class="scoreboard-divider">
                <div class="score-label">Sets</div>
                <div class="score-label">Games</div>
                <div class="score-label">Pts</div>
            </div>

            <!-- Team B -->
            <div class="team-panel ${s.winner === 'B' ? 'winner' : ''}">
                <div class="team-name">${s.config.teamB}${svcB}</div>
                <div class="score-sets">${s.setsB}</div>
                <div class="score-games">${s.tiebreakMode ? s.tbPointsB : s.gamesB}</div>
                <div class="score-points">${labelB}</div>
                ${!isFinished ? `
                <div class="score-controls">
                    <button class="btn-score-add" onclick="scorePoint('B')">+1</button>
                    <button class="btn-score-sub" onclick="undo()">−1</button>
                </div>` : ''}
            </div>
        </div>

        ${isFinished ? `
        <div class="winner-banner">
            🏆 ${s.winner === 'A' ? s.config.teamA : s.config.teamB} Wins!
        </div>` : ''}

        <div class="match-actions">
            ${!isFinished ? `
            <button class="btn btn-outline" onclick="undo()" ${canUndo() ? '' : 'disabled'}>↩ Undo</button>
            <button class="btn btn-danger" onclick="confirmFinishMatch()">✅ Finish</button>
            ` : `
            <button class="btn btn-primary btn-block" onclick="appendMatchLog(); renderMatchPage(); showToast('Saved ✓');">
                💾 Save Result
            </button>
            <button class="btn btn-outline btn-block" onclick="showMatchSetup()">+ New Match</button>
            `}
        </div>
    `;
}

/* ── 8.3 TOURNAMENT / STANDINGS PAGE ─────────────────────── */
function renderTournamentPage() {
    const el = document.getElementById('standings-content');
    if (!el) return;

    if (!T.id || T.status === 'setup') {
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-title">No Tournament</div>
                <div class="empty-state-text">Create a tournament to see standings and match schedule.</div>
                <button class="btn btn-primary" onclick="showTournamentSetup()">+ New Tournament</button>
            </div>`;
        return;
    }

    const standings  = getTournamentStandings();
    const curMatches = getRoundMatches(T.currentRound);
    const ci         = getCourtsInfo();

    const completedMatches = [...T.matches, ...T.plateBracket]
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

    el.innerHTML = `
        <!-- Header -->
        <div class="card" style="margin-bottom:16px;">
            <div class="flex flex-between" style="align-items:flex-start;">
                <div>
                    <div style="font-size:18px;font-weight:800;">${T.name}</div>
                    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
                        <span class="badge badge-accent">${T.format.toUpperCase()}</span>
                        <span class="badge badge-muted">Round ${T.currentRound}/${T.totalRounds}</span>
                        <span class="badge ${T.status === 'finished' ? 'badge-gold' : 'badge-success'}">${T.status}</span>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                    <button class="btn btn-danger btn-sm" style="padding:4px 10px;font-size:11px;" onclick="confirmDeleteTournament()">
                        🗑 Reset
                    </button>
                    <small class="text-muted" style="font-size:11px;">${ci.available}/${ci.all.length} courts free</small>
                </div>
            </div>
        </div>

        <!-- Standings Table -->
        <div class="section-title">Standings</div>
        <div class="table-container card" style="margin-bottom:20px;padding:0;">
            <table class="table">
                <thead><tr>
                    <th>#</th>
                    <th style="text-align:left;">Player</th>
                    <th>W</th><th>L</th>
                    <th>Pts</th><th>+/-</th>
                </tr></thead>
                <tbody>
                ${standings.map((p, i) => `
                    <tr>
                        <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td style="text-align:left;font-weight:600;">${p.name}</td>
                        <td class="text-success">${p.wins || 0}</td>
                        <td class="text-muted">${p.losses || 0}</td>
                        <td><strong style="color:var(--accent)">${p.points || 0}</strong></td>
                        <td class="${(p.pointDiff || 0) >= 0 ? 'text-success' : 'text-danger'}">
                            ${(p.pointDiff || 0) > 0 ? '+' : ''}${p.pointDiff || 0}
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>

        <!-- Current Round Matches -->
        <div class="section-title">Round ${T.currentRound} Matches</div>
        ${curMatches.map(m => {
            const court = m.courtId ? T.courts.find(c => c.id === m.courtId) : null;
            const courtDisplayName = m.courtName || (court ? court.name : '—');
            const statusBadge = m.status === 'in_progress'
                ? '<span class="badge badge-success">▶ Live</span>'
                : m.status === 'completed'
                ? '<span class="badge badge-muted">✓ Done</span>'
                : '<span class="badge badge-warning">⏳ Waiting</span>';
            return `
            <div class="match-card">
                <div class="match-card-meta">
                    ${statusBadge}
                    <small class="text-muted">${courtDisplayName}</small>
                </div>
                <div class="match-card-teams">
                    <div class="match-card-team ${m.winnerId === 'A' ? 'text-accent font-bold' : ''}">
                        ${getTeamLabel(m.teamA)} ${m.winnerId === 'A' ? '🏆' : ''}
                    </div>
                    <div class="match-card-score">
                        ${m.status === 'completed' ? `${m.scoreA}–${m.scoreB}` : 'vs'}
                    </div>
                    <div class="match-card-team right ${m.winnerId === 'B' ? 'text-accent font-bold' : ''}">
                        ${m.winnerId === 'B' ? '🏆 ' : ''}${getTeamLabel(m.teamB)}
                    </div>
                </div>
                ${m.status !== 'completed' ? `
                <div class="match-card-actions">
                    ${m.status === 'pending' ? `<button class="btn btn-outline btn-sm flex-1" onclick="assignCourt('${m.id}');renderTournamentPage();">🎾 Assign Court</button>` : ''}
                    ${m.status === 'in_progress' ? `<button class="btn btn-primary btn-sm flex-1" onclick="showRecordResult('${m.id}')">✅ Input Score</button>` : ''}
                </div>` : ''}
            </div>`;
        }).join('')}

        <!-- Plate Bracket -->
        ${T.plateBracket.length ? `
        <div style="margin-top:20px;">
            <div class="section-title">🏅 Consolation Bracket</div>
            ${T.plateBracket.map(m => {
                const courtDisplayName = m.courtName || (m.courtId ? T.courts.find(c => c.id === m.courtId)?.name : '—');
                return `
                <div class="match-card" style="border-color:rgba(255,152,0,0.3);">
                    <div class="match-card-meta">
                        <span class="badge badge-warning">Plate R${m.round}</span>
                        <small class="text-muted">${courtDisplayName || ''}</small>
                    </div>
                    <div class="match-card-teams">
                        <div class="match-card-team ${m.winnerId === 'A' ? 'text-accent font-bold' : ''}">
                            ${getTeamLabel(m.teamA)} ${m.winnerId === 'A' ? '🏆' : ''}
                        </div>
                        <div class="match-card-score">${m.status === 'completed' ? `${m.scoreA}–${m.scoreB}` : 'vs'}</div>
                        <div class="match-card-team right ${m.winnerId === 'B' ? 'text-accent font-bold' : ''}">
                            ${m.winnerId === 'B' ? '🏆 ' : ''}${getTeamLabel(m.teamB)}
                        </div>
                    </div>
                    ${m.status === 'in_progress' ? `
                    <div class="match-card-actions">
                        <button class="btn btn-primary btn-sm flex-1" onclick="showRecordResult('${m.id}')">✅ Input Score</button>
                    </div>` : ''}
                </div>`;
            }).join('')}
        </div>` : ''}

        <!-- Tournament Match History -->
        <div style="margin-top:24px;">
            <div class="section-title">📜 Tournament Match History (${completedMatches.length})</div>
            ${completedMatches.length ? completedMatches.map(m => {
                const winnerName = m.winnerId === 'A' ? getTeamLabel(m.teamA) : (m.winnerId === 'B' ? getTeamLabel(m.teamB) : 'Draw');
                const courtTag = m.courtName ? `📍 ${m.courtName}` : '📍 Court';
                const timeTag = m.completedAt ? new Date(m.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                return `
                <div class="card" style="margin-bottom:8px;padding:12px;">
                    <div class="flex flex-between" style="align-items:center;margin-bottom:6px;">
                        <div style="display:flex;gap:6px;align-items:center;">
                            <span class="badge badge-muted">Round ${m.round}</span>
                            <span class="badge badge-accent">${courtTag}</span>
                            ${m.phase === 'plate' ? '<span class="badge badge-warning">Plate</span>' : ''}
                        </div>
                        <small class="text-muted">${timeTag}</small>
                    </div>
                    <div class="flex flex-between" style="align-items:center;">
                        <div style="font-size:14px;font-weight:600;flex:1;">
                            <span class="${m.winnerId === 'A' ? 'text-accent font-bold' : ''}">${getTeamLabel(m.teamA)}</span>
                            <span style="color:var(--text-muted);margin:0 4px;">vs</span>
                            <span class="${m.winnerId === 'B' ? 'text-accent font-bold' : ''}">${getTeamLabel(m.teamB)}</span>
                        </div>
                        <div style="font-size:16px;font-weight:800;color:var(--accent);margin-left:8px;">
                            ${m.scoreA} – ${m.scoreB}
                        </div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                        Winner: <strong class="text-success">${winnerName}</strong>
                    </div>
                </div>`;
            }).join('') : `
            <div class="card" style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">
                No completed matches yet. Results will be logged here per court and per round.
            </div>`}
        </div>

        <!-- Courts Overview -->
        <div style="margin-top:24px;">
            <div class="section-title">Courts Status</div>
            <div class="court-grid">
                ${ci.all.map(c => `
                <div class="court-card ${c.status}">
                    <div class="court-card-icon">${c.status === 'available' ? '✅' : c.status === 'in_use' ? '🎾' : '🔧'}</div>
                    <div class="court-card-name">${c.name}</div>
                    <div class="court-card-status">${c.status === 'available' ? 'Free' : c.status === 'in_use' ? 'In Use' : 'Maintenance'}</div>
                </div>`).join('')}
            </div>
        </div>

        <!-- Action Buttons (Always Accessible) -->
        <div style="margin-top:24px;display:flex;gap:10px;">
            <button class="btn btn-outline flex-1 btn-sm" onclick="showTournamentSetup()">
                ➕ New Tournament
            </button>
            <button class="btn btn-danger flex-1 btn-sm" onclick="confirmDeleteTournament()">
                🗑 Clear Tournament
            </button>
        </div>
    `;
}

/* ── 8.4 SETUP / PLAYERS PAGE ────────────────────────────── */
function renderSetupPage() {
    const el = document.getElementById('setup-content');
    if (!el) return;
    const players = getPlayers();

    el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div class="section-title" style="margin:0;">Players (${players.length})</div>
            <button class="btn btn-success btn-sm" onclick="toggleAddBox()">+ Add</button>
        </div>

        <div id="add-box" style="display:none;margin-bottom:12px;">
            <div class="flex gap-sm">
                <input type="text" id="new-name-input" class="input flex-1" placeholder="Player name..."
                    onkeydown="if(event.key==='Enter')submitAddPlayer()">
                <button class="btn btn-success" onclick="submitAddPlayer()">Add</button>
            </div>
        </div>

        <div id="players-list">
            ${players.length ? players.map(p => `
            <div class="player-item">
                <div class="avatar">${p.name.charAt(0).toUpperCase()}</div>
                <div class="player-item-info">
                    <div class="player-item-name">${p.name}</div>
                </div>
                <div class="player-item-actions">
                    <button class="btn btn-icon btn-ghost"
                        onclick="promptEditPlayer('${p.id}','${p.name.replace(/'/g, "\\'")}')">✏️</button>
                    <button class="btn btn-icon btn-ghost"
                        onclick="confirmDeletePlayer('${p.id}','${p.name.replace(/'/g, "\\'")}')">🗑</button>
                </div>
            </div>`).join('') :
            `<div class="empty-state" style="padding:32px 0;">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-title">No Players Yet</div>
                <div class="empty-state-text">Add players to get started.</div>
            </div>`}
        </div>

        <div style="margin-top:24px;">
            <button class="btn btn-ghost btn-sm btn-block" onclick="toggleTheme()">
                🌙 Toggle Dark/Light
            </button>
        </div>
    `;
}


/* ============================================================
   9. UI DIALOGS & WIZARDS (Modals, Toasts, Match & Tourney Setup)
   ============================================================ */

/* ── 9.1 Toast Notification ──────────────────────────────── */
let _toastTimer = null;
function showToast(msg, type = 'default', duration = 1600) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'toast show';
    if (type === 'success')      el.style.borderColor = 'rgba(0,230,118,0.4)';
    else if (type === 'warning') el.style.borderColor = 'rgba(255,152,0,0.4)';
    else if (type === 'danger')  el.style.borderColor = 'rgba(255,82,82,0.4)';
    else                         el.style.borderColor = 'var(--bg-glass-border)';

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ── 9.2 Modal Dialog (Promise-based) ────────────────────── */
let _modalResolve = null;
function showModal(title, message, confirmText = 'Confirm', isDanger = false, showCancel = true) {
    return new Promise(resolve => {
        _modalResolve = resolve;
        document.getElementById('modal-title').textContent   = title;
        document.getElementById('modal-message').textContent = message;
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn  = document.getElementById('modal-cancel-btn');
        confirmBtn.textContent = confirmText;
        confirmBtn.className   = `btn ${isDanger ? 'btn-danger' : 'btn-primary'}`;
        cancelBtn.style.display = showCancel ? '' : 'none';
        document.getElementById('modal-overlay').classList.add('visible');
    });
}

function resolveModal(val) {
    document.getElementById('modal-overlay').classList.remove('visible');
    if (_modalResolve) {
        _modalResolve(val);
        _modalResolve = null;
    }
}

/* ── 9.3 Quick Match Setup Wizard ────────────────────────── */
function showMatchSetup() {
    const overlay = document.getElementById('wizard-overlay');
    document.getElementById('wiz-title').textContent  = 'Quick Match';
    document.getElementById('wiz-step').textContent   = '⚡ Configure match settings';
    document.getElementById('wiz-back').style.display = 'none';
    document.getElementById('wiz-next').textContent   = '🎾 Start Match';

    document.getElementById('wizard-body').innerHTML = `
        <div class="flex flex-col gap-md">
            <div class="form-group">
                <label class="form-label">Team A Name</label>
                <input type="text" id="ms-teamA" class="input" value="Team A" placeholder="Team A">
            </div>
            <div class="form-group">
                <label class="form-label">Team B Name</label>
                <input type="text" id="ms-teamB" class="input" value="Team B" placeholder="Team B">
            </div>
            <div class="form-group">
                <label class="form-label">First Server</label>
                <select id="ms-server" class="select">
                    <option value="A">Team A</option>
                    <option value="B">Team B</option>
                </select>
            </div>
            <div class="card" style="display:flex;flex-direction:column;gap:12px;">
                <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                    <input type="checkbox" id="ms-gp" checked style="margin-top:2px;flex-shrink:0;">
                    <div>
                        <div style="font-weight:700;">👑 Punto de Oro</div>
                        <small class="text-muted">At 40-40, one point wins the game (no deuce)</small>
                    </div>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                    <input type="checkbox" id="ms-stb" checked style="margin-top:2px;flex-shrink:0;">
                    <div>
                        <div style="font-weight:700;">🔥 Super Tiebreak</div>
                        <small class="text-muted">3rd set uses Super Tiebreak (first to 10)</small>
                    </div>
                </label>
            </div>
        </div>
    `;

    document.getElementById('wiz-next').onclick = () => {
        overlay.classList.remove('visible');
        startNewMatch({
            teamA:         document.getElementById('ms-teamA').value.trim() || 'Team A',
            teamB:         document.getElementById('ms-teamB').value.trim() || 'Team B',
            firstServer:   document.getElementById('ms-server').value,
            goldenPoint:   document.getElementById('ms-gp').checked,
            superTiebreak: document.getElementById('ms-stb').checked,
        });
    };
    overlay.classList.add('visible');
}

/* ── 9.4 Tournament Setup Wizard ─────────────────────────── */
function showTournamentSetup() {
    const overlay  = document.getElementById('wizard-overlay');
    const players  = getPlayers();

    document.getElementById('wiz-title').textContent  = 'New Tournament';
    document.getElementById('wiz-step').textContent   = '🏆 Configure tournament';
    document.getElementById('wiz-back').style.display = 'none';
    document.getElementById('wiz-next').textContent   = '🚀 Start Tournament';

    document.getElementById('wizard-body').innerHTML = `
        <div class="flex flex-col gap-md">
            <div class="form-group">
                <label class="form-label">Tournament Name</label>
                <input type="text" id="t-name" class="input" value="Padel Open" placeholder="Tournament name">
            </div>
            <div class="form-group">
                <label class="form-label">Format</label>
                <select id="t-format" class="select">
                    <option value="americano">Americano (rotate partners each round)</option>
                    <option value="mexicano">Mexicano (pair by standing each round)</option>
                </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label class="form-label">Courts</label>
                    <input type="number" id="t-courts" class="input" min="1" max="10" value="2">
                </div>
                <div class="form-group">
                    <label class="form-label">Rounds</label>
                    <input type="number" id="t-rounds" class="input" min="1" max="20" value="4">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Points per Match</label>
                <select id="t-pts" class="select">
                    <option value="16">16 pts</option>
                    <option value="21" selected>21 pts (standard)</option>
                    <option value="24">24 pts</option>
                    <option value="32">32 pts</option>
                </select>
            </div>
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;background:var(--bg-glass);border-radius:var(--radius-md);padding:12px;">
                <input type="checkbox" id="t-plate" checked style="margin-top:2px;">
                <div>
                    <div style="font-weight:700;">🏅 Consolation Bracket</div>
                    <small class="text-muted">Round 1 losers get a separate bracket</small>
                </div>
            </label>
            <div class="card">
                <div style="font-size:13px;font-weight:600;margin-bottom:6px;">
                    👥 Players (${players.length})
                </div>
                ${players.length < 4
                    ? `<span class="badge badge-warning">Need at least 4 — add in Players tab</span>`
                    : `<div style="font-size:12px;color:var(--text-muted);line-height:1.7;">${players.map(p => p.name).join(' · ')}</div>`
                }
            </div>
        </div>
    `;

    document.getElementById('wiz-next').onclick = () => {
        if (getPlayers().length < 4) {
            showToast('Add at least 4 players first!', 'warning');
            return;
        }
        overlay.classList.remove('visible');
        createAndStartTournament({
            name:           document.getElementById('t-name').value.trim() || 'Padel Open',
            format:         document.getElementById('t-format').value,
            courtsCount:    parseInt(document.getElementById('t-courts').value) || 2,
            roundsCount:    parseInt(document.getElementById('t-rounds').value) || 4,
            pointsPerMatch: parseInt(document.getElementById('t-pts').value) || 21,
            plateBracket:   document.getElementById('t-plate').checked,
        });
    };
    overlay.classList.add('visible');
}

/* ── 9.5 Record Match Score Wizard (Auto-balancing) ───────── */
function showRecordResult(matchId) {
    const m      = findMatch(matchId);
    if (!m) return;
    const target = T.config.pointsPerMatch;
    const overlay = document.getElementById('wizard-overlay');

    document.getElementById('wiz-title').textContent  = 'Enter Match Score';
    document.getElementById('wiz-step').textContent   = `${getTeamLabel(m.teamA)} vs ${getTeamLabel(m.teamB)}`;
    document.getElementById('wiz-back').style.display = 'none';
    document.getElementById('wiz-next').textContent   = '✅ Save Result';

    const courtObj = m.courtId ? T.courts.find(c => c.id === m.courtId) : null;
    const defaultA = Math.ceil(target / 2);
    const defaultB = target - defaultA;

    document.getElementById('wizard-body').innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
            ${courtObj ? `<span class="badge badge-accent" style="margin-bottom:6px;">📍 ${courtObj.name}</span>` : ''}
            <div style="font-size:15px;font-weight:700;margin-top:4px;">${getTeamLabel(m.teamA)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin:2px 0;">vs</div>
            <div style="font-size:15px;font-weight:700;">${getTeamLabel(m.teamB)}</div>
            <div style="font-size:13px;color:var(--accent);font-weight:700;margin-top:6px;">Target Total: ${target} pts</div>
        </div>

        <div class="flex gap-md" style="align-items:center;justify-content:center;">
            <!-- Team A input -->
            <div class="form-group flex-1" style="text-align:center;">
                <label class="form-label" style="text-align:center;font-size:12px;margin-bottom:4px;">
                    ${getTeamLabel(m.teamA)}
                </label>
                <div style="display:flex;align-items:center;gap:4px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-dec-a" style="padding:10px 12px;font-size:18px;">−</button>
                    <input type="number" id="sc-A" class="input" min="0" max="${target}"
                        value="${defaultA}" style="font-size:28px;font-weight:800;text-align:center;padding:10px 4px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-inc-a" style="padding:10px 12px;font-size:18px;">+</button>
                </div>
            </div>

            <div style="font-size:24px;font-weight:900;color:var(--text-muted);padding-top:18px;">:</div>

            <!-- Team B input -->
            <div class="form-group flex-1" style="text-align:center;">
                <label class="form-label" style="text-align:center;font-size:12px;margin-bottom:4px;">
                    ${getTeamLabel(m.teamB)}
                </label>
                <div style="display:flex;align-items:center;gap:4px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-dec-b" style="padding:10px 12px;font-size:18px;">−</button>
                    <input type="number" id="sc-B" class="input" min="0" max="${target}"
                        value="${defaultB}" style="font-size:28px;font-weight:800;text-align:center;padding:10px 4px;">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-inc-b" style="padding:10px 12px;font-size:18px;">+</button>
                </div>
            </div>
        </div>

        <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted);">
            💡 Total points will automatically balance to <strong>${target}</strong>
        </div>
    `;

    const inputA = document.getElementById('sc-A');
    const inputB = document.getElementById('sc-B');

    function updateFromA(valA) {
        let a = parseInt(valA, 10);
        if (isNaN(a)) a = 0;
        if (a > target) a = target;
        if (a < 0) a = 0;
        inputA.value = a;
        inputB.value = target - a;
    }

    function updateFromB(valB) {
        let b = parseInt(valB, 10);
        if (isNaN(b)) b = 0;
        if (b > target) b = target;
        if (b < 0) b = 0;
        inputB.value = b;
        inputA.value = target - b;
    }

    inputA.addEventListener('input', (e) => {
        if (e.target.value === '') return;
        updateFromA(e.target.value);
    });
    inputA.addEventListener('blur', (e) => {
        if (e.target.value === '') updateFromA(0);
    });

    inputB.addEventListener('input', (e) => {
        if (e.target.value === '') return;
        updateFromB(e.target.value);
    });
    inputB.addEventListener('blur', (e) => {
        if (e.target.value === '') updateFromB(0);
    });

    // Stepper Buttons
    document.getElementById('btn-dec-a')?.addEventListener('click', () => {
        updateFromA((parseInt(inputA.value, 10) || 0) - 1);
    });
    document.getElementById('btn-inc-a')?.addEventListener('click', () => {
        updateFromA((parseInt(inputA.value, 10) || 0) + 1);
    });
    document.getElementById('btn-dec-b')?.addEventListener('click', () => {
        updateFromB((parseInt(inputB.value, 10) || 0) - 1);
    });
    document.getElementById('btn-inc-b')?.addEventListener('click', () => {
        updateFromB((parseInt(inputB.value, 10) || 0) + 1);
    });

    document.getElementById('wiz-next').onclick = () => {
        const sA = parseInt(inputA.value, 10) || 0;
        const sB = parseInt(inputB.value, 10) || 0;
        overlay.classList.remove('visible');

        const isPlate = T.plateBracket.some(x => x.id === matchId);
        if (isPlate) completePlateMatch(matchId, sA, sB);
        else         recordResult(matchId, sA, sB);

        showToast('✅ Score saved!');
        renderTournamentPage();
    };
    overlay.classList.add('visible');
}

/* ── 9.6 Confirmation Modals ─────────────────────────────── */
async function confirmFinishMatch() {
    const ok = await showModal('Finish Match?', 'End this match and record the result.', 'Finish', false, true);
    if (!ok) return;
    matchState.status = 'finished';
    matchState.winner = matchState.setsA >= matchState.setsB ? 'A' : 'B';
    appendMatchLog();
    renderMatchPage();
    showToast('Match saved!', 'success');
}

async function confirmClearLog() {
    const ok = await showModal('Clear History?', 'All match records will be deleted.', 'Clear', true, true);
    if (ok) {
        clearMatchLog();
        renderMatchPage();
        renderHomePage();
        showToast('History cleared');
    }
}

async function confirmDeletePlayer(id, name) {
    const ok = await showModal(`Delete "${name}"?`, 'Remove this player from the list.', 'Delete', true, true);
    if (ok) {
        deletePlayer(id);
        renderSetupPage();
        showToast(`${name} removed`);
    }
}

async function confirmDeleteTournament() {
    const ok = await showModal('End Tournament?', 'This will clear all tournament data.', 'End It', true, true);
    if (ok) {
        localStorage.removeItem(LS.TOURNAMENT);
        T = createEmptyTournament();
        renderTournamentPage();
        showToast('Tournament ended');
    }
}

/* ── 9.7 Player Actions ──────────────────────────────────── */
function toggleAddBox() {
    const box = document.getElementById('add-box');
    if (!box) return;
    const showing = box.style.display !== 'none';
    box.style.display = showing ? 'none' : 'block';
    if (!showing) document.getElementById('new-name-input')?.focus();
}

function submitAddPlayer() {
    const input = document.getElementById('new-name-input');
    if (!input) return;
    const p = addPlayer(input.value);
    if (p) {
        input.value = '';
        renderSetupPage();
        showToast(`${p.name} added ✅`);
    } else {
        showToast('Name already exists or empty', 'warning');
    }
}

function promptEditPlayer(id, oldName) {
    const newName = prompt(`Edit player name:`, oldName);
    if (!newName?.trim() || newName.trim() === oldName) return;
    updatePlayer(id, newName.trim());
    renderSetupPage();
    showToast('Name updated ✅');
}


/* ============================================================
   10. SYSTEM HELPERS (Haptic, Confetti, Theme)
   ============================================================ */
function haptic(pattern = 30) {
    if (navigator.vibrate) {
        navigator.vibrate(Array.isArray(pattern) ? pattern : [pattern]);
    }
}

function showConfetti() {
    const colors = ['#ccff00', '#00e676', '#ff9800', '#ffd700', '#ff5252', '#2196f3'];
    for (let i = 0; i < 35; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-particle';
        const size = 6 + Math.random() * 8;
        el.style.cssText = `
            left: ${Math.random() * 100}vw;
            width: ${size}px; height: ${size}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            animation-duration: ${1.4 + Math.random() * 1.2}s;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}


/* ============================================================
   11. APPLICATION ROUTING & INITIALIZATION
   ============================================================ */
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(`page-${pageId}`);
    const nav  = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (page) page.classList.add('active');
    if (nav)  nav.classList.add('active');

    haptic(15);

    switch (pageId) {
        case 'home':      renderHomePage();        break;
        case 'match':     renderMatchPage();       break;
        case 'standings': renderTournamentPage();  break;
        case 'setup':     renderSetupPage();       break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });

    // Modal buttons
    document.getElementById('modal-confirm-btn')?.addEventListener('click', () => resolveModal(true));
    document.getElementById('modal-cancel-btn')?.addEventListener('click',  () => resolveModal(false));

    // Wizard actions
    document.getElementById('wiz-close')?.addEventListener('click', () => {
        document.getElementById('wizard-overlay').classList.remove('visible');
    });

    document.getElementById('wizard-overlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible');
    });

    // Load persisted state
    loadMatch();
    loadTournament();

    // Initial page view
    navigateTo('home');
});
