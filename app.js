const SPORTS = [
  { key: 'football', label: 'Football', espn: ['soccer', 'eng.1'] },
  { key: 'cricket', label: 'Cricket', espn: ['cricket', 'ipl'] },
  { key: 'hockey', label: 'Hockey', espn: ['hockey', 'nhl'] },
  { key: 'basketball', label: 'NBL/Basketball', espn: ['basketball', 'nbl'] },
  { key: 'tennis', label: 'Tennis', espn: ['tennis', 'atp'] },
  { key: 'badminton', label: 'Badminton', espn: ['badminton', 'bwf'] },
];

const state = {
  events: [],
  health: [],
  trend: [],
  animationsPaused: false,
};

let sportsChart;
let trendChart;

const formatScore = (e) => {
  if (!e.homeScore && !e.awayScore) return 'TBD';
  return `${e.homeTeam} ${e.homeScore ?? '-'} : ${e.awayScore ?? '-'} ${e.awayTeam}`;
};

const normalizeStatus = (txt = '') => {
  const s = txt.toLowerCase();
  if (s.includes('in progress') || s.includes('live')) return 'live';
  if (s.includes('final') || s.includes('ended') || s.includes('complete')) return 'finished';
  return 'upcoming';
};

async function fetchEspnSport(sport, league) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN ${sport}/${league} failed`);
  const data = await res.json();

  return (data.events || []).map((event) => {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c) => c.homeAway === 'away');
    const statusText = event.status?.type?.description || 'Scheduled';
    return {
      sport: data.sport?.name || sport,
      league: data.league?.name || league,
      match: event.name,
      homeTeam: home?.team?.shortDisplayName || 'Home',
      awayTeam: away?.team?.shortDisplayName || 'Away',
      homeScore: home?.score,
      awayScore: away?.score,
      statusText,
      status: normalizeStatus(statusText),
      source: 'ESPN',
      startsAt: event.date,
    };
  });
}

async function fetchTheSportsDB() {
  const url = 'https://www.thesportsdb.com/api/v1/json/3/all_sports.php';
  const res = await fetch(url);
  if (!res.ok) throw new Error('TheSportsDB failed');
  const data = await res.json();
  return (data.sports || []).slice(0, 8).map((s) => ({
    sport: s.strSport,
    league: 'Catalog',
    match: `Top competitions in ${s.strSport}`,
    homeTeam: '',
    awayTeam: '',
    homeScore: '',
    awayScore: '',
    statusText: 'Reference',
    status: 'upcoming',
    source: 'TheSportsDB',
    startsAt: new Date().toISOString(),
  }));
}

async function loadData() {
  document.getElementById('loader').classList.add('active');

  const all = [];
  const health = [];

  const espnPromises = SPORTS.map(async (sport) => {
    try {
      const events = await fetchEspnSport(sport.espn[0], sport.espn[1]);
      all.push(...events);
      health.push({ source: `ESPN ${sport.label}`, ok: true, count: events.length });
    } catch {
      health.push({ source: `ESPN ${sport.label}`, ok: false, count: 0 });
    }
  });

  const dbPromise = fetchTheSportsDB()
    .then((events) => {
      all.push(...events);
      health.push({ source: 'TheSportsDB', ok: true, count: events.length });
    })
    .catch(() => {
      health.push({ source: 'TheSportsDB', ok: false, count: 0 });
    });

  await Promise.all([...espnPromises, dbPromise]);

  all.sort((a, b) => {
    const rank = { live: 0, upcoming: 1, finished: 2 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return new Date(a.startsAt) - new Date(b.startsAt);
  });

  state.events = all;
  state.health = health;
  state.trend.push({ at: new Date().toLocaleTimeString(), live: all.filter((e) => e.status === 'live').length });
  if (state.trend.length > 8) state.trend.shift();

  render();
  document.getElementById('loader').classList.remove('active');
}

function renderKpis() {
  const byStatus = {
    live: state.events.filter((e) => e.status === 'live').length,
    upcoming: state.events.filter((e) => e.status === 'upcoming').length,
    finished: state.events.filter((e) => e.status === 'finished').length,
  };

  const sportsCovered = new Set(state.events.map((e) => e.sport)).size;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi"><h3>Sports Covered</h3><p>${sportsCovered}</p></div>
    <div class="kpi"><h3>Live Matches</h3><p>${byStatus.live}</p></div>
    <div class="kpi"><h3>Upcoming</h3><p>${byStatus.upcoming}</p></div>
    <div class="kpi"><h3>Finished</h3><p>${byStatus.finished}</p></div>
  `;
}

