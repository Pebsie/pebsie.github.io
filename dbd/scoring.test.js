/* Run with: node scoring.test.js */
var assert = require('assert');
var S = require('./scoring.js');

var passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error('FAIL ' + name);
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

test('rounding follows half up to the nearest 2,000', function () {
  assert.strictEqual(S.bpRawPoints(0), 0);
  assert.strictEqual(S.bpRawPoints(999), 0);
  assert.strictEqual(S.bpRawPoints(1000), 1);
  assert.strictEqual(S.bpRawPoints(1999), 1);
  assert.strictEqual(S.bpRawPoints(2000), 1);
  assert.strictEqual(S.bpRawPoints(2999), 1);
  assert.strictEqual(S.bpRawPoints(3000), 2);
  assert.strictEqual(S.bpRawPoints(5000), 3);
  assert.strictEqual(S.bpRawPoints(18999), 9);
  assert.strictEqual(S.bpRawPoints(19000), 10);
  assert.strictEqual(S.bpRawPoints(40000), 20);
});

test('killer bloodpoints cap at 10 and a 4K reaches 50', function () {
  var none = S.scoreEntry({ role: 'killer', bloodpoints: 40000, kills: 0 });
  assert.strictEqual(none.bpPoints, 10);
  assert.strictEqual(none.bpCapped, true);
  assert.strictEqual(none.total, 10);

  var farming = S.scoreEntry({ role: 'killer', bloodpoints: 32000, kills: 4 });
  assert.strictEqual(farming.bpRaw, 16);
  assert.strictEqual(farming.bpPoints, 10);
  assert.strictEqual(farming.killPoints, 32);
  assert.strictEqual(farming.bonus, 8);
  assert.strictEqual(farming.total, 50);
  assert.strictEqual(farming.total, S.KILLER_GAME_MAX);
  assert.ok(farming.lines.some(function (line) { return line.indexOf('capped at 10') !== -1; }));

  var exactCap = S.scoreEntry({ role: 'killer', bloodpoints: 20000, kills: 0 });
  assert.strictEqual(exactCap.bpPoints, 10);
  assert.strictEqual(exactCap.bpCapped, false);

  var three = S.scoreEntry({ role: 'killer', bloodpoints: 19000, kills: 3 });
  assert.strictEqual(three.bpPoints, 10);
  assert.strictEqual(three.killPoints, 24);
  assert.strictEqual(three.bonus, 0);
  assert.strictEqual(three.total, 34);

  var under = S.scoreEntry({ role: 'killer', bloodpoints: 18999, kills: 1 });
  assert.strictEqual(under.bpPoints, 9);
  assert.strictEqual(under.total, 17);

  var half = S.scoreEntry({ role: 'killer', bloodpoints: 1000, kills: 1 });
  assert.strictEqual(half.bpPoints, 1);
  assert.strictEqual(half.total, 9);

  var zeroKills = S.scoreEntry({ role: 'killer', bloodpoints: 0, kills: 0 });
  assert.strictEqual(zeroKills.total, 0);
});

test('survivor cap is 20, and escapes scale by how many others got out', function () {
  var alone = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: true, othersEscaped: 0 });
  assert.strictEqual(alone.bpPoints, 20);
  assert.strictEqual(alone.escapePoints, 8);
  assert.strictEqual(alone.bonus, 0);
  assert.strictEqual(alone.total, 28);
  assert.ok(alone.lines.some(function (line) { return line === 'Escaped +8.'; }));

  var pair = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: true, othersEscaped: 1 });
  assert.strictEqual(pair.escapePoints, 12);
  assert.strictEqual(pair.total, 32);
  assert.ok(pair.lines.some(function (line) { return line === '1 other survivor escaped +4.'; }));

  var three = S.scoreEntry({ role: 'survivor', bloodpoints: 0, escaped: true, othersEscaped: 2 });
  assert.strictEqual(three.escapePoints, 16);
  assert.strictEqual(three.total, 16);

  var full = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: true, othersEscaped: 3 });
  assert.strictEqual(full.escapePoints, 20);
  assert.strictEqual(full.total, 40);
  assert.strictEqual(full.total, S.SURVIVOR_GAME_MAX);
  assert.ok(full.lines.some(function (line) { return line === '3 other survivors escaped × 4 = 12.'; }));

  var dead = S.scoreEntry({ role: 'survivor', bloodpoints: 0, escaped: false, othersEscaped: 3 });
  assert.strictEqual(dead.escapePoints, 0);
  assert.strictEqual(dead.total, 0);
  assert.ok(dead.lines.some(function (line) { return line === 'Did not escape.'; }));

  var richDead = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: false, othersEscaped: 3 });
  assert.strictEqual(richDead.total, 20);

  var odd = S.scoreEntry({ role: 'survivor', bloodpoints: 39000, escaped: true, othersEscaped: 0 });
  assert.strictEqual(odd.bpRaw, 20);
  assert.strictEqual(odd.total, 28);
});

