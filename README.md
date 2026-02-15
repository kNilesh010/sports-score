# PulseScore (Sports Score Website)

PulseScore is a clean, minimal sports-score dashboard that aggregates data from multiple open sources and visualizes it in:

- interactive charts
- summary KPI cards
- event table
- animated UI interactions

## Open-source/free endpoints used

1. **ESPN public scoreboard endpoints** (no key required)
   - `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`
   - Used for football, cricket (IPL), hockey, basketball (NBL), tennis, and badminton where available.
2. **TheSportsDB free API**
   - `https://www.thesportsdb.com/api/v1/json/3/all_sports.php`
   - Used for additional sport catalog coverage and fallback diversity.

## Features

- Multi-source fetch with source health indicators
- Coverage of wide sport categories including cricket, hockey, football, NBL, IPL, tennis, badminton
- Interactive bar and line charts (Chart.js)
- Clean glassmorphism-inspired dark UI
- Sports-themed micro-animations:
  - bouncing hero ball
  - rotating sports loader
  - click pulse medal effect
  - animation pause/resume toggle

## Run locally

Because this is a static web app:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.