function renderTable() {
  document.getElementById('eventsTableBody').innerHTML = state.events
    .slice(0, 140)
    .map(
      (e) => `
      <tr>
        <td>${e.sport}</td>
        <td>${e.match}</td>
        <td>${e.league}</td>
        <td>${formatScore(e)}</td>
        <td><span class="badge ${e.status}">${e.statusText}</span></td>
        <td>${e.source}</td>
      </tr>
    `,
    )
    .join('');
}

function renderSourceHealth() {
  document.getElementById('sourceHealth').innerHTML = state.health
    .map(
      (h) => `
      <div class="source-pill">
        <strong>${h.source}</strong>
        <span>${h.count} events</span>
        <span class="status-dot ${h.ok ? 'ok' : 'fail'}"></span>
      </div>
    `,
    )
    .join('');
}

function renderSportsChart() {
  const grouped = state.events.reduce((acc, e) => {
    acc[e.sport] = (acc[e.sport] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(grouped).slice(0, 12);
  const values = labels.map((k) => grouped[k]);

  if (sportsChart) sportsChart.destroy();
  sportsChart = new Chart(document.getElementById('sportsChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Events',
          data: values,
          borderRadius: 8,
          backgroundColor: 'rgba(56, 189, 248, 0.6)',
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#c5d5ff' }, grid: { color: '#ffffff11' } },
        y: { ticks: { color: '#c5d5ff' }, grid: { color: '#ffffff11' } },
      },
    },
  });
}

function renderTrendChart() {
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: state.trend.map((p) => p.at),
      datasets: [
        {
          label: 'Live Events',
          data: state.trend.map((p) => p.live),
          tension: 0.35,
          borderColor: '#a78bfa',
          backgroundColor: '#a78bfa66',
          fill: true,
        },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: '#d1ddff' } } },
      scales: {
        x: { ticks: { color: '#c5d5ff' }, grid: { color: '#ffffff11' } },
        y: { ticks: { color: '#c5d5ff' }, grid: { color: '#ffffff11' } },
      },
    },
  });
}

function render() {
  renderKpis();
  renderSourceHealth();
  renderSportsChart();
  renderTrendChart();
  renderTable();
}

document.getElementById('refreshBtn').addEventListener('click', loadData);

document.getElementById('toggleAnimBtn').addEventListener('click', (e) => {
  state.animationsPaused = !state.animationsPaused;
  document.body.classList.toggle('anim-paused', state.animationsPaused);
  e.target.textContent = state.animationsPaused ? 'Resume Animations' : 'Pause Animations';
});

document.addEventListener('pointerdown', (event) => {
  const pulse = document.createElement('span');
  pulse.textContent = '🏅';
  pulse.style.position = 'fixed';
  pulse.style.left = `${event.clientX}px`;
  pulse.style.top = `${event.clientY}px`;
  pulse.style.pointerEvents = 'none';
  pulse.style.transform = 'translate(-50%, -50%) scale(0.4)';
  pulse.style.opacity = '1';
  pulse.style.transition = 'transform 600ms ease, opacity 600ms ease';
  document.body.appendChild(pulse);

  requestAnimationFrame(() => {
    pulse.style.transform = 'translate(-50%, -100%) scale(1.4)';
    pulse.style.opacity = '0';
  });

  setTimeout(() => pulse.remove(), 650);
});

loadData();
setInterval(loadData, 120000);