test('a game scores the killer and the survivors from the same result', function () {
  var players = ['a', 'b', 'c', 'd', 'e'];
  var fourK = S.scoreGame({
    killerId: 'a',
    entries: players.map(function (id) {
      return { playerId: id, bloodpoints: 40000, kills: id === 'a' ? 4 : 0, escaped: false };
    })
  });
  assert.strictEqual(fourK.allSurvivorsEscaped, false);
  assert.strictEqual(fourK.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 50);
  fourK.rows.filter(function (row) { return row.playerId !== 'a'; }).forEach(function (row) {
    assert.strictEqual(row.total, 20);
    assert.strictEqual(row.bonus, 0);
  });

  var flight = S.scoreGame({
    killerId: 'a',
    entries: players.map(function (id) {
      return { playerId: id, bloodpoints: 40000, kills: 0, escaped: id !== 'a' };
    })
  });
  assert.strictEqual(flight.allSurvivorsEscaped, true);
  assert.strictEqual(flight.escapeCount, 4);
  assert.strictEqual(flight.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 10);
  flight.rows.filter(function (row) { return row.playerId !== 'a'; }).forEach(function (row) {
    assert.strictEqual(row.escapePoints, 20);
    assert.strictEqual(row.total, 40);
  });
});

test('three survivors who all escape score 16 each', function () {
  var game = S.scoreGame({
    killerId: 'k',
    entries: [
      { playerId: 'k', bloodpoints: 0, kills: 0, escaped: false },
      { playerId: 'a', bloodpoints: 0, kills: 0, escaped: true },
      { playerId: 'b', bloodpoints: 0, kills: 0, escaped: true },
      { playerId: 'c', bloodpoints: 0, kills: 0, escaped: true }
    ]
  });
  assert.strictEqual(game.allSurvivorsEscaped, true);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 16);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'a'; })[0].escapePoints, 16);
});

test('one escape scores 8, two score 12 each, and a 4K can sit beside one escape', function () {
  var players = ['k', 'a', 'b', 'c', 'd', 'e'];
  var game = S.scoreGame({
    killerId: 'k',
    entries: players.map(function (id) {
      return {
        playerId: id,
        bloodpoints: 0,
        kills: id === 'k' ? 4 : 0,
        escaped: id === 'e'
      };
    })
  });
  assert.strictEqual(game.allSurvivorsEscaped, false);
  assert.strictEqual(game.escapeCount, 1);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'k'; })[0].total, 40);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'e'; })[0].escapePoints, 8);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'e'; })[0].total, 8);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 0);

  var pair = S.scoreGame({
    killerId: 'k',
    entries: players.map(function (id) {
      return {
        playerId: id,
        bloodpoints: 0,
        kills: 0,
        escaped: id === 'd' || id === 'e'
      };
    })
  });
  assert.strictEqual(pair.escapeCount, 2);
  ['d', 'e'].forEach(function (id) {
    var row = pair.rows.filter(function (item) { return item.playerId === id; })[0];
    assert.strictEqual(row.escapePoints, 12);
    assert.strictEqual(row.total, 12);
  });
  assert.strictEqual(pair.rows.filter(function (row) { return row.playerId === 'a'; })[0].escapePoints, 0);
});

