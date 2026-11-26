---
title: BrawlQuest
kind: Game
order: 1
featured: true
built: Written by hand
# [WRITE: built_why — optional one line on why this was written by hand. Leave "" until you do.]
built_why: ""
summary: &summary A pixel-art MMORPG I released on Steam in 2022 and am now rebuilding as BrawlQuest 2.0, with free movement, a faster server, phone support and its own content editor.
description: *summary
role: Creator. Game design, client, server and tools.
year: 2017 - 2022
status: On Steam for Windows. Early Access 25 Feb 2021, full release 28 Jun 2022.
platforms: [Windows (Steam)]
stack: [Lua, LÖVE 11, Go]
links:
  - label: BrawlQuest on Steam
    url: https://store.steampowered.com/app/871940/
  - label: BrawlQuest site
    url: /bq/
  - label: Armoury
    url: /brawlquest-armory/
followed_by:
  title: BrawlQuest 2.0
  url: /work/brawlquest-2/
cover: &cover /assets/img/work/brawlquest/cover.webp
image: *cover
cover_alt: A slice of the BrawlQuest world around Squall's End, with the BrawlQuest logo over it.
cover_pixel: true
gallery:
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

## The brief

BrawlQuest is a top-down MMORPG about, in its Steam description's words, "hitting stuff, mining stuff, crafting stuff, building stuff and generally vibing". It's built around simplicity, with no subscription and no intrusive microtransactions. Everything you see on another player was earned by playing.

The world has towns, forests, caves, a snowy north and a desert, and bosses that live out in the open world rather than behind instance doors. The original game was made by a team of two.

{% comment %}[WRITE: name the other half of the team, if you'd like them credited]{% endcomment %}

## How it works

### How it got here

BrawlQuest has been rewritten a few times. The repos tell the story.

| Year | What happened |
| --- | --- |
| 2017 | The first BrawlQuest, in Lua. That repo is public, with a README that calls it pre-university code. |
| 2018 | A launcher and auto-updater, and a PHP website. |
| 2019 | Split into a client, a server and a PHP API. |
| 2020 | The current client (LÖVE, Lua) and API repos start. The API is now written in Go. |
| 2021 | Steam Early Access on 25 February. |
| 2022 | Released on Steam on 28 June, for Windows. |
| 2023 | Side experiments, including a remake in Godot. |
| 2026 | Work starts on [BrawlQuest 2.0]({{ '/work/brawlquest-2/' | relative_url }}). |

{% comment %}
## Testing and trade-offs
[WRITE: how you tested the original game, and the trade-offs.]
{% endcomment %}

{% comment %}
## What I'd point to
[WRITE: one or two lines on what you're proudest of, or what you learnt. Player numbers or reviews only if you want them here.]
{% endcomment %}
