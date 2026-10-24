# Learn It All

A calm, self-hosted study workspace. Organise subjects into courses and lessons, write flashcards
that test them, and review on a spaced-repetition schedule that pushes what you know further
out and brings back what you do not.

No account, no server, no tracking — the entire app is three JavaScript files and one
stylesheet, and all state lives in your browser's `localStorage`.

---

## What it is

Most flashcard apps optimise for cards. **Learn It All** keeps the course structure visible:
a subject has lessons you work through, and each lesson can own the cards that test it. The
dashboard answers one question — *what should I do in the next ten minutes* — and the study
screen stays out of the way of the actual recall.

It was built as a static single-page app so it can be hosted anywhere: GitHub Pages, a
`file://` URL, an S3 bucket, or a USB stick.

## Features

**Study engine**
- Spaced repetition with a simplified SM-2 scheduler — four grades (*Again*, *Hard*, *Good*, *Easy*) adjust each card's ease factor and next interval.
- Live interval preview on every grade button, so you can see what "Easy" actually means before you click it.
- A due queue ordered by how overdue each card is.
- "Drill ahead" to pull cards forward when the queue is empty but you want to practise.

**Organisation**
- Courses with an icon, colour and description.
- Lessons with a three-state status (to do → in progress → done) and free-text notes in your own words.
- Cards can be linked to a specific lesson, or sit loose in the course.
- Per-course progress, cards-due count and average ease.

**Feedback**
- Dashboard hero with the current streak, cards due, and today's goal progress.
- 14-day review-volume bar chart, with today highlighted.
- Progress screen: 30-day recall rate, answer mix (how often you hit each grade), per-course recall breakdown, and the cards you have kept alive longest.
- Designed empty states on every list — a new workspace explains itself and offers the one action that fills it.

**Practicalities**
- Keyboard-first studying: `Space` to reveal, `1`–`4` to grade, `Esc` to close dialogs.
- Responsive down to a phone; the sidebar collapses to a drawer.
- Export the whole workspace as JSON. Reset to the sample content, or erase everything.
- Respects `prefers-reduced-motion`.

## Screens

| Route | Screen | What you see |
|---|---|---|
| `#/dashboard` | **Dashboard** | Deep-green hero with streak and due count, four stat tiles (reviewed today, due now, 30-day recall, lessons complete), course cards, an "Up next" queue, and a 14-day bar chart. |
| `#/courses` | **Courses** | A grid of course cards — icon, title, lesson/card counts, a progress bar tinted with the course colour, and how many cards are due right now. |
| `#/course/:id` | **Course detail** | Course header with description, three summary stats, action bar (Study / Add lesson / Add card / Delete), a lesson list you can tick through with one click, and the card list showing next-due and current ease per card. |
| `#/study` `#/study/:id` | **Study** | A large flashcard on a paper surface. Click or press space to reveal, then grade. Progress bar and counter at the top, card source and current ease at the bottom. |
| `#/stats` | **Progress** | Total reviews, current streak, recall rates (30-day and 7-day), review-volume chart, per-course recall chips, answer-mix table and longest-interval cards. |
| `#/settings` | **Settings** | Daily goal, workspace data counts, export / restore-sample / erase, and a short explanation of how the scheduling works. |
| `#/about` | **About** | A one-paragraph description of the build and the screens. |

New visitors land on a dashboard pre-filled with three sample courses (Product Discovery,
Distributed Systems, Metrics & Experimentation), twelve lessons, eleven cards and two weeks of
review history — so every chart and empty-state rule is visible immediately. Settings →
*Erase everything* clears it to a genuinely blank workspace.

## How the scheduling works

Each card carries an **ease factor** (starting at `2.5`) and a **current interval** in days.

| Grade | Ease change | Next interval |
|---|---|---|
| Again | −0.20 | 10 minutes (and the lapse counter increments) |
| Hard | −0.15 | previous interval × 1.2, minimum 1 day |
| Good | unchanged | previous interval × ease |
| Easy | +0.15 | previous interval × ease × 1.3, minimum 2 days |

Ease is floored at `1.3`. Correct answers push a card further out; a lapse pulls it back to
minutes without destroying the card's history. This is the SM-2 family, simplified — enough to
produce sensible intervals, little enough to read in one sitting.

## Running it locally

There is no build step and no dependency to install. Any of these work:

**Open the file directly**

```bash
git clone https://github.com/Dimitrisgrigg/learn-it-all.git
cd learn-it-all
open index.html          # macOS  (xdg-open on Linux, start on Windows)
```

**Or serve it, which is closer to how it is hosted**

```bash
# Python 3 — no install needed
python3 -m http.server 8000
# then visit http://localhost:8000

# or Node
npx serve .
```

**Or with any static host** — the repo root *is* the site. Point Netlify, Vercel, Cloudflare
Pages or GitHub Pages at the root directory and nothing else is required.

> `localStorage` is scoped per origin, so data created at `file://` will not appear when you
> serve the same files over `http://localhost:8000`. Pick one and stay with it.

## Project structure

```
learn-it-all/
├── index.html              # App shell: sidebar, topbar, view container, script tags
├── assets/
│   ├── css/
│   │   └── style.css       # Design tokens + every component style (one file)
│   └── js/
│       ├── seed.js         # Sample courses/lessons/cards + 14 days of review history
│       ├── store.js        # localStorage persistence, queries, SM-2 scheduler
│       ├── views.js        # Every screen as a pure function returning HTML
│       └── app.js          # Hash router, modals, study session, event delegation
├── LICENSE                 # MIT
├── .gitignore
└── README.md
```

**Where to change things**

- Colours, spacing, type scale → `:root` block at the top of `assets/css/style.css`.
- Scheduler behaviour → `GRADE` and `grade()` in `assets/js/store.js`.
- Starter content → `window.LIA_SEED` in `assets/js/seed.js`.
- A new screen → add a function to `Views` in `views.js`, then a case in `render()` in `app.js`.

## Browser support

Current Chrome, Firefox, Safari and Edge. The app uses ES5-compatible syntax plus
`Element.closest`, `NodeList.forEach` and `URL.createObjectURL` — all long-standing. It
degrades to an in-memory workspace (with a console warning) if `localStorage` is unavailable,
for example in some private-browsing modes.

## Data & privacy

Nothing is transmitted. There are no network requests after the page loads, no analytics, no
fonts fetched from a CDN and no third-party scripts. Everything you type stays in
`localStorage["learn-it-all:v1"]` on your machine, which also means *you* are responsible for
backups — use **Settings → Export JSON**.

## License

MIT — see [LICENSE](LICENSE).