test('210 is one 4K plus four full escapes, and the mark matches the caps', function () {
  assert.strictEqual(S.KILLER_GAME_MAX, 10 + (4 * 8) + 8);
  assert.strictEqual(S.ESCAPE_POINT, 8);
  assert.strictEqual(S.ESCAPE_OTHER, 4);
  assert.strictEqual(S.SURVIVOR_GAME_MAX, 20 + 8 + (3 * 4));
  assert.strictEqual(S.TOURNAMENT_MARK, S.KILLER_GAME_MAX + (4 * S.SURVIVOR_GAME_MAX));
  assert.strictEqual(S.TOURNAMENT_MARK, 210);

  var ids = ['a', 'b', 'c', 'd', 'e'];
  var players = ids.map(function (id) { return { id: id, name: id.toUpperCase() }; });
  var games = ids.map(function (killerId) {
    var fourK = killerId === 'a';
    return {
      id: 'g' + killerId,
      killerId: killerId,
      entries: ids.map(function (id) {
        return {
          playerId: id,
          bloodpoints: 40000,
          kills: id === killerId ? (fourK ? 4 : 0) : 0,
          escaped: id !== killerId && !fourK
        };
      })
    };
  });
  var board = S.standings(players, games, null);
  var rowA = board.rows.filter(function (row) { return row.player.id === 'a'; })[0];
  var rowB = board.rows.filter(function (row) { return row.player.id === 'b'; })[0];
  assert.strictEqual(rowA.total, 210);
  assert.strictEqual(rowA.games[0].gained, 50);
  assert.strictEqual(rowA.games[1].gained, 40);
  assert.strictEqual(rowA.games[0].cumulative, 50);
  assert.strictEqual(rowA.games[4].cumulative, 210);
  assert.strictEqual(rowB.total, 150);
  assert.strictEqual(rowA.rank, 1);
  assert.strictEqual(board.tiedForFirst, false);
});

test('a tie is visible and the chase winner is listed first without changing the points', function () {
  var players = [
    { id: 'a', name: 'Alex' },
    { id: 'b', name: 'Blair' },
    { id: 'c', name: 'Casey' }
  ];
  var games = [{
    id: 'g1',
    killerId: 'c',
    entries: [
      { playerId: 'a', bloodpoints: 4000, kills: 0, escaped: true },
      { playerId: 'b', bloodpoints: 4000, kills: 0, escaped: true },
      { playerId: 'c', bloodpoints: 0, kills: 0, escaped: false }
    ]
  }];
  var tied = S.standings(players, games, null);
  assert.strictEqual(tied.tiedForFirst, true);
  assert.deepStrictEqual(tied.tiedIds.slice().sort(), ['a', 'b']);
  assert.strictEqual(tied.rows[0].rank, 1);
  assert.strictEqual(tied.rows[1].rank, 1);
  assert.strictEqual(tied.rows[0].total, tied.rows[1].total);

  var chase = S.tiebreakWinner([
    { winnerId: 'b' },
    { winnerId: 'a' },
    { winnerId: 'b' }
  ]);
  assert.strictEqual(chase.winnerId, 'b');
  assert.strictEqual(chase.decidedAt, 2);
  assert.strictEqual(chase.tally.b, 2);
  assert.strictEqual(chase.tally.a, 1);

  var settled = S.standings(players, games, { winnerId: 'b', playerA: 'a', playerB: 'b' });
  assert.strictEqual(settled.tiebreakApplies, true);
  assert.strictEqual(settled.rows[0].player.id, 'b');
  assert.strictEqual(settled.rows[0].tiebreakWinner, true);
  assert.strictEqual(settled.rows[0].total, settled.rows[1].total);
  assert.strictEqual(settled.rows[1].rank, 1);

  var early = S.tiebreakWinner([{ winnerId: 'a' }, { winnerId: 'a' }, { winnerId: 'b' }]);
  assert.strictEqual(early.winnerId, 'a');
  assert.strictEqual(early.decidedAt, 1);
  assert.strictEqual(S.tiebreakWinner([{ winnerId: 'a' }, { winnerId: null }]).winnerId, null);
});

