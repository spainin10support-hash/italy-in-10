const http = require('http');
const fs = require('fs');
const path = require('path');

const MY_BOOKING_AID = "304433";
const CONTACT_EMAIL = "italy10minutes@gmail.com";
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// ── Load Italy data ───────────────────────────────────────────
const RAW = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'italy.json'), 'utf8'));

const SLUG_MAP = {
  rome:'Rome', florence:'Florence', venice:'Venice', milan:'Milan',
  naples:'Naples', amalfi:'Amalfi', 'cinque-terre':'Cinque Terre',
  bologna:'Bologna', turin:'Turin', como:'Como',
};

const CITY_COLORS = {
  rome:['#e74c3c','#c0392b'], florence:['#d4a373','#7b5b3a'], venice:['#1a5276','#2980b9'],
  milan:['#7d3c98','#4a235a'], naples:['#e67e22','#d35400'], amalfi:['#1abc9c','#16a085'],
  'cinque-terre':['#8e44ad','#6c3483'], bologna:['#27ae60','#1e8449'],
  turin:['#34495e','#2c3e50'], como:['#3498db','#2ecc71'],
};

const EMOJI_MAP = {
  rome:'🏛', florence:'🎨', venice:'🚣', milan:'🏙', naples:'🍕',
  amalfi:'🌊', 'cinque-terre':'🏡', bologna:'🍝', turin:'👑', como:'🏔',
};

const PHRASES = [
  {s:"Buongiorno",e:"Good morning (used until early afternoon)"},
  {s:"Buonasera",e:"Good evening (after 4pm)"},
  {s:"Grazie",e:"Thank you"},
  {s:"Per favore",e:"Please"},
  {s:"Un caffè, per favore",e:"An espresso, please"},
  {s:"Il conto, per favore",e:"The bill, please"},
  {s:"Quanto costa?",e:"How much is it?"},
  {s:"Dov'è il bagno?",e:"Where is the toilet?"},
  {s:"Parla inglese?",e:"Do you speak English?"},
  {s:"Salute!",e:"Cheers!"},
  {s:"Aiuto!",e:"Help!"},
  {s:"Non capisco",e:"I don't understand"},
];

const TRAVEL_TIPS = [
  "Italy has free public water fountains (fontanelle/nasoni) — fill your bottle for free",
  "Avoid restaurants with 'tourist menus' in multiple languages — walk one street back",
  "Cappuccino is a breakfast drink only — never order it after 11am",
  "Gelato from shops with muted natural colours — bright colours = artificial flavouring",
  "Dinner in Italy starts at 8pm at the earliest, 9pm is normal",
  "Many restaurants charge 'coperto' (cover charge) of €1-3pp — it's normal, not a scam",
  "Book major attractions (Colosseum, Uffizi, Last Supper) weeks in advance",
  "Pickpockets are common on crowded metros and in tourist hotspots — bag in front",
  "Learn 5 Italian phrases — locals appreciate it enormously",
  "Carry some cash — not all small shops and trattorias accept cards",
  "Italy uses Type F plugs (same as Spain/Germany) — bring an adapter",
  "Summer in Rome/Florence is brutally hot — visit in spring or autumn instead",
  "The tap water (acqua del rubinetto) is perfectly safe to drink",
  "Trenitalia and Italo run high-speed trains between major cities — book ahead for discounts",
  "Restaurants that charge for bread they bring to the table (pane e coperto) are normal",
  "You don't need to tip in Italy, but rounding up is appreciated",
  "Visit popular attractions at opening time or right before closing for smaller crowds",
  "Aperitivo (pre-dinner drinks) often comes with a buffet of food — skip dinner and do this instead",
];

