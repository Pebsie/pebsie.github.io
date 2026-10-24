(function () {
  'use strict';

  var S = window.DbDScoring;
  var STORAGE_KEY = 'dbd-trial-ledger-v1';
  var HEART_KEY = 'dbd-heartbeat';
  var COLOURS = ['#9c2b2e', '#d9c7a6', '#6d4c3c', '#b85a45', '#8e9486', '#7c2430', '#c4a574', '#3f5552', '#a33b24', '#efe0cc', '#5c2a2a', '#b7a696'];
  var PORTRAITS = ['portrait-dwight', 'portrait-meg', 'portrait-claudette', 'portrait-jake', 'portrait-nea'];

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = motionQuery.matches;
  var state = null;
  var shared = false;
  var draft = null;
  var confirmDeleteId = null;
  var pairPick = [];
  var saveTimer = null;
  var toastTimer = null;
  var beats = [];
  var beatIndex = 0;
  var animToken = 0;
  var heartOn = false;
  var heartTimer = null;
  var audioCtx = null;

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value == null || value === false) return;
        if (key === 'class') node.className = value;
        else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, String(value));
      });
    }
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      if (typeof child === 'string' || typeof child === 'number') node.appendChild(document.createTextNode(String(child)));
      else node.appendChild(child);
    });
    return node;
  }

  function uid(prefix) {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var bytes = new Uint8Array(5);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    var out = prefix;
    for (var j = 0; j < bytes.length; j++) out += alphabet[bytes[j] % alphabet.length];
    return out;
  }

  function displayName(id) {
    var index = -1;
    for (var i = 0; i < state.players.length; i++) if (state.players[i].id === id) index = i;
    if (index < 0) return 'Unknown';
    var name = (state.players[index].name || '').trim();
    return name || ('Player ' + (index + 1));
  }

  function colourFor(id) {
    var index = 0;
    for (var i = 0; i < state.players.length; i++) if (state.players[i].id === id) index = i;
    return COLOURS[index % COLOURS.length];
  }

  function playerInGames(id) {
    return state.games.some(function (game) {
      return game.killerId === id || game.entries.some(function (entry) { return entry.playerId === id; });
    });
  }

  function blankValue() {
    return { bloodpoints: '', kills: null, escaped: null };
  }

  function resetDraft() {
    draft = { editingId: null, killerId: null, error: '', warnings: [] , values: {} };
    state.players.forEach(function (player) { draft.values[player.id] = blankValue(); });
  }

  function defaultState() {
    return {
      version: 1,
      title: 'The Trial',
      players: [0, 1, 2, 3, 4].map(function () { return { id: uid('p'), name: '' }; }),
      games: [],
      tiebreak: null
    };
  }

  function toast(message) {
    var el = document.getElementById('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3600);
  }

  function persist() {
    if (shared) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S.exportObject(state))); }
    catch (error) { toast('Could not save on this device.'); }
  }

  function scheduleSave() {
    if (shared) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 180);
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return S.importState(JSON.parse(raw));
    } catch (error) {
      toast('The saved scoreboard could not be read, so this is a fresh ledger.');
      return null;
    }
  }

  function syncTiebreak() {
    if (!state.tiebreak) return;
    state.tiebreak.winnerId = S.tiebreakWinner(state.tiebreak.rounds).winnerId;
  }

  function bytesToB64url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function b64urlToBytes(text) {
    var pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
    var bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function encodeHash() {
    var bytes = new TextEncoder().encode(JSON.stringify(S.serialise(state)));
    if (typeof CompressionStream !== 'undefined') {
      try {
        var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
        var zipped = new Uint8Array(await new Response(stream).arrayBuffer());
        if (zipped.length < bytes.length) return 'v1g.' + bytesToB64url(zipped);
      } catch (error) { /* fall through to plain JSON */ }
    }
    return 'v1j.' + bytesToB64url(bytes);
  }

  async function decodeHash(hash) {
    var raw = hash.replace(/^#/, '');
    var bytes;
    if (raw.indexOf('v1g.') === 0) {
      var packed = b64urlToBytes(raw.slice(4));
      var stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (raw.indexOf('v1j.') === 0) {
      bytes = b64urlToBytes(raw.slice(4));
    } else return null;
    return S.importState(JSON.parse(new TextDecoder().decode(bytes)));
  }

  function updateNameDisplays() {
    document.querySelectorAll('[data-name-for]').forEach(function (el) {
      el.textContent = displayName(el.getAttribute('data-name-for'));
    });
  }

  function captureOpen() {
    return Array.prototype.map.call(document.querySelectorAll('details[open][data-keep]'), function (el) {
      return el.getAttribute('data-keep');
    });
  }

  function restoreOpen(keys) {
    (keys || []).forEach(function (key) {
      var el = document.querySelector('details[data-keep="' + key + '"]');
      if (el) el.open = true;
    });
  }

  function icon(src, className) {
    return h('img', { src: src, alt: '', class: className || 'icon-btn' });
  }

  function renderAll() {
    document.body.classList.toggle('is-readonly', shared);
    var title = document.getElementById('title');
    if (document.activeElement !== title) title.value = state.title;
    title.readOnly = shared;
    document.title = state.title + ' · Dead by Daylight tournament';
    renderBanner();
    renderStandings();
    renderEditor();
    renderPlayers();
    renderHistory();
    renderTiebreak();
  }

  function renderBanner() {
    var banner = document.getElementById('banner');
    banner.innerHTML = '';
    if (!shared) { banner.hidden = true; return; }
    banner.hidden = false;
    banner.appendChild(h('p', {}, ['Shared scoreboard. This view is read-only and is not saved on this device.']));
    banner.appendChild(h('button', { type: 'button', class: 'btn btn-primary', 'data-action': 'import-shared' }, ['Import into my copy']));
  }

  function renderStandings() {
    var open = captureOpen();
    var root = document.getElementById('standings');
    var board = S.standings(state.players, state.games, state.tiebreak);
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'kicker' }, ['I · The tally']));
    root.appendChild(h('h2', { id: 'standings-heading' }, ['Standings']));
    var line;
    if (!state.games.length) {
      line = 'No games yet. 186 is the most one player can score across five standard games.';
    } else if (board.tiedForFirst) {
      var names = board.tiedIds.map(displayName);
      line = names.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' are tied on ' + board.max + '.';
      if (board.tiebreakApplies) line += ' Tie-break: ' + displayName(state.tiebreak.winnerId) + '.';
    } else {
      var leader = board.rows[0];
      line = displayName(leader.player.id) + ' leads on ' + leader.total + '.';
    }
    root.appendChild(h('p', { class: 'leader-line' }, [line]));

    var grid = h('div', { class: 'board' });
    board.rows.forEach(function (row) {
      var stripe = h('div', { class: 'slab-stripe' });
      stripe.style.background = colourFor(row.player.id);
      var badges = h('div', { class: 'badges' });
      if (row.tiebreakWinner) badges.appendChild(h('span', { class: 'badge win' }, ['Tie-break']));
      else if (row.tied) badges.appendChild(h('span', { class: 'badge' }, ['Tied']));
      var pct = Math.max(0, Math.min(100, row.progress * 100));
      var fill = h('span');
      fill.style.width = pct + '%';
      var pace = row.total > S.TOURNAMENT_MARK
        ? (row.total - S.TOURNAMENT_MARK) + ' past the five-game mark'
        : Math.round(pct) + '% towards 186';
      var table = h('table', { class: 'mini' }, [
        h('thead', {}, [h('tr', {}, [h('th', {}, ['Game']), h('th', {}, ['Role']), h('th', {}, ['Pts']), h('th', {}, ['Running'])])])
      ]);
      var body = h('tbody');
      if (!row.games.length) {
        body.appendChild(h('tr', {}, [h('td', { colspan: '4' }, ['Waiting for the first game.'])]));
      }
      row.games.forEach(function (game) {
        var role = '—';
        var mark = null;
        if (game.role === 'killer') { role = 'Killer'; mark = icon('assets/killer.webp'); }
        else if (game.score && game.score.escapePoints) { role = 'Escaped'; mark = icon('assets/exit.webp'); }
        else if (game.played) { role = 'Dead'; mark = icon('assets/hook.webp'); }
        body.appendChild(h('tr', {}, [
          h('td', {}, [String(game.gameIndex + 1)]),
          h('td', {}, [mark, ' ' + role]),
          h('td', {}, [String(game.gained)]),
          h('td', {}, [String(game.cumulative)])
        ]));
      });
      table.appendChild(body);
      var maths = h('div', { class: 'math' });
      var details = h('details', { 'data-keep': 'player:' + row.player.id });
      details.appendChild(h('summary', {}, ['How this was scored']));
      if (!row.games.length) details.appendChild(h('p', {}, ['Nothing scored yet.']));
      row.games.forEach(function (game) {
        var text = 'Game ' + (game.gameIndex + 1) + '. ';
        if (!game.score) text += 'Not in this game.';
        else text += game.score.lines.join(' ') + ' Running total ' + game.cumulative + '.';
        details.appendChild(h('p', {}, [text]));
      });
      maths.appendChild(details);

      var slab = h('article', { class: 'slab' + (row.rank === 1 && state.games.length ? ' is-leader' : '') + (row.tied ? ' is-tied' : '') }, [
        stripe,
        row.rank === 1 && state.games.length && !row.tied ? h('img', { class: 'watermark', src: 'assets/emblem-chaser.webp', alt: '' }) : null,
        row.tied ? h('img', { class: 'watermark', src: 'assets/crows.webp', alt: '' }) : null,
        h('div', { class: 'slab-top' }, [
          h('span', { class: 'slab-rank' }, [row.rank < 10 ? '0' + row.rank : String(row.rank)]),
          badges
        ]),
        h('h3', { class: 'slab-name', 'data-name-for': row.player.id }, [displayName(row.player.id)]),
        h('div', { class: 'slab-score' }, [
          h('div', { class: 'slab-total' }, [String(row.total)]),
          h('div', { class: 'slab-of' }, ['/ 186'])
        ]),
        h('div', { class: 'track' }, [fill]),
        h('p', { class: 'pace' }, [pace]),
        table,
        maths
      ]);
      grid.appendChild(slab);
    });
    root.appendChild(grid);
    restoreOpen(open);
  }

  function renderPlayers() {
    var root = document.getElementById('players');
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'kicker' }, ['II · The roster']));
    root.appendChild(h('h2', { id: 'players-heading' }, ['Players']));
    root.appendChild(h('p', { class: 'lede' }, ['Five seats to start. Names stay on this device until you share or export.']));
    if (shared) {
      var list = h('ul', { class: 'roll' });
      state.players.forEach(function (player) {
        list.appendChild(h('li', {}, [h('span', { 'data-name-for': player.id }, [displayName(player.id)])]));
      });
      root.appendChild(list);
      return;
    }
    state.players.forEach(function (player, index) {
      var locked = playerInGames(player.id);
      root.appendChild(h('div', { class: 'player-row' }, [
        h('label', { class: 'sr-only', for: 'name-' + player.id }, ['Name for player ' + (index + 1)]),
        h('input', {
          id: 'name-' + player.id,
          type: 'text',
          maxlength: '40',
          placeholder: 'Player ' + (index + 1),
          value: player.name,
          'data-field': 'player-name',
          'data-player': player.id,
          autocomplete: 'off'
        }),
        h('button', { type: 'button', class: 'btn btn-small js-mutate', 'data-action': 'move-player', 'data-dir': '-1', 'data-player': player.id, disabled: index === 0 }, ['Up']),
        h('button', { type: 'button', class: 'btn btn-small js-mutate', 'data-action': 'move-player', 'data-dir': '1', 'data-player': player.id, disabled: index === state.players.length - 1 }, ['Down']),
        h('button', {
          type: 'button',
          class: 'btn btn-small btn-danger js-mutate',
          'data-action': 'remove-player',
          'data-player': player.id,
          disabled: locked || state.players.length <= 2,
          title: locked ? 'Delete the games they are in first.' : ''
        }, ['Remove'])
      ]));
    });
    root.appendChild(h('button', {
      type: 'button',
      class: 'btn js-mutate',
      'data-action': 'add-player',
      disabled: state.players.length >= S.MAX_PLAYERS
    }, ['Add player']));
  }

  function renderEditor() {
    var root = document.getElementById('editor');
    if (shared) { root.hidden = true; root.innerHTML = ''; return; }
    root.hidden = false;
    var editing = draft.editingId ? state.games.filter(function (game) { return game.id === draft.editingId; })[0] : null;
    var editingIndex = editing ? state.games.indexOf(editing) + 1 : null;
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'kicker' }, [editing ? 'Editing game ' + editingIndex : 'III · Record a game']));
    root.appendChild(h('h2', { id: 'editor-heading' }, [editing ? 'Edit game ' + editingIndex : 'Record a game']));
    root.appendChild(h('p', { class: 'lede' }, ['Pick the killer, then the bloodpoints, the kills, and who escaped. The points update as you type.']));

    var chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Who was the killer?' });
    state.players.forEach(function (player) {
      var pressed = draft.killerId === player.id;
      chips.appendChild(h('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': pressed ? 'true' : 'false',
        'data-action': 'pick-killer',
        'data-player': player.id
      }, [icon('assets/killer.webp'), h('span', { 'data-name-for': player.id }, [displayName(player.id)])]));
    });
    root.appendChild(h('p', { class: 'legend' }, ['Who was the killer?']));
    root.appendChild(chips);
    if (draft.error) root.appendChild(h('p', { class: 'editor-error', role: 'alert' }, [draft.error]));
    (draft.warnings || []).forEach(function (warning) {
      root.appendChild(h('p', { class: 'editor-warn' }, [warning]));
    });

    state.players.forEach(function (player) {
      var value = draft.values[player.id] || blankValue();
      var isKiller = player.id === draft.killerId;
      var roleControls;
      if (!draft.killerId) {
        roleControls = h('p', { class: 'lines' }, ['Choose the killer to mark this seat.']);
      } else if (isKiller) {
        var kills = h('div', { class: 'choice', role: 'group', 'aria-label': 'Kills for ' + displayName(player.id) });
        for (var k = 0; k <= 4; k++) {
          kills.appendChild(h('button', {
            type: 'button',
            'aria-pressed': value.kills === k ? 'true' : 'false',
            'data-action': 'set-kills',
            'data-player': player.id,
            'data-kills': String(k)
          }, [String(k)]));
        }
        roleControls = h('div', { class: 'field' }, [h('span', {}, ['Kills']), kills]);
      } else {
        roleControls = h('div', { class: 'field' }, [
          h('span', {}, ['Escaped']),
          h('div', { class: 'choice', role: 'group', 'aria-label': 'Did ' + displayName(player.id) + ' escape?' }, [
            h('button', { type: 'button', 'aria-pressed': value.escaped === true ? 'true' : 'false', 'data-action': 'set-escaped', 'data-player': player.id, 'data-escaped': 'yes' }, ['Escaped']),
            h('button', { type: 'button', 'aria-pressed': value.escaped === false ? 'true' : 'false', 'data-action': 'set-escaped', 'data-player': player.id, 'data-escaped': 'no' }, ['Dead'])
          ])
        ]);
      }
      root.appendChild(h('div', { class: 'entry' }, [
        h('div', { class: 'entry-name' }, [
          icon(isKiller ? 'assets/killer.webp' : 'assets/survivor.webp'),
          h('span', { 'data-name-for': player.id }, [displayName(player.id)])
        ]),
        h('label', { class: 'field' }, [
          h('span', {}, ['Bloodpoints']),
          h('input', {
            type: 'text',
            inputmode: 'numeric',
            maxlength: '7',
            placeholder: '0–40,000',
            value: value.bloodpoints,
            'data-field': 'bp',
            'data-player': player.id,
            autocomplete: 'off',
            'aria-invalid': draft.error ? 'false' : 'false'
          })
        ]),
        roleControls,
        h('div', { class: 'points js-preview', 'data-player': player.id }, ['—'])
      ]));
      root.appendChild(h('p', { class: 'lines js-lines', 'data-player': player.id }, ['']));
    });

    root.appendChild(h('div', { class: 'row-actions' }, [
      h('button', { type: 'button', class: 'btn btn-primary', 'data-action': 'save-game' }, [editing ? 'Save changes' : 'Save game']),
      editing ? h('button', { type: 'button', class: 'btn', 'data-action': 'cancel-edit' }, ['Cancel']) : null
    ]));
    refreshPreview();
  }

  function draftToGame() {
    return {
      killerId: draft.killerId,
      entries: state.players.map(function (player) {
        var value = draft.values[player.id] || blankValue();
        var isKiller = player.id === draft.killerId;
        return {
          playerId: player.id,
          bloodpoints: value.bloodpoints,
          kills: isKiller ? value.kills : 0,
          escaped: isKiller ? false : value.escaped
        };
      })
    };
  }

  function refreshPreview() {
    if (!draft || shared) return;
    var survivors = state.players.filter(function (player) { return player.id !== draft.killerId; });
    var allChosen = !!draft.killerId && survivors.every(function (player) {
      var value = draft.values[player.id];
      return value && (value.escaped === true || value.escaped === false);
    });
    var allEscaped = allChosen && survivors.length > 0 && survivors.every(function (player) {
      return draft.values[player.id].escaped === true;
    });
    state.players.forEach(function (player) {
      var preview = document.querySelector('.js-preview[data-player="' + player.id + '"]');
      var lines = document.querySelector('.js-lines[data-player="' + player.id + '"]');
      if (!preview || !lines) return;
      var value = draft.values[player.id] || blankValue();
      if (!draft.killerId) {
        preview.textContent = '—';
        preview.classList.remove('is-max');
        lines.textContent = '';
        return;
      }
      var isKiller = player.id === draft.killerId;
      var bpOk = !S.validateBloodpoints(value.bloodpoints);
      var roleOk = isKiller
        ? (value.kills !== null && value.kills !== '' && S.parseWhole(value.kills) !== null && S.parseWhole(value.kills) <= 4)
        : (value.escaped === true || value.escaped === false);
      if (!bpOk || !roleOk) {
        preview.textContent = '—';
        preview.classList.remove('is-max');
        lines.textContent = bpOk ? '' : (S.validateBloodpoints(value.bloodpoints) || '');
        return;
      }
      var scored = S.scoreEntry({
        role: isKiller ? 'killer' : 'survivor',
        bloodpoints: value.bloodpoints,
        kills: value.kills,
        escaped: value.escaped === true,
        allSurvivorsEscaped: allEscaped
      });
      preview.textContent = String(scored.total);
      var cap = isKiller ? S.KILLER_GAME_MAX : S.SURVIVOR_GAME_MAX;
      preview.classList.toggle('is-max', scored.total === cap);
      var text = scored.lines.join(' ');
      if (!isKiller && value.escaped === true && !allChosen) {
        text += ' The escape bonus lands once every survivor is marked.';
      }
      lines.textContent = text;
    });
  }

  function renderHistory() {
    var open = captureOpen();
    var root = document.getElementById('history');
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'kicker' }, ['Games']));
    root.appendChild(h('h2', { id: 'history-heading' }, ['Games']));
    if (!state.games.length) {
      root.appendChild(h('p', { class: 'lede' }, ['No games yet.']));
      return;
    }
    state.games.forEach(function (game, index) {
      var scored = S.scoreGame(game);
      var byId = {};
      scored.rows.forEach(function (row) { byId[row.playerId] = row; });
      var pills = h('div', { class: 'chips' });
      state.players.forEach(function (player) {
        var row = byId[player.id];
        if (!row) return;
        var note = row.role === 'killer' ? (row.bonusLabel === '4K' ? '4K' : 'Killer') : (row.escapePoints ? 'Out' : 'Dead');
        pills.appendChild(h('span', { class: 'pill' }, [
          h('span', { 'data-name-for': player.id }, [displayName(player.id)]),
          ' ',
          h('strong', {}, [String(row.total)]),
          ' ',
          h('em', {}, [note])
        ]));
      });
      var details = h('details', { class: 'math', 'data-keep': 'game:' + game.id });
      details.appendChild(h('summary', {}, ['Breakdown']));
      scored.rows.forEach(function (row) {
        details.appendChild(h('p', {}, [displayName(row.playerId) + ' · ' + (row.role === 'killer' ? 'Killer' : 'Survivor') + '. ' + row.lines.join(' ')]));
      });
      var confirming = confirmDeleteId === game.id;
      var actions = h('div', { class: 'row-actions js-mutate' });
      if (confirming) {
        actions.appendChild(h('span', {}, ['Delete this game?']));
        actions.appendChild(h('button', { type: 'button', class: 'btn btn-small btn-danger', 'data-action': 'delete-confirm', 'data-game': game.id }, ['Delete']));
        actions.appendChild(h('button', { type: 'button', class: 'btn btn-small', 'data-action': 'delete-cancel' }, ['Keep']));
      } else {
        actions.appendChild(h('button', { type: 'button', class: 'btn btn-small', 'data-action': 'edit-game', 'data-game': game.id }, ['Edit']));
        actions.appendChild(h('button', { type: 'button', class: 'btn btn-small btn-danger', 'data-action': 'delete-ask', 'data-game': game.id }, ['Delete']));
        actions.appendChild(h('button', { type: 'button', class: 'btn btn-small', 'data-action': 'move-game', 'data-dir': '-1', 'data-game': game.id, disabled: index === 0 }, ['Up']));
        actions.appendChild(h('button', { type: 'button', class: 'btn btn-small', 'data-action': 'move-game', 'data-dir': '1', 'data-game': game.id, disabled: index === state.games.length - 1 }, ['Down']));
      }
      root.appendChild(h('article', { class: 'game' }, [
        h('div', { class: 'game-head' }, [
          h('h3', {}, ['Game ' + (index + 1)]),
          scored.allSurvivorsEscaped ? h('span', { class: 'badge' }, ['All escaped']) : null,
          scored.killCount === 4 ? h('span', { class: 'badge win' }, ['4K']) : null
        ]),
        h('p', { class: 'game-killer' }, ['Killer: ', h('span', { 'data-name-for': game.killerId }, [displayName(game.killerId)])]),
        pills,
        details,
        shared ? null : actions
      ]));
    });
    restoreOpen(open);
  }

  function currentPair() {
    var board = S.standings(state.players, state.games, null);
    if (!board.tiedForFirst) return { board: board, ids: [], a: null, b: null };
    if (board.tiedIds.length === 2) return { board: board, ids: board.tiedIds, a: board.tiedIds[0], b: board.tiedIds[1] };
    var a = state.tiebreak && board.tiedIds.indexOf(state.tiebreak.playerA) !== -1 ? state.tiebreak.playerA : (pairPick[0] || null);
    var b = state.tiebreak && board.tiedIds.indexOf(state.tiebreak.playerB) !== -1 ? state.tiebreak.playerB : (pairPick[1] || null);
    if (a && b && a === b) b = null;
    return { board: board, ids: board.tiedIds, a: a, b: b };
  }

  function renderTiebreak() {
    var root = document.getElementById('tiebreak');
    var pair = currentPair();
    var stale = !pair.board.tiedForFirst && state.tiebreak;
    if (!pair.board.tiedForFirst && !state.tiebreak) {
      root.hidden = true;
      root.innerHTML = '';
      return;
    }
    root.hidden = false;
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'kicker' }, ['Deadlock']));
    root.appendChild(h('h2', { id: 'tiebreak-heading' }, ['Tie-break']));
    if (stale) {
      root.appendChild(h('p', { class: 'lede' }, ['The standings have moved on, so this tie-break is not applied.']));
      root.appendChild(h('button', { type: 'button', class: 'btn js-mutate', 'data-action': 'tie-clear' }, ['Clear tie-break']));
      return;
    }
    var names = pair.ids.map(displayName);
    root.appendChild(h('p', { class: 'lede' }, [
      names.join(', ').replace(/, ([^,]*)$/, ' and $1'),
      ' are level on ' + pair.board.max + '. Best of 3, a 1v1 timed chase. First to two chases takes it. The points stay level.'
    ]));
    if (!shared && pair.ids.length > 2) {
      root.appendChild(h('p', { class: 'legend' }, ['Choose the two who will chase.']));
      var chips = h('div', { class: 'chips' });
      pair.ids.forEach(function (id) {
        var on = id === pair.a || id === pair.b;
        chips.appendChild(h('button', {
          type: 'button',
          class: 'chip',
          'aria-pressed': on ? 'true' : 'false',
          'data-action': 'tie-contender',
          'data-player': id
        }, [displayName(id)]));
      });
      root.appendChild(chips);
    }
    if (!pair.a || !pair.b) {
      root.appendChild(h('p', { class: 'lede' }, [shared ? 'The tie-break has not been recorded.' : 'Pick two names to start the chases.']));
      return;
    }
    var rounds = (state.tiebreak && state.tiebreak.playerA === pair.a && state.tiebreak.playerB === pair.b)
      ? state.tiebreak.rounds
      : [];
    for (var i = 0; i < 3; i++) {
      var round = rounds[i] || { winnerId: null, timeSeconds: null };
      var winners = h('div', { class: 'chase-winners' });
      [pair.a, pair.b].forEach(function (id) {
        winners.appendChild(h('button', {
          type: 'button',
          class: 'chip js-mutate',
          'aria-pressed': round.winnerId === id ? 'true' : 'false',
          'data-action': 'chase-winner',
          'data-index': String(i),
          'data-player': id,
          disabled: shared
        }, [displayName(id)]));
      });
      if (round.winnerId && !shared) {
        winners.appendChild(h('button', { type: 'button', class: 'btn btn-small js-mutate', 'data-action': 'chase-clear', 'data-index': String(i) }, ['Clear']));
      }
      root.appendChild(h('div', { class: 'chase' }, [
        h('div', { class: 'legend' }, ['Chase ' + (i + 1)]),
        winners,
        h('label', { class: 'field chase-time' }, [
          h('span', {}, ['Time (seconds)']),
          h('input', {
            type: 'text',
            inputmode: 'decimal',
            placeholder: 'e.g. 42.5',
            value: round.timeSeconds == null ? '' : String(round.timeSeconds),
            'data-field': 'chase-time',
            'data-index': String(i),
            disabled: shared || !round.winnerId
          })
        ])
      ]));
    }
    var tallyA = 0;
    var tallyB = 0;
    rounds.forEach(function (round) {
      if (!round || !round.winnerId) return;
      if (round.winnerId === pair.a) tallyA += 1;
      if (round.winnerId === pair.b) tallyB += 1;
    });
    var result = S.tiebreakWinner(rounds);
    var resultText;
    if (result.winnerId) {
      resultText = displayName(result.winnerId) + ' takes the tie-break, ' + Math.max(tallyA, tallyB) + '–' + Math.min(tallyA, tallyB) + '.';
    } else if (tallyA || tallyB) {
      resultText = displayName(pair.a) + ' ' + tallyA + '–' + tallyB + ' ' + displayName(pair.b) + '.';
    } else {
      resultText = 'No chases recorded yet.';
    }
    root.appendChild(h('p', { class: 'tie-result' }, [resultText]));
    if (!shared && state.tiebreak) {
      root.appendChild(h('button', { type: 'button', class: 'btn js-mutate', 'data-action': 'tie-clear' }, ['Clear tie-break']));
    }
  }

  function ensurePairRounds(a, b) {
    if (!state.tiebreak || state.tiebreak.playerA !== a || state.tiebreak.playerB !== b) {
      state.tiebreak = { playerA: a, playerB: b, rounds: [], winnerId: null };
    }
    pairPick = [a, b];
  }

  function saveGame() {
    var checked = S.validateGame(state.players, draftToGame());
    draft.warnings = checked.warnings;
    if (checked.errors.length) {
      draft.error = checked.errors.join(' ');
      renderEditor();
      var alert = document.querySelector('.editor-error');
      if (alert) alert.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    var wasEdit = !!draft.editingId;
    var game = {
      id: draft.editingId || uid('g'),
      killerId: draft.killerId,
      entries: state.players.map(function (player) {
        var value = draft.values[player.id];
        var isKiller = player.id === draft.killerId;
        return {
          playerId: player.id,
          bloodpoints: S.parseWhole(value.bloodpoints),
          kills: isKiller ? S.parseWhole(value.kills) : 0,
          escaped: isKiller ? false : value.escaped === true
        };
      })
    };
    if (wasEdit) {
      var index = -1;
      state.games.forEach(function (existing, i) { if (existing.id === game.id) index = i; });
      if (index >= 0) state.games[index] = game;
    } else state.games.push(game);
    resetDraft();
    confirmDeleteId = null;
    syncTiebreak();
    persist();
    renderAll();
    toast(wasEdit ? 'Game updated.' : 'Game saved.');
  }

  function editGame(id) {
    var game = null;
    state.games.forEach(function (item) { if (item.id === id) game = item; });
    if (!game) return;
    resetDraft();
    draft.editingId = game.id;
    draft.killerId = game.killerId;
    game.entries.forEach(function (entry) {
      draft.values[entry.playerId] = {
        bloodpoints: String(entry.bloodpoints),
        kills: entry.playerId === game.killerId ? entry.kills : null,
        escaped: entry.playerId === game.killerId ? null : entry.escaped === true
      };
    });
    renderEditor();
    document.getElementById('editor').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function movePlayer(id, dir) {
    var index = -1;
    state.players.forEach(function (player, i) { if (player.id === id) index = i; });
    var next = index + dir;
    if (index < 0 || next < 0 || next >= state.players.length) return;
    var swap = state.players[index];
    state.players[index] = state.players[next];
    state.players[next] = swap;
    persist();
    renderPlayers();
    renderStandings();
    renderEditor();
    renderHistory();
  }

  function addPlayer() {
    if (state.players.length >= S.MAX_PLAYERS) return;
    var player = { id: uid('p'), name: '' };
    state.players.push(player);
    draft.values[player.id] = blankValue();
    persist();
    renderAll();
  }

  function removePlayer(id) {
    if (playerInGames(id)) { toast('Delete the games they are in first.'); return; }
    if (state.players.length <= S.MIN_PLAYERS) { toast('Keep at least two players.'); return; }
    state.players = state.players.filter(function (player) { return player.id !== id; });
    delete draft.values[id];
    if (draft.killerId === id) draft.killerId = null;
    if (state.tiebreak && (state.tiebreak.playerA === id || state.tiebreak.playerB === id)) state.tiebreak = null;
    pairPick = pairPick.filter(function (pick) { return pick !== id; });
    persist();
    renderAll();
  }

  function moveGame(id, dir) {
    var index = -1;
    state.games.forEach(function (game, i) { if (game.id === id) index = i; });
    var next = index + dir;
    if (index < 0 || next < 0 || next >= state.games.length) return;
    var swap = state.games[index];
    state.games[index] = state.games[next];
    state.games[next] = swap;
    persist();
    renderStandings();
    renderHistory();
    renderTiebreak();
  }

  function deleteGame(id) {
    state.games = state.games.filter(function (game) { return game.id !== id; });
    if (draft.editingId === id) resetDraft();
    confirmDeleteId = null;
    syncTiebreak();
    persist();
    renderAll();
    toast('Game deleted.');
  }

  function onClick(event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var action = button.getAttribute('data-action');
    if (shared && action !== 'import-shared') return;
    var playerId = button.getAttribute('data-player');
    var gameId = button.getAttribute('data-game');
    if (action === 'import-shared') {
      shared = false;
      history.replaceState(null, '', location.pathname + location.search);
      resetDraft();
      persist();
      renderAll();
      toast('Imported into the copy on this device.');
      return;
    }
    if (action === 'add-player') addPlayer();
    else if (action === 'remove-player') removePlayer(playerId);
    else if (action === 'move-player') movePlayer(playerId, Number(button.getAttribute('data-dir')));
    else if (action === 'pick-killer') {
      draft.killerId = playerId;
      renderEditor();
    } else if (action === 'set-kills') {
      draft.values[playerId].kills = Number(button.getAttribute('data-kills'));
      renderEditor();
    } else if (action === 'set-escaped') {
      draft.values[playerId].escaped = button.getAttribute('data-escaped') === 'yes';
      renderEditor();
    } else if (action === 'save-game') saveGame();
    else if (action === 'cancel-edit') { resetDraft(); renderEditor(); }
    else if (action === 'edit-game') editGame(gameId);
    else if (action === 'delete-ask') { confirmDeleteId = gameId; renderHistory(); }
    else if (action === 'delete-cancel') { confirmDeleteId = null; renderHistory(); }
    else if (action === 'delete-confirm') deleteGame(gameId);
    else if (action === 'move-game') moveGame(gameId, Number(button.getAttribute('data-dir')));
    else if (action === 'tie-contender') {
      var board = S.standings(state.players, state.games, null);
      if (board.tiedIds.indexOf(playerId) === -1) return;
      if (pairPick.indexOf(playerId) !== -1) pairPick = pairPick.filter(function (id) { return id !== playerId; });
      else if (pairPick.length >= 2) pairPick = [pairPick[1], playerId];
      else pairPick = pairPick.concat(playerId);
      if (state.tiebreak && (state.tiebreak.playerA !== pairPick[0] || state.tiebreak.playerB !== pairPick[1])) {
        state.tiebreak = null;
      }
      if (pairPick.length === 2) ensurePairRounds(pairPick[0], pairPick[1]);
      persist();
      renderTiebreak();
      renderStandings();
    } else if (action === 'chase-winner') {
      var pair = currentPair();
      if (!pair.a || !pair.b) return;
      ensurePairRounds(pair.a, pair.b);
      var index = Number(button.getAttribute('data-index'));
      while (state.tiebreak.rounds.length <= index) state.tiebreak.rounds.push({ winnerId: null, timeSeconds: null });
      state.tiebreak.rounds[index].winnerId = playerId;
      syncTiebreak();
      persist();
      renderTiebreak();
      renderStandings();
    } else if (action === 'chase-clear') {
      if (!state.tiebreak) return;
      var clearIndex = Number(button.getAttribute('data-index'));
      if (state.tiebreak.rounds[clearIndex]) {
        state.tiebreak.rounds[clearIndex].winnerId = null;
        state.tiebreak.rounds[clearIndex].timeSeconds = null;
      }
      syncTiebreak();
      persist();
      renderTiebreak();
      renderStandings();
    } else if (action === 'tie-clear') {
      state.tiebreak = null;
      pairPick = [];
      persist();
      renderTiebreak();
      renderStandings();
    }
  }

  function onInput(event) {
    var target = event.target;
    if (target.id === 'title') {
      state.title = target.value.slice(0, 60);
      document.title = (state.title || 'The Trial') + ' · Dead by Daylight tournament';
      scheduleSave();
      return;
    }
    if (shared) return;
    if (target.getAttribute('data-field') === 'player-name') {
      state.players.forEach(function (player) {
        if (player.id === target.getAttribute('data-player')) player.name = target.value.slice(0, 40);
      });
      updateNameDisplays();
      scheduleSave();
      return;
    }
    if (target.getAttribute('data-field') === 'bp') {
      var owner = target.getAttribute('data-player');
      if (draft.values[owner]) draft.values[owner].bloodpoints = target.value;
      refreshPreview();
      return;
    }
    if (target.getAttribute('data-field') === 'chase-time') {
      if (!state.tiebreak) return;
      var index = Number(target.getAttribute('data-index'));
      var round = state.tiebreak.rounds[index];
      if (!round) return;
      var raw = target.value.trim();
      if (raw === '') {
        round.timeSeconds = null;
        target.removeAttribute('aria-invalid');
        scheduleSave();
        return;
      }
      if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > 999) {
        target.setAttribute('aria-invalid', 'true');
        return;
      }
      round.timeSeconds = Number(raw);
      target.removeAttribute('aria-invalid');
      scheduleSave();
    }
  }

  function buildBeats() {
    if (!state.games.length) return [{ type: 'empty' }];
    var list = [{ type: 'open' }];
    state.games.forEach(function (game, index) {
      list.push({ type: 'card', index: index });
      list.push({ type: 'race', index: index });
      list.push({ type: 'leader', index: index });
    });
    list.push({ type: 'final' });
    return list;
  }

  function beatLabel(beat) {
    if (!beat || beat.type === 'empty') return 'Empty ledger';
    if (beat.type === 'open') return 'Opening';
    if (beat.type === 'final') return 'Final tally';
    var n = beat.index + 1;
    if (beat.type === 'card') return 'Game ' + n + ' · scoreboard';
    if (beat.type === 'race') return 'Game ' + n + ' · the chart';
    return 'Game ' + n + ' · the leader';
  }

  function announce(text) {
    document.getElementById('present-live').textContent = text;
  }

  function goBeat(index) {
    animToken += 1;
    beatIndex = Math.max(0, Math.min(beats.length - 1, index));
    var beat = beats[beatIndex];
    var present = document.getElementById('present');
    present.classList.remove('beat-slow', 'beat-mid', 'beat-fast');
    var speed = beat.type === 'race' || beat.type === 'leader' ? 'beat-fast' : (beat.type === 'card' ? 'beat-mid' : 'beat-slow');
    present.classList.add(speed);
    document.getElementById('present-progress').textContent = beatLabel(beat) + '  ·  ' + (beatIndex + 1) + ' / ' + beats.length;
    document.getElementById('present-next').textContent = beatIndex === beats.length - 1 ? 'Close' : 'Advance';
    document.getElementById('present-prev').disabled = beatIndex === 0;
    renderBeat(beat);
    if (heartOn) startHeart();
  }

  function renderBeat(beat) {
    var stage = document.getElementById('present-stage');
    stage.innerHTML = '';
    if (beat.type === 'empty') {
      stage.appendChild(h('div', { class: 'opening' }, [
        h('img', { class: 'brand-logo', src: 'assets/logo.webp', alt: 'Dead by Daylight' }),
        h('h2', {}, [state.title]),
        h('p', {}, ['No games on the ledger yet.'])
      ]));
      announce(state.title + '. No games yet.');
      return;
    }
    if (beat.type === 'open') {
      var names = h('div', { class: 'roll' });
      state.players.forEach(function (player, index) {
        var chip = h('span', {}, [displayName(player.id)]);
        chip.style.animationDelay = (index * 0.12) + 's';
        names.appendChild(chip);
      });
      stage.appendChild(h('div', { class: 'opening' }, [
        h('img', { class: 'brand-logo', src: 'assets/logo.webp', alt: 'Dead by Daylight' }),
        h('p', { class: 'reveal-kicker' }, ['The Entity keeps the tally']),
        h('h2', {}, [state.title]),
        h('p', {}, [state.players.length + ' players · ' + state.games.length + ' games · mark of 186']),
        names
      ]));
      announce(state.title + '. ' + state.games.length + ' games.');
      return;
    }
    if (beat.type === 'card') renderCard(stage, beat.index);
    else if (beat.type === 'race') renderRace(stage, beat.index);
    else if (beat.type === 'leader') renderLeader(stage, beat.index);
    else renderFinal(stage);
  }

  function renderCard(stage, index) {
    var game = state.games[index];
    var scored = S.scoreGame(game);
    var byId = {};
    scored.rows.forEach(function (row) { byId[row.playerId] = row; });
    var list = h('div', { class: 'card-list' });
    var order = [game.killerId].concat(state.players.map(function (player) { return player.id; }).filter(function (id) { return id !== game.killerId; }));
    order.forEach(function (id, i) {
      var row = byId[id];
      if (!row) return;
      var item = h('div', { class: 'card-row' }, [
        icon(row.role === 'killer' ? 'assets/killer.webp' : (row.escapePoints ? 'assets/exit.webp' : 'assets/hook.webp')),
        h('strong', {}, [displayName(id)]),
        h('div', { class: 'card-points' }, [String(row.total)]),
        h('p', { class: 'card-lines' }, [row.lines.slice(0, -1).join(' ')])
      ]);
      item.style.animationDelay = (i * 0.12) + 's';
      list.appendChild(item);
    });
    stage.appendChild(h('div', { class: 'card-sheet' }, [
      h('p', { class: 'reveal-kicker' }, ['Game ' + (index + 1) + ' of ' + state.games.length]),
      h('h2', {}, ['Killer: ' + displayName(game.killerId)]),
      list
    ]));
    announce('Game ' + (index + 1) + '. Killer ' + displayName(game.killerId) + '.');
  }

  function renderRace(stage, index) {
    var token = animToken;
    var prev = S.standings(state.players, state.games.slice(0, index), null);
    var next = S.standings(state.players, state.games.slice(0, index + 1), null);
    var max = 1;
    next.rows.forEach(function (row) { if (row.total > max) max = row.total; });
    var prevBy = {};
    var nextBy = {};
    prev.rows.forEach(function (row) { prevBy[row.player.id] = row; });
    next.rows.forEach(function (row) { nextBy[row.player.id] = row; });
    var chart = h('div', { class: 'race' });
    var rows = {};
    prev.rows.forEach(function (row) {
      var scale = row.total / max;
      var fill = h('div', { class: 'race-fill' });
      fill.style.transform = 'scaleX(' + scale + ')';
      fill.style.background = colourFor(row.player.id);
      var item = h('div', { class: 'race-row' }, [
        h('div', { class: 'race-rank' }, [String(row.rank)]),
        h('div', { class: 'race-name' }, [displayName(row.player.id)]),
        h('div', { class: 'race-track' }, [fill]),
        h('div', { class: 'race-score' }, [String(row.total)])
      ]);
      rows[row.player.id] = item;
      chart.appendChild(item);
    });
    stage.appendChild(h('div', {}, [
      h('p', { class: 'reveal-kicker' }, ['Game ' + (index + 1) + ' · running tally']),
      chart
    ]));
    announce('The standings climb after game ' + (index + 1) + '.');
    if (reducedMotion) {
      next.rows.forEach(function (row) { chart.appendChild(rows[row.player.id]); });
      next.rows.forEach(function (row) {
        var el = rows[row.player.id];
        el.querySelector('.race-rank').textContent = String(row.rank);
        el.querySelector('.race-score').textContent = String(row.total);
        var fill = el.querySelector('.race-fill');
        fill.style.transform = 'scaleX(' + (row.total / max) + ')';
      });
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (token !== animToken) return;
        var first = {};
        Object.keys(rows).forEach(function (id) { first[id] = rows[id].getBoundingClientRect(); });
        next.rows.forEach(function (row) { chart.appendChild(rows[row.player.id]); });
        next.rows.forEach(function (row) {
          var el = rows[row.player.id];
          var dy = first[row.player.id].top - el.getBoundingClientRect().top;
          el.style.transition = 'none';
          el.style.transform = 'translateY(' + dy + 'px)';
          el.querySelector('.race-rank').textContent = String(row.rank);
        });
        requestAnimationFrame(function () {
          if (token !== animToken) return;
          next.rows.forEach(function (row) {
            var el = rows[row.player.id];
            el.style.transition = 'transform 1.45s cubic-bezier(.2,.7,.2,1)';
            el.style.transform = 'translateY(0)';
            var fill = el.querySelector('.race-fill');
            fill.style.transition = 'transform 2.5s cubic-bezier(.12,.7,.15,1)';
            fill.style.transform = 'scaleX(' + (row.total / max) + ')';
            countUp(el.querySelector('.race-score'), prevBy[row.player.id].total, row.total, 2500, token);
          });
        });
      });
    });
  }

  function countUp(el, from, to, ms, token) {
    if (from === to || reducedMotion) { el.textContent = String(to); return; }
    var start = performance.now();
    function frame(now) {
      if (token !== animToken) return;
      var p = Math.min(1, (now - start) / ms);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderLeader(stage, index) {
    var board = S.standings(state.players, state.games.slice(0, index + 1), null);
    var leaders = board.rows.filter(function (row) { return row.total === board.max; });
    var sheet;
    if (leaders.length > 1) {
      var names = h('div', { class: 'deadlock-names' });
      leaders.forEach(function (row) {
        names.appendChild(h('h2', { class: 'reveal-name' }, [displayName(row.player.id)]));
      });
      sheet = h('div', { class: 'reveal' }, [
        icon('assets/crows.webp'),
        h('p', { class: 'reveal-kicker' }, ['After game ' + (index + 1)]),
        h('p', { class: 'reveal-sub' }, ['Deadlock']),
        names,
        h('p', { class: 'reveal-points' }, [String(board.max)]),
        h('div', { class: 'blood-line' })
      ]);
      announce('Deadlock on ' + board.max + ' after game ' + (index + 1) + '.');
    } else {
      var name = displayName(leaders[0].player.id);
      sheet = h('div', { class: 'reveal' }, [
        h('div', { class: 'reveal-hook' }, [h('img', { src: 'assets/hook.webp', alt: '' })]),
        h('p', { class: 'reveal-kicker' }, ['After game ' + (index + 1)]),
        h('p', { class: 'reveal-sub' }, ['The Entity chooses']),
        h('h2', { class: 'reveal-name' }, [name]),
        h('p', { class: 'reveal-points' }, [String(leaders[0].total)]),
        h('div', { class: 'blood-line' }),
        h('p', { class: 'reveal-sub' }, ['leads the trial'])
      ]);
      announce(name + ' leads on ' + leaders[0].total + ' after game ' + (index + 1) + '.');
    }
    stage.appendChild(sheet);
  }

  function renderFinal(stage) {
    var board = S.standings(state.players, state.games, state.tiebreak);
    var list = h('div', { class: 'final-list' });
    board.rows.forEach(function (row, index) {
      var item = h('div', { class: 'final-row' + (index === 0 ? ' is-winner' : '') }, [
        h('span', {}, [String(row.rank)]),
        h('span', {}, [displayName(row.player.id) + (row.tiebreakWinner ? ' · tie-break' : '')]),
        h('strong', {}, [String(row.total)])
      ]);
      item.style.animationDelay = (0.15 + index * 0.08) + 's';
      list.appendChild(item);
    });
    var winner = board.rows[0];
    var headline = displayName(winner.player.id);
    var sub = 'The trial is closed';
    if (board.tiedForFirst && board.tiebreakApplies) {
      var result = S.tiebreakWinner(state.tiebreak.rounds);
      var scores = result.tally || {};
      var high = 0;
      var low = 0;
      Object.keys(scores).forEach(function (id) {
        if (id === board.rows[0].player.id) high = scores[id];
        else low = Math.max(low, scores[id]);
      });
      sub = 'Settled by a 1v1 chase, ' + high + '–' + low;
    } else if (board.tiedForFirst) {
      headline = 'Deadlock';
      sub = 'Record the tie-break to name a winner';
    }
    stage.appendChild(h('div', { class: 'final-sheet' }, [
      h('div', { class: 'reveal-hook' }, [h('img', { src: board.tiedForFirst && !board.tiebreakApplies ? 'assets/crows.webp' : 'assets/hook.webp', alt: '' })]),
      h('p', { class: 'reveal-kicker' }, [sub]),
      h('h2', {}, [headline]),
      h('p', { class: 'reveal-points' }, [board.tiedForFirst && !board.tiebreakApplies ? String(board.max) : String(winner.total)]),
      list
    ]));
    announce('Final tally. ' + headline + ' on ' + winner.total + '.');
  }

  function openPresent() {
    beats = buildBeats();
    beatIndex = 0;
    var present = document.getElementById('present');
    present.hidden = false;
    document.documentElement.classList.add('presenting');
    goBeat(0);
    document.getElementById('present-stage').focus();
  }

  function closePresent() {
    document.getElementById('present').hidden = true;
    document.documentElement.classList.remove('presenting');
    animToken += 1;
    clearTimeout(heartTimer);
  }

  function nextBeat() {
    if (beatIndex >= beats.length - 1) { closePresent(); return; }
    goBeat(beatIndex + 1);
  }

  function prevBeat() { goBeat(beatIndex - 1); }

  function thump(freq, gain) {
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var amp = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.55), t + 0.14);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function heartGap() {
    var present = document.getElementById('present');
    if (present.classList.contains('beat-fast')) return 560;
    if (present.classList.contains('beat-mid')) return 900;
    return 1320;
  }

  function startHeart() {
    clearTimeout(heartTimer);
    if (!heartOn || document.getElementById('present').hidden) return;
    thump(68, 0.22);
    setTimeout(function () { if (heartOn) thump(48, 0.14); }, 170);
    heartTimer = setTimeout(startHeart, heartGap());
  }

  function setHeart(on) {
    heartOn = on;
    try { localStorage.setItem(HEART_KEY, on ? '1' : '0'); } catch (error) {}
    document.getElementById('present-sound').textContent = on ? 'Heartbeat on' : 'Heartbeat off';
    document.getElementById('present-sound').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { toast('This browser will not play the heartbeat.'); return; }
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      startHeart();
    } else clearTimeout(heartTimer);
  }

  function fillMarquee() {
    var track = document.getElementById('marquee');
    var sources = PORTRAITS.concat(PORTRAITS);
    sources.forEach(function (name) {
      track.appendChild(h('img', { src: 'assets/' + name + '.webp', alt: '' }));
    });
  }

  function startFog() {
    var canvas = document.getElementById('fog');
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    var width = 0;
    var height = 0;
    var dpr = 1;
    var puffs = [];
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(initial) {
      return {
        x: Math.random() * window.innerWidth,
        y: initial ? Math.random() * window.innerHeight : window.innerHeight * (0.2 + Math.random() * 0.8),
        rx: 80 + Math.random() * 180,
        ry: 30 + Math.random() * 70,
        a: 0.015 + Math.random() * 0.04,
        vx: 0.15 + Math.random() * 0.35
      };
    }
    for (var i = 0; i < 16; i++) puffs.push(spawn(true));
    resize();
    window.addEventListener('resize', resize);
    function frame() {
      ctx.clearRect(0, 0, width, height);
      puffs.forEach(function (puff) {
        ctx.fillStyle = 'rgba(186, 180, 172, ' + puff.a + ')';
        ctx.beginPath();
        ctx.ellipse(puff.x, puff.y, puff.rx, puff.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!reducedMotion && !document.hidden) {
          puff.x += puff.vx;
          if (puff.x - puff.rx > width) puff.x = -puff.rx;
        }
      });
      if (!reducedMotion) requestAnimationFrame(frame);
    }
    frame();
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(S.exportObject(state), null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    var slug = (state.title || 'trial').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trial';
    link.href = URL.createObjectURL(blob);
    link.download = slug + '-ledger.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        state = S.importState(JSON.parse(String(reader.result)));
        shared = false;
        history.replaceState(null, '', location.pathname + location.search);
        resetDraft();
        pairPick = [];
        confirmDeleteId = null;
        syncTiebreak();
        persist();
        renderAll();
        toast('Imported.');
      } catch (error) {
        toast(error.message || 'Could not import that file.');
      }
    };
    reader.readAsText(file);
  }

  async function copyShare() {
    var token;
    try { token = await encodeHash(); }
    catch (error) { toast('Could not build the share link.'); return; }
    var url = location.origin + location.pathname + '#' + token;
    var panel = document.getElementById('share-panel');
    var input = document.getElementById('share-url');
    input.value = url;
    panel.hidden = false;
    var copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch (error) { copied = false; }
    if (!copied) {
      input.focus();
      input.select();
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    }
    var message = copied ? 'Share link copied.' : 'Share link ready. Copy it from the box.';
    if (url.length > 8000) message += ' It is very long; export JSON if a chat app trims it.';
    toast(message);
  }

  function bind() {
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('input', onInput);
    document.body.addEventListener('focusout', function (event) {
      if (event.target && event.target.getAttribute && event.target.getAttribute('data-field') === 'player-name') {
        setTimeout(function () {
          renderStandings();
          renderHistory();
          updateNameDisplays();
        }, 0);
      }
    });
    document.getElementById('btn-present').addEventListener('click', openPresent);
    document.getElementById('btn-share').addEventListener('click', copyShare);
    document.getElementById('btn-export').addEventListener('click', exportJson);
    document.getElementById('btn-import').addEventListener('click', function () {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (file) importFile(file);
    });
    document.getElementById('share-close').addEventListener('click', function () {
      document.getElementById('share-panel').hidden = true;
    });
    document.getElementById('share-select').addEventListener('click', function () {
      var input = document.getElementById('share-url');
      input.focus();
      input.select();
    });
    document.getElementById('present-close').addEventListener('click', closePresent);
    document.getElementById('present-next').addEventListener('click', nextBeat);
    document.getElementById('present-prev').addEventListener('click', prevBeat);
    document.getElementById('present-sound').addEventListener('click', function () { setHeart(!heartOn); });
    document.getElementById('present').addEventListener('click', function (event) {
      if (event.target.closest('button, a, input, label')) return;
      nextBeat();
    });
    document.addEventListener('keydown', function (event) {
      var presentOpen = !document.getElementById('present').hidden;
      if (presentOpen) {
        if (event.key === 'Escape') { event.preventDefault(); closePresent(); return; }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); prevBeat(); return; }
        if (event.key === 'Home') { event.preventDefault(); goBeat(0); return; }
        if (event.key === 'End') { event.preventDefault(); goBeat(beats.length - 1); return; }
        if (event.target.closest && event.target.closest('button, input, textarea')) return;
        if (event.key === ' ' || event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'Enter') {
          event.preventDefault();
          nextBeat();
        }
        return;
      }
      if (event.key === 'Enter' && event.target.closest && event.target.closest('#editor') && event.target.tagName === 'INPUT') {
        event.preventDefault();
        saveGame();
      }
    });
    motionQuery.addEventListener && motionQuery.addEventListener('change', function () {
      reducedMotion = motionQuery.matches;
    });
  }

  async function init() {
    bind();
    fillMarquee();
    startFog();
    try { heartOn = localStorage.getItem(HEART_KEY) === '1'; } catch (error) { heartOn = false; }
    document.getElementById('present-sound').textContent = heartOn ? 'Heartbeat on' : 'Heartbeat off';
    if (location.hash.length > 4) {
      try {
        var decoded = await decodeHash(location.hash);
        if (decoded) { state = decoded; shared = true; }
      } catch (error) {
        toast('That share link could not be read. Showing the copy saved on this device.');
      }
    }
    if (!state) state = loadLocal() || defaultState();
    syncTiebreak();
    resetDraft();
    renderAll();
  }

  init();
})();