test('validation rejects bad bloodpoints, too many outcomes, and accepts commas', function () {
  assert.strictEqual(S.validateBloodpoints(''), 'Enter bloodpoints.');
  assert.strictEqual(S.validateBloodpoints('12.5'), 'Bloodpoints must be a whole number.');
  assert.strictEqual(S.validateBloodpoints('-1'), 'Bloodpoints must be a whole number.');
  assert.strictEqual(S.validateBloodpoints('40001'), 'Bloodpoints must be from 0 to 40,000.');
  assert.strictEqual(S.validateBloodpoints('32,000'), null);
  assert.strictEqual(S.parseWhole('32,000'), 32000);

  var players = [
    { id: 'k', name: 'Killer' },
    { id: 'a', name: '' },
    { id: 'b', name: 'Blair' }
  ];
  var bad = S.validateGame(players, {
    killerId: 'k',
    entries: [
      { playerId: 'k', bloodpoints: 1000, kills: 2, escaped: false },
      { playerId: 'a', bloodpoints: 1000, kills: 0, escaped: true },
      { playerId: 'b', bloodpoints: 1000, kills: 0, escaped: true }
    ]
  });
  assert.ok(bad.errors.some(function (error) { return error.indexOf('more than the number of survivors') !== -1; }));

  var open = S.validateGame(players, {
    killerId: 'k',
    entries: [
      { playerId: 'k', bloodpoints: '8,000', kills: 0, escaped: false },
      { playerId: 'a', bloodpoints: 0, kills: 0, escaped: false },
      { playerId: 'b', bloodpoints: 0, kills: 0, escaped: null }
    ]
  });
  assert.ok(open.errors.some(function (error) { return error.indexOf('escaped') !== -1; }));

  var fine = S.validateGame(players, {
    killerId: 'k',
    entries: [
      { playerId: 'k', bloodpoints: '8,000', kills: 1, escaped: false },
      { playerId: 'a', bloodpoints: 2000, kills: 0, escaped: false },
      { playerId: 'b', bloodpoints: 4000, kills: 0, escaped: true }
    ]
  });
  assert.deepStrictEqual(fine.errors, []);
  assert.strictEqual(fine.warnings.length, 0);
});

test('import, export and the compact share shape round-trip', function () {
  var state = {
    version: 1,
    title: 'Friday night',
    players: [
      { id: 'p1', name: 'Rowan' },
      { id: 'p2', name: 'Alex' }
    ],
    games: [{
      id: 'g1',
      killerId: 'p1',
      entries: [
        { playerId: 'p1', bloodpoints: 28000, kills: 1, escaped: false },
        { playerId: 'p2', bloodpoints: 12000, kills: 0, escaped: false }
      ]
    }],
    tiebreak: null
  };
  var exported = S.exportObject(state);
  var again = S.importState(exported);
  assert.strictEqual(again.title, 'Friday night');
  assert.strictEqual(again.games[0].entries[0].bloodpoints, 28000);
  assert.strictEqual(again.games[0].entries[0].kills, 1);
  assert.strictEqual(again.games[0].entries[1].escaped, false);

  var packed = S.serialise(again);
  var fromPack = S.importState(packed);
  assert.deepStrictEqual(S.serialise(fromPack), packed);

  assert.throws(function () {
    S.importState({ version: 1, title: 'x', players: [{ id: 'p1', name: 'Only' }], games: [] });
  }, /between 2 and 12/);

  assert.throws(function () {
    S.importState({
      version: 1,
      title: 'x',
      players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }],
      games: [{
        id: 'g1',
        killerId: 'p1',
        entries: [
          { playerId: 'p1', bloodpoints: 90000, kills: 0, escaped: false },
          { playerId: 'p2', bloodpoints: 0, kills: 0, escaped: false }
        ]
      }]
    });
  }, /40,000/);
});

test('an empty ledger is not a tie, and progress is measured towards 210', function () {
  var players = [{ id: 'a', name: '' }, { id: 'b', name: 'B' }];
  var empty = S.standings(players, [], null);
  assert.strictEqual(empty.tiedForFirst, false);
  assert.strictEqual(empty.rows[0].progress, 0);
  var scored = S.scoreEntry({ role: 'killer', bloodpoints: 40000, kills: 4 });
  assert.strictEqual(scored.total / S.TOURNAMENT_MARK, 50 / 210);
});

