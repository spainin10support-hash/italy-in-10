const http = require('http');
const fs = require('fs');
const path = require('path');

// ── CONFIG ──
const PORT = parseInt(process.argv[2], 10) || parseInt(process.env.PORT, 10) || 3000;
const COUNTRY = process.argv[3] || process.env.COUNTRY || 'italy';
const DATA_PATH = path.join(__dirname, '..', 'data', `${COUNTRY}.json`);
const DATA = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const TEMPLATES = {};

function loadTemplates() {
  const dir = path.join(__dirname, 'templates');
  fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.html')) TEMPLATES[f.replace('.html','')] = fs.readFileSync(path.join(dir, f), 'utf8');
  });
}

function render(template, vars) {
  let html = TEMPLATES[template] || '';
  Object.keys(vars).forEach(k => {
    html = html.split(`{{${k}}}`).join(vars[k]);
  });
  return html;
}

function getCityData(name) {
  return Object.values(DATA.cities).find(c => c.name.toLowerCase() === (name || '').toLowerCase());
}
function slugifyCity(name) { return (name || '').toLowerCase().replace(/\s+/g, '-'); }

// ── HELPERS ──
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

function getCityUrl(name) {
  return `/?city=${encodeURIComponent(name)}`;
}

function htmlPage(title, body, extra, cityName) {
  const cities = Object.values(DATA.cities).map(c => c.name);
  const slug = cityName ? cityName.toLowerCase().replace(/\s+/g, '-') : (cities[0] || '').toLowerCase().replace(/\s+/g, '-');
  let html = render('layout', {
    COUNTRY_NAME: DATA.country,
    COUNTRY_FLAG: DATA.flag,
    COUNTRY_CODE: DATA.code,
    PAGE_TITLE: title,
    PAGE_BODY: body,
    EXTRA_HEAD: extra || '',
    CITY_NAME: cityName || cities[0] || '',
    CITY_SLUG: slug,
    CITY_SEARCH_SCRIPT: `
<script>
const cities = ${JSON.stringify(cities)};
let idx = 0;
const inp = document.querySelector('input[name="city"]');
if (inp) setInterval(() => { idx = (idx+1) % cities.length; inp.placeholder = 'Try: ' + cities[idx]; }, 3000);
</script>`,
  });
  // Inject country-specific data script before database.js
  const code = COUNTRY;
  html = html.replace(
    'src="/sarah/data/database.js"',
    `src="/sarah/data/${code}.js"></script>\n  <script src="/sarah/data/database.js"`
  );
  return html;
}

