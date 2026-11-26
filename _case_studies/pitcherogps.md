---
title: PitcheroGPS
kind: App
order: 3
featured: true
built: Written by hand
# [WRITE: built_why — optional one line on why this was written by hand. Leave "" until you do.]
built_why: ""
summary: &summary GPS performance tracking for grassroots sports clubs. I was the sole app developer, connecting a custom tracker over Bluetooth Low Energy and turning its binary data into something the app and API could use.
description: *summary
role: Sole app developer, at Pitchero.
year: 2022 - 2023
status: On the App Store and Google Play.
platforms: [iOS, Android]
stack: [Flutter, Dart, Bluetooth Low Energy]
links:
  - label: App Store
    url: https://apps.apple.com/gb/app/pitcherogps/id1659662663
  - label: Google Play
    url: https://play.google.com/store/apps/details?id=com.pitchero.gps
cover: &cover /assets/img/work/pitcherogps/cover.webp
image: *cover
cover_alt: The PitcheroGPS app icon over a line drawing of a pitch with a GPS trace across it.
# Screens. Uncomment and fill one block per image. Files go in assets/img/work/pitcherogps/.
# gallery:
#   - src: /assets/img/work/pitcherogps/screen-1.webp
#     alt: [WRITE: what this screenshot shows]
#     caption: [WRITE: a short caption]
#     width: 1600
#     height: 900
---

## The brief

PitcheroGPS gives grassroots sports clubs the kind of player performance data that's usually only seen at the top level, using a bespoke GPS tracker and a detailed app.

I worked at Pitchero from 2022 to 2023 and was the sole developer on the app side of the project.

## How it works

- **Talking to the tracker.** The app connects to the custom GPS tracker and its firmware over Bluetooth Low Energy.
- **Making the data usable.** The tracker sends low-level binary. The app converts it into JSON and sends it up to Pitchero's API.

{% comment %}[WRITE: what players and coaches see in the app: sessions, stats, the screens you're proudest of]{% endcomment %}

{% comment %}
## Testing and trade-offs
[WRITE: anything hard about BLE on iOS and Android, sync, battery or testing with real kit.]
{% endcomment %}

{% comment %}
## What I'd point to
[WRITE: what you'd point a reader at.]
{% endcomment %}
