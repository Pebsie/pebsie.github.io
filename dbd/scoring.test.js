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

test('survivor cap is 20, escape is 6, and a full escape adds 8', function () {
  var alone = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: true, allSurvivorsEscaped: false });
  assert.strictEqual(alone.bpPoints, 20);
  assert.strictEqual(alone.escapePoints, 6);
  assert.strictEqual(alone.bonus, 0);
  assert.strictEqual(alone.total, 26);

  var full = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: true, allSurvivorsEscaped: true });
  assert.strictEqual(full.total, 34);
  assert.strictEqual(full.total, S.SURVIVOR_GAME_MAX);
  assert.strictEqual(full.bonus, 8);

  var dead = S.scoreEntry({ role: 'survivor', bloodpoints: 0, escaped: false, allSurvivorsEscaped: false });
  assert.strictEqual(dead.total, 0);

  var richDead = S.scoreEntry({ role: 'survivor', bloodpoints: 40000, escaped: false, allSurvivorsEscaped: false });
  assert.strictEqual(richDead.total, 20);

  var odd = S.scoreEntry({ role: 'survivor', bloodpoints: 39000, escaped: true, allSurvivorsEscaped: false });
  assert.strictEqual(odd.bpRaw, 20);
  assert.strictEqual(odd.total, 26);
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
  assert.strictEqual(flight.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 10);
  flight.rows.filter(function (row) { return row.playerId !== 'a'; }).forEach(function (row) {
    assert.strictEqual(row.total, 34);
  });
});

test('three survivors who all escape still take the escape bonus', function () {
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
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 14);
});

test('a partial escape does not pay the bonus, and a 4K can sit beside one escape', function () {
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
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'k'; })[0].total, 40);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'e'; })[0].total, 6);
  assert.strictEqual(game.rows.filter(function (row) { return row.playerId === 'a'; })[0].total, 0);
});

test('186 is one 4K plus four full escapes, and the mark matches the caps', function () {
  assert.strictEqual(S.KILLER_GAME_MAX, 10 + (4 * 8) + 8);
  assert.strictEqual(S.SURVIVOR_GAME_MAX, 20 + 6 + 8);
  assert.strictEqual(S.TOURNAMENT_MARK, S.KILLER_GAME_MAX + (4 * S.SURVIVOR_GAME_MAX));
  assert.strictEqual(S.TOURNAMENT_MARK, 186);

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
  assert.strictEqual(rowA.total, 186);
  assert.strictEqual(rowA.games[0].gained, 50);
  assert.strictEqual(rowA.games[1].gained, 34);
  assert.strictEqual(rowA.games[0].cumulative, 50);
  assert.strictEqual(rowA.games[4].cumulative, 186);
  assert.strictEqual(rowB.total, 132);
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

test('an empty ledger is not a tie, and progress is measured towards 186', function () {
  var players = [{ id: 'a', name: '' }, { id: 'b', name: 'B' }];
  var empty = S.standings(players, [], null);
  assert.strictEqual(empty.tiedForFirst, false);
  assert.strictEqual(empty.rows[0].progress, 0);
  var scored = S.scoreEntry({ role: 'killer', bloodpoints: 40000, kills: 4 });
  assert.strictEqual(scored.total / S.TOURNAMENT_MARK, 50 / 186);
});

if (!process.exitCode) console.log(passed + ' tests passed');
