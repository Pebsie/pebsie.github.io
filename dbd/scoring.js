/* Dead by Daylight tournament scoring.
   Bloodpoints: 1 point per 2,000, rounded to the nearest 2,000 (half up).
   Killer bloodpoint points are capped at 10. Survivor bloodpoint points are
   capped at 20 (a trial cannot pay more than 40,000 bloodpoints).
   Each kill is +8. Four kills add a further +8. Escaping is +6. When every
   survivor in the game escapes, each of those survivors gains a further +8.
   A killer game therefore tops out at 50, a survivor game at 34, and one
   player tops out at 186 across five games (one 4K and four full escapes). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DbDScoring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var BP_UNIT = 2000;
  var BP_MIN = 0;
  var BP_MAX = 40000;
  var KILLER_BP_CAP = 10;
  var SURVIVOR_BP_CAP = 20;
  var KILL_POINT = 8;
  var MAX_KILLS = 4;
  var ESCAPE_POINT = 6;
  var FOUR_K_BONUS = 8;
  var ALL_ESCAPE_BONUS = 8;
  var KILLER_GAME_MAX = 50;
  var SURVIVOR_GAME_MAX = 34;
  var TOURNAMENT_MARK = 186;
  var MAX_PLAYERS = 12;
  var MIN_PLAYERS = 2;
  var MAX_GAMES = 40;
  var MAX_NAME = 40;
  var MAX_TITLE = 60;

  function formatBp(n) {
    var sign = Number(n) < 0 ? '-' : '';
    var digits = String(Math.trunc(Math.abs(Number(n))));
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function parseWhole(value) {
    if (typeof value === 'number' && Number.isFinite(value) && Math.trunc(value) === value) {
      return value;
    }
    if (typeof value === 'string') {
      var cleaned = value.trim().replace(/[, ]/g, '');
      if (/^\d+$/.test(cleaned)) return Number(cleaned);
    }
    return null;
  }

  function bpRawPoints(bloodpoints) {
    return Math.round(Number(bloodpoints) / BP_UNIT);
  }

  function scoreEntry(entry) {
    var role = entry.role === 'killer' ? 'killer' : 'survivor';
    var parsed = parseWhole(entry.bloodpoints);
    var bp = parsed === null ? 0 : Math.max(BP_MIN, Math.min(BP_MAX, parsed));
    var raw = bpRawPoints(bp);
    var cap = role === 'killer' ? KILLER_BP_CAP : SURVIVOR_BP_CAP;
    var bpPoints = Math.max(0, Math.min(cap, raw));
    var lines = [];
    if (raw > cap) {
      lines.push(formatBp(bp) + ' bloodpoints rounds to ' + raw + ', capped at ' + cap + ' for the ' + role + '.');
    } else {
      lines.push(formatBp(bp) + ' bloodpoints rounds to ' + bpPoints + ' (nearest 2,000).');
    }

    var killPoints = 0;
    var escapePoints = 0;
    var bonus = 0;
    var bonusLabel = null;

    if (role === 'killer') {
      var kills = parseWhole(entry.kills);
      if (kills === null || kills < 0) kills = 0;
      if (kills > MAX_KILLS) kills = MAX_KILLS;
      killPoints = kills * KILL_POINT;
      lines.push(kills === 0 ? 'No kills.' : (kills === 1 ? '1 kill × 8 = 8.' : kills + ' kills × 8 = ' + killPoints + '.'));
      if (kills === MAX_KILLS) {
        bonus = FOUR_K_BONUS;
        bonusLabel = '4K';
        lines.push('4K bonus +' + FOUR_K_BONUS + '.');
      }
    } else if (entry.escaped) {
      escapePoints = ESCAPE_POINT;
      lines.push('Escaped +' + ESCAPE_POINT + '.');
      if (entry.allSurvivorsEscaped) {
        bonus = ALL_ESCAPE_BONUS;
        bonusLabel = 'All escaped';
        lines.push('Every survivor escaped +' + ALL_ESCAPE_BONUS + '.');
      }
    } else {
      lines.push('Did not escape.');
    }

    var total = bpPoints + killPoints + escapePoints + bonus;
    lines.push('Total ' + total + '.');
    return {
      role: role,
      bloodpoints: bp,
      bpRaw: raw,
      bpPoints: bpPoints,
      bpCapped: raw > cap,
      killPoints: killPoints,
      escapePoints: escapePoints,
      bonus: bonus,
      bonusLabel: bonusLabel,
      total: total,
      lines: lines
    };
  }

  function scoreGame(game) {
    var entries = game.entries || [];
    var survivors = entries.filter(function (e) { return e.playerId !== game.killerId; });
    var allEscaped = survivors.length > 0 && survivors.every(function (e) { return !!e.escaped; });
    var rows = entries.map(function (e) {
      var role = e.playerId === game.killerId ? 'killer' : 'survivor';
      var scored = scoreEntry({
        role: role,
        bloodpoints: e.bloodpoints,
        kills: role === 'killer' ? e.kills : 0,
        escaped: role === 'survivor' ? !!e.escaped : false,
        allSurvivorsEscaped: allEscaped
      });
      scored.playerId = e.playerId;
      return scored;
    });
    var killer = null;
    entries.forEach(function (e) { if (e.playerId === game.killerId) killer = e; });
    return {
      rows: rows,
      allSurvivorsEscaped: allEscaped,
      escapeCount: survivors.filter(function (e) { return !!e.escaped; }).length,
      survivorCount: survivors.length,
      killCount: killer ? Number(killer.kills) || 0 : 0
    };
  }

  function validateBloodpoints(value) {
    if (value === '' || value === null || value === undefined) return 'Enter bloodpoints.';
    var parsed = parseWhole(value);
    if (parsed === null) return 'Bloodpoints must be a whole number.';
    if (parsed < BP_MIN || parsed > BP_MAX) return 'Bloodpoints must be from 0 to 40,000.';
    return null;
  }

  function playerLabel(players, id) {
    for (var i = 0; i < players.length; i++) {
      if (players[i].id === id) {
        var name = (players[i].name || '').trim();
        return name || ('Player ' + (i + 1));
      }
    }
    return 'Unknown player';
  }

  function validateGame(players, game) {
    var errors = [];
    var warnings = [];
    if (!game || !game.killerId) errors.push('Choose the killer.');
    var known = {};
    players.forEach(function (p) { known[p.id] = true; });
    if (game && game.killerId && !known[game.killerId]) errors.push('The killer is not in the player list.');

    var entries = (game && game.entries) || [];
    var byId = {};
    entries.forEach(function (e) {
      if (byId[e.playerId]) errors.push(playerLabel(players, e.playerId) + ' is listed twice.');
      byId[e.playerId] = e;
    });

    players.forEach(function (p) {
      var label = playerLabel(players, p.id);
      var entry = byId[p.id];
      if (!entry) {
        errors.push(label + ' has no result.');
        return;
      }
      var bpError = validateBloodpoints(entry.bloodpoints);
      if (bpError) errors.push(label + ': ' + bpError);
      if (p.id === game.killerId) {
        var kills = parseWhole(entry.kills);
        if (kills === null || kills < 0 || kills > MAX_KILLS) {
          errors.push(label + ': enter kills from 0 to 4.');
        }
      } else if (entry.escaped !== true && entry.escaped !== false) {
        errors.push(label + ': mark whether they escaped.');
      }
    });

    var survivors = players.filter(function (p) { return p.id !== (game && game.killerId); });
    var killerEntry = game && byId[game.killerId];
    var kills = killerEntry ? parseWhole(killerEntry.kills) : null;
    if (kills === null) kills = 0;
    var escapes = survivors.filter(function (p) {
      return byId[p.id] && byId[p.id].escaped === true;
    }).length;
    var undecided = survivors.some(function (p) {
      var entry = byId[p.id];
      return !entry || (entry.escaped !== true && entry.escaped !== false);
    });
    if (!undecided && kills > survivors.length) {
      errors.push('Kills cannot exceed the number of survivors.');
    } else if (!undecided && kills + escapes > survivors.length) {
      errors.push('Kills plus escapes is more than the number of survivors.');
    } else if (!undecided && errors.length === 0 && kills + escapes < survivors.length) {
      warnings.push('Kills plus escapes is less than the number of survivors. Bleed-outs and disconnects can be left that way.');
    }
    return { errors: errors, warnings: warnings };
  }

  function standings(players, games, tiebreak) {
    var totals = {};
    var perGame = {};
    players.forEach(function (p) {
      totals[p.id] = 0;
      perGame[p.id] = [];
    });

    (games || []).forEach(function (game, index) {
      var scored = scoreGame(game);
      var byId = {};
      scored.rows.forEach(function (row) { byId[row.playerId] = row; });
      players.forEach(function (p) {
        var row = byId[p.id];
        var gained = row ? row.total : 0;
        totals[p.id] += gained;
        perGame[p.id].push({
          gameId: game.id,
          gameIndex: index,
          played: !!row,
          gained: gained,
          cumulative: totals[p.id],
          score: row || null,
          role: row ? row.role : null
        });
      });
    });

    var list = players.map(function (p, index) {
      return {
        player: p,
        index: index,
        total: totals[p.id],
        games: perGame[p.id],
        progress: totals[p.id] / TOURNAMENT_MARK
      };
    });

    var max = 0;
    list.forEach(function (row) { if (row.total > max) max = row.total; });
    var tiedIds = list.filter(function (row) { return row.total === max; }).map(function (row) { return row.player.id; });
    var tiedForFirst = (games || []).length > 0 && tiedIds.length >= 2;
    var winnerId = tiebreak && tiebreak.winnerId;
    var tiebreakApplies = !!(tiedForFirst && winnerId && tiedIds.indexOf(winnerId) !== -1);

    list.sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      if (tiebreakApplies) {
        if (a.player.id === winnerId) return -1;
        if (b.player.id === winnerId) return 1;
      }
      var an = (a.player.name || '').toLowerCase();
      var bn = (b.player.name || '').toLowerCase();
      if (an !== bn) return an < bn ? -1 : 1;
      return a.index - b.index;
    });

    list.forEach(function (row, index) {
      if (index === 0) row.rank = 1;
      else if (row.total === list[index - 1].total) row.rank = list[index - 1].rank;
      else row.rank = index + 1;
      row.tied = tiedForFirst && row.total === max;
      row.tiebreakWinner = tiebreakApplies && row.player.id === winnerId;
    });

    return {
      rows: list,
      tiedForFirst: tiedForFirst,
      tiedIds: tiedForFirst ? tiedIds : [],
      tiebreakApplies: tiebreakApplies,
      max: max,
      mark: TOURNAMENT_MARK
    };
  }

  function tiebreakWinner(rounds) {
    var tally = {};
    var decided = null;
    var decidedAt = null;
    (rounds || []).forEach(function (round, index) {
      if (decided || !round || !round.winnerId) return;
      tally[round.winnerId] = (tally[round.winnerId] || 0) + 1;
      if (tally[round.winnerId] >= 2) {
        decided = round.winnerId;
        decidedAt = index;
      }
    });
    (rounds || []).forEach(function (round) {
      if (!round || !round.winnerId || tally[round.winnerId]) return;
      tally[round.winnerId] = 1;
    });
    var full = {};
    (rounds || []).forEach(function (round) {
      if (!round || !round.winnerId) return;
      full[round.winnerId] = (full[round.winnerId] || 0) + 1;
    });
    return { winnerId: decided, tally: full, decidedAt: decidedAt };
  }

  function cleanName(name) {
    return String(name == null ? '' : name).replace(/[\u0000-\u001f]/g, '').trim().slice(0, MAX_NAME);
  }

  function cleanTitle(title) {
    var text = String(title == null ? '' : title).replace(/[\u0000-\u001f]/g, '').trim().slice(0, MAX_TITLE);
    return text || 'The Trial';
  }

  function cleanId(id) {
    var text = String(id == null ? '' : id);
    return /^[A-Za-z0-9_-]{1,24}$/.test(text) ? text : null;
  }

  function normaliseEntry(playerId, killerId, entry) {
    var bp = parseWhole(entry.bloodpoints);
    var isKiller = playerId === killerId;
    var kills = isKiller ? parseWhole(entry.kills) : 0;
    return {
      playerId: playerId,
      bloodpoints: bp,
      kills: kills,
      escaped: isKiller ? false : entry.escaped === true
    };
  }

  function normaliseState(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('That file is not a scoreboard.');
    var playersIn = raw.players || raw.p;
    if (!Array.isArray(playersIn)) throw new Error('The player list is missing.');
    if (playersIn.length < MIN_PLAYERS || playersIn.length > MAX_PLAYERS) {
      throw new Error('A scoreboard needs between ' + MIN_PLAYERS + ' and ' + MAX_PLAYERS + ' players.');
    }
    var seen = {};
    var players = playersIn.map(function (p) {
      var id = cleanId(p.id || p.i);
      if (!id) throw new Error('A player has an invalid id.');
      if (seen[id]) throw new Error('Two players share an id.');
      seen[id] = true;
      return { id: id, name: cleanName(p.name != null ? p.name : p.n) };
    });

    var gamesIn = raw.games || raw.g || [];
    if (!Array.isArray(gamesIn)) throw new Error('The game list is not a list.');
    if (gamesIn.length > MAX_GAMES) throw new Error('That scoreboard has too many games.');
    var gameIds = {};
    var games = gamesIn.map(function (game, index) {
      var id = cleanId(game.id || game.i);
      if (!id) throw new Error('Game ' + (index + 1) + ' has an invalid id.');
      if (gameIds[id]) throw new Error('Two games share an id.');
      gameIds[id] = true;
      var killerId = cleanId(game.killerId || game.k);
      if (!killerId || !seen[killerId]) throw new Error('Game ' + (index + 1) + ' has no valid killer.');
      var entriesIn = game.entries || game.e || [];
      if (!Array.isArray(entriesIn)) throw new Error('Game ' + (index + 1) + ' has no results.');
      var entries = entriesIn.map(function (entry) {
        var playerId = cleanId(entry.playerId || entry.p);
        if (!playerId || !seen[playerId]) throw new Error('Game ' + (index + 1) + ' lists an unknown player.');
        var escaped = entry.escaped;
        if (escaped === 1 || escaped === '1') escaped = true;
        if (escaped === 0 || escaped === '0') escaped = false;
        if (entry.s === 1 || entry.s === true) escaped = true;
        if (entry.s === 0 || entry.s === false) escaped = false;
        return {
          playerId: playerId,
          bloodpoints: entry.bloodpoints != null ? entry.bloodpoints : entry.b,
          kills: entry.kills != null ? entry.kills : entry.h,
          escaped: playerId === killerId ? false : escaped
        };
      });
      var normalised = {
        id: id,
        killerId: killerId,
        entries: entries.map(function (entry) { return normaliseEntry(entry.playerId, killerId, entry); })
      };
      var check = validateGame(players, {
        killerId: killerId,
        entries: entries.map(function (entry) {
          return {
            playerId: entry.playerId,
            bloodpoints: entry.bloodpoints,
            kills: entry.kills,
            escaped: entry.playerId === killerId ? false : entry.escaped
          };
        })
      });
      if (check.errors.length) throw new Error('Game ' + (index + 1) + ': ' + check.errors[0]);
      return normalised;
    });

    var tiebreak = null;
    var tb = raw.tiebreak || raw.tb;
    if (tb) {
      var a = cleanId(tb.playerA || tb.a);
      var b = cleanId(tb.playerB || tb.b);
      if (!a || !b || a === b || !seen[a] || !seen[b]) throw new Error('The tie-break names two players who are not both in the list.');
      var roundsIn = tb.rounds || tb.r || [];
      if (!Array.isArray(roundsIn) || roundsIn.length > 3) throw new Error('A tie-break is a best of 3.');
      var rounds = roundsIn.map(function (round) {
        var winner = round.winnerId || round.w || null;
        if (winner != null) {
          winner = cleanId(winner);
          if (winner !== a && winner !== b) throw new Error('A chase was won by someone who was not in it.');
        }
        var time = round.timeSeconds != null ? round.timeSeconds : round.t;
        if (time === '' || time == null) time = null;
        else {
          var numeric = Number(time);
          if (!Number.isFinite(numeric) || numeric < 0 || numeric > 999) throw new Error('A chase time is not a valid number of seconds.');
          time = Math.round(numeric * 100) / 100;
        }
        return { winnerId: winner, timeSeconds: time };
      });
      var decided = tiebreakWinner(rounds);
      tiebreak = { playerA: a, playerB: b, rounds: rounds, winnerId: decided.winnerId };
    }

    return { version: 1, title: cleanTitle(raw.title != null ? raw.title : raw.t), players: players, games: games, tiebreak: tiebreak };
  }

  function exportObject(state) {
    return {
      version: 1,
      title: state.title,
      players: state.players.map(function (p) { return { id: p.id, name: p.name }; }),
      games: state.games.map(function (game) {
        return {
          id: game.id,
          killerId: game.killerId,
          entries: game.entries.map(function (entry) {
            return {
              playerId: entry.playerId,
              bloodpoints: entry.bloodpoints,
              kills: entry.kills,
              escaped: entry.escaped === true
            };
          })
        };
      }),
      tiebreak: state.tiebreak ? {
        playerA: state.tiebreak.playerA,
        playerB: state.tiebreak.playerB,
        rounds: (state.tiebreak.rounds || []).map(function (round) {
          return { winnerId: round.winnerId || null, timeSeconds: round.timeSeconds == null ? null : round.timeSeconds };
        })
      } : null,
      note: 'Every 2,000 bloodpoints is 1 point, rounded to the nearest 2,000. Killer bloodpoint points are capped at 10. Survivor bloodpoint points are capped at 20. Each kill is +8. Escaping is +6. A 4K is +8. Every survivor escaping is +8 for each survivor. Five-game mark: 186.'
    };
  }

  function serialise(state) {
    var packed = {
      v: 1,
      t: state.title,
      p: state.players.map(function (p) { return { i: p.id, n: p.name }; }),
      g: state.games.map(function (game) {
        return {
          i: game.id,
          k: game.killerId,
          e: game.entries.map(function (entry) {
            return { p: entry.playerId, b: entry.bloodpoints, h: entry.kills, s: entry.escaped ? 1 : 0 };
          })
        };
      })
    };
    if (state.tiebreak) {
      packed.tb = {
        a: state.tiebreak.playerA,
        b: state.tiebreak.playerB,
        r: (state.tiebreak.rounds || []).map(function (round) {
          return { w: round.winnerId || null, t: round.timeSeconds == null ? null : round.timeSeconds };
        })
      };
    }
    return packed;
  }

  return {
    BP_UNIT: BP_UNIT,
    BP_MIN: BP_MIN,
    BP_MAX: BP_MAX,
    KILLER_BP_CAP: KILLER_BP_CAP,
    SURVIVOR_BP_CAP: SURVIVOR_BP_CAP,
    KILL_POINT: KILL_POINT,
    MAX_KILLS: MAX_KILLS,
    ESCAPE_POINT: ESCAPE_POINT,
    FOUR_K_BONUS: FOUR_K_BONUS,
    ALL_ESCAPE_BONUS: ALL_ESCAPE_BONUS,
    KILLER_GAME_MAX: KILLER_GAME_MAX,
    SURVIVOR_GAME_MAX: SURVIVOR_GAME_MAX,
    TOURNAMENT_MARK: TOURNAMENT_MARK,
    MAX_PLAYERS: MAX_PLAYERS,
    MIN_PLAYERS: MIN_PLAYERS,
    formatBp: formatBp,
    parseWhole: parseWhole,
    bpRawPoints: bpRawPoints,
    scoreEntry: scoreEntry,
    scoreGame: scoreGame,
    validateBloodpoints: validateBloodpoints,
    validateGame: validateGame,
    standings: standings,
    tiebreakWinner: tiebreakWinner,
    importState: normaliseState,
    exportObject: exportObject,
    serialise: serialise
  };
});