function cityPageHTML(cityName) {
  const cd = getCityData(cityName);
  if (!cd) return null;

  // Journey banner
  const citySlug = slugifyCity(cityName);
  const linkedJourneys = (DATA.journeys || []).filter(j => j.cities.includes(citySlug));
  const journeyBanner = linkedJourneys.length ? `
<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:15px;">
  ${linkedJourneys.map(j => `<a href="/journey/${j.slug}.html" style="display:inline-flex; align-items:center; gap:4px; background:#f0f4ff; color:#1a7a3a; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:600; text-decoration:none; border:1px solid #d0d8ff;">${j.emoji} Part of ${j.name}</a>`).join('')}
</div>` : '';

  const citySearchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityName)}`;
  const flightsUrl = `https://www.booking.com/flights/search.html?from=&to=${encodeURIComponent(cityName)}&aid=${DATA.bookingAid || '304433'}`;

  // Hotels
  const hotelTiers = ['budget','mid','luxury'];
  const hotelHTML = hotelTiers.map(tier => {
    const hotels = cd.hotels?.[tier] || [];
    return hotels.map(h => `
      <div class="hotel-card">
        <div class="hotel-info">
          <div class="hotel-name">${h.name}</div>
          <div class="hotel-desc">${h.desc}</div>
          <div class="hotel-price">${h.price}</div>
        </div>
        <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityName + ' ' + h.name)}&aid=${DATA.bookingAid || '304433'}" target="_blank" rel="noopener" class="hotel-book-btn">Check Availability</a>
      </div>
    `).join('');
  }).join('');

  // Attractions
  const attractionsHTML = (cd.attractions || []).map(a => `
    <p class="attraction-item"><b>${a.emoji || '•'}</b> ${a.name}${a.desc ? ': ' + a.desc : ''}</p>
  `).join('');

  // Transport
  const transportHTML = cd.transport ? `
    <div class="transport-box">${cd.transport}</div>
  ` : '';

  // Fiestas
  const fiestasHTML = cd.fiestas ? `
    <h3>🎉 Local Fiestas & Events</h3>
    <div class="info-card">${cd.fiestas}</div>
  ` : '';

  // Phrases
  const phrasesHTML = cd.phrases ? `
    <h3>🗣️ Local Phrases</h3>
    <div class="info-card">
      ${cd.phrases.map(p => `<p class="phrase-item"><b>${p.phrase}</b> — ${p.meaning}</p>`).join('')}
    </div>
  ` : '';

  // Don'ts
  const dontsHTML = (cd.donts || []).length ? `
    <div class="donts-box">
      <h4>⚠️ Don't do this</h4>
      ${cd.donts.map(d => `<p class="dont-item">• ${d}</p>`).join('')}
    </div>
  ` : '';

  // Day trips
  const dayTripsHTML = (cd.day_trips || []).length ? `
    <h3>🚗 Day Trips</h3>
    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
      ${cd.day_trips.map(d => `
        <div class="daytrip-card">
          <b>${d.name}</b> — <span class="meta">${d.duration} ${d.price ? '· ' + d.price : ''}</span>
          ${d.tip ? `<span class="tip">💡 ${d.tip}</span>` : ''}
          ${d.bookLink ? `<br><a href="${d.bookLink}" target="_blank" rel="noopener" style="font-size:12px; color:#1a73e8;">Book here →</a>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  // Weather block
  const weatherBlock = `
    <div class="weather-block">
      <img src="https://openweathermap.org/img/wn/02d@2x.png" style="width:40px; height:40px;">
      <div>
        <div class="weather-temp" id="weather-temp">--°C</div>
        <div class="weather-desc" id="weather-desc">Loading...</div>
      </div>
      <div class="weather-refresh">Live Weather<br>
        <span onclick="location.reload()">Refresh 🔄</span>
      </div>
    </div>
    <script>
    fetch('/weather?city=${encodeURIComponent(cityName)}').then(r=>r.json()).then(w => {
      if (w && w.temp != null) {
        document.getElementById('weather-temp').textContent = w.temp + '°C';
        document.getElementById('weather-desc').textContent = w.description;
        document.querySelector('.weather-block img').src = 'https://openweathermap.org/img/wn/' + w.icon + '@2x.png';
      }
    }).catch(() => {});
    </script>
  `;

  // Flight block
  const flightBlock = `
    <div class="flight-card">
      <div class="flight-header">
        <div class="flight-icon">✈️</div>
        <div class="flight-text">
          <div class="flight-title">Fly to ${cd.name}</div>
          <div class="flight-sub">Compare all airlines — best prices guaranteed</div>
        </div>
      </div>
      <a href="${flightsUrl}" target="_blank" class="flight-cta">Search Flights →</a>
    </div>
  `;

  // Action grid
  const taxiNum = cd.taxi_num || '112';
  const excursion = cd.excursion || { link: `https://www.getyourguide.com/s/?q=${encodeURIComponent(cd.name)}`, label: '🎟️ Book Tours & Excursions' };
  const actionGrid = `
    <div class="action-grid">
      <a href="tel:${taxiNum}" class="action-card">📞 Call Taxi</a>
      <a href="https://getrentacar.tp.st/fVVjqc4R" target="_blank" class="action-card">🚗 Hire a Car</a>
      <a href="${excursion.link}" target="_blank" class="action-card" style="grid-column:span 2;">${excursion.label}</a>
    </div>
  `;

  // Tours block
  const toursBlock = `
    <div class="tours-box">
      <span class="tours-label">⛰️ Local Experience</span>
      <h4 class="tours-title">Join a Local Walking Tour</h4>
      <div class="scroll-x">
        <a href="https://www.freetour.com/${encodeURIComponent(cd.name)}" target="_blank" class="tour-pill">🏙️ Free Tours</a>
        <a href="https://www.getyourguide.com/s/?q=${encodeURIComponent(cd.name)}" target="_blank" class="tour-pill">🏰 Sightseeing</a>
        <a href="https://www.viator.com/search/${encodeURIComponent(cd.name)}" target="_blank" class="tour-pill">🍷 Food Tours</a>
      </div>
    </div>
  `;

  // Map block
  const mapBlock = `
    <h3>📍 Local Essentials</h3>
    <div class="map-container">
      <iframe width="100%" height="100%"
        src="https://maps.google.com/maps?q=${encodeURIComponent(cd.name + ', ' + DATA.country)}&t=&z=13&ie=UTF8&iwloc=&output=embed">
      </iframe>
    </div>
  `;

  // Travel tips
  const travelTips = cd.travel_tips || [
    `Book major attractions in ${cd.name} weeks ahead — they sell out`,
    `Learn a few phrases in ${DATA.code === 'it' ? 'Italian' : 'the local language'} — locals appreciate it`,
    `Restaurant reservations needed for anywhere good on weekends`,
    `Carry cash — smaller places don't always take cards`,
  ];

  return render('city', {
    CITY_NAME: cd.name,
    CITY_EMOJI: cd.emoji || '📍',
    CITY_TAGLINE: cd.taglines?.mix || `${cd.name} — you're going to love it here.`,
    JOURNEY_BANNER: journeyBanner,
    WELCOME_TEXT: cd.welcome || `Welcome to ${cd.name}!`,
    TRANSPORT: transportHTML,
    HOTELS: hotelHTML,
    ATTRACTIONS: attractionsHTML,
    FIESTAS: fiestasHTML,
    PHRASES: phrasesHTML,
    DONTS: dontsHTML,
    DAY_TRIPS: dayTripsHTML,
    WEATHER: weatherBlock,
    CITY_SEARCH_URL: citySearchUrl,
    FLIGHTS_URL: flightsUrl,
    BOOKING_AID: DATA.bookingAid || '304433',
    COUNTRY_NAME: DATA.country,
    COUNTRY_FLAG: DATA.flag,
    COUNTRY_CODE: DATA.code,
    EXTRA_CITY_SCRIPTS: '',
    FLIGHT_BLOCK: flightBlock,
    TIP_DEFAULT: travelTips[0],
    TIPS_JSON: JSON.stringify(travelTips),
    ACTION_GRID: actionGrid,
    TOURS_BLOCK: toursBlock,
    MAP_BLOCK: mapBlock,
  });
}

