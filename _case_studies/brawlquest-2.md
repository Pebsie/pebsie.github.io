---
title: BrawlQuest 2.0
kind: Game
order: 2
featured: true
built: AI-assisted
# [WRITE: built_why — optional one line on why this was AI-assisted. Leave "" until you do.]
built_why: ""
summary: &summary Free movement, a faster server, phone support and its own content editor.
description: *summary
role: Creator. Game design, client, server and tools.
year: "2026"
status: In development.
platforms: [Windows, iPhone]
stack: [Lua, LÖVE 11, Go, SQLite, UDP]
follows:
  title: BrawlQuest
  url: /work/brawlquest/
links:
  - label: Content editor
    url: /brawlquest-editor/
cover: &cover /assets/img/work/brawlquest/v2-fight.webp
image: *cover
cover_alt: BrawlQuest 2.0. A warrior fights a group of red-hooded bandits by a river at dusk, with blood on the grass and a quest tracker in the corner.
cover_caption: BrawlQuest 2.0. Bandits at dusk, with adventurers, the server's bot players, fighting alongside.
cover_pixel: true
gallery:
  - src: /assets/img/work/brawlquest/v2-bridge.webp
    alt: BrawlQuest 2.0. A mage stands by a wooden bridge next to a giant spider, with the minimap and hotbar showing.
    caption: 2.0 on desktop.
    width: 1280
    height: 720
    pixel: true
  - src: /assets/img/work/brawlquest/v2-phone.webp
    alt: BrawlQuest 2.0 on a phone screen held sideways, with a larger HUD.
    caption: The same scene laid out for a phone.
    width: 844
    height: 390
    pixel: true
---

## The brief

The 2022 game moved one tile at a time and ran most of the world on a one-second server tick. 2.0 keeps the world, the art and the spirit, and rebuilds how it moves and fights.

## How it works

- **Free movement.** Players and enemies move freely with wall collision, rather than hopping between tiles.
- **Combat off the tick.** Enemy AI and combat run faster than the old tick, with positions, hotbar use and level-ups sent over UDP. Other players and NPCs are smoothed with snapshot interpolation.
- **Feel.** Swing arcs, knockback, stamina and sprint, crits with a screen shake, and enemies that crumple when they die.
- **Adventurers.** The server fills the world with bot players who quest, hunt, chat a little, wave back, go sailing and can be hired. Their numbers scale so the world feels busy without drowning out real players.
- **A living world.** A 30-minute day and night cycle, mobs that only come out after dark, NPCs with daily routines, and seasonal dressing like snow at Christmas.
- **Phones.** An iPhone build with touch controls: tap to move, tap an enemy to fight, and a layout sized for a small screen. Singleplayer runs a server built into the app.
- **Accounts.** Play as a guest, then keep your character with a code sent by email.

### Content as data

All of the game's content lives in one SQLite database: items, enemies, NPCs, dialogue, quests, loot tables and the world map itself. The Go server reads it, and I edit it with a browser-based [content editor](/brawlquest-editor/) I built for the job. Changes to the live game go out as small SQL migrations, each with a rollback.

## Testing and trade-offs

Most new systems come with headless tests on both sides: Go tests on the server for movement, stamina, combat timing and snapshots, and Lua tests that run the client without a window. That's what makes it possible to change combat this much without breaking the rest of the game.

{% comment %}
## What I'd point to
[WRITE: one or two lines on what you're proudest of, or what you learnt. Player numbers or reviews only if you want them here.]
{% endcomment %}
