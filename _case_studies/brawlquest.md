---
title: BrawlQuest
kind: Game
order: 1
featured: true
summary: A pixel-art MMORPG I released on Steam in 2022 and am now rebuilding as BrawlQuest 2.0, with free movement, a faster server, phone support and its own content editor.
role: Creator. Game design, client, server and tools.
year: 2017 - now
status: On Steam for Windows. 2.0 in development.
platforms: [Windows (Steam), iPhone (2.0, in development)]
stack: [Lua, LÖVE 11, Go, SQLite, UDP, JavaScript]
links:
  - label: BrawlQuest on Steam
    url: https://store.steampowered.com/app/871940/
  - label: BrawlQuest site
    url: /bq/
  - label: Content editor
    url: /work/brawlquest-editor/
  - label: Armoury
    url: /brawlquest-armory/
cover: /assets/img/work/brawlquest/cover.webp
cover_alt: A slice of the BrawlQuest world around Squall's End, with the BrawlQuest logo over it.
cover_pixel: true
gallery:
  - src: /assets/img/work/brawlquest/v2-fight.webp
    alt: BrawlQuest 2.0. A warrior fights a group of red-hooded bandits by a river at dusk, with blood on the grass and a quest tracker in the corner.
    caption: BrawlQuest 2.0. Bandits at dusk, with adventurers, the server's bot players, fighting alongside.
    width: 1280
    height: 800
    wide: true
    pixel: true
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
  - src: /assets/img/work/brawlquest/world-map.webp
    alt: The whole BrawlQuest world map, an island with forests, a snowy north, a desert, a walled arena and a dark industrial east.
    caption: The whole world, drawn from the game's own world data.
    width: 1260
    height: 1028
    wide: true
    pixel: true
  - src: /assets/img/work/brawlquest/2022-crafting.webp
    alt: The original BrawlQuest crafting window open over the inventory.
    caption: The 2022 Steam release. Inventory and crafting.
    width: 1280
    height: 720
  - src: /assets/img/work/brawlquest/2022-town.webp
    alt: The original BrawlQuest in a walled town with player chat down the right-hand side.
    caption: The 2022 release. Town and chat.
    width: 1280
    height: 720
---

## What it is

BrawlQuest is a top-down MMORPG about, in its Steam description's words, "hitting stuff, mining stuff, crafting stuff, building stuff and generally vibing". It's built around simplicity, with no subscription and no intrusive microtransactions. Everything you see on another player was earned by playing.

The world has towns, forests, caves, a snowy north and a desert, and bosses that live out in the open world rather than behind instance doors. The original game was made by a team of two.

{% include todo.html text="name the other half of the team, if you'd like them credited" %}

## How it got here

BrawlQuest has been rewritten a few times. The repos tell the story.

| Year | What happened |
| --- | --- |
| 2017 | The first BrawlQuest, in Lua. That repo is public, with a README that calls it pre-university code. |
| 2018 | A launcher and auto-updater, and a PHP website. |
| 2019 | Split into a client, a server and a PHP API. |
| 2020 | The current client (LÖVE, Lua) and API repos start. The API is now written in Go. |
| 2022 | Released on Steam on 28 June, for Windows. |
| 2023 | Side experiments, including a remake in Godot. |
| 2026 | Work starts on BrawlQuest 2.0. |

## BrawlQuest 2.0

The 2022 game moved one tile at a time and ran most of the world on a one-second server tick. 2.0 keeps the world, the art and the spirit, and rebuilds how it moves and fights.

- **Free movement.** Players and enemies move freely with wall collision, rather than hopping between tiles.
- **Combat off the tick.** Enemy AI and combat run faster than the old tick, with positions, hotbar use and level-ups sent over UDP. Other players and NPCs are smoothed with snapshot interpolation.
- **Feel.** Swing arcs, knockback, stamina and sprint, crits with a screen shake, and enemies that crumple when they die.
- **Adventurers.** The server fills the world with bot players who quest, hunt, chat a little, wave back, go sailing and can be hired. Their numbers scale so the world feels busy without drowning out real players.
- **A living world.** A 30-minute day and night cycle, mobs that only come out after dark, NPCs with daily routines, and seasonal dressing like snow at Christmas.
- **Phones.** An iPhone build with touch controls: tap to move, tap an enemy to fight, and a layout sized for a small screen. Singleplayer runs a server built into the app.
- **Accounts.** Play as a guest, then keep your character with a code sent by email.

### Content as data

All of the game's content lives in one SQLite database: items, enemies, NPCs, dialogue, quests, loot tables and the world map itself. The Go server reads it, and I edit it with a browser-based [content editor](/work/brawlquest-editor/) I built for the job. Changes to the live game go out as small SQL migrations, each with a rollback.

### Tested headless

Most new systems come with headless tests on both sides: Go tests on the server for movement, stamina, combat timing and snapshots, and Lua tests that run the client without a window. That's what makes it possible to change combat this much without breaking the rest of the game.

## What I'd point to

{% include todo.html text="one or two lines on what you're proudest of, or what you learnt. Player numbers or reviews only if you want them here." %}