// ── Build city database from RAW JSON ─────────────────────────
const cityDatabase = {};
for (const [slug, c] of Object.entries(RAW.cities)) {
  const name = c.name;
  const airport = c.sarah_knows?.airport || `${name} Airport`;
  const toCity = c.sarah_knows?.to_city || 'Various transport options';
  const top5 = (c.attractions || []).slice(0, 5).map(a => `${a.name}: ${a.desc.split('.')[0]}.`);
  while (top5.length < 5) top5.push(`${name} city centre: Explore this incredible Italian city`);

  const fiestas = (c.fiestas || []).map(f => ({
    season: f.season || 'spring',
    m: f.m || '',
    emoji: f.emoji || '🎉',
    e: f.e || '',
    desc: f.desc || '',
  }));

  const hotels = (c.hotels?.budget || []).concat(c.hotels?.mid || []).concat(c.hotels?.luxury || []).map(h => ({
    name: h.name,
    vibe: h.vibe || 'Recommended',
    reason: h.desc,
    price: h.price || '',
    area: h.area || '',
    proximity: h.proximity || '',
    img: 'https://images.pexels.com/photos/261169/pexels-photo-261169.jpeg?w=150',
    bookingLink: h.bookingLink || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name)}+${encodeURIComponent(h.name)}&aid=${MY_BOOKING_AID}`,
  }));
  if (hotels.length < 3) {
    hotels.push({ name:`Hotel ${name} Centro`, vibe:'Central', reason:`Well-located hotel in the heart of ${name}`, img:'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?w=150', bookingLink:`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name)}&aid=${MY_BOOKING_AID}` });
  }

  cityDatabase[slug] = {
    name,
    temp: '20°C',
    trans: `✈️ ${airport} <br> 🚆 ${toCity.replace(/\./g, '.')}`,
    tips: `<b>🍝 Food:</b> Try the local speciality first. <br><b>🏛️ Attractions:</b> Book major sites in advance.`,
    welcome: c.welcome || `Welcome to <b>${name}</b> — ${c.taglines?.mix || 'one of the most incredible cities in Italy'}!`,
    hotels,
    top5,
    fiestas,
  };

  // Activities from database.js data (generated file)
  const dbPath = path.join(__dirname, 'public', 'sarah', 'data', 'database.js');
  if (fs.existsSync(dbPath)) {
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    const dbMatch = dbContent.match(/window\.SARAH_DATABASE\s*=\s*({[\s\S]*?});/);
    if (dbMatch) {
      try {
        const db = new Function('return ' + dbMatch[1])();
        if (db[name]) {
          cityDatabase[slug].restaurants = (db[name].restaurants || []).slice(0, 3).map(r => ({
            name: r.name, vibe: r.vibe || 'Traditional', price: r.price || '€€',
            bestDish: r.bestDish || 'Local speciality', time: r.time || 'Lunch & Dinner',
            location: r.location || 'City centre', family: r.family !== false,
            tip: r.tip || 'Locals\' favourite', bookLink: r.bookLink || '',
          }));
          cityDatabase[slug].morning_activities = (db[name].morning_activities || []).slice(0, 8).map(a => ({
            name: a.name, type: a.type || 'Sightseeing', price: a.price || 'Free',
            family: a.family !== false, tip: a.tip || 'Worth seeing',
            duration: a.duration || '1-2 hours', bookLink: a.bookLink || '',
          }));
          cityDatabase[slug].evening_activities = (db[name].evening_activities || []).slice(0, 6).map(a => ({
            name: a.name, type: 'Food & Drinks', price: a.price || '€€',
            family: a.family !== false, tip: a.tip || 'Best in the evening',
            bookLink: a.bookLink || '',
          }));
          cityDatabase[slug].family_specific = (db[name].family_specific || []).slice(0, 3);
          cityDatabase[slug].party_specific = (db[name].party_specific || []).slice(0, 3);
          cityDatabase[slug].day_trips = (db[name].day_trips || []).slice(0, 4).map(d => ({
            ...d, bookLink: d.bookLink || '',
          }));
        }
      } catch(e) {}
    }
  }
}

// ── Server ─────────────────────────────────────────────────────
async function getItalianWeather(cityName) {
  const codeMap = { 'Rome':'IT','Florence':'IT','Venice':'IT','Milan':'IT','Naples':'IT','Amalfi':'IT',
    'Cinque Terre':'IT','Bologna':'IT','Turin':'IT','Como':'IT' };
  const cc = codeMap[cityName] || 'IT';
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName},${cc}&units=metric&appid=${WEATHER_API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return { temp: Math.round(data.main.temp), description: data.weather[0].description, icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}.png` };
  } catch { return null; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filePath = req.url.split('?')[0];

  // ── Anthropic chat proxy ─────────────────────────────────────
  if (filePath === '/sarah-chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify(parsed),
        });
        const data = await response.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── Serve static files from public/ ──────────────────────────
  if (filePath.startsWith('/sarah/') || filePath === '/manifest.json' || filePath.startsWith('/icons/') || filePath.startsWith('/.well-known/') || filePath === '/sw.js') {
    const fullPath = path.join(__dirname, 'public', filePath);
    const ext = path.extname(fullPath);
    const mime = { '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon', '.html':'text/html' };
    if (fs.existsSync(fullPath)) {
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      return res.end(fs.readFileSync(fullPath));
    }
  }

  const pathname = url.pathname;
  const searchCity = (url.searchParams.get('city') || '').toLowerCase().trim();
  const cityData = cityDatabase[searchCity];
  const fromJourneySlug = url.searchParams.get('from') || '';

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  let html = `<!DOCTYPE html><html lang="en" class="notranslate" translate="no">
  <head>
    <meta charset="UTF-8">
    <script>var _nativeFetch = window.fetch.bind(window);</script>
    <style>
      * { box-sizing: border-box; }
      body { margin:0; background:#e8f5e9; font-family:-apple-system,sans-serif; color:#202124; -webkit-text-size-adjust:none; height:100vh; height:-webkit-fill-available; }
      .app-container { max-width:600px; margin:0 auto; background:#f4faf4; min-height:100vh; position:relative; padding-bottom:160px; }
      .sticky-header { padding:15px; position:sticky; top:0; background:#f4faf4; z-index:1000; border-bottom:3px solid #2e7d32; display:flex; gap:10px; align-items:center; }
      .search-input { flex:1; padding:12px 20px; border-radius:25px; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid #dfe1e5; font-size:16px; outline:none; }
      .search-btn { background:#2e7d32; color:white; border:none; padding:10px 15px; border-radius:25px; font-weight:bold; cursor:pointer; }
      .hero { height:250px; background:linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)), url('https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg?auto=compress&cs=tinysrgb&w=1000'); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color:white; text-align:center; }
      .hero h2 { font-size:32px; text-shadow:2px 2px 8px rgba(0,0,0,0.5); margin:0; }
      .featured-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:20px; margin-top:-30px; }
      .city-card { height:140px; border-radius:12px; background-size:cover; background-position:center; display:flex; align-items:flex-end; padding:15px; color:white; font-weight:bold; text-decoration:none; box-shadow:0 4px 12px rgba(0,0,0,0.15); text-shadow:1px 1px 4px rgba(0,0,0,0.8); background-color:#ccc; }
      h3 { border-bottom:2px solid #2e7d32; display:inline-block; margin-bottom:15px; padding-bottom:2px; }
      .footer-nav { position:fixed; bottom:0; width:100%; max-width:600px; background:#f4faf4; z-index:1001; }
      .footer-links { background:#f4faf4; padding:10px 0 10px; display:flex; justify-content:space-around; font-weight:bold; font-size:11px; border-top:3px solid #2e7d32; }
      .footer-link { text-decoration:none; color:#202124; display:flex; flex-direction:column; align-items:center; gap:2px; }
      .footer-icon { font-size:20px; line-height:1.2; }
      .footer-label { font-size:10px; font-weight:700; letter-spacing:0.3px; }
      section { padding:20px; }
      .action-card { background:#f1f3f4; border-radius:12px; padding:15px; text-decoration:none; color:#3c4043; text-align:center; }
      .hotel-list { display:flex; flex-direction:column; gap:12px; padding:0 5px; }
      .hotel-card { display:flex; align-items:center; background:white; border-radius:12px; overflow:hidden; text-decoration:none; color:#202124; border:1px solid #eee; }
      .hotel-img { width:100px; height:100px; object-fit:cover; }
      .hotel-info { padding:12px; flex:1; }
      .hotel-name { font-size:16px; font-weight:700; }
      .hotel-price { font-size:13px; font-weight:600; color:#1a7a3a; white-space:nowrap; margin-left:8px; }
      .hotel-reason { font-size:13px; color:#5f6368; }
      .hotel-meta { font-size:11px; color:#888; margin-top:4px; }
      .sarah-fab{position:fixed;bottom:145px;right:18px;width:52px;height:52px;background:#1c1a18;border-radius:50%;border:none;overflow:hidden;box-shadow:0 0 0 2px rgba(212,168,67,0.5),0 6px 20px rgba(0,0,0,0.35);z-index:998;display:flex;align-items:center;justify-content:center;cursor:pointer;}
      .sarah-fab:active{transform:scale(0.93);}
      .sarah-fab-img{width:100%;height:100%;border-radius:50%;object-fit:cover;}
      .sarah-fab-label{position:fixed;bottom:158px;right:86px;background:#1c1a18;color:#faf7f2;font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;white-space:nowrap;z-index:997;pointer-events:none;opacity:0;transform:translateX(8px);transition:opacity 0.25s ease,transform 0.25s ease;}
      .sarah-fab-label::after{content:'';position:absolute;right:-5px;top:50%;transform:translateY(-50%);border:5px solid transparent;border-left-color:#1c1a18;}
      .sarah-fab-label.sarah-label-show{opacity:1;transform:translateX(0);}
      .byg-fab{position:fixed;bottom:85px;right:18px;width:52px;height:52px;background:#003580;border:none;border-radius:50%;cursor:pointer;z-index:999;box-shadow:0 4px 20px rgba(0,53,128,0.35);display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform 0.2s ease;}
      .byg-fab:active{transform:scale(0.93);}
      .byg-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1002;align-items:flex-end;justify-content:center;}
      .byg-sheet{background:white;border-radius:24px 24px 0 0;padding:20px 20px 30px;width:100%;max-width:600px;max-height:80vh;overflow-y:auto;animation:slideUp 0.3s ease;}
      @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      .byg-handle{width:36px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 18px;}
      .byg-header{text-align:center;margin-bottom:22px;}
      .byg-header h3{font-size:17px;font-weight:800;margin:0 0 4px;letter-spacing:-0.3px;border:none;display:block;}
      .byg-header p{font-size:12px;color:#888;margin:0;}
      .byg-item{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f4f4f4;text-decoration:none;color:#202124;}
      .byg-icon{width:46px;height:46px;background:#f0f4ff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
      .byg-tag{font-size:9px;font-weight:800;color:#1a73e8;text-transform:uppercase;}
      .byg-title{font-size:14px;font-weight:700;margin:2px 0 3px;}
      .byg-desc{font-size:11px;color:#888;}
      .byg-arrow{margin-left:auto;color:#003580;font-size:20px;font-weight:300;}
      .byg-close{width:100%;margin-top:18px;padding:14px;background:#f8f8f8;border:none;border-radius:14px;font-size:14px;font-weight:700;color:#333;cursor:pointer;}
      .section-label { font-size:12px; color:#2e7d32; margin:0 0 10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
      .journey-grid { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
      .journey-card { display:block; border-radius:14px; padding:20px; text-decoration:none; color:white; position:relative; overflow:hidden; transition:transform 0.15s ease; }
      .journey-card:active { transform:scale(0.98); }
      .journey-card-content { position:relative; z-index:1; }
      .journey-emoji { font-size:28px; margin-bottom:6px; }
      .journey-name { font-size:18px; font-weight:800; letter-spacing:-0.3px; margin-bottom:4px; }
      .journey-cities { font-size:13px; opacity:0.9; margin-bottom:6px; }
      .journey-meta { font-size:11px; opacity:0.8; }
      .journey-city-card { display:block; border-radius:12px; padding:15px; text-decoration:none; color:white; transition:transform 0.15s ease; }
      .journey-city-card:active { transform:scale(0.98); }
      .leg-card { background:#f8f9fa; border-radius:10px; padding:12px 15px; margin-bottom:10px; border-left:4px solid #1a7a3a; }
      .leg-route { font-size:15px; margin-bottom:6px; }
      .leg-details { display:flex; gap:10px; flex-wrap:wrap; font-size:12px; color:#555; margin-bottom:6px; }
      .leg-book { display:inline-block; font-size:12px; color:#1a73e8; font-weight:600; text-decoration:none; }
      .help-banner { margin:20px 0; padding:12px 15px; border-radius:10px; background:#fff9e6; border:1px solid #ffcc00; display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .help-banner-text { text-align:left; }
      .help-banner-title { color:#996600; font-size:14px; display:block; font-weight:bold; }
      .help-banner-sub { font-size:12px; color:#555; }
      .help-banner-cta { background:#996600; color:white; padding:8px 12px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:12px; white-space:nowrap; }
      .scroll-x { display:flex; gap:10px; overflow-x:auto; padding-bottom:8px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
      .scroll-x::-webkit-scrollbar { display:none; }
      .city-card-sm { display:inline-flex; align-items:center; gap:6px; background:#1a7a3a; color:white; padding:10px 16px; border-radius:20px; text-decoration:none; font-size:13px; font-weight:600; white-space:nowrap; }
      .swipe-hint { font-size:11px; color:#aaa; margin:8px 0 0; text-align:center; }
    </style>
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="/sarah/sarah-ui.css?v=4">
    <link rel="stylesheet" href="/sarah/sarah-fab.css?v=1">
    <script defer src="/sarah/data/italy.js"></script>
    <script defer src="/sarah/data/database.js"></script>
    <script defer src="/sarah/sarah-core.js?v=5"></script>
    <script>if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js');</script>
    <meta name="google" content="notranslate">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#1a7a3a">
    <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover">
  </head>
  <body>
    <div class="app-container" translate="no">
      <div style="height:5px;background:linear-gradient(90deg,#009246 33%,#ffffff 33% 66%,#ce2b37 66%);"></div>
      <div class="sticky-header">
        <a href="/" style="text-decoration:none; font-size:20px;">🏠</a>
        <form action="/" method="GET" style="display:flex; flex:1; gap:5px;">
          <input type="text" name="city" placeholder="Try: Rome, Florence..." class="search-input" value="${searchCity}">
          <button type="submit" class="search-btn">GO</button>
        </form>
      </div>`;

  // ── PHRASES page ─────────────────────────────────────────────
  if (pathname === '/phrases') {
    html += `<section>
      <h3>🗣️ Essential Italian Phrases</h3>
      <p style="color:#666;font-size:13px;margin-bottom:20px;">Tap the speaker to hear pronunciation!</p>
      ${PHRASES.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f0f0f0;">
          <div>
            <b style="font-size:16px;color:#003580;">${p.s}</b><br>
            <small style="color:#666;font-size:13px;">${p.e}</small>
          </div>
          <button onclick="speakItalian('${p.s.replace(/'/g,"\\'")}')" style="background:#003580;color:white;border:none;border-radius:50%;width:42px;height:42px;font-size:18px;cursor:pointer;flex-shrink:0;box-shadow:0 2px 8px rgba(0,53,128,0.3);">🔊</button>
        </div>`).join('')}
    </section>
    <script>
    function speakItalian(text) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT'; u.rate = 0.85;
      const v = window.speechSynthesis.getVoices().find(v => v.lang === 'it-IT');
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    }
    </script>`;

  // ── LEGAL page ───────────────────────────────────────────────
  } else if (pathname === '/legal') {
    html += `<section>
      <h3>🇮🇹 About Italy in 10 Minutes</h3>
      <p style="font-size:14px;line-height:1.6;color:#444;">
        <b>10 Minute Italy</b> was built for the traveller who wants to skip the fluff.
        We provide essential info for Italy's top destinations in under 10 minutes.
      </p>
      <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
      <h3>⚖️ Terms & Disclaimers</h3>
      <div style="font-size:13px;line-height:1.6;color:#444;">
        <p style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #fbbc04;">
          <b>Please Note:</b> Information is for guidance only.
          <br>• <b>Weather:</b> Sourced via OpenWeatherMap API and subject to change.
          <br>• <b>Prices:</b> Transport and event prices are estimates and subject to change.
          <br>• <b>Bookings:</b> We are not responsible for bookings on external sites.
        </p>
        <p><b>Support:</b> <a href="mailto:${CONTACT_EMAIL}" style="color:#1a73e8;font-weight:bold;">${CONTACT_EMAIL}</a></p>
        <p><b>Affiliate Disclosure:</b> We use Booking.com partner links. We may earn a commission at no extra cost to you.</p>
        <p><b>Data Privacy:</b> We do not store personal search data, cookies, or location history.</p>
      </div>
      <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
      <h3>❓ FAQ</h3>
      <div style="font-size:13px;">
        <p><b>Q: Is the info 100% accurate?</b><br>A: We update regularly, but always check locally for current prices.</p>
        <p><b>Q: How do I book?</b><br>A: Click any hotel or excursion link to book directly.</p>
      </div>
    </section>`;

  // ── HELP / SOS page ──────────────────────────────────────────
  } else if (pathname === '/help') {
    html += `<section style="text-align:center;">
      <h3>🆘 Emergency Contacts</h3>
      <p style="font-size:14px;color:#666;margin-bottom:20px;">All numbers free to call</p>
      <a href="tel:112" style="background:#d93025;color:white;display:block;margin-bottom:12px;padding:20px;border-radius:12px;text-decoration:none;font-size:18px;font-weight:bold;">
        🚨 112 — ALL EMERGENCIES<br><small>(EU-wide, English speaking)</small>
      </a>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <a href="tel:113" style="background:#e8f0fe;padding:15px;border-radius:12px;text-decoration:none;color:#3c4043;font-weight:bold;">🚔 Police</a>
        <a href="tel:118" style="background:#e8f0fe;padding:15px;border-radius:12px;text-decoration:none;color:#3c4043;font-weight:bold;">🚑 Medical</a>
        <a href="tel:115" style="background:#e8f0fe;padding:15px;border-radius:12px;text-decoration:none;color:#3c4043;font-weight:bold;">👨‍🚒 Fire</a>
        <a href="tel:1530" style="background:#e8f0fe;padding:15px;border-radius:12px;text-decoration:none;color:#3c4043;font-weight:bold;">🚁 Coast Guard</a>
      </div>
      <div style="margin-top:20px;padding:15px;background:#e8f0fe;border-radius:10px;font-size:13px;text-align:left;">
        <h3 style="font-size:15px;margin:0 0 10px 0;">🛂 Visiting Italy — Entry Requirements</h3>
        <p style="margin:0 0 8px 0;"><b>🇬🇧 UK Citizens:</b> Valid passport required. No visa needed for up to 90 days.</p>
        <p style="margin:0 0 8px 0;"><b>🇪🇺 EU Citizens:</b> National ID card accepted.</p>
        <p style="margin:0 0 0 0;"><b>⚠️ ETIAS:</b> UK visitors will soon require ETIAS pre-travel authorisation.</p>
      </div>
      <div style="margin-top:15px;padding:15px;background:#fce8e8;border-radius:10px;font-size:13px;text-align:left;">
        <h3 style="font-size:15px;margin:0 0 10px 0;color:#d93025;">🚨 Lost Your Passport?</h3>
        <p style="margin:0 0 8px 0;"><b>Step 1:</b> Report to local police immediately.</p>
        <p style="margin:0 0 8px 0;"><b>Step 2:</b> Get a crime reference number — your insurer will need this.</p>
        <p style="margin:0 0 8px 0;"><b>Step 3:</b> Contact your nearest embassy or consulate.</p>
        <p style="margin:0 0 15px 0;"><b>Step 4:</b> Apply for an Emergency Travel Document.</p>
        <a href="https://www.gov.uk/world/organisations/british-embassy-rome" target="_blank" style="display:block;background:#003580;color:white;padding:12px;border-radius:8px;text-align:center;text-decoration:none;font-weight:bold;">
          🇬🇧 British Embassy Rome
        </a>
      </div>
    </section>`;

  // ── FIESTAS page ──────────────────────────────────────────────
  } else if (pathname === '/fiestas' && cityData) {
    html += `<section>
      <h3>🎉 ${cityData.name} — Events & Fiestas</h3>
      <p style="color:#666;font-size:13px;margin-bottom:20px;">Festivals and celebrations in ${cityData.name}.</p>
      ${['spring','summer','autumn','winter'].map(season => {
        const seasonLabel = { spring:'🌸 Spring', summer:'☀️ Summer', autumn:'🍂 Autumn', winter:'❄️ Winter' }[season];
        const events = cityData.fiestas.filter(f => f.season === season);
        if (!events.length) return '';
        return `<div style="margin-bottom:25px;">
          <h4 style="background:#003580;color:white;padding:10px 15px;border-radius:10px;margin-bottom:12px;">${seasonLabel}</h4>
          ${events.map(f => `
            <div style="background:#f8f9fa;border-radius:10px;padding:15px;margin-bottom:10px;border-left:4px solid #fbbc04;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <b style="font-size:15px;">${f.emoji} ${f.e}</b>
                <span style="background:#003580;color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${f.m}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#555;line-height:1.5;">${f.desc}</p>
            </div>`).join('')}
        </div>`;
      }).join('')}
    </section>`;

  // ── JOURNEY PAGE ──────────────────────────────────────────────
  } else if (pathname.startsWith('/journey/')) {
    const journeySlug = pathname.replace('/journey/', '').replace('.html', '');
    const journey = RAW.journeys.find(j => j.slug === journeySlug);
    if (journey) {
      const cityGrads = CITY_COLORS;

      const routeCityCards = journey.cities.map(slug => {
        const city = RAW.cities[slug];
        if (!city) return '';
        const [g1, g2] = cityGrads[slug] || ['#333','#555'];
        const hotels = (city.hotels?.budget || []).slice(0, 1).concat((city.hotels?.mid || []).slice(0, 1)).map(h => h.name).join(', ');
        return `<a href="/?city=${slug}&from=${journeySlug}" class="journey-city-card" style="background:linear-gradient(rgba(0,0,0,0.2),rgba(0,0,0,0.2)),linear-gradient(135deg,${g1},${g2});">
          <div><b style="font-size:16px;">${EMOJI_MAP[slug] || '📍'} ${city.name}</b>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.85;">${(city.description || city.taglines?.mix || city.name + ' — a must-see Italian destination.').split('.')[0]}.</p>${hotels ? `<div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:6px;">🏨 ${hotels}</div>` : ''}</div>
        </a>`;
      }).join('');

      const legCards = journey.legs.map(l => `
        <div class="leg-card">
          <div class="leg-route"><b>${l.from}</b> → <b>${l.to}</b></div>
          <div class="leg-details">
            <span>⏱ ${l.time}</span>
            <span>💰 ${l.price}</span>
            <span>🚄 ${l.mode}</span>
          </div>
          <a href="${l.bookUrl}" target="_blank" class="leg-book">Book this leg →</a>
        </div>`).join('');

      const lastSlug = journey.cities[journey.cities.length - 1];
      const lastCity = RAW.cities[lastSlug];
      const onwardSection = (lastCity && lastCity.sarah_knows) ? (() => {
        const airport = lastCity.sarah_knows.airport || `${lastCity.name} Airport`;
        const toCity = lastCity.sarah_knows.to_city || '';
        return `<div style="background:#e8f0fe;padding:15px;border-radius:12px;margin-bottom:20px;border-left:4px solid #1a73e8;">
          <h4 style="margin:0 0 8px;font-size:15px;">🛫 Onward Travel — Departing ${lastCity.name}</h4>
          <p style="margin:0;font-size:13px;color:#1967d2;line-height:1.5;">
            <b>Nearest Airport:</b> ${airport}<br>
            <b>Getting there:</b> ${toCity || `Various transport options from ${lastCity.name} city centre`}
          </p>
        </div>`;
      })() : '';

      html += `<section class="page-content">
        <h1 style="margin:0;font-size:26px;">${journey.emoji} ${journey.name}</h1>
        <p style="color:#666;margin:5px 0 15px 0;">${journey.tagline}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px;">
          <span style="background:#e8f0fe;color:#1a7a3a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">👤 ${journey.bestFor}</span>
          <span style="background:#e8f0fe;color:#1a7a3a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">📅 ${journey.days}</span>
          <span style="background:#e8f0fe;color:#1a7a3a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${journey.vibe}</span>
        </div>
        <div style="background:#f8f9fa;border-radius:10px;padding:15px;margin-bottom:20px;border-left:4px solid #fbbc04;">
          <p style="margin:0;font-size:14px;color:#333;line-height:1.7;">${journey.intro}</p>
        </div>
        <h3>📍 The Route</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">${routeCityCards}</div>
        <h3>🚄 Getting Between Cities</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">${legCards}</div>
        ${onwardSection}
        <div class="help-banner">
          <div class="help-banner-text">
            <b class="help-banner-title">Like this route?</b>
            <span class="help-banner-sub">I can help you book every leg — just ask Sarah</span>
          </div>
          <a href="https://beacons.ai/travelwithneil" target="_blank" class="help-banner-cta">Book Now</a>
        </div>
      </section>`;
    } else {
      html += `<section><h3>Journey not found</h3><p>This journey doesn't exist. <a href="/">Go home</a></p></section>`;
    }

  // ── CITY PAGE ─────────────────────────────────────────────────
  } else if (cityData) {
    const realWeather = await getItalianWeather(cityData.name);
    const displayTemp = realWeather ? `${realWeather.temp}°C — ${realWeather.description}` : cityData.temp;
    const weatherIcon = realWeather ? `<img src="${realWeather.icon}" style="vertical-align:middle;width:30px;">` : '☀️ ';

    const fromJourney = fromJourneySlug ? RAW.journeys.find(j => j.slug === fromJourneySlug) : null;
    const backBar = fromJourney ? (() => {
      const [bg1, bg2] = fromJourney.color || ['#1a7a3a','#145a2a'];
      return `<a href="/journey/${fromJourney.slug}" style="display:flex;align-items:center;gap:8px;padding:10px 15px;margin-bottom:12px;background:linear-gradient(135deg,${bg1},${bg2});border-radius:10px;text-decoration:none;color:white;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
        ← Back to ${fromJourney.emoji} ${fromJourney.name}
      </a>`;
    })() : '';

    html += `<section style="padding:15px;max-width:600px;margin:0 auto;">
      ${backBar}
      <h1 style="margin:0;font-size:26px;">📍 10 Minute ${cityData.name}</h1>
      <div style="display:flex;align-items:center;gap:8px;background:#f0f4ff;padding:10px 15px;border-radius:12px;margin:10px 0 15px;">
        ${weatherIcon}
        <div>
          <div style="font-size:18px;font-weight:800;color:#003580;">${realWeather ? realWeather.temp + '°C' : cityData.temp}</div>
          <div style="font-size:12px;color:#666;text-transform:capitalize;">${realWeather ? realWeather.description : 'Loading...'}</div>
        </div>
        <div style="margin-left:auto;font-size:11px;color:#aaa;text-align:right;">Live Weather<br><span onclick="location.reload()" style="cursor:pointer;color:#1a73e8;font-weight:600;">Refresh 🔄</span></div>
      </div>

      <div style="background:#fff;padding:20px 15px;border-radius:12px;border-left:4px solid #003580;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#333;">${cityData.welcome}</p>
      </div>

      <div id="travelTipBox" style="background:#fff3cd;color:#856404;padding:12px;border-radius:8px;margin-bottom:15px;font-size:14px;transition:opacity 0.5s ease;">
        💡 ${TRAVEL_TIPS[Math.floor(Math.random() * TRAVEL_TIPS.length)]}
      </div>

      <div style="margin-bottom:20px;">
        <h3>✈️ Getting to ${cityData.name}</h3>
        <div style="background:#e8f0fe;padding:15px;border-radius:12px;font-size:13px;color:#1967d2;line-height:1.5;border-left:4px solid #1a73e8;">${cityData.trans}</div>
      </div>

      <h3>🏨 Hand-Picked Stays</h3>
      <div class="hotel-list">
        ${cityData.hotels.map(h => `
          <a href="${h.bookingLink}" target="_blank" rel="noopener noreferrer" class="hotel-card">
            <img src="${h.img}" class="hotel-img">
            <div class="hotel-info">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <b class="hotel-name">${h.name}</b>
                ${h.price ? `<span class="hotel-price">${h.price}</span>` : ''}
              </div>
              <div class="hotel-reason">${h.reason}</div>
              <div class="hotel-meta">${h.vibe}${h.area ? ` · 📍 ${h.area}` : ''}${h.proximity ? ` · ${h.proximity}` : ''}</div>
            </div>
          </a>`).join('')}
      </div>

      <div style="margin:20px 0;padding:15px;background:#f0f4f8;border-radius:12px;text-align:center;">
        <p style="margin:0 0 10px 0;font-size:13px;color:#555;">Not found what you're looking for?</p>
        <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityData.name)}&aid=${MY_BOOKING_AID}" target="_blank" rel="noopener noreferrer" style="display:block;background:white;border:1px solid #003580;color:#003580;padding:12px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
          🔍 Search all hotels in ${cityData.name}
        </a>
      </div>

      <h3>🔥 Must See</h3>
      <div style="background:#f9f9f9;padding:15px;border-radius:12px;border:1px solid #eee;margin-bottom:20px;">
        ${cityData.top5.map((item, i) => `<p style="font-size:14px;margin-bottom:10px;"><b>${i+1}.</b> ${item}</p>`).join('')}
      </div>

      <div style="margin-bottom:20px;background:linear-gradient(135deg,#1c1a18,#2d2a24);border-radius:14px;padding:20px;text-align:center;color:#faf7f2;">
        <div style="font-size:32px;margin-bottom:8px;">✨</div>
        <h3 style="margin:0 0 6px;font-size:18px;border:none;color:#faf7f2;">Want the full ${cityData.name} experience?</h3>
        <p style="font-size:13px;color:#d4c8a8;margin:0 0 14px;line-height:1.5;">Airport transfers, entry prices, day trips, hidden gems — skip 20 hours of Googling. Sarah knows this city inside out.</p>
        <button onclick="document.getElementById('sarahFab').click()" style="background:#d4a843;color:#1c1a18;border:none;padding:12px 28px;border-radius:25px;font-size:14px;font-weight:700;cursor:pointer;">Ask Sarah ✨</button>
      </div>

      <h3>🚗 Day Trips</h3>
      <div style="margin-bottom:20px;">
        ${cityData.day_trips.map(d => `
          <div style="background:#f8f9fa;border-radius:10px;padding:12px 15px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <b>${d.name}</b>
              <span style="background:#003580;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${d.duration}</span>
            </div>
            <p style="font-size:12px;color:#555;margin:5px 0 0;">${d.tip} ${d.price ? `— ${d.price}` : ''}</p>
          </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0;">
        <a href="/fiestas?city=${searchCity}${fromJourney ? '&from='+fromJourneySlug : ''}" style="background:#e3f2fd;padding:15px;border-radius:12px;text-decoration:none;text-align:center;color:#1967d2;font-weight:bold;">🎉 Fiestas</a>
        <a href="https://www.getyourguide.com/s/?q=${encodeURIComponent(cityData.name)}" target="_blank" style="background:#e3f2fd;padding:15px;border-radius:12px;text-decoration:none;text-align:center;color:#1967d2;font-weight:bold;">🎟️ Excursions</a>
      </div>

      ${cityData.restaurants ? `
      <h3>🍝 Where to Eat</h3>
      <div style="margin-bottom:20px;">
        ${cityData.restaurants.map(r => `
          <div style="background:white;border:1px solid #eee;border-radius:10px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <b>${r.name}</b>
              <span style="background:#1a7a3a;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${r.price}</span>
            </div>
            <p style="font-size:12px;color:#555;margin:5px 0 0;">${r.tip || r.bestDish}</p>
          </div>`).join('')}
      </div>` : ''}

      ${cityData.morning_activities ? `
      <h3>☀️ Morning Activities</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
        ${cityData.morning_activities.slice(0, 6).map(a => `
          <div style="background:#f0f4ff;border-radius:10px;padding:10px;text-align:center;border:1px solid #e0e9ff;">
            <b style="font-size:12px;">${a.name}</b>
            <div style="font-size:10px;color:#666;margin-top:3px;">${a.price}</div>
          </div>`).join('')}
      </div>` : ''}
    </section>`;

  // ── HOMEPAGE ─────────────────────────────────────────────────
  } else {
    const primaryCities = [['rome','Rome'],['florence','Florence'],['venice','Venice'],['milan','Milan']];
    const moreCities = Object.entries(SLUG_MAP).filter(([k]) => !['rome','florence','venice','milan'].includes(k));

    const journeyCards = RAW.journeys.map(j => {
      const [c1, c2] = j.color;
      const cityNames = j.cities.map(s => RAW.cities[s]?.name || s).join(' → ');
      return `<a href="/journey/${j.slug}" class="journey-card" style="background:linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)),linear-gradient(135deg,${c1},${c2});">
        <div class="journey-card-content">
          <div class="journey-emoji">${j.emoji}</div>
          <div class="journey-name">${j.name}</div>
          <div class="journey-cities">${cityNames}</div>
          <div class="journey-meta">${j.days} · ${j.bestFor} · ${j.vibe}</div>
        </div>
      </a>`;
    }).join('');

    html += `
      <div class="hero"><h2>🇮🇹 ITALY IN 10 MINUTES</h2></div>
      <div style="margin:15px 20px 0;padding:12px 15px;background:#f0f7f0;border-radius:10px;border-left:4px solid #009246;text-align:center;">
        <p style="color:#555;font-size:13px;margin:0;line-height:1.6;">
          Select a featured city or use the search bar above or links below. Please note all prices suggested are subject to change and not in our control, and Sarah the AI can sometimes get things wrong.
        </p>
      </div>
      <div style="padding:0 20px 25px;">
        <p class="section-label">🗺️ Curated Routes</p>
        <p style="color:#666;font-size:12px;margin:-10px 0 15px 0;">Multi-city journeys hand-picked for every kind of traveller</p>
        <div class="journey-grid">${journeyCards}</div>
      </div>
      <div style="padding:0 20px;">
        <p class="section-label">🏙️ Cities</p>
        <div class="featured-grid">
          ${primaryCities.map(([slug, name]) => {
            const [g1, g2] = CITY_COLORS[slug] || ['#1a7a3a','#145a2a'];
            return `<a href="/?city=${slug}" class="city-card" style="background:linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),linear-gradient(135deg,${g1},${g2});">${name.toUpperCase()}</a>`;
          }).join('')}
        </div>
      </div>
      <div style="padding:12px 20px 24px;">
        <p class="section-label">📍 More in Italy</p>
        <div class="scroll-x">
          ${moreCities.map(([slug, name]) => `<a href="/?city=${slug}" class="city-card-sm">${EMOJI_MAP[slug] || '📍'} ${name}</a>`).join('')}
        </div>
        <p class="swipe-hint">👆 Swipe to explore more cities</p>
      </div>
      <div style="padding:0 20px 25px;">
        <p class="section-label">💬 Loved by travellers</p>
        <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
          <div style="flex-shrink:0;width:240px;background:white;border:1px solid #eee;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#003580;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;flex-shrink:0;">S</div>
              <div><div style="font-size:13px;font-weight:700;">Sarah M.</div><div style="font-size:10px;color:#999;">Visited Rome</div></div>
              <span style="margin-left:auto;font-size:11px;color:#fbbc04;">★★★★★</span>
            </div>
            <p style="font-size:12px;color:#444;line-height:1.5;margin:0;">"Sarah built us an itinerary on the fly. We didn't plan a thing and had the best trip."</p>
          </div>
          <div style="flex-shrink:0;width:240px;background:white;border:1px solid #eee;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#e8a020;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;flex-shrink:0;">J</div>
              <div><div style="font-size:13px;font-weight:700;">James K.</div><div style="font-size:10px;color:#999;">Venice explorer</div></div>
              <span style="margin-left:auto;font-size:11px;color:#fbbc04;">★★★★★</span>
            </div>
            <p style="font-size:12px;color:#444;line-height:1.5;margin:0;">"Weather, phrases, SOS page — everything I need in one place. No more hopping between apps."</p>
          </div>
          <div style="flex-shrink:0;width:240px;background:white;border:1px solid #eee;border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#d93025;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;flex-shrink:0;">E</div>
              <div><div style="font-size:13px;font-weight:700;">Elena R.</div><div style="font-size:10px;color:#999;">First time solo</div></div>
              <span style="margin-left:auto;font-size:11px;color:#fbbc04;">★★★★★</span>
            </div>
            <p style="font-size:12px;color:#444;line-height:1.5;margin:0;">"The SOS page with emergency numbers gave my mum so much peace of mind. Genius feature."</p>
          </div>
        </div>
      </div>`;
  }

  // ── Footer nav ───────────────────────────────────────────────
  const activeKey = cityData ? searchCity : (url.searchParams.get('city') || '');
  const fromSuffix = fromJourneySlug ? '&from='+fromJourneySlug : '';
  html += `<div class="footer-nav">
    <div class="footer-links">
      <a href="/?city=${activeKey}${fromSuffix}" class="footer-link"><span class="footer-icon">ℹ️</span><span class="footer-label">Info</span></a>
      <a href="/fiestas?city=${activeKey}${fromSuffix}" class="footer-link"><span class="footer-icon">🎉</span><span class="footer-label">Fiestas</span></a>
      <a href="/phrases" class="footer-link"><span class="footer-icon">🗣️</span><span class="footer-label">Phrases</span></a>
      <a href="/legal" class="footer-link"><span class="footer-icon">⚖️</span><span class="footer-label">Legal</span></a>
      <a href="/help" class="footer-link" style="color:#d93025;"><span class="footer-icon">🆘</span><span class="footer-label">HELP</span></a>
    </div>
    <div style="height:5px;background:linear-gradient(90deg,#009246 33%,#ffffff 33% 66%,#ce2b37 66%);"></div>
  </div>`;

  // ── Sarah FAB + BYG ──────────────────────────────────────────
  html += `
    <button class="sarah-fab" id="sarahFab" onclick="SarahAdvisor.open()" aria-label="Ask Sarah">
      <img src="/sarah/sarah-avatar.png" class="sarah-fab-img">
    </button>
    <div class="sarah-fab-label" id="sarahFabLabel">Ask Sarah ✨</div>
    <script>
    (function(){ try {
      if(!localStorage.getItem('sarah_seen')) {
        var l=document.getElementById('sarahFabLabel');
        if(l) { setTimeout(function(){ l.classList.add('sarah-label-show'); setTimeout(function(){ l.classList.remove('sarah-label-show'); localStorage.setItem('sarah_seen','1'); },3000); },1500); }
      }
    }catch(e){}})();

    const clientTips = ${JSON.stringify(TRAVEL_TIPS)};
    setTimeout(() => {
      const box = document.getElementById('travelTipBox');
      if (box) { let i=Math.floor(Math.random()*clientTips.length); setInterval(() => { i=(i+1)%clientTips.length; box.style.opacity='0'; setTimeout(() => { box.innerHTML='💡 '+clientTips[i]; box.style.opacity='1'; },500); },20000); }
    },1000);

    function shareApp(c) { if(navigator.share) { navigator.share({title:'Italy in 10 Minutes: '+c,text:'Check out these travel tips for '+c+'!',url:window.location.href}); } else { alert("Copy this link: "+window.location.href); } }

    window.addEventListener('load', () => { if(window.history.state!=='app-running') window.history.pushState('app-running',''); });
    window.onpopstate = function(e) {
      const p = new URLSearchParams(window.location.search);
      if(p.has('city')) { window.history.pushState('app-running',null,window.location.href); }
      else { window.location.href='/'; }
    };

    const citiesList = ${JSON.stringify(Object.values(SLUG_MAP))};
    let idx=0; const inp=document.querySelector('input[name="city"]');
    if(inp) setInterval(() => { idx=(idx+1)%citiesList.length; inp.placeholder='Try: '+citiesList[idx]; },3000);
    <\/script>

    <button class="byg-fab" onclick="document.getElementById('bygOverlay').style.display='flex'" aria-label="Before You Go">🧳</button>
    <div class="byg-overlay" id="bygOverlay" onclick="if(event.target===this)this.style.display='none'">
      <div class="byg-sheet">
        <div class="byg-handle"></div>
        <div class="byg-header"><h3>✈️ Before You Go</h3><p>Hand-picked essentials for your Italy trip</p></div>
        <a href="https://airalo.tp.st/M1Bz5YfY" target="_blank" class="byg-item">
          <div class="byg-icon">📱</div>
          <div><div class="byg-tag">Stay Connected</div><div class="byg-title">Travel eSIM</div><div class="byg-desc">No roaming bills. Connected from the moment you land.</div></div>
          <span class="byg-arrow">›</span>
        </a>
        <a href="https://www.coverwise.co.uk" target="_blank" class="byg-item">
          <div class="byg-icon">🛡️</div>
          <div><div class="byg-tag">Essential</div><div class="byg-title">Travel Insurance</div><div class="byg-desc">Don't leave without it. Takes 2 minutes to sort.</div></div>
          <span class="byg-arrow">›</span>
        </a>
        <a href="https://amzn.to/47ZyLhL" target="_blank" class="byg-item">
          <div class="byg-icon">🔌</div>
          <div><div class="byg-tag">Don't Forget</div><div class="byg-title">Travel Adapter</div><div class="byg-desc">Italy uses Type F plugs — grab one before you fly.</div></div>
          <span class="byg-arrow">›</span>
        </a>
        <a href="https://amzn.to/4t3EnzW" target="_blank" class="byg-item">
          <div class="byg-icon">☀️</div>
          <div><div class="byg-tag">Pack This</div><div class="byg-title">SPF 50 Sunscreen</div><div class="byg-desc">Far cheaper at home. The Italian sun is no joke!</div></div>
          <span class="byg-arrow">›</span>
        </a>
        <button class="byg-close" onclick="document.getElementById('bygOverlay').style.display='none'">Done</button>
      </div>
    </div>`;

  res.end(html + '</div></body></html>');
});

if (process.env.NODE_ENV === 'production') {
  module.exports = server;
} else {
  server.listen(3000);
  console.log('Italy in 10 running at http://localhost:3000');
}