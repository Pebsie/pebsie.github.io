---
title: PitcheroGPS
kind: App
order: 3
featured: true
summary: GPS performance tracking for grassroots sports clubs. I was the sole app developer, connecting a custom tracker over Bluetooth Low Energy and turning its binary data into something the app and API could use.
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
cover: /assets/img/work/pitcherogps/cover.webp
cover_alt: The PitcheroGPS app icon over a line drawing of a pitch with a GPS trace across it.
---

## The brief

PitcheroGPS gives grassroots sports clubs the kind of player performance data that's usually only seen at the top level, using a bespoke GPS tracker and a detailed app.

I worked at Pitchero from 2022 to 2023 and was the sole developer on the app side of the project.

## What I built

- **Talking to the tracker.** The app connects to the custom GPS tracker and its firmware over Bluetooth Low Energy.
- **Making the data usable.** The tracker sends low-level binary. The app converts it into JSON and sends it up to Pitchero's API.
- **The app itself.** {% include todo.html text="what players and coaches see in the app: sessions, stats, the screens you're proudest of" %}

## Notes

{% include todo.html text="anything hard about BLE on iOS and Android, sync, battery or testing with real kit. Add screenshots to assets/img/work/pitcherogps/ and list them under gallery: in this file's front matter." %}