test('a scoreboard saved under the previous rules still loads and is rescored', function () {
  var legacyExport = {
    version: 1,
    title: 'Friday night trial',
    players: [
      { id: 'rowan', name: 'Rowan' },
      { id: 'alex', name: 'Alex' },
      { id: 'sam', name: 'Sam' },
      { id: 'jordan', name: 'Jordan' },
      { id: 'casey', name: 'Casey' }
    ],
    games: [{
      id: 'g1',
      killerId: 'rowan',
      entries: [
        { playerId: 'rowan', bloodpoints: 24000, kills: 2, escaped: false },
        { playerId: 'alex', bloodpoints: 30000, kills: 0, escaped: true },
        { playerId: 'sam', bloodpoints: 18000, kills: 0, escaped: false },
        { playerId: 'jordan', bloodpoints: 40000, kills: 0, escaped: true },
        { playerId: 'casey', bloodpoints: 8000, kills: 0, escaped: false }
      ]
    }],
    tiebreak: {
      playerA: 'jordan',
      playerB: 'casey',
      rounds: [{ winnerId: 'jordan', timeSeconds: 38.2 }]
    },
    note: 'Every 2,000 bloodpoints is 1 point, rounded to the nearest 2,000. Killer bloodpoint points are capped at 10. Survivor bloodpoint points are capped at 20. Each kill is +8. Escaping is +6. A 4K is +8. Every survivor escaping is +8 for each survivor. Five-game mark: 186.'
  };
  var loaded = S.importState(legacyExport);
  assert.strictEqual(loaded.version, 1);
  assert.strictEqual(loaded.title, 'Friday night trial');
  assert.strictEqual(loaded.players.length, 5);
  assert.strictEqual(loaded.players[3].name, 'Jordan');
  assert.strictEqual(loaded.games.length, 1);
  assert.strictEqual(loaded.games[0].entries[0].bloodpoints, 24000);
  assert.strictEqual(loaded.games[0].entries[0].kills, 2);
  assert.strictEqual(loaded.games[0].entries[1].escaped, true);
  assert.strictEqual(loaded.games[0].entries[2].escaped, false);
  assert.strictEqual(loaded.games[0].entries[3].escaped, true);
  assert.strictEqual(loaded.games[0].entries[4].escaped, false);
  assert.strictEqual(loaded.tiebreak.playerA, 'jordan');
  assert.strictEqual(loaded.tiebreak.rounds[0].timeSeconds, 38.2);
  assert.strictEqual(loaded.tiebreak.winnerId, null);

  var scored = S.scoreGame(loaded.games[0]);
  function total(id) {
    return scored.rows.filter(function (row) { return row.playerId === id; })[0].total;
  }
  assert.strictEqual(total('rowan'), 26);
  assert.strictEqual(total('alex'), 27);
  assert.strictEqual(total('sam'), 9);
  assert.strictEqual(total('jordan'), 32);
  assert.strictEqual(total('casey'), 4);
  assert.ok(scored.rows.filter(function (row) { return row.playerId === 'jordan'; })[0].lines.some(function (line) {
    return line === '1 other survivor escaped +4.';
  }));

  var legacyShare = {
    v: 1,
    t: 'Friday night trial',
    p: legacyExport.players.map(function (player) { return { i: player.id, n: player.name }; }),
    g: [{
      i: 'g1',
      k: 'rowan',
      e: [
        { p: 'rowan', b: 24000, h: 2, s: 0 },
        { p: 'alex', b: 30000, h: 0, s: 1 },
        { p: 'sam', b: 18000, h: 0, s: 0 },
        { p: 'jordan', b: 40000, h: 0, s: 1 },
        { p: 'casey', b: 8000, h: 0, s: 0 }
      ]
    }],
    tb: { a: 'jordan', b: 'casey', r: [{ w: 'jordan', t: 38.2 }] }
  };
  var fromShare = S.importState(legacyShare);
  assert.strictEqual(fromShare.players.length, 5);
  assert.strictEqual(fromShare.games[0].entries[1].escaped, true);
  assert.strictEqual(fromShare.games[0].entries[3].bloodpoints, 40000);
  assert.strictEqual(fromShare.games[0].entries[3].escaped, true);
  assert.strictEqual(fromShare.games[0].entries[4].escaped, false);
  assert.strictEqual(S.scoreGame(fromShare.games[0]).rows.filter(function (row) {
    return row.playerId === 'alex';
  })[0].escapePoints, 12);
  assert.deepStrictEqual(S.serialise(fromShare).g, legacyShare.g);
});

if (!process.exitCode) console.log(passed + ' tests passed');
