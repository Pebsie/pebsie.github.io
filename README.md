# tomlock.me

Personal site for Thomas Lock. Plain Jekyll, built by GitHub Pages itself: no Actions, no Node, nothing to install to publish. Push to the published branch and Pages rebuilds in a minute or two.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Home page |
| `work/index.html` | Work index: every case study, then the other apps |
| `_case_studies/` | One Markdown file per case study |
| `_data/projects.yml` | Smaller apps listed under "Other apps" |
| `_data/testimonials.yml` | Quotes on the home page |
| `_layouts/`, `_includes/` | Templates |
| `assets/css/site.css` | The only stylesheet |
| `assets/img/work/<slug>/` | Images for each case study |
| `assets/fonts/` | Fraunces and IBM Plex (both SIL Open Font Licence, licences alongside) |
| `bq-editor/`, `dbd/`, `img/` | Older things on this domain, left as they were |

`/bq/`, `/brawlquest-editor/`, `/brawlquest-armory/`, `/theroundwindow-preview/` and `/Streamlads/` are separate repos with their own Pages and keep working on their own. Don't add folders here with those names: the project repo wins, so they would never show.

## Add a case study

1. Copy `docs/case-study-template.md` to `_case_studies/<slug>.md`. The slug becomes the address: `_case_studies/inhabit.md` is served at `/work/inhabit/`.
2. Put the images in `assets/img/work/<slug>/`. WebP or JPEG, about 1600px wide at most. A 16:9 cover looks best.
3. Fill in the front matter (the block between the `---` lines) and write the body in Markdown.
4. Set `order:` to place it on the work page (1 is first). Set `featured: true` to show it on the home page too.
5. If the project is also in `_data/projects.yml`, either remove it from there or add `case_study: <slug>` so its name links to the case study.
6. Commit and push.

Front matter fields:

| Field | Needed | Notes |
| --- | --- | --- |
| `title` | yes | |
| `summary` | yes | One or two sentences. Used on cards and for link previews. |
| `kind` | yes | A one-word label: App, Game, Tool, Website. |
| `year` | yes | `"2024"` or `2022 - 2023`. Quote a bare year. |
| `order` | yes | Position on the work page. |
| `cover` | yes | Path to the cover image. |
| `cover_alt` | yes | What the cover shows, for screen readers. |
| `role`, `status` | no | Short text. |
| `platforms`, `stack` | no | Lists, e.g. `[Flutter, Firebase]`. |
| `links` | no | List of `label` and `url`. |
| `gallery` | no | List of `src`, `alt`, `caption`, and optional `width`, `height`, `wide: true` (full width) and `pixel: true` (keeps pixel art sharp). |
| `featured` | no | `true` to show on the home page. |
| `cover_pixel` | no | `true` for a pixel-art cover. |
| `cover_position` | no | Which part of the cover to keep when it's cropped, e.g. `left top`. |
| `accent` | no | A CSS colour for this case study's links. |

Inside the body you can mark something unfinished with `{% raw %}{% include todo.html text="what's missing" %}{% endraw %}`. It shows as a yellow striped box, so search the site for `TODO` before going live.

## Run it locally

Needs Ruby. Then:

```sh
gem install github-pages webrick
jekyll serve --livereload
```

and open http://localhost:4000. The `github-pages` gem pins the same Jekyll and plugins that GitHub Pages uses.
