---
title: BrawlQuest
kind: Game
order: 1
featured: true
built: Written by hand
# [WRITE: built_why — optional one line on why this was written by hand. Leave "" until you do.]
built_why: ""
summary: &summary "Like all first time game developers, I enjoyed writing Pong and Breakout clones but my eyes always drifted to creating something outlandishly ambitious. My white whale was BrawlQuest: a 2D MMORPG written in LÖVE/Lua with a backend created in Go. I created several iterations of this whilst at college, and then at university, but none of them stuck. That was, until I received some funding in 2021 to work on the project full time with one of my agency employees, and thus was born Luven Interactive."
description: *summary
hide_lede: true
role: Creator. Game design, client, server and tools.
year: 2017 - 2022
status: On Steam for Windows. Early Access 25 Feb 2021, full release 28 Jun 2022.
platforms: [Windows (Steam)]
stack: [Lua, LÖVE 11, Go, SQLite]
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

## Summary

Like all first time game developers, I enjoyed writing Pong and Breakout clones but my eyes always drifted to creating something outlandishly ambitious. My white whale was BrawlQuest: a 2D MMORPG written in LÖVE/Lua with a backend created in Go. I created several iterations of this whilst at college, and then at university, but none of them stuck. That was, until I received some funding in 2021 to work on the project full time with one of my agency employees, and thus was born Luven Interactive.

My role on the project was to be an everyman; this was before AI coding tools, and so I created the backend Go server entirely by hand, in addition to the major parts of the frontend in Lua. My employee [Danjoe Stubbs](https://www.danstubbs.dev/) worked on the user interface and polish, while I rapidly built out new features and content.

The game launched in Steam early access in February 2021, with a full release following in June 2022. It was a commercial flop, selling just over 100 copies in its lifetime. I've continued to work on it, however, with periodic updates and improvements, and it has garnered a small cult following. In 2026, I'm prepping for the launch of BrawlQuest 2.0: an almost complete rework of many of the game's features.

## The brief

This was a game I made mostly for myself, the idea being that if I created something I wanted to play I'd naturally find my tribe. To that end the game harkens back to the retro, and is intentionally slow paced and calm. I had a strong preference for atmosphere, and much of my time was spent to that effect; working on lighting, world animations such as leaves blowing off of trees, and ensuring the world felt alive and bustling.

Working in 2 dimensions with a backend that updated once a second created many limitations and informed a lot of the design decisions; how would enemies attack, how would boss fights go, how can we allow players to customise their character in meaningful ways when we only have 3 armour slots? I was building within the confines of what I knew, because that was what was most fun, and it created something truly unique.

## How it works

The front end uses Lua/LÖVE and the backend is entirely Go with SQLite for the database. Dan created a content editor that we could use in-game to immediately ship world updates. Some of the biggest issues we ran into were around that SQLite database; the limitations in terms of how many writes can be active at once (1), and there were some major inefficiencies in both the way the front end and back end handled networking that caused issues for players overseas (the server was hosted on a VPS in London). This was very much part of the continual work I'd do, from 2021 to 2026, to make things function better.

The game peaked at 30 concurrent players, and sold just over 100 copies in its lifetime. We transitioned to free to play, and ended up with over 1000 players, but never hit that concurrent player count again. The fascinating thing is the retention graph: people either played the game for less than 20 minutes, or over 4 hours. There was practically no in-between. It either immediately clicked for you, and you became addicted fast, or you weren't interested and moved on.

I created a YouTube video documenting the game here: [https://www.youtube.com/watch?v=E3O0EmvyrDA](https://www.youtube.com/watch?v=E3O0EmvyrDA)

<figure class="video">
<iframe src="https://www.youtube.com/embed/E3O0EmvyrDA" title="BrawlQuest" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
</figure>

## Design highlight: Enchanting

One of the most unique features we added was the Enchanting system. The level cap was 40, and when you hit 40 you could keep playing using all your end-game gear and grind bosses (bosses dropped 1 Old World Crystal each per day, which could be used to create Legendary armour. You needed 100 OWC per gear piece, and there were 8 bosses. The grind was real and calculated!!) or you could choose to Enchant a single item piece.

Enchanting would reset you to Level 1, but apply a +40 stat bonus to any piece of gear. For mounts it would boost movement speed by 40%. People developed serious strategies: many would enchant their best gear, only to realise that it wasn't usable until level 40. Because you reset to level 1 and needed to grind out the levels again, it began to make sense to start enchanting early game gear, so many people would enchant the default weapon from +1 ATK to +41 ATK, alongside the default armour so you could take on tougher enemies from level 1. Of course, those enemies also provided more XP, and we allowed overlevelling: so one enemy could theoretically take you up several levels at once.

This feature was golden: people got seriously addicted to how satisfying the gameplay loop was, and many players ended up spending over 200 hours on the game. [One player enchanted 53 items](https://tomlock.me/brawlquest-armory/#/character/410)

{% comment %}
## What I'd point to
[WRITE: what you'd point a reader at.]
{% endcomment %}
