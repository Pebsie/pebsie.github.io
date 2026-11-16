---
title: BrawlQuest Content Editor
kind: Tool
order: 2
featured: true
summary: A browser-only editor for everything in BrawlQuest, from quests and dialogue to mobs, loot and the world map. It opens the game's SQLite database in the tab, checks it the way the server would, and commits it to GitHub.
role: Design and build.
year: "2026"
status: Live. Used to build BrawlQuest 2.0's content.
platforms: [Any modern browser, desktop and phone]
stack: [JavaScript, sql.js (SQLite in WebAssembly), IndexedDB, GitHub Git Data API, Web Audio]
links:
  - label: Open the editor
    url: /brawlquest-editor/
  - label: Source on GitHub
    url: https://github.com/Pebsie/brawlquest-editor
  - label: BrawlQuest case study
    url: /work/brawlquest/
cover: /assets/img/work/brawlquest-editor/journey.webp
cover_position: left top
cover_alt: The editor's Quest Studio journey view. Quests are cards on a dark canvas, linked by lines in story order and grouped into questlines.
gallery:
  - src: /assets/img/work/brawlquest-editor/cast.webp
    alt: The Cast view. NPCs shown as character cards with their portraits, faction, home zone and level range.
    caption: Cast. Every NPC as a character card, in the order you meet them.
    width: 1500
    height: 694
    wide: true
  - src: /assets/img/work/brawlquest-editor/sprite-picker.webp
    alt: An NPC character sheet with a sprite picker open, showing a grid of mage sprites grouped by folder.
    caption: Picking a look for an NPC. Tome tiles by David E. Gervais, CC BY 3.0.
    width: 1400
    height: 900
  - src: /assets/img/work/brawlquest-editor/mob-form.webp
    alt: The mob form, with speed, passive and sleep settings above a balance guide that works out how long a fight takes at a given level.
    caption: A mob's settings, with a balance guide that does the fight maths for a player at that level.
    width: 1400
    height: 748
---

## The problem

All of BrawlQuest's content lives in one SQLite file, `bq-content.db`: items, mobs, NPCs, quests, dialogue, loot, crafting and the world map. The old way to change it was a database browser and a lot of care. One bad row could stop every quest after it from loading on the server.

The editor turns that into a game tool rather than a spreadsheet. It works on a phone as well as a desk, and needs no server of its own.

## How it works

The editor is a static site. It loads the database into the browser with [sql.js](https://sql.js.org/), SQLite compiled to WebAssembly, so every edit is a real SQL write on a real copy of the file. Nothing is uploaded unless I commit it.

- **Autosave and History.** Snapshots go into IndexedDB as you work, gzipped (an 8.3 MB database is about 1.4 MB), with a summary of what changed. It works offline.
- **Checks before saving.** The editor runs the same checks the Go server's loaders would: SQLite's integrity check, every table and column the server reads, JSON decoded with Go's rules, and every reference between quests, NPCs, mobs and items. Errors block, warnings can be overridden.
- **Commits to GitHub.** It commits the database plus a plain-text SQL dump of each table, so the diff on GitHub shows what changed. It uses the Git Data API, only uploads files that changed, and only ever fast-forwards. If someone else committed in the meantime, it offers a new branch instead of overwriting.

## Quest Studio

It treats quests as a story rather than rows.

- **Journey.** Every quest is a card on a pannable, zoomable map, in story order or by level, grouped into questlines. Problems are flagged on the cards: missing prerequisites, level jumps, no reward, missing lines.
- **Cast.** NPCs as character cards, each with a sheet for their look, where they stand on the map, their daily routine and their whole conversation as one editable tree.
- **Quick quest.** Build a quest one question at a time. Level, XP, gold and kill counts are suggested from the quests, spawns and loot around the giver.
- **Playtest.** A pretend character takes, finishes and hands in quests through the same rules as the server.

## Beyond quests

There are tools for painting the world map tile by tile, placing NPCs and mobs, boss attack patterns, effects and projectiles, sounds (record one on your phone and shape it in the browser), skills, seasons and vendors. The mob form includes a balance guide that works out how long a fight takes for a player at a given level, using the same maths as the server.

Most features ship with headless tests that drive the real page, including GitHub sync against a mocked API.

{% include todo.html text="optional: a line on how much faster content work is now, if you want to say" %}