// ── SERVER ──
loadTemplates();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filePath = req.url.split('?')[0];

  // Weather API proxy
  if (filePath === '/weather' && req.method === 'GET') {
    const city = url.searchParams.get('city') || Object.values(DATA.cities)[0]?.name || 'Rome';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${DATA.code.toUpperCase()}&units=metric&appid=${WEATHER_API_KEY}`;
    fetch(apiUrl).then(r => r.json()).then(d => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(d.main ? { temp: Math.round(d.main.temp), description: d.weather[0].description, icon: d.weather[0].icon } : { temp: null, description: null, icon: null }));
    }).catch(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ temp: null, description: null, icon: null }));
    });
    return;
  }

  // Sarah chat proxy
  if (filePath === '/sarah-chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify(parsed),
        });
        const data = await resp.json();
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Sarah static files — serve from engine/public/sarah/
  // Populate this dir via build.js or manually copy needed assets
  if (filePath.startsWith('/sarah/')) {
    const fullPath = path.join(__dirname, 'public', filePath);
    const ext = path.extname(fullPath);
    const mime = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
    if (fs.existsSync(fullPath)) {
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      res.end(fs.readFileSync(fullPath));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Static files
  if (filePath === '/manifest.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: `${DATA.country} Travel Guide`,
      short_name: `${DATA.country} Guide`,
      start_url: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      background_color: '#1a7a3a',
      theme_color: '#1a7a3a',
      icons: [{ src: '/sarah/sarah-avatar.png', sizes: '104x104', type: 'image/png' }]
    }));
    return;
  }

  if (filePath.startsWith('/static/')) {
    const fullPath = path.join(__dirname, 'public', filePath);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath);
      const mime = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(fullPath));
      return;
    }
  }

  // ── PAGES ──
  const city = url.searchParams.get('city') || '';

  if (filePath === '/' || filePath === '') {
    if (city) {
      const html = cityPageHTML(city);
      if (html) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage(`${DATA.emoji || '📍'} ${city}`, html));
        return;
      }
    }
    // Home page
    const topCities = Object.values(DATA.cities).slice(0, 4);
    const moreCities = Object.values(DATA.cities).slice(4);
    const featuredCards = topCities.map(c => {
      return `<a href="/?city=${encodeURIComponent(c.name)}" class="city-card" style="background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), linear-gradient(135deg, ${c.gradient?.[0] || '#e74c3c'}, ${c.gradient?.[1] || '#c0392b'});">${c.name.toUpperCase()}</a>`;
    }).join('');
    const morePills = moreCities.map(c =>
      `<a href="/?city=${encodeURIComponent(c.name)}" class="city-card-sm">${c.emoji || '📍'} ${c.name}</a>`
    ).join('');
    const allPills = Object.values(DATA.cities).map(c =>
      `<a href="/?city=${encodeURIComponent(c.name)}" class="city-card-sm">${c.emoji || '📍'} ${c.name}</a>`
    ).join('');
    // Journey cards
    const allJourneys = DATA.journeys || [];
    const journeyCards = allJourneys.map(j => {
      const cityNames = j.cities.map(slug => {
        const found = Object.values(DATA.cities).find(c => slugifyCity(c.name) === slug);
        return found ? found.emoji + ' ' + found.name : slug;
      }).join(' → ');
      return `<a href="/journey/${j.slug}.html" class="journey-card" style="background: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), linear-gradient(135deg, ${j.color[0] || '#003580'}, ${j.color[1] || '#8e44ad'});">
        <div class="journey-card-content">
          <div class="journey-emoji">${j.emoji}</div>
          <div class="journey-name">${j.name}</div>
          <div class="journey-cities">${cityNames}</div>
          <div class="journey-meta">${j.days} days · ${j.bestFor} · ${j.vibe}</div>
        </div>
      </a>`;
    }).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage(`${DATA.flag} ${DATA.country} Travel Guide`, `
      <div class="hero">
        <h2>${DATA.flag} ${DATA.country.toUpperCase()} IN 10 MINUTES</h2>
      </div>
      ${journeyCards ? `
      <div style="padding:0 20px;">
        <p class="section-label">🗺️ Curated Routes</p>
        <p style="color:#666; font-size:12px; margin:-10px 0 15px 0;">Multi-city journeys hand-picked for every kind of traveller</p>
        <div class="journey-grid">${journeyCards}</div>
      </div>` : ''}
      <div style="padding:0 20px;">
        <p class="section-label">🏙️ Cities</p>
        <div class="featured-grid">${featuredCards}</div>
      </div>
      <div style="padding:12px 20px 24px;">
        <p class="section-label">📍 More in ${DATA.country}</p>
        <div class="scroll-x">${morePills.length ? morePills : allPills}</div>
        ${morePills.length ? '<p class="swipe-hint">👆 Swipe to explore more cities</p>' : ''}
      </div>
    `));
    return;
  }

  // Static-friendly URLs: /fiestas/{slug}.html → /fiestas?city=X
  if (filePath.startsWith('/fiestas/') && filePath.endsWith('.html')) {
    const slug = path.basename(filePath, '.html');
    const found = Object.values(DATA.cities).find(c => slugifyCity(c.name) === slug);
    if (found) { res.writeHead(302, { Location: `/fiestas?city=${encodeURIComponent(found.name)}` }); return res.end(); }
  }
  // /city/{slug}.html → /?city=X
  if (filePath.startsWith('/city/') && filePath.endsWith('.html')) {
    const slug = path.basename(filePath, '.html');
    const found = Object.values(DATA.cities).find(c => slugifyCity(c.name) === slug);
    if (found) { res.writeHead(302, { Location: `/?city=${encodeURIComponent(found.name)}` }); return res.end(); }
  }
  // /journey/{slug}.html → render journey page
  if (filePath.startsWith('/journey/') && filePath.endsWith('.html')) {
    const slug = path.basename(filePath, '.html');
    const j = (DATA.journeys || []).find(j => j.slug === slug);
    if (j) {
      const cities = Object.values(DATA.cities);
      const cityBlocks = j.cities.map(s => {
        const c = cities.find(cc => slugifyCity(cc.name) === s);
        if (!c) return '';
        const h = (c.hotels?.mid || c.hotels?.budget || []).slice(0, 2);
        const hotelPicks = h.length ? `<div style="font-size:12px; color:#666; margin-top:6px;">🏨 ${h.map(hh => hh.name).join(', ')}</div>` : '';
        return `<a href="/?city=${encodeURIComponent(c.name)}" class="journey-city-card" style="background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), linear-gradient(135deg, ${c.gradient?.[0] || '#003580'}, ${c.gradient?.[1] || '#8e44ad'});">
          <div><b style="font-size:16px;">${c.emoji || '📍'} ${c.name}</b>
          <p style="margin:4px 0 0; font-size:12px; opacity:0.85;">${(c.taglines?.mix || '').substring(0, 80)}${(c.taglines?.mix?.length || 0) > 80 ? '…' : ''}</p>${hotelPicks}</div>
        </a>`;
      }).filter(Boolean).join('');
      const legBlocks = j.legs.map(l => `
        <div class="leg-card">
          <div class="leg-route"><b>${l.from}</b> → <b>${l.to}</b></div>
          <div class="leg-details"><span>⏱ ${l.time}</span><span>💰 ${l.price}</span><span>🚄 ${l.mode}</span></div>
          <a href="${l.bookUrl || '#'}" target="_blank" class="leg-book">Book this leg →</a>
        </div>`).join('');
      const metaBar = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:15px;">
        <span style="background:#e8f0fe; color:#1a7a3a; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;">👤 ${j.bestFor}</span>
        <span style="background:#e8f0fe; color:#1a7a3a; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;">📅 ${j.days} days</span>
        <span style="background:#e8f0fe; color:#1a7a3a; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;">${j.vibe}</span>
      </div>`;
      const body = render('journey', {
        JOURNEY_NAME: j.name, JOURNEY_EMOJI: j.emoji, JOURNEY_TAGLINE: j.tagline,
        JOURNEY_INTRO: j.intro, JOURNEY_META_BAR: metaBar,
        JOURNEY_CITIES: cityBlocks, JOURNEY_LEGS: legBlocks,
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage(`${j.emoji} ${j.name}`, body, '', cities[0]?.name || ''));
      return;
    }
  }

  if (filePath === '/fiestas' && city) {
    const cd = getCityData(city);
    if (!cd) { res.writeHead(404); res.end('Not found'); return; }
    let content = '';
    if (typeof cd.fiestas === 'string') {
      content = `<h3>🎉 ${city} — Events & Fiestas</h3><p style="color:#666; font-size:13px; margin-bottom:20px;">Your complete guide to festivals, events and celebrations in ${city}.</p><div class="info-card">${cd.fiestas}</div>`;
    } else if (Array.isArray(cd.fiestas)) {
      const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
      const seasonEmoji = { spring:'🌸', summer:'☀️', autumn:'🍂', winter:'❄️' };
      let seasonHTML = '';
      seasons.forEach(sea => {
        const sk = sea.toLowerCase();
        const events = cd.fiestas.filter(f => (f.season || '').toLowerCase() === sk || (f.m || '').toLowerCase() === sk);
        if (!events.length) return;
        seasonHTML += `<div style="margin-bottom:25px;"><h4 style="background:#1a7a3a; color:white; padding:10px 15px; border-radius:10px; margin-bottom:12px;">${seasonEmoji[sk] || '•'} ${sea}</h4>${events.map(f => `<div style="background:#f8f9fa; border-radius:10px; padding:15px; margin-bottom:10px; border-left:4px solid #d4a843;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><b style="font-size:15px;">${f.emoji || '🎉'} ${f.e || f.name || 'Event'}</b><span style="background:#1a7a3a; color:white; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600;">${f.m || 'TBC'}</span></div><p style="margin:0; font-size:13px; color:#555; line-height:1.5;">${f.desc || ''}</p></div>`).join('')}</div>`;
      });
      if (!seasonHTML && cd.fiestas.length) {
        seasonHTML = cd.fiestas.map(f => `<div style="background:#f8f9fa; border-radius:10px; padding:15px; margin-bottom:10px; border-left:4px solid #d4a843;"><b style="font-size:15px;">${f.emoji || '🎉'} ${f.e || f.name || 'Event'}</b><p style="margin:5px 0 0; font-size:13px; color:#555;">${f.desc || ''}</p></div>`).join('');
      }
      content = `<h3>🎉 ${city} — Events & Fiestas</h3><p style="color:#666; font-size:13px; margin-bottom:20px;">Your complete guide to festivals, events and celebrations in ${city}.</p>${seasonHTML || '<p style="color:#888;">No fiesta data available.</p>'}`;
    } else {
      content = `<h3>🎉 Fiestas in ${city}</h3><p style="color:#888;">No fiesta data available.</p>`;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage(`🎉 ${city} Fiestas`, content, '', city));
    return;
  }

  if (filePath === '/phrases' && city) {
    const cd = getCityData(city);
    const langCode = 'it-IT';
    const phrasePairs = cd?.phrases || [];
    if (!phrasePairs.length) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlPage(`🗣️ ${city} Phrases`, '<p>No phrase data available.</p>', '', city));
      return;
    }
    const content = `
      <h3>🗣️ Essential Phrases</h3>
      <p style="color:#666; font-size:13px; margin-bottom:20px;">Tap the speaker button to hear the correct ${DATA.country} pronunciation!</p>
      <div>
        ${phrasePairs.map(p => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid #f0f0f0;">
          <div>
            <b style="font-size:16px; color:#1a7a3a;">${p.phrase}</b><br>
            <small style="color:#666; font-size:13px;">${p.meaning}</small>
          </div>
          <button onclick="speakPhrase('${(p.phrase || '').replace(/'/g, "\\'")}')"
            style="background:#1a7a3a; color:white; border:none; border-radius:50%; width:42px; height:42px; font-size:18px; cursor:pointer; flex-shrink:0; box-shadow:0 2px 8px rgba(0,53,128,0.3);">
            🔊
          </button>
        </div>`).join('')}
      </div>
      <script>
      function speakPhrase(text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = '${langCode}';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === '${langCode}' || v.lang.startsWith('${langCode.split('-')[0]}-'));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }
      </script>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage(`🗣️ ${city} Phrases`, content, '', city));
    return;
  }

  if (filePath === '/help' && city) {
    const cd = getCityData(city);
    const safetyTips = cd?.sarah_knows?.safety || ['Keep belongings secure in crowded areas', 'Use registered taxis only', 'Be aware of pickpockets at major tourist sites'];
    const isItaly = DATA.code === 'it';
    const content = `
      <div style="text-align:center;">
        <h3>🆘 Emergency Contacts — ${city}</h3>
        <p style="font-size:14px; color:#666; margin-bottom:20px;">All numbers below are free to call.</p>
        <a href="tel:112" style="display:block; background:#d93025; color:white; text-decoration:none; border-radius:12px; margin-bottom:12px; padding:20px; font-size:18px; font-weight:bold;">
          🚨 112 — ALL EMERGENCIES<br><small style="font-size:13px; font-weight:normal;">(English Speaking)</small>
        </a>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <a href="tel:${isItaly ? '113' : '091'}" style="display:block; padding:15px; background:#e8f0fe; border-radius:12px; text-decoration:none; color:#1967d2; font-weight:bold;">🚔 Police</a>
          <a href="tel:${isItaly ? '118' : '061'}" style="display:block; padding:15px; background:#e8f0fe; border-radius:12px; text-decoration:none; color:#1967d2; font-weight:bold;">🚑 Ambulance</a>
          <a href="tel:${isItaly ? '115' : '080'}" style="display:block; padding:15px; background:#e8f0fe; border-radius:12px; text-decoration:none; color:#1967d2; font-weight:bold;">👨‍🚒 Fire Brigade</a>
          <a href="tel:${isItaly ? '112' : '062'}" style="display:block; padding:15px; background:#e8f0fe; border-radius:12px; text-decoration:none; color:#1967d2; font-weight:bold;">🛡️ Civil Protection</a>
        </div>
        <div style="margin-top:20px; padding:15px; border-radius:10px; font-size:13px; text-align:center;">
          <a href="tel:${isItaly ? '+39069309' : '+34902102112'}" style="display:block; padding:15px; background:#fff3cd; border-radius:10px; color:#856404; font-weight:bold; text-decoration:none; margin-bottom:8px;">📞 Tourist Helpline — Tap to Call</a>
          <a href="tel:${isItaly ? '1530' : '900202202'}" style="display:block; padding:15px; background:#fff3cd; border-radius:10px; color:#856404; font-weight:bold; text-decoration:none;">🚤 Marine Rescue — Tap to Call</a>
        </div>
        <div style="margin-top:20px; padding:15px; background:#e8f0fe; border-radius:10px; font-size:13px; text-align:left;">
          <h4 style="font-size:15px; margin:0 0 10px;">🛂 Visiting ${DATA.country} — Entry Requirements</h4>
          <p style="margin:0 0 8px;"><b>🇬🇧 UK Citizens:</b> Valid passport required. No visa needed for up to 90 days.</p>
          <p style="margin:0 0 8px;"><b>🇪🇺 EU Citizens:</b> National ID card accepted.</p>
          <p style="margin:0 0 8px;"><b>⚠️ Passport:</b> Must be valid for duration of stay.</p>
          <p style="margin:0;"><b>✈️ ETIAS:</b> UK visitors will soon require ETIAS pre-travel authorisation. Check gov.uk before travelling.</p>
        </div>
        <div style="margin-top:15px; padding:15px; background:#fce8e8; border-radius:10px; font-size:13px; text-align:left;">
          <h4 style="font-size:15px; margin:0 0 10px; color:#d93025;">🚨 Lost Your Passport?</h4>
          <p style="margin:0 0 8px;"><b>Step 1:</b> Report to local police immediately!</p>
          <p style="margin:0 0 8px;"><b>Step 2:</b> Get a crime reference number — your insurer will need this.</p>
          <p style="margin:0 0 8px;"><b>Step 3:</b> Contact your nearest embassy or consulate.</p>
          <p style="margin:0 0 15px;"><b>Step 4:</b> Apply for an Emergency Travel Document.</p>
          ${DATA.code === 'it' ? `
          <a href="tel:+390642200001" style="display:block; background:#d93025; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇬🇧 British Embassy Rome — +39 06 4220 0001</a>
          <a href="tel:+39065852381" style="display:block; background:#169b62; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇮🇪 Irish Embassy Rome — +39 06 585 2381</a>
          <a href="tel:+3906852721" style="display:block; background:#1a7a3a; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇦🇺 Australian Embassy Rome — +39 06 852 721</a>
          <a href="tel:+3906854441" style="display:block; background:#c8102e; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇨🇦 Canadian Embassy Rome — +39 06 854 441</a>
          <a href="tel:+390646741" style="display:block; background:#1a7a3a; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇺🇸 US Embassy Rome — +39 06 4674 1</a>
          <a href="tel:+3906852541" style="display:block; background:#007A4D; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold;">🇿🇦 South African Embassy Rome — +39 06 852 541</a>
          ` : `
          <a href="tel:+390642200001" style="display:block; background:#d93025; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇬🇧 British Embassy Rome — +39 06 4220 0001</a>
          <a href="tel:+39065852381" style="display:block; background:#169b62; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇮🇪 Irish Embassy Rome — +39 06 585 2381</a>
          <a href="tel:+3906852721" style="display:block; background:#1a7a3a; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇦🇺 Australian Embassy Rome — +39 06 852 721</a>
          <a href="tel:+3906854441" style="display:block; background:#c8102e; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇨🇦 Canadian Embassy Rome — +39 06 854 441</a>
          <a href="tel:+390646741" style="display:block; background:#1a7a3a; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold; margin-bottom:8px;">🇺🇸 US Embassy Rome — +39 06 4674 1</a>
          <a href="tel:+3906852541" style="display:block; background:#007A4D; color:white; padding:12px; border-radius:8px; text-align:center; text-decoration:none; font-weight:bold;">🇿🇦 South African Embassy Rome — +39 06 852 541</a>
          `}
        </div>
        <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
        <p style="font-size:13px; text-align:left;"><b>💡 Sarah's safety tips for ${city}:</b></p>
        ${safetyTips.map(t => `<p style="font-size:12px; text-align:left; color:#555; margin-bottom:6px;">• ${t}</p>`).join('')}
      </div>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage(`🆘 ${city} Help & Emergencies`, content, '', city));
    return;
  }

  if (filePath === '/legal') {
    const content = `
      <section>
        <h3 style="border-bottom: 2px solid #d4a843; padding-bottom: 5px;">${DATA.flag} Roamin10 — ${DATA.country} Travel</h3>
        <p style="font-size:14px; line-height:1.6; color:#444;">
          <b>Roamin10</b> was built for the traveller who wants to skip the fluff.
          Our mission is to provide you with the essential need-to-know info for ${DATA.country}'s top
          destinations fast. We focus on the practical details that make your trip smoother.
        </p>
        <div style="margin-top:20px; background:#f0f4ff; border-radius:12px; padding:15px; border-left:4px solid #003580;">
          <b style="color:#1a7a3a; font-size:14px;">🌍 Growing Family of Apps</b>
          <p style="font-size:13px; color:#444; margin:8px 0 0; line-height:1.6;">
            10 Minute ${DATA.country} is just the beginning! We are building a complete series of
            10 Minute Travel apps to help you explore Europe effortlessly.<br><br>
            <b>Coming Soon:</b><br>
            🇮🇹 10 Minute Italy<br>
            🇵🇹 10 Minute Portugal<br>
            🇬🇷 10 Minute Greece<br>
            🇫🇷 10 Minute France
          </p>
        </div>
        <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
        <h3>⚖️ Terms & Disclaimers</h3>
        <div style="font-size:13px; line-height:1.6; color:#444;">
          <p style="background:#f8f9fa; padding:12px; border-radius:8px; border-left:4px solid #d4a843;">
            <b>Please Note:</b> Information is for guidance only.
            <br>• <b>Weather:</b> Sourced via OpenWeatherMap API and subject to change.
            <br>• <b>Prices:</b> Transport and event prices are estimates and subject to change by providers.
            <br>• <b>Bookings:</b> We are not responsible for bookings made on external sites like Booking.com.
          </p>
          <p><b>Support:</b> <a href="mailto:italy10minutes@gmail.com" style="color:#1a73e8; font-weight:bold;">italy10minutes@gmail.com</a></p>
          <p><b>Affiliate Disclosure:</b> We use Booking.com partner links. We may earn a commission on bookings made through these links at no extra cost to you.</p>
          <p><b>Data Privacy:</b> We do not store personal search data, cookies, or location history. <a href="https://www.roamin10.com/privacy.html" target="_blank" style="color:#1a73e8; font-weight:bold;">View our full Privacy Policy →</a></p>
        </div>
        <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
        <h3>❓ FAQ</h3>
        <div style="font-size:13px;">
          <p><b>Q: Is the info 100% accurate?</b><br>A: We update regularly, but always check locally for the most current prices.</p>
          <p><b>Q: How do I book?</b><br>A: Click any hotel or excursion link to book directly with the provider.</p>
        </div>
      </section>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage(`⚖️ ${DATA.country} Travel Guide`, content));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlPage('404', '<h2>404 — Page not found</h2><p>Nothing here, love.</p>'));
});

server.listen(PORT, () => {
  console.log(`🏁 ${DATA.flag} ${DATA.country} app running at http://localhost:${PORT}`);
});
