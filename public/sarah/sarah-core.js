var _nativeFetch = window.fetch.bind(window);
/* ============================================================
   SARAH-CORE.JS — Brain of the Sarah Advisor system
   Works with any country data file (italy.js etc)
   Called from your app with: SarahAdvisor.open()

   ── PREMIUM SWITCH ──────────────────────────────────────────
   Set SARAH_PREMIUM_MODE = true before your first post-
   approval Play Store update to activate the paywall.
   Everything else is automatic.
   ────────────────────────────────────────────────────────── */

const SARAH_PREMIUM_MODE = false;   // ← FLIP THIS TO true FOR PAYWALL

/* Valid unlock codes — add more when you connect Stripe */
const SARAH_VALID_CODES = new Set([
  'ITALY-2024','SARAH-VIP','CITY-OPEN','TEST-1234',
  'SARAH-001','UNLOCK-IT','DEMO-2024','ITALY-ROM',
  'ITALY-FLO','ITALY-VEN','ITALY-MIL','ITALY-NAP',
  'ITALY-AMA','ITALY-CIN','ITALY-BOL','ITALY-TUR',
  'ITALY-COM','PREMIUM-IT','SARAH-PRO',
]);

/* Max free AI chat messages before paywall nudge */
const SARAH_FREE_CHATS = 3;

/* Affiliate product picks — thread these into Sarah's advice */
const SARAH_AFFILIATE_PICKS = [
  { icon: '📱', tag: 'Stay Connected', title: 'Travel eSIM', desc: 'No roaming bills. Connected from the moment you land.', url: 'https://airalo.tp.st/M1Bz5YfY' },
  { icon: '🛡️', tag: 'Essential', title: 'Travel Insurance', desc: "Don't leave without it. Takes 2 minutes to sort.", url: 'https://www.coverwise.co.uk' },
  { icon: '🔌', tag: "Don't Forget", title: 'Travel Adapter', desc: 'Your destination uses a different plug — grab one before your trip.', url: 'https://amzn.to/47ZyLhL' },
  { icon: '☀️', tag: 'Pack This', title: 'SPF 50 Sunscreen', desc: 'Far cheaper at home. The sun is no joke!', url: 'https://amzn.to/4t3EnzW' },
];

// ── EXCHANGE RATES (Frankfurter API, ECB data) ────────────────
const SARAH_CURRENCIES = ['EUR', 'GBP', 'USD'];
const SARAH_CURRENCY_SYMBOLS = { EUR: '€', GBP: '£', USD: '$' };

function _sarahGetRates() {
  try { const c = JSON.parse(localStorage.getItem('sarah_xr')||'{}'); if (c.ts && Date.now()-c.ts<86400000) return c.rates; } catch(e) {}
  return null;
}
async function _sarahEnsureRates() {
  let rates = _sarahGetRates();
  if (!rates) try { const r=await fetch('https://api.frankfurter.app/latest?from=EUR&to=GBP,USD'); const d=await r.json(); if(d&&d.rates){rates=d.rates;localStorage.setItem('sarah_xr',JSON.stringify({rates,ts:Date.now()}));}} catch(e){}
  return rates || { GBP: 0.85, USD: 1.08 };
}
function _sarahPrefCurrency() { return localStorage.getItem('sarah_cur')||'EUR'; }
function _sarahSetCurrency(c) { localStorage.setItem('sarah_cur',c); }
function _sarahConvert(amt,to,rates) { if(!rates||!rates[to]||to==='EUR')return amt; return Number((amt*rates[to]).toFixed(2)); }
function _sarahFormatPrice(eurStr,rates,pref) {
  if(!eurStr)return''; const n=parseFloat(eurStr.replace(/[^0-9.]/g,'')); if(isNaN(n))return eurStr;
  const sym=SARAH_CURRENCY_SYMBOLS[pref]||'€';
  if(pref==='EUR')return sym+Math.round(n);
  return sym+_sarahConvert(n,pref,rates);
}
function _sarahFormatPriceRange(rangeStr,rates,pref) {
  if(!rangeStr)return''; const sep=rangeStr.includes('–')?'–':'-';
  const parts=rangeStr.split(sep).map(s=>s.trim());
  const conv=parts.map(p=>_sarahFormatPrice(p,rates,pref));
  return conv.join(sep);
}
function _sarahDisplayPrice(eurPrice) {
  if (!eurPrice || eurPrice.includes('€€') || eurPrice === 'Free') return eurPrice;
  const rates = _sarahGetRates();
  const pref = _sarahPrefCurrency();
  if (!rates || pref === 'EUR') return eurPrice;
  const hasRange = eurPrice.includes('–') || eurPrice.includes('-');
  if (hasRange) {
    const converted = _sarahFormatPriceRange(eurPrice, rates, pref);
    const orig = eurPrice.replace(/€/g, '').trim();
    return `${converted} <span class="sarah-price-converted">(€${orig})</span>`;
  }
  const converted = _sarahFormatPrice(eurPrice, rates, pref);
  const orig = eurPrice.replace(/€/g, '').trim();
  return `${converted} <span class="sarah-price-converted">(€${orig})</span>`;
}

// ── EXPENSE TRACKER ──────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  { id:'food', label:'Food', emoji:'🍽️' },
  { id:'transport', label:'Transport', emoji:'🚌' },
  { id:'accommodation', label:'Accommodation', emoji:'🏨' },
  { id:'activities', label:'Activities', emoji:'🎭' },
  { id:'shopping', label:'Shopping', emoji:'🛍️' },
  { id:'other', label:'Other', emoji:'📦' },
];

function _sarahLoadExpenses() { try { _s.expenses=JSON.parse(localStorage.getItem('sarah_expenses')||'[]'); } catch(e){_s.expenses=[];} }
function _sarahSaveExpenses() { try { localStorage.setItem('sarah_expenses',JSON.stringify(_s.expenses)); } catch(e){} }
function _sarahAddExpense(cat,amt,desc) {
  _s.expenses.push({id:Date.now(),category:cat,amount:parseFloat(amt),description:desc,date:new Date().toISOString().split('T')[0]});
  _sarahSaveExpenses(); _sarahRenderExpenses();
}
function _sarahDeleteExpense(id) {
  _s.expenses=_s.expenses.filter(e=>e.id!==id); _sarahSaveExpenses(); _sarahRenderExpenses();
}
function _sarahRenderExpenses() {
  const c=document.getElementById('sarah-expenses-list'); if(!c)return;
  const totals={}; _s.expenses.forEach(e=>{totals[e.category]=(totals[e.category]||0)+e.amount;});
  const gt=Object.values(totals).reduce((a,b)=>a+b,0);
  let h='<div class="sarah-expenses-totals">';
  EXPENSE_CATEGORIES.forEach(cat=>{
    const a=totals[cat.id]||0;
    h+=`<div class="sarah-expense-cat-total"><span>${cat.emoji} ${cat.label}</span><span>€${a.toFixed(0)}</span></div>`;
  });
  h+=`<div class="sarah-expense-grand-total">Total: €${gt.toFixed(0)}</div></div>`;
  h+='<div class="sarah-expenses-items">';
  [..._s.expenses].reverse().forEach(e=>{
    const cat=EXPENSE_CATEGORIES.find(c=>c.id===e.category)||{emoji:'📦',label:'Other'};
    h+=`<div class="sarah-expense-item"><div class="sarah-expense-info"><span class="sarah-expense-cat">${cat.emoji} ${cat.label}</span><span class="sarah-expense-desc">${e.description}</span><span class="sarah-expense-date">${e.date}</span></div><div class="sarah-expense-amount">€${e.amount.toFixed(0)}</div><button class="sarah-expense-delete" onclick="_sarahDeleteExpense(${e.id})">✕</button></div>`;
  });
  if(!_s.expenses.length)h+='<p class="sarah-expenses-empty">No expenses logged yet</p>';
  h+='</div>'; c.innerHTML=h;
}

// ── INTERNAL STATE ──────────────────────────────────────────
let _s = {
  group: null, vibe: null, budget: null, days: null,
  city: null, cityData: null, chatCount: 0, unlocked: false,
  step: 0, currentDay: 1, checklistState: {},
  tripStartDate: null, tripEndDate: null, dynamicItinerary: null,
  cityPrefilled: false, hasRunOnce: false,
  expenses: [],
};

// ── PUBLIC API ───────────────────────────────────────────────
window.SarahAdvisor = {

  /* Call this from any button in your app */
  open(country = 'italy') {
    _ensureOverlay();
    _resetState();

    // Detect city from page URL (e.g. ?city=rome)
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get('city');
    if (cityParam && window.SARAH_CITIES) {
      const match = window.SARAH_CITIES.find(c => c.name.toLowerCase() === cityParam.toLowerCase());
      if (match) {
        _s.city = match.name;
        _s.cityData = match;
        _s.cityPrefilled = true;
      }
    }

    _showScreen('sarah-welcome-screen');
    _startRotatingPhrases();
    document.getElementById('sarah-overlay').classList.add('sarah-open');
    document.body.style.overflow = 'hidden';
    history.pushState({sarah: true}, '');

    // Update welcome message for prefilled city
    if (_s.cityPrefilled) {
      const badge = document.querySelector('.sarah-welcome-badge');
      const sub = document.querySelector('.sarah-welcome-sub');
      const btn = document.querySelector('.sarah-welcome .sarah-btn-primary');
      if (badge) badge.textContent = `${_s.cityData.emoji || '📍'} ${_s.city} · Personalised Plan`;
      if (sub) sub.innerHTML = `You're looking at <strong>${_s.city}</strong>. Tell me who's going and what you want — I'll build you a custom plan in 10 seconds.`;
      if (btn) btn.textContent = `Plan ${_s.city} →`;
    }
  },

  close() {
    document.getElementById('sarah-overlay').classList.remove('sarah-open');
    document.body.style.overflow = '';
  },
};

// ── BUILD OVERLAY (once) ─────────────────────────────────────
function _ensureOverlay() {
  if (document.getElementById('sarah-overlay')) return;

  // Inject Google Fonts if not already loaded
  if (!document.querySelector('link[href*="Playfair"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  const overlay = document.createElement('div');
  overlay.id = 'sarah-overlay';
  overlay.innerHTML = _buildOverlayHTML();
  document.body.appendChild(overlay);

  _attachEvents();
  _buildCityGrid();
  _loadSavedTrips();
}

// ── HTML STRUCTURE ───────────────────────────────────────────
function _buildOverlayHTML() {
  const c = window.SARAH_COUNTRY || { name:'Italy', flag:'🇮🇹' };
  return `
  <!-- HEADER -->
  <div class="sarah-header">
    <div class="sarah-header-avatar"><img src="/sarah/sarah-avatar.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div>
    <div class="sarah-header-info">
      <div class="sarah-header-name">Sarah · ${c.name} Expert</div>
      <div class="sarah-header-status">Your personal city advisor</div>
    </div>
    <button class="sarah-header-icon" id="sarah-header-checklist-btn" onclick="_sarahGoChecklist()" title="Packing checklist">📋</button>
    <button class="sarah-header-icon" id="sarah-header-trips-btn" onclick="_sarahShowSaved()" title="My Trips">📁</button>
    <button class="sarah-close-btn" onclick="SarahAdvisor.close()">✕</button>
  </div>

  <!-- CHECKLIST DROPDOWN PANEL (toggled by 📋) -->
  <div class="sarah-checklist-panel" id="sarah-checklist-panel">
    <div class="sarah-checklist-panel-header">
      <span>📋 <span id="sarah-checklist-panel-title">Packing checklist</span></span>
      <div class="sarah-checklist-panel-actions">
        <button class="sarah-checklist-clear" id="sarah-checklist-clear-btn" onclick="_sarahClearChecklist()" title="Clear all ticks for this city">🗑️</button>
        <button class="sarah-checklist-panel-close" onclick="_sarahToggleChecklist()">✕</button>
      </div>
    </div>
    <div class="sarah-checklist-panel-tabs" id="sarah-checklist-panel-tabs"></div>
    <div class="sarah-checklist-panel-body" id="sarah-checklist-panel-body"></div>
  </div>

  <!-- SCREENS -->
  <div class="sarah-screens">

    <!-- ① WELCOME -->
    <div class="sarah-screen sarah-active" id="sarah-welcome-screen">
      <div class="sarah-welcome">
        <div class="sarah-welcome-glow"></div>
        <div class="sarah-welcome-orb"></div>
        <div class="sarah-welcome-badge">${c.flag} ${c.name} · ${c.cityCount || 12} Cities · Your Advisor</div>
        <h2>${c.name} sorted.<br><em>In 10 minutes.</em></h2>
        <p class="sarah-welcome-sub">Tell me who's going and what you want — I'll tell you exactly which city to book and why. Honest advice, no faff.</p>
        <p class="sarah-rotating-phrase" id="sarah-rotating-phrase">${c.name} sorted. In 10 minutes.</p>
        <div class="sarah-intro-card">
	<div class="sarah-intro-avatar" style="width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="/sarah/sarah-avatar.png" style="width:100%;height:100%;object-fit:cover;"></div>
          <div>
            <div class="sarah-intro-name">Sarah · ${c.name} Expert</div>
            <div class="sarah-intro-quote">"${c.sarahIntro || "I've been everywhere. Let's find your perfect city."}"</div>
          </div>
        </div>
        <button class="sarah-btn-primary" onclick="_sarahGoQuiz()">Let's Find Your City →</button>
      </div>
    </div>

    <!-- ①.5 LOADING -->
    <div class="sarah-screen" id="sarah-loading-screen">
      <div class="sarah-loading">
        <div class="sarah-loading-avatar"><img src="/sarah/sarah-avatar.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div>
        <div class="sarah-loading-bar"><div class="sarah-loading-fill" id="sarah-loading-fill"></div></div>
        <p class="sarah-loading-text" id="sarah-loading-text">Sarah is building your itinerary…</p>
        <p class="sarah-loading-sub" id="sarah-loading-sub">Finding the best restaurants, activities and local favourites for you</p>
      </div>
    </div>

    <!-- ② QUIZ -->
    <div class="sarah-screen" id="sarah-quiz-screen">
      <div class="sarah-quiz-inner">
        <div class="sarah-progress-bar" id="sarah-progress-bar">
          <div class="sarah-progress-dot s-active" id="spd0"></div>
          <div class="sarah-progress-dot" id="spd1"></div>
          <div class="sarah-progress-dot" id="spd2"></div>
          <div class="sarah-progress-dot" id="spd3"></div>
          <div class="sarah-progress-dot" id="spd4"></div>
        </div>

        <!-- Step 0: Who -->
        <div id="sarah-step-0">
          <p class="sarah-step-label">Step 1 of 5</p>
          <h2 class="sarah-step-title">Who's <em>going?</em></h2>
          <p class="sarah-step-instruct">Pick your group and tap <strong>Next</strong></p>
          <div class="sarah-options-grid g2">
            <div class="sarah-option" onclick="_sPickGroup(this,'solo')"><span class="sarah-option-icon">🙋‍♀️</span><span class="sarah-option-label">Solo</span><span class="sarah-option-sub">Just me, my way</span></div>
            <div class="sarah-option" onclick="_sPickGroup(this,'couple')"><span class="sarah-option-icon">💑</span><span class="sarah-option-label">Couple</span><span class="sarah-option-sub">Two of us</span></div>
            <div class="sarah-option" onclick="_sPickGroup(this,'girls')"><span class="sarah-option-icon">👯‍♀️</span><span class="sarah-option-label">Girls Trip</span><span class="sarah-option-sub">The squad is ready</span></div>
            <div class="sarah-option" onclick="_sPickGroup(this,'lads')"><span class="sarah-option-icon">🍺</span><span class="sarah-option-label">Lads / Stag</span><span class="sarah-option-sub">Boys on tour</span></div>
            <div class="sarah-option" onclick="_sPickGroup(this,'family')"><span class="sarah-option-icon">👨‍👩‍👧‍👦</span><span class="sarah-option-label">Family</span><span class="sarah-option-sub">Kids in tow</span></div>
            <div class="sarah-option" onclick="_sPickGroup(this,'group')"><span class="sarah-option-icon">🎉</span><span class="sarah-option-label">Mixed Group</span><span class="sarah-option-sub">Friends, all ages</span></div>
          </div>
          <div class="sarah-quiz-nav"><span></span><button class="sarah-btn-next" id="sarah-next-0" onclick="_sarahStep(1)"><strong>Next</strong> →</button></div>
        </div>

        <!-- Step 1: Vibe -->
        <div id="sarah-step-1" style="display:none">
          <p class="sarah-step-label">Step 2 of 5</p>
          <h2 class="sarah-step-title">What's the <em>vibe?</em></h2>
          <p class="sarah-step-instruct">Pick your vibe and tap <strong>Next</strong></p>
          <div class="sarah-options-grid g3">
            <div class="sarah-option" onclick="_sPickVibe(this,'beach')"><span class="sarah-option-icon">🏖️</span><span class="sarah-option-label">Beach</span><span class="sarah-option-sub">Sun, sea, sand</span></div>
            <div class="sarah-option" onclick="_sPickVibe(this,'party')"><span class="sarah-option-icon">🎊</span><span class="sarah-option-label">Party</span><span class="sarah-option-sub">Nights out, late bars</span></div>
            <div class="sarah-option" onclick="_sPickVibe(this,'culture')"><span class="sarah-option-icon">🏛️</span><span class="sarah-option-label">Culture</span><span class="sarah-option-sub">Art, history, architecture</span></div>
            <div class="sarah-option" onclick="_sPickVibe(this,'food')"><span class="sarah-option-icon">🍷</span><span class="sarah-option-label">Food & Wine</span>            <span class="sarah-option-sub">Osterias, markets, tables</span></div>
            <div class="sarah-option" onclick="_sPickVibe(this,'relax')"><span class="sarah-option-icon">😌</span><span class="sarah-option-label">Relax</span><span class="sarah-option-sub">Slow pace, no plans</span></div>
            <div class="sarah-option" onclick="_sPickVibe(this,'mix')"><span class="sarah-option-icon">✨</span><span class="sarah-option-label">A bit of everything</span><span class="sarah-option-sub">Keep it open</span></div>
          </div>
          <div class="sarah-quiz-nav"><button class="sarah-btn-back" onclick="_sarahStep(0)">← Back</button><button class="sarah-btn-next" id="sarah-next-1" onclick="_sarahStep(2)"><strong>Next</strong> →</button></div>
        </div>

        <!-- Step 2: Budget -->
        <div id="sarah-step-2" style="display:none">
          <p class="sarah-step-label">Step 3 of 5</p>
          <h2 class="sarah-step-title">What's your <em>budget?</em></h2>
          <p class="sarah-step-instruct">Pick your budget and tap <strong>Next</strong></p>
          <div class="sarah-options-grid g3">
            <div class="sarah-option" onclick="_sPickBudget(this,'budget')"><span class="sarah-option-icon">💰</span><span class="sarah-option-label">Budget</span><span class="sarah-option-sub">Make it stretch</span></div>
            <div class="sarah-option" onclick="_sPickBudget(this,'mid')"><span class="sarah-option-icon">💳</span><span class="sarah-option-label">Mid-range</span><span class="sarah-option-sub">Comfort without splashing</span></div>
            <div class="sarah-option" onclick="_sPickBudget(this,'luxury')"><span class="sarah-option-icon">✨</span><span class="sarah-option-label">Luxury</span><span class="sarah-option-sub">Treat ourselves</span></div>
          </div>
          <div class="sarah-quiz-nav"><button class="sarah-btn-back" onclick="_sarahStep(1)">← Back</button><button class="sarah-btn-next" id="sarah-next-2" onclick="_sarahStep(3)"><strong>Next</strong> →</button></div>
        </div>

        <!-- Step 3: Duration + Date picker -->
        <div id="sarah-step-3" style="display:none">
          <p class="sarah-step-label">Step 4 of 5</p>
          <h2 class="sarah-step-title">How many <em>days?</em></h2>
          <p class="sarah-step-instruct">Pick your duration and tap <strong>Next</strong></p>
          <div class="sarah-options-grid g3">
            <div class="sarah-option" onclick="_sPickDays(this,3)"><span class="sarah-option-icon">🗓️</span><span class="sarah-option-label">3 Days</span><span class="sarah-option-sub">Weekend break</span></div>
            <div class="sarah-option" onclick="_sPickDays(this,5)"><span class="sarah-option-icon">🗓️</span><span class="sarah-option-label">5 Days</span><span class="sarah-option-sub">Short getaway</span></div>
            <div class="sarah-option" onclick="_sPickDays(this,7)"><span class="sarah-option-icon">🗓️</span><span class="sarah-option-label">7 Days</span><span class="sarah-option-sub">Full week</span></div>
            <div class="sarah-option" onclick="_sPickDays(this,10)"><span class="sarah-option-icon">🗓️</span><span class="sarah-option-label">10 Days</span><span class="sarah-option-sub">Deep dive</span></div>
          </div>
          <div id="sarah-date-picker-wrap" style="display:none;margin-top:20px;">
            <p style="font-size:0.82rem;color:#9a9088;margin-bottom:8px;">📅 Select your start date to check local events &amp; fiestas</p>
            <input type="date" class="sarah-date-picker" id="sarah-date-input" onchange="_sPickDates(this)">
          </div>
          <div class="sarah-quiz-nav"><button class="sarah-btn-back" onclick="_sarahStep(2)">← Back</button><button class="sarah-btn-next" id="sarah-next-3" onclick="_sarahStep(4)"><strong>Next</strong> →</button></div>
        </div>

        <!-- Step 4: City -->
        <div id="sarah-step-4" style="display:none">
          <p class="sarah-step-label">Step 5 of 5</p>
          <h2 class="sarah-step-title">Pick your <em>city</em></h2>
          <p style="font-size:0.82rem;color:#9a9088;margin-bottom:16px;">Got one in mind? Go for it. If it doesn't match your vibe, I'll tell you honestly.</p>
          <div class="sarah-city-grid" id="sarah-city-grid"></div>
          <div class="sarah-redirect-notice" id="sarah-redirect-notice"></div>
          <div class="sarah-quiz-nav"><button class="sarah-btn-back" onclick="_sarahStep(3)">← Back</button><button class="sarah-btn-next" id="sarah-next-4" onclick="_sarahShowResults()">Show Me →</button></div>
        </div>
      </div>
    </div>

    <!-- ③ RESULTS -->
    <div class="sarah-screen" id="sarah-results-screen">
      <div class="sarah-results-inner">

        <!-- Sarah greeting -->
        <div class="sarah-greeting-row" id="sarah-greeting-row">
	<div class="sarah-greeting-avatar" style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="/sarah/sarah-avatar.png" style="width:100%;height:100%;object-fit:cover;"></div>
          <div class="sarah-greeting-bubble" id="sarah-greeting-bubble">
            <div class="s-typing"><span></span><span></span><span></span></div>
          </div>
        </div>

        <!-- Content fades in after greeting -->
        <div id="sarah-results-content" style="opacity:0;transition:opacity 0.5s ease 0.7s;">

          <!-- City header -->
          <div class="sarah-city-header" id="sarah-city-header">
            <div class="sarah-city-title" id="sarah-city-title"></div>
            <div class="sarah-city-tags" id="sarah-city-tags"></div>
            <div class="sarah-tagline" id="sarah-city-tagline"></div>
            <div class="sarah-city-scene" id="sarah-city-scene"></div>
          </div>

          <!-- Sticky results nav -->
          <div class="sarah-results-nav" id="sarah-results-nav">
            <button class="sarah-nav-item s-active" data-target="sarah-itin-section">🗺️ Itinerary</button>
            <button class="sarah-nav-item" data-target="sarah-hotels-grid">🏨 Hotels</button>
            <button class="sarah-nav-item" data-target="sarah-knows-wrap">💡 Tips</button>
            <button class="sarah-nav-item" data-target="sarah-checklist-section">🧳 Checklist</button>
            <button class="sarah-nav-item" data-target="sarah-chat-input">💬 Chat</button>
          </div>

          <!-- Currency toggle -->
          <div class="sarah-currency-bar" id="sarah-currency-bar" style="display:none;">
            <span class="sarah-currency-label">💰 Show prices in</span>
            <div class="sarah-currency-options" id="sarah-currency-options">
              <button class="sarah-currency-btn s-active" data-cur="EUR" onclick="_sarahPickCurrency('EUR')">€ EUR</button>
              <button class="sarah-currency-btn" data-cur="GBP" onclick="_sarahPickCurrency('GBP')">£ GBP</button>
              <button class="sarah-currency-btn" data-cur="USD" onclick="_sarahPickCurrency('USD')">$ USD</button>
            </div>
          </div>

          <!-- Trip summary card -->
          <div class="sarah-summary-card" id="sarah-summary-card" style="display:none;"></div>

          <!-- Itinerary (front and centre) -->
          <div class="sarah-section-label" id="sarah-itin-section">🗺️ Your trip to <span id="sarah-itin-city-name"></span></div>
          <div class="sarah-day-tabs" id="sarah-day-tabs" style="display:none;"></div>
          <p class="sarah-itin-intro" id="sarah-itin-intro"></p>
          <div class="sarah-timeline" id="sarah-timeline-free" style="margin-bottom:28px;"></div>

          <!-- Sarah knows (after itinerary, before hotels) -->
          <div class="sarah-knows-wrap" id="sarah-knows-wrap" style="display:none;">
            <div class="sarah-knows-header" onclick="this.parentElement.classList.toggle('sarah-knows-open')">
              🧠 Sarah knows <span class="sarah-knows-toggle">▶</span>
            </div>
            <div class="sarah-knows-body" id="sarah-knows-body"></div>
            <div class="sarah-disclaimer">⚠️ All prices are approximate and seasonal. Sarah uses AI to generate personalised recommendations — while she's done her best, double-check opening times, prices, and availability before you go. Things change, and AI can sometimes get things wrong. Restaurant picks are Sarah's personal suggestions — your taste may differ.</div>
          </div>

          <!-- Hotels -->
          <div class="sarah-section-label">🏨 Hotels picked for you</div>
          <div id="sarah-hotels-grid" style="margin-bottom:24px;"></div>

          <!-- Don't do -->
          <div class="sarah-donts" id="sarah-donts-block" style="margin-bottom:28px;"></div>

          <!-- PAYWALL (shown in premium mode) -->
          <div id="sarah-paywall-block" style="display:none;">
            <div class="sarah-ghost-stops">
              <div class="sarah-ghost"><div class="sarah-ghost-dot"></div><div class="sarah-ghost-line full"></div></div>
              <div class="sarah-ghost"><div class="sarah-ghost-dot"></div><div class="sarah-ghost-line half"></div></div>
              <div class="sarah-ghost"><div class="sarah-ghost-dot"></div><div class="sarah-ghost-line full"></div></div>
            </div>
            <div class="sarah-paywall">
              <div class="sarah-paywall-avatar"><img src="/sarah/sarah-avatar.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div>
              <h3>The afternoon is where it <em>really opens up...</em></h3>
              <p class="sarah-paywall-sub">Unlock the full day — afternoon, evening, where to eat, transport tips, fiestas, a saveable itinerary and unlimited chats.</p>
              <div class="sarah-paywall-feats">
                <div class="sarah-paywall-feat"><span class="sarah-paywall-feat-icon">🗺️</span>Full day itinerary</div>
                <div class="sarah-paywall-feat"><span class="sarah-paywall-feat-icon">🍽️</span>Full restaurant guide</div>
                <div class="sarah-paywall-feat"><span class="sarah-paywall-feat-icon">🎭</span>All activities</div>
                <div class="sarah-paywall-feat"><span class="sarah-paywall-feat-icon">🎉</span>Fiestas & events</div>
                <div class="sarah-paywall-feat"><span class="sarah-paywall-feat-icon">🚌</span>Transport tips</div>
                <div class="sarah-paywall-feat"><span class="sarah-paywall-feat-icon">💬</span>Unlimited Sarah chat</div>
              </div>
              <div class="sarah-price">
                <div class="sarah-price-amount"><sup>£</sup>2.99</div>
                <div class="sarah-price-label">One-off · Yours forever · This city</div>
              </div>
              <button class="sarah-btn-unlock" onclick="_sarahHandleUnlock()">Unlock Full Guide — £2.99</button>
              <div class="sarah-code-divider"><span>Already have a code?</span></div>
              <div class="sarah-code-row">
                <input class="sarah-code-input" id="sarah-code-input" placeholder="Enter your code" maxlength="12" oninput="this.value=this.value.toUpperCase()">
                <button class="sarah-btn-apply" onclick="_sarahApplyCode()">Apply</button>
              </div>
              <div class="sarah-code-feedback" id="sarah-code-feedback"></div>
            </div>
          </div>

          <!-- UNLOCKED CONTENT (always shown when not premium, shown after unlock when premium) -->
          <div id="sarah-unlocked-content" style="display:none;">
            <div class="sarah-unlocked-badge">✓ Full guide unlocked · Thanks for using Sarah <img src="/sarah/sarah-avatar.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div>
            <div class="sarah-section-label">🌆 Afternoon & Evening</div>
            <div class="sarah-timeline" id="sarah-timeline-unlocked"></div>

            <div class="sarah-divider"></div>
            <div class="sarah-section-label">🍽️ Where to eat</div>
            <div id="sarah-restaurants-grid" style="margin-bottom:24px;"></div>

            <div class="sarah-section-label">🎭 Things to do</div>
            <div id="sarah-activities-grid" style="margin-bottom:24px;"></div>

            <div class="sarah-section-label">🚌 Getting around</div>
            <div class="sarah-info-block" id="sarah-transport-block"></div>

            <div class="sarah-section-label">🎉 Fiestas & events</div>
            <div class="sarah-info-block" id="sarah-fiestas-block"></div>

            <div class="sarah-divider"></div>

            <!-- Packing checklist -->
            <div class="sarah-section-label" id="sarah-checklist-section">🧳 Packing checklist</div>
            <div class="sarah-checklist-tabs">
              <button class="sarah-tab s-active" onclick="_sTab(this,'essentials')">Essentials</button>
              <button class="sarah-tab" onclick="_sTab(this,'clothing')">Clothing</button>
              <button class="sarah-tab" onclick="_sTab(this,'documents')">Documents</button>
              <button class="sarah-tab" onclick="_sTab(this,'tips')">Sarah's Tips</button>
            </div>
            <div id="sarah-checklist-essentials" class="sarah-checklist-content s-active"></div>
            <div id="sarah-checklist-clothing" class="sarah-checklist-content"></div>
            <div id="sarah-checklist-documents" class="sarah-checklist-content"></div>
            <div id="sarah-checklist-tips" class="sarah-checklist-content"></div>

            <div class="sarah-divider"></div>

            <!-- Expense tracker -->
            <div class="sarah-section-label">💰 Trip expenses</div>
            <p class="sarah-expenses-sub">Track what you're spending — add items as you go</p>
            <div class="sarah-expense-form">
              <select class="sarah-expense-select" id="sarah-expense-cat">
                <option value="food">🍽️ Food</option>
                <option value="transport">🚌 Transport</option>
                <option value="accommodation">🏨 Accommodation</option>
                <option value="activities">🎭 Activities</option>
                <option value="shopping">🛍️ Shopping</option>
                <option value="other">📦 Other</option>
              </select>
              <input class="sarah-expense-input" id="sarah-expense-amount" type="number" placeholder="Amount €" min="0" step="1">
              <input class="sarah-expense-input" id="sarah-expense-desc" type="text" placeholder="What for?" maxlength="60">
              <button class="sarah-expense-add" onclick="_sarahAddExpense(document.getElementById('sarah-expense-cat').value,document.getElementById('sarah-expense-amount').value,document.getElementById('sarah-expense-desc').value)">+ Add</button>
            </div>
            <div id="sarah-expenses-list"></div>
          </div>

          <!-- Chat with Sarah -->
          <div class="sarah-chat-wrap" id="sarah-chat-wrap">
            <div class="sarah-chat-header"><div class="sarah-chat-header-avatar"><img src="/sarah/sarah-avatar.png" class="sarah-chat-avatar-img"></div>
              <div>
                <div class="sarah-chat-header-name">Chat with Sarah</div>
                <div class="sarah-chat-header-status">${c.name} expert · replies instantly</div>
              </div>
            </div>
            <div class="sarah-suggested-qs" id="sarah-suggested-qs"></div>
            <div class="sarah-chat-msgs" id="sarah-chat-msgs"></div>
            <p class="sarah-chat-limit" id="sarah-chat-limit"></p>
            <div class="sarah-chat-input-row">
              <input class="sarah-chat-input" id="sarah-chat-input" placeholder="Ask Sarah anything about this city..." onkeydown="if(event.key==='Enter')_sarahSendChat()">
              <button class="sarah-chat-send" onclick="_sarahSendChat()">→</button>
            </div>
          </div>

        </div><!-- /results-content -->
      </div>

      <!-- Global disclaimer (always visible) -->
      <div class="sarah-disclaimer">⚠️ Sarah uses AI to create your personalised plan. She's done her best, but always double-check opening times, prices and availability before you go — things change and AI can sometimes get things wrong. Restaurant picks are suggestions, not guarantees. Your holiday, your call.</div>

      <!-- Sticky save bar -->
      <div class="sarah-save-bar" id="sarah-save-bar" style="display:none;">
        <button class="sarah-btn-save" id="sarah-save-btn" onclick="_sarahSaveTrip()">💾 Save this itinerary</button>
        <button class="sarah-btn-restart" onclick="_sarahGoQuiz()">Start over</button>
      </div>
    </div>

    <!-- ④ SAVED TRIPS -->
    <div class="sarah-screen" id="sarah-saved-screen">
      <div class="sarah-saved-wrap">
        <button class="sarah-btn-back" onclick="_showScreen('sarah-results-screen')" style="margin-bottom:16px;">← Back to results</button>
        <div class="sarah-section-label" style="margin-bottom:20px;">💾 Your saved itineraries</div>
        <div id="sarah-saved-list"></div>
      </div>
    </div>

  </div><!-- /screens -->
  `;
}

// ── EVENTS & NAVIGATION ─────────────────────────────────────
function _attachEvents() {
  // Swipe down to close
  let touchY = 0;
  const overlay = document.getElementById('sarah-overlay');
  overlay.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  overlay.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientY - touchY;
    if (diff > 80 && document.querySelector('.sarah-screen.sarah-active')?.id === 'sarah-welcome-screen') {
      SarahAdvisor.close();
    }
  }, { passive: true });
}

function _showScreen(id) {
  document.querySelectorAll('#sarah-overlay .sarah-screen').forEach(s => s.classList.remove('sarah-active'));
  document.getElementById(id).classList.add('sarah-active');
  document.getElementById(id).scrollTop = 0;
}

function _sarahGoQuiz() {
  _resetState();
  _showScreen('sarah-quiz-screen');

  // Hide city picker step and its progress dot if city is prefilled
  const step4 = document.getElementById('sarah-step-4');
  const dot4 = document.getElementById('spd4');
  if (_s.cityPrefilled) {
    if (step4) step4.style.display = 'none';
    if (dot4) dot4.style.display = 'none';
  } else {
    if (step4) step4.style.display = '';
    if (dot4) dot4.style.display = '';
  }

  _sarahStep(0);
}

function _sarahShowSaved() {
  _loadSavedTrips();
  _showScreen('sarah-saved-screen');
}

function _sarahGoChecklist() {
  _sarahToggleChecklist();
}

function _sarahToggleChecklist() {
  const panel = document.getElementById('sarah-checklist-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('sarah-checklist-open');
  if (isOpen) {
    panel.classList.remove('sarah-checklist-open');
  } else {
    // Update city title every time panel opens
    document.getElementById('sarah-checklist-panel-title').textContent = _s.city ? `${_s.city} checklist` : 'Packing checklist';
    // Build checklist content if not already built
    _sarahBuildChecklistPanel();
    panel.classList.add('sarah-checklist-open');
  }
}

let _sarahChecklistBuilt = false;
function _sarahBuildChecklistPanel() {
  if (_sarahChecklistBuilt) return;
  const cd = _s.cityData;
  const cl = (cd && cd.checklist) ? cd.checklist : _sarahDefaultChecklist();
  if (!cl) return;

  // Set city-specific title
  document.getElementById('sarah-checklist-panel-title').textContent = _s.city ? `${_s.city} checklist` : 'Packing checklist';

  const cats = [
    { id: 'essentials', label: 'Essentials' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'documents', label: 'Documents' },
    { id: 'tips', label: "Sarah's Tips" },
  ];

  // Build tabs
  const tabsEl = document.getElementById('sarah-checklist-panel-tabs');
  tabsEl.innerHTML = cats.map((c, i) =>
    `<button class="sarah-tab${i === 0 ? ' s-active' : ''}" onclick="_sarahPanelTab(this,'${c.id}')">${c.label}</button>`
  ).join('');

  // Build bodies
  const bodyEl = document.getElementById('sarah-checklist-panel-body');
  bodyEl.innerHTML = cats.map((c, i) => {
    const items = cl[c.id] || [];
    return `<div class="sarah-checklist-content${i === 0 ? ' s-active' : ''}" id="sarah-panel-checklist-${c.id}">
      ${items.map((item, j) => {
        const key = `${_s.city}-${c.id}-${j}`;
        const checked = _s.checklistState[key] || false;
        return `<div class="sarah-check-item${checked ? ' s-checked' : ''}" onclick="_sToggleCheck(this,'${key}')">
          <div class="sarah-check-box">${checked ? '✓' : ''}</div>
          <span class="sarah-check-text">${item}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
  _sarahChecklistBuilt = true;
}

function _sarahDefaultChecklist() {
  return {
    essentials: [
      '📱 Phone & charger',
      '🔌 Universal travel adapter',
      '🎧 Headphones',
      '💊 Travel first-aid kit',
      '🧴 Sunscreen & toiletries',
    ],
    clothing: [
      '👕 Light layers for warm days',
      '🧥 Light jacket for cooler evenings',
      '👟 Comfortable walking shoes',
      '🩱 Swimwear',
      '🧢 Sun hat & sunglasses',
    ],
    documents: [
      '🛂 Passport (check expiry!)',
      '✈️ Flight & hotel confirmations',
      '💳 Travel card & some cash',
      '📱 Downloaded offline maps',
      '🏥 Travel insurance details',
    ],
    tips: [
      'Tap items above to check them off',
      'Your checks save automatically',
      'Come back any time to review',
    ],
  };
}

function _sarahPanelTab(btn, cat) {
  document.querySelectorAll('#sarah-checklist-panel .sarah-tab').forEach(t => t.classList.remove('s-active'));
  document.querySelectorAll('#sarah-checklist-panel .sarah-checklist-content').forEach(c => c.classList.remove('s-active'));
  btn.classList.add('s-active');
  document.getElementById('sarah-panel-checklist-' + cat).classList.add('s-active');
}

function _sarahClearChecklist() {
  if (!_s.city) return;
  const prefix = _s.city + '-';
  for (const key of Object.keys(_s.checklistState)) {
    if (key.startsWith(prefix)) delete _s.checklistState[key];
  }
  _saveChecklistState();
  _sarahChecklistBuilt = false;
  _sarahBuildChecklistPanel();
}

function _sarahStep(n) {
  // If city is prefilled and we reach step 4 (city picker), skip to results
  if (_s.cityPrefilled && n === 4) {
    _sarahShowResults();
    return;
  }

  [0,1,2,3,4].forEach(i => {
    const el = document.getElementById(`sarah-step-${i}`);
    if (el) {
      el.style.display = 'none';
      // Show step 4 only if not prefilled
      if (i === 4 && _s.cityPrefilled) el.style.display = 'none';
    }
  });
  document.getElementById(`sarah-step-${n}`).style.display = 'block';
  _s.step = n;
  _updateProgress(n);
  document.getElementById('sarah-quiz-screen').scrollTop = 0;

  // Update step labels
  const totalSteps = _s.cityPrefilled ? 4 : 5;
  const labels = document.querySelectorAll('.sarah-step-label');
  labels.forEach(el => {
    if (el) el.textContent = `Step ${n + 1} of ${totalSteps}`;
  });
}

function _updateProgress(n) {
  [0,1,2,3,4].forEach(i => {
    const d = document.getElementById(`spd${i}`);
    if (d) { d.classList.remove('s-active','s-done');
    if (i < n) d.classList.add('s-done');
    if (i === n) d.classList.add('s-active'); }
  });
}

// ── QUIZ SELECTIONS ─────────────────────────────────────────
function _sPickGroup(el, val) {
  _pickOption(el, 'sarah-step-0', 'sarah-next-0');
  _s.group = val;
}
function _sPickVibe(el, val) {
  _pickOption(el, 'sarah-step-1', 'sarah-next-1');
  _s.vibe = val;
  if (_s.city) _checkRedirect(_s.city);
}
function _sPickBudget(el, val) {
  _pickOption(el, 'sarah-step-2', 'sarah-next-2');
  _s.budget = val;
}
function _sPickDays(el, val) {
  _pickOption(el, 'sarah-step-3', 'sarah-next-3');
  _s.days = val;
  _s.currentDay = 1;
  _s.dynamicItinerary = null;
  document.getElementById('sarah-date-picker-wrap').style.display = 'block';
}

function _sPickDates(el) {
  const val = el.value;
  if (!val) return;
  _s.tripStartDate = val;
  _s.dynamicItinerary = null;
  const sd = new Date(val + 'T00:00:00');
  const ed = new Date(sd);
  ed.setDate(ed.getDate() + (_s.days || 3) - 1);
  _s.tripEndDate = ed.toISOString().split('T')[0];
}

function _pickOption(el, stepId, nextId) {
  document.getElementById(stepId).querySelectorAll('.sarah-option').forEach(o => o.classList.remove('s-selected'));
  el.classList.add('s-selected');
  document.getElementById(nextId).classList.add('sarah-ready');
}

function _buildCityGrid() {
  const grid = document.getElementById('sarah-city-grid');
  if (!grid || !window.SARAH_CITIES) return;
  grid.innerHTML = '';

  const cg = [
    ['#e74c3c','#c0392b'], ['#2c3e50','#1a252f'], ['#e67e22','#d35400'],
    ['#1abc9c','#16a085'], ['#f39c12','#e67e22'], ['#8e44ad','#6c3483'],
    ['#27ae60','#1e8449'], ['#2980b9','#2471a3'], ['#7f8c8d','#5d6d7e'],
    ['#c0392b','#922b21'], ['#f1c40f','#d4ac0d'], ['#16a085','#0e6655'],
  ];

  window.SARAH_CITIES.forEach((city, i) => {
    const cols = cg[i % cg.length];
    const card = document.createElement('div');
    card.className = 'sarah-city-card';
    card.style.background = `linear-gradient(145deg, ${cols[0]}, ${cols[1]})`;
    const tag = city.taglines && city.taglines[_s.vibe || 'mix'] || city.taglines && city.taglines.mix || '';
    card.innerHTML = `<span class="sarah-city-card-emoji">${city.emoji}</span><span class="sarah-city-card-name">${city.name}</span><span class="sarah-city-card-tag">${tag}</span>`;
    card.onclick = () => {
      grid.querySelectorAll('.sarah-city-card').forEach(c => c.classList.remove('s-selected'));
      card.classList.add('s-selected');
      _s.city = city.name;
      _s.cityData = city;
      _s.dynamicItinerary = null;
      document.getElementById('sarah-next-4').classList.add('sarah-ready');
      _checkRedirect(city.name);
    };
    grid.appendChild(card);
  });
}

function _checkRedirect(cityName) {
  const notice = document.getElementById('sarah-redirect-notice');
  const rules = window.SARAH_REDIRECTS || {};
  const rule = rules[cityName];
  if (rule && _s.vibe && rule.vibes.includes(_s.vibe)) {
    const g = _groupLabel(_s.group);
    notice.style.display = 'block';
    notice.innerHTML = `<strong>💬 A note from Sarah:</strong><br><br>${rule.msg(_s.vibe, g)}`;
  } else {
    notice.style.display = 'none';
  }
}

// ── SHOW RESULTS ─────────────────────────────────────────────
function _sarahShowResults() {
  if (!_s.city || !_s.cityData) return;
  _s.currentDay = 1;

  // Repeat visit? Skip the long loading show
  const isRepeat = _s.hasRunOnce;
  _s.hasRunOnce = true;

  if (isRepeat) {
    _showScreen('sarah-results-screen');
    document.getElementById('sarah-greeting-bubble').innerHTML = _buildGreeting();
    document.getElementById('sarah-greeting-row').classList.add('s-show');
    document.getElementById('sarah-results-content').style.opacity = '1';
    _buildResults();
    document.getElementById('sarah-save-bar').style.display = 'flex';
    return;
  }

  _showScreen('sarah-loading-screen');
  _startLoadingBar();

  // Reset results UI
  const greetRow = document.getElementById('sarah-greeting-row');
  const content = document.getElementById('sarah-results-content');
  greetRow.classList.remove('s-show');
  content.style.opacity = '0';
  document.getElementById('sarah-save-bar').style.display = 'none';

  setTimeout(() => {
    _showScreen('sarah-results-screen');
    greetRow.classList.add('s-show');
    setTimeout(() => {
      document.getElementById('sarah-greeting-bubble').innerHTML = _buildGreeting();
      setTimeout(() => {
        content.style.opacity = '1';
        _buildResults();
        document.getElementById('sarah-save-bar').style.display = 'flex';
      }, 300);
    }, 1100);
  }, 1800);

  // Fetch exchange rates in background
  _sarahEnsureRates().then(rates => {
    const bar = document.getElementById('sarah-currency-bar');
    if (bar && rates) { bar.style.display = 'flex'; _sarahUpdateCurrencyUI(); }
  });
}

function _sarahInitCurrencyBar() {
  const rates = _sarahGetRates();
  const bar = document.getElementById('sarah-currency-bar');
  if (bar && rates) { bar.style.display = 'flex'; _sarahUpdateCurrencyUI(); }
}

function _sarahUpdateCurrencyUI() {
  const pref = _sarahPrefCurrency();
  document.querySelectorAll('#sarah-currency-bar .sarah-currency-btn').forEach(b => {
    b.classList.toggle('s-active', b.dataset.cur === pref);
  });
  // Re-render timeline to show converted prices
  _renderTimeline();
}

function _sarahPickCurrency(cur) {
  _sarahSetCurrency(cur);
  _sarahUpdateCurrencyUI();
}

function _buildGreeting() {
  const city = _s.city;
  const v = _s.vibe;
  const cd = _s.cityData;
  const tag = cd.taglines[v] || cd.taglines.mix;
  const emoji = cd.emoji || '📍';
  const sensoryPics = {
    rome: "ancient echoes, sunset glow over the Tiber, gelato in hand",
    florence: "Renaissance light, cypress-dotted hills, the scent of leather and espresso",
    venice: "lapping canals, the call of gondoliers, mist rising from the lagoon",
    milan: "fashion hums in the air, design at every turn, cocktails in the Brera",
    naples: "chaos that sings, pizza in the air, Vesuvius watching the madness",
    amalfi: "turquoise below, lemons above, the warmest sea you've ever felt",
    "cinque terre": "salt-washed trails, pastel villages clinging to cliffs, sunset over the Ligurian",
    bologna: "porticos stretching forever, ragù simmering, the city of red and learning",
    turin: "elegant arcades, chocolate in the air, alpine light on baroque squares",
    como: "deep blue stillness, mountains cradling the lake, villas that whisper of another era",
  };
  const pic = sensoryPics[city.toLowerCase()] || "warm sun, good food, that holiday feeling you've been craving";
  const msgs = {
    solo:   `Close your eyes for a second. <strong>${city}</strong>. ${pic}..<br><br>You on your own, doing exactly what <em>you</em> want. That coffee at 10. That detour down a random street. That feeling of being somewhere new and completely free.<br><br>${tag} I've pulled together everything you need — the spots you'll love, the tourist traps to skip, and a few secrets most people never find.`,
    couple: `Picture it. You and them, <strong>${city}</strong>. ${pic}.<br><br>Long lunches that turn into late afternoons. A sunset you'll both photograph. That little restaurant neither of you will forget.<br><br>${tag} I've found the places that <em>feel</em> like a holiday should — romantic without trying, memorable without forcing it. All matched to your budget.`,
    girls:  `OK so I'm already jealous. <strong>${city}</strong> with your girls. ${pic}.<br><br>I can see it — the coffee-run selfies, the collective gasp when you walk into your hotel, the one dinner where you stay three hours because nobody wants to leave.<br><br>${tag} I've picked the best bits: where to eat, where to pose, what to book ahead, and what to skip so you don't waste a second.`,
    lads:   `Right then. <strong>${city}</strong> with the lads. ${pic}.<br><br>Cold beers in the sun, the banter, the one night that becomes <em>that</em> story. I get it. You want good vibes and no faff.<br><br>${tag} Hotels that work, bars that deliver, the stuff that's worth your time and the stuff that absolutely isn't. Sorted.`,
    family: `Now <em>this</em> is a trip. <strong>${city}</strong> with the family. ${pic}.<br><br>I know what you're thinking — will the kids be bored? Will everyone actually enjoy it? Where do we even start?<br><br>${tag} I've chosen everything with family in mind: hotels with space, activities that work for all ages, restaurants that won't judge the mess, and a pace that doesn't exhaust everyone by day two.`,
    group:  `<strong>${city}</strong> as a group. Big energy. ${pic}.<br><br>Getting everyone to agree on a restaurant is hard enough — planning a whole trip? That's where I come in.<br><br>${tag} I've done the legwork: accommodation that fits everyone, group-friendly spots, and the honest truth about what works when you're a crowd.`,
  };
  return msgs[_s.group] || msgs.group;
}

function _buildTripSummary() {
  const cd = _s.cityData;
  const card = document.getElementById('sarah-summary-card');
  if (!card) return;
  const days = _s.days;
  const groupLabels = { solo:'Solo', couple:'Couple', girls:'Girls Trip', lads:'Lads Trip', family:'Family', group:'Group' };
  const vibeLabels = { beach:'Beach', party:'Party', culture:'Culture', food:'Foodie', relax:'Relax', mix:'Mix' };
  const budgetIcons = { low:'€€', mid:'€€€', high:'€€€€', luxury:'€€€€€' };
  const groupLabel = groupLabels[_s.group] || 'Trip';
  const vibeLabel = vibeLabels[_s.vibe] || cd.taglines[_s.vibe] || 'Curated';
  const budgetIcon = budgetIcons[_s.budget] || '€€€';

  // Pull highlights from itinerary
  let topPick = '', mustBook = '', bestEat = '';
  const itin = _s.itinerary || _s.dynamicItinerary || [];
  const allStops = itin.flatMap(d => d.stops || []);
  if (allStops.length) {
    // Top pick: first non-food/drink activity
    const acts = allStops.filter(s => s.emoji && !['🍽️','🍷','🥘','🍹','☕','🌯'].includes(s.emoji));
    if (acts.length) topPick = acts[0].title;
    // Must book: first bookAhead item
    const booked = allStops.filter(s => s.bookAhead);
    if (booked.length) mustBook = booked[0].title;
    // Best eat: first restaurant
    const eats = allStops.filter(s => ['🍽️','🍷','🥘','🍹'].includes(s.emoji));
    if (eats.length) bestEat = eats[0].title;
  }

  card.innerHTML =
    `<div class="s-summary-top">
      <span class="s-summary-emoji">${cd.emoji||'📍'}</span>
      <span class="s-summary-title">${cd.name}</span>
      <span class="s-summary-meta">${days} days · ${groupLabel}</span>
    </div>
    <div class="s-summary-tags">
      <span class="sarah-summary-tag">${vibeLabel}</span>
      <span class="sarah-summary-tag">${budgetIcon}</span>
    </div>
    <div class="s-summary-highlights">
      ${topPick ? `<div class="s-summary-hl"><span class="s-hl-icon">🔥</span> <span class="s-hl-label">Top pick:</span> ${topPick}</div>` : ''}
      ${mustBook ? `<div class="s-summary-hl"><span class="s-hl-icon">⚠️</span> <span class="s-hl-label">Must book:</span> ${mustBook}</div>` : ''}
      ${bestEat ? `<div class="s-summary-hl"><span class="s-hl-icon">🍽️</span> <span class="s-hl-label">Best eat:</span> ${bestEat}</div>` : ''}
    </div>
    <div class="s-summary-weather" id="s-summary-weather">
      <span id="s-weather-spinner" class="s-weather-spinner">☀️</span>
      <span id="s-weather-text">Checking weather...</span>
    </div>`;
  card.style.display = '';

  // Fetch live weather
  _fetchWeather(cd.name);
}

function _fetchWeather(city) {
  const weatherRow = document.getElementById('s-summary-weather');
  const spinner = document.getElementById('s-weather-spinner');
  const text = document.getElementById('s-weather-text');
  if (!text || !weatherRow) return;
  fetch(`/sarah-weather?city=${encodeURIComponent(city)}`)
    .then(r => r.json())
    .then(w => {
      if (w && w.temp != null) {
        const isNight = w.icon && w.icon.includes('n');
        const timeLabel = isNight ? 'this evening' : 'now';
        spinner.textContent = '';
        spinner.innerHTML = w.icon ? `<img src="https://openweathermap.org/img/wn/${w.icon}@2x.png" style="width:28px;height:28px;vertical-align:middle;">` : '🌤️';
        text.textContent = `${w.temp}°C · ${w.description} ${timeLabel}`;
        weatherRow.style.display = '';
      } else {
        weatherRow.style.display = 'none';
      }
    })
    .catch(() => {
      weatherRow.style.display = 'none';
    });
}

function _buildResults() {
  const cd = _s.cityData;
  const tier = _s.budget || 'mid';

  // City header
  document.getElementById('sarah-city-title').textContent = cd.name;
  document.getElementById('sarah-itin-city-name').textContent = cd.name;
  const groupLabels = { solo:'Solo Trip', couple:'Couple\'s Break', girls:'Girls Trip', lads:'Lads Trip', family:'Family Holiday', group:'Group Trip' };
  document.getElementById('sarah-city-tags').innerHTML =
    `<span class="sarah-tag">${groupLabels[_s.group]||'Group Trip'}</span>` +
    `<span class="sarah-tag sage">${tier.charAt(0).toUpperCase()+tier.slice(1)} Budget</span>`;
  document.getElementById('sarah-city-tagline').textContent = `"${cd.taglines[_s.vibe]||cd.taglines.mix}"`;

  // Sensory city scene
  const scenes = {
    rome: "Golden light on ancient stone. The hiss of an espresso machine. A city that wears its history like skin.",
    florence: "The Duomo rising above terracotta roofs. Renaissance at every turn. A cypress-lined dream.",
    venice: "The lapping of canal water. A gondolier's call echoing between palazzos. Mist over the lagoon at dawn.",
    milan: "Design and commerce in equal measure. Aperitivo hour in Brera. The Duomo's spires touching the sky.",
    naples: "Organised chaos. The best pizza you'll ever eat. Vesuvius on the horizon, watching over it all.",
    amalfi: "Turquoise water meeting colourful cliffside villages. Lemon groves scenting the air. The sweet life by the sea.",
    "cinque terre": "Pastel colours stacked against rugged cliffs. Salt on your skin. Trails that take your breath away.",
    bologna: "Red porticos as far as the eye can see. The smell of ragù. A city that lives for food and learning.",
    turin: "Elegant arcades sheltering grand cafes. The Alps visible from every wide boulevard. Chocolate in the air.",
    como: "The deep blue stillness of the lake. Mountains wrapped around it like a protective hug. Villas straight from a film set.",
  };
  const scene = scenes[cd.name.toLowerCase()] || `${cd.emoji} ${cd.name} — you're going to love it here.`;
  document.getElementById('sarah-city-scene').textContent = scene;

  // Trip summary card
  _buildTripSummary();

  // Hotels (3 matching budget)
  const hotels = (cd.hotels[tier] || cd.hotels.mid).slice(0,3);
  document.getElementById('sarah-hotels-grid').innerHTML = hotels.map(h => `
    <div class="sarah-hotel-card">
      <div><div class="sarah-hotel-name">${h.name}</div><div class="sarah-hotel-desc">${h.desc}</div></div>
      <div class="sarah-hotel-price">${h.price}</div>
    </div>`).join('');

  // Don'ts
  document.getElementById('sarah-donts-block').innerHTML =
    `<div class="sarah-donts-title">⚠️ Sarah says: don't do this</div>` +
    cd.donts.map(d => `<div class="sarah-dont-item">${d}</div>`).join('');

  // Day tabs + timeline
  _buildDayTabs();
  _renderTimeline();

  // Paywall vs unlocked
  const pwDays = document.getElementById('sarah-paywall-days');
  if (pwDays) pwDays.textContent = _s.days;
  if (SARAH_PREMIUM_MODE && !_s.unlocked) {
    document.getElementById('sarah-paywall-block').style.display = 'block';
    document.getElementById('sarah-unlocked-content').style.display = 'none';
  } else {
    document.getElementById('sarah-paywall-block').style.display = 'none';
    _buildUnlockedContent();
  }

  // Chat
  _buildChat();

  // Currency bar
  _sarahInitCurrencyBar();

  // Sticky results nav
  _sSetupResultsNav();

  // Scroll-reveal animations
  const resultsScreen = document.getElementById('sarah-results-screen');
  if (resultsScreen) {
    setTimeout(() => _sarahSetupScrollReveal(resultsScreen), 300);
  }
}

function _sSetupResultsNav() {
  const nav = document.getElementById('sarah-results-nav');
  if (!nav) return;
  const items = nav.querySelectorAll('.sarah-nav-item');
  const container = document.getElementById('sarah-results-screen');

  // Click to scroll (offset for sticky nav height)
  items.forEach(btn => {
    btn.onclick = () => {
      const target = document.getElementById(btn.dataset.target);
      if (target && container) {
        const offset = nav.offsetHeight + 16;
        container.scrollTo({ top: Math.max(0, target.offsetTop - offset), behavior: 'smooth' });
        items.forEach(b => b.classList.remove('s-active'));
        btn.classList.add('s-active');
      }
    };
  });

  // Scroll-aware active state
  if (container) {
    let ticking = false;
    container.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          let current = items[0];
          const viewMid = container.scrollTop + container.clientHeight * 0.3;
          items.forEach(btn => {
            const el = document.getElementById(btn.dataset.target);
            if (el && el.offsetTop <= viewMid) current = btn;
          });
          items.forEach(b => b.classList.remove('s-active'));
          current.classList.add('s-active');
          ticking = false;
        });
        ticking = true;
      }
    });
  }
}

function _sBadgeColor(stop) {
  const t = (stop.title||'').toLowerCase();
  const e = stop.emoji||'';
  if (stop.bookAhead) return 'sarah-badge--amber';
  if (t.includes('lunch')||t.includes('dinner')||e==='🍽️'||e==='🍷'||e==='🥘'||e==='🍹') return 'sarah-badge--gold';
  if (t.includes('🎉')) return 'sarah-badge--plum';
  if (t.includes('beach')||e==='🏖️') return 'sarah-badge--teal';
  if (e==='🖼️'||e==='🎨'||e==='🏛️'||t.includes('museum')||t.includes('gallery')||t.includes('historic')) return 'sarah-badge--terracotta';
  if (e==='🌙'||e==='🍺'||t.includes('club')||t.includes('nightlife')||t.includes('bar')) return 'sarah-badge--plum';
  if (e==='🌳'||e==='😌'||t.includes('park')||t.includes('relax')||t.includes('garden')) return 'sarah-badge--sage';
  if (e==='🛍️'||t.includes('shopping')||t.includes('souvenir')) return 'sarah-badge--gold';
  if (e==='🏞️'||e==='👀'||t.includes('view')||t.includes('panorama')||t.includes('orientation')) return 'sarah-badge--blue';
  if (e==='🎢'||e==='🚴'||e==='⛵'||e==='🚡'||e==='🏄'||e==='🚌') return 'sarah-badge--amber';
  return null;
}

function _sBadgeLabel(stop) {
  const c = _sBadgeColor(stop);
  if (!c) return null;
  if (stop.bookAhead) return '⚠️ Book ahead';
  const t = (stop.title||'').toLowerCase();
  const e = stop.emoji||'';
  if (t.includes('lunch')||t.includes('dinner')||t.includes('🍽️')||e==='🍽️'||e==='🍷'||e==='🥘') return 'Eat';
  if (e==='🍹') return 'Drinks';
  if (t.includes('🎉')) return 'Event';
  if (e==='🏖️'||t.includes('beach')) return 'Beach';
  if (e==='🖼️'||e==='🎨'||e==='🏛️'||t.includes('museum')||t.includes('gallery')) return 'Culture';
  if (e==='🌙'||e==='🍺'||t.includes('club')||t.includes('nightlife')) return 'Nightlife';
  if (e==='🌳'||e==='😌'||t.includes('park')||t.includes('relax')) return 'Relax';
  if (e==='🛍️'||t.includes('shopping')) return 'Shop';
  if (e==='🏞️'||e==='👀'||t.includes('view')||t.includes('orientation')) return 'Explore';
  if (e==='🎢'||e==='🚴'||e==='⛵'||e==='🚡'||e==='🏄') return 'Adventure';
  if (e==='🚌') return 'Trip';
  return null;
}

function _buildStopEl(stop) {
  const el = document.createElement('div');
  el.className = 'sarah-stop';
  const badgeColor = _sBadgeColor(stop);
  const badgeLabel = _sBadgeLabel(stop);
  const badgeHtml = badgeColor && badgeLabel ? `<span class="sarah-stop-badge ${badgeColor}">${badgeLabel}</span>` : '';
  el.innerHTML = `
    <div class="sarah-stop-dot"></div>
    <div class="sarah-stop-time">${stop.time}</div>
    <div class="sarah-stop-content">
      <div class="sarah-stop-head">
        <span class="sarah-stop-emoji">${stop.emoji}</span>
        <h3 class="sarah-stop-title">${stop.title}</h3>
        ${badgeHtml}
      </div>
      <p class="sarah-stop-story">${stop.story}</p>
      ${stop.price ? `<span class="sarah-stop-price">${_sarahDisplayPrice(stop.price)}</span>` : ''}
      ${stop.bookLink ? `<a href="${stop.bookLink}" target="_blank" rel="noopener" class="sarah-stop-book" onclick="event.stopPropagation()">📍 Find on Maps</a>` : ''}
    </div>`;
  return el;
}

// ── MULTI-DAY ITINERARY ─────────────────────────────────────
function _generateDayStops(cd, dayNum, totalDays) {
  if (!cd || !cd.name) return { name: 'Exploration Day', stops: [{ time:'9:00am', emoji:'☕', title:'Start your day', story:'Explore the city at your own pace.' }] };
  const acts = cd.activities || [];
  const rests = cd.restaurants || [];
  const donts = cd.donts || [];

  const dayThemes = [
    'Local Life', 'Culture Deep Dive', 'Food & Wine Trail',
    'Neighbourhood Wander', 'Relax & Recharge', 'Adventure & Outdoors',
    'Markets & Shopping', 'Hidden Corners', 'Sunset & Social',
    'Off the Beaten Path', 'Slow Living', 'Coastal Escape',
  ];
  const theme = dayThemes[(dayNum - 2) % dayThemes.length];

  const actIdx = (dayNum - 2) % Math.max(acts.length, 1);
  const restIdx = ((dayNum - 2) * 5 + 3) % Math.max(rests.length, 1);
  const hasAct = acts.length > 0;
  const hasRest = rests.length > 0;

  const mStops = [];

  // Morning
  mStops.push({ time:'9:00am', emoji:'☕', title:`Morning in ${cd.name}`, story:`Start your day exploring ${cd.name} at your own pace. Grab a coffee, watch the city wake up, and ease into the rhythm of the day.` });

  // Late morning activity
  if (hasAct) {
    const act = acts[actIdx];
    mStops.push({ time:'11:00am', emoji:'🎯', title:act.name, story:act.desc });
  } else {
    mStops.push({ time:'11:00am', emoji:'🚶', title:'Late morning explore', story:`Wander the streets of ${cd.name} and discover what catches your eye.` });
  }

  // Lunch
  if (hasRest) {
    const rest = rests[restIdx];
    mStops.push({ time:'1:00pm', emoji:'🍽️', title:`Lunch at ${rest.name}`, story:`${rest.desc} ${rest.price}`, bookLink:rest.bookLink });
  } else {
    mStops.push({ time:'1:00pm', emoji:'🥗', title:'Lunch break', story:`Find somewhere that looks good and settle in. ${cd.name} does lunch properly.` });
  }

  // Afternoon
  const hasAct2 = hasAct && acts.length > 1;
  const act2Idx = (dayNum) % Math.max(acts.length, 1);
  if (hasAct2) {
    const act2 = acts[act2Idx];
    mStops.push({ time:'4:00pm', emoji:'🎨', title:act2.name, story:act2.desc });
  } else {
    mStops.push({ time:'4:00pm', emoji:'😎', title:'Afternoon slow-down', story:`The afternoon in ${cd.name} is made for doing nothing in particular. Find a spot, sit, watch.` });
  }

  // Evening
  if (dayNum % 3 === 0 && donts.length > 0) {
    const dont = donts[(dayNum - 2) % donts.length];
    mStops.push({ time:'8:00pm', emoji:'💡', title:`Sarah's tip: ${dont.replace(/Don't /i,'').substring(0,35)}...`, story:dont });
  } else {
    mStops.push({ time:'8:00pm', emoji:'🍷', title:'Evening out', story:`${cd.name} comes alive in the evening. Find a spot that feels right and settle in for the night.` });
  }

  return { name: theme, stops: mStops };
}

// ── SARAH'S FILLER SYSTEM ────────────────────────────────────
function _sarahPick(arr, seed) { return arr[Math.abs(seed || 1) % arr.length]; }

function _sarahFillStory(ctx) {
  const { dayType, dayNum, totalDays, vibe, city, stopTitle, tip, price, timeOfDay, isInland, isArrival, isDeparture, bookAhead } = ctx;
  let parts = [];

  // Day-type opener (first stop of the day)
  if (timeOfDay === 'morning-start') {
    if (isArrival) {
      parts.push(_sarahPick([
        `Welcome to ${city}! Bet you're tired — early flight, long morning.`,
        `You've made it to ${city}. Well done — travel days are knackering.`,
        `${city} — you're here! Drop your bags, take a breath.`,
      ], dayNum));
      parts.push(_sarahPick([
        `Hotels don't let you check in before 2pm, so you've got time for a late lunch and a gentle wander.`,
        `Can't get in your room until 2pm anyway — perfect excuse for a relaxed intro to the city.`,
        `Rooms aren't ready until 2pm, so let's ease in with food and a slow stroll.`,
      ], dayNum + 3));
    } else if (isDeparture) {
      parts.push(_sarahPick([
        `Last morning in ${city}. Checkout's midday — you've got a few hours.`,
        `Final morning. Out by 12pm, so let's make the most of it.`,
        `One last stretch in ${city} before you check out.`,
      ], dayNum));
      parts.push(_sarahPick([
        `Quick breakfast, a last wander, and you're on your way. Simple.`,
        `Squeeze in a coffee and a souvenir before you head off.`,
        `No rush — just a relaxed goodbye to ${city}.`,
      ], dayNum + 3));
    } else if (dayType === 'high-energy') {
      parts.push(_sarahPick([
        `Right — day ${dayNum} of ${totalDays}, let's go!`,
        `Morning! Day ${dayNum} — energy's high, make it count.`,
        `No lie-in today. Day ${dayNum} is packed and I'm not sorry.`,
        `Up and at 'em. ${city} doesn't explore itself.`,
      ], dayNum));
      if (dayNum > 1) parts.push(_sarahPick([
        `Yesterday was brilliant, but today's even better.`,
        `You've warmed up. Now we really get into it.`,
      ], dayNum + 1));
    } else {
      parts.push(_sarahPick([
        `Morning. Day ${dayNum}. Slow start — you've earned it.`,
        `Right — day ${dayNum}. We're taking it easy today. Balance.`,
        `Late start today. You're on holiday, not a treadmill.`,
        `Breathe. Today's about going with the flow.`,
      ], dayNum));
      if (dayNum > 1) parts.push(_sarahPick([
        `You had a busy day yesterday — today we recharge. Simple.`,
        `High energy yesterday, chill today. That's the rhythm.`,
        `You've earned a lazy one. No guilt.`,
      ], dayNum + 1));
    }
  }

  // Transitions between stops
  if (timeOfDay === 'lunch') parts.push(_sarahPick([
    `All that exploring works up an appetite. Let's sort lunch.`,
    `Bet you're hungry after that. I've got you.`,
    `Right, let's eat. You'll need the energy.`,
    `Time to refuel. I know just the spot.`,
  ], dayNum * 3));
  if (timeOfDay === 'afternoon') parts.push(_sarahPick([
    `Refuelled? Good. Onwards.`,
    `Stomach happy? Great — there's more to see.`,
    `Feed's done. Let's keep moving.`,
    `Right, afternoon bit. Trust the flow.`,
  ], dayNum * 5));
  if (timeOfDay === 'dinner') parts.push(_sarahPick([
    `Sun's starting to drop. You know what that means — dinner.`,
    `Evening's creeping in. Let's eat well tonight.`,
    `Done for the day? Almost. One more essential stop — food.`,
    `Right — dinner time. You've built up an appetite by now.`,
    `The best meals in ${city} happen when the sun goes down.`,
  ], dayNum * 7));
  if (timeOfDay === 'evening') parts.push(_sarahPick([
    `Night's still young. Fancy one more stop?`,
    `Stuffed? Good. But the night's just getting started.`,
    `Dinner's done. Want to see what ${city} does after dark?`,
    `One for the road? Go on then.`,
  ], dayNum * 11));

  // Shopping context
  if (timeOfDay === 'shopping') parts.push(_sarahPick([
    `Time for some retail therapy.`,
    `You can't leave ${city} without picking up a few bits.`,
    `Souvenir time! Let's see what ${city} has to offer.`,
    `Perfect chance to grab gifts and keepsakes.`,
  ], dayNum * 6));

  // Book-ahead warning
  if (bookAhead) {
    parts.push('⚠️ Book this in advance — it sells out!');
  }

  // The actual stop
  if (stopTitle) {
    parts.push(_sarahPick([
      `${stopTitle}. Tourist-friendly but the real deal.`,
      `${stopTitle} — this is the kind of place that makes ${city} special.`,
      `Right, ${stopTitle}. Not many people know about this one.`,
      `${stopTitle} — trust me on this one.`,
      `${stopTitle} — worth every minute.`,
      `${stopTitle}. Almost kept this one to myself.`,
    ], dayNum * 7 + 3));
  }

  // Tip / description
  if (tip) parts.push(tip);

  // Price
  if (price) parts.push(price);

  // Vibe-specific colour
  if (vibe === 'party' || vibe === 'beach') parts.push(_sarahPick([
    `Feel that buzz? ${city}'s got the energy tonight.`,
    `This is what you came for. Let loose.`,
    `The night's young and so are you. Go for it.`,
  ], dayNum * 13));
  else if (vibe === 'culture') parts.push(_sarahPick([
    `History's all around you here. Soak it in.`,
    `Every corner of ${city} has a story. This one's worth hearing.`,
    `Centuries of history in every stone. Mad, isn't it?`,
  ], dayNum * 13));
  else if (vibe === 'food') parts.push(_sarahPick([
    `Your taste buds are in for a treat.`,
    `This is why you came to ${window.SARAH_COUNTRY?.name || 'Italy'}, let's be honest.`,
    `Food's the heart of ${city}. This place delivers.`,
  ], dayNum * 13));
  else if (vibe === 'relax') parts.push(_sarahPick([
    `No rush. That's the whole point of being here.`,
    `This is your sign to slow down and enjoy it.`,
  ], dayNum * 13));

  // Evening magic
  if (timeOfDay === 'evening') parts.push(_sarahPick([
    `${city} comes alive at night. You'll see.`,
    `The city looks different after dark. In a good way.`,
    `Night's young and ${city}'s just getting started.`,
  ], dayNum * 21));

  // Departure sentiment
  if (isDeparture && timeOfDay !== 'morning-start') parts.push(_sarahPick([
    `Last few hours — make 'em count.`,
    `Soak it up. You'll be back.`,
    `One last taste of ${city} before you go.`,
  ], dayNum * 23));

  // Affiliate product mentions (seeded by dayNum so they don't repeat every day)
  if (timeOfDay === 'morning-start') {
    if (isArrival && dayNum % 2 === 0) {
      parts.push(`📱 <a href="https://airalo.tp.st/M1Bz5YfY" target="_blank" rel="noopener" class="sarah-affiliate-link">Grab a travel eSIM before you leave</a> — connected the moment you land.`);
    }
    if (isDeparture && dayNum % 2 === 1) {
      parts.push(`☀️ <a href="https://amzn.to/4t3EnzW" target="_blank" rel="noopener" class="sarah-affiliate-link">Pack the SPF 50</a> and <a href="https://amzn.to/47ZyLhL" target="_blank" rel="noopener" class="sarah-affiliate-link">travel adapter</a> — far cheaper at home.`);
    }
    if (!isArrival && !isDeparture && !isInland && dayNum % 3 === 0) {
      parts.push(`☀️ The Italian sun is no joke — <a href="https://amzn.to/4t3EnzW" target="_blank" rel="noopener" class="sarah-affiliate-link">grab SPF 50 here</a> before you go.`);
    }
  }

  return parts.join(' ');
}

// ── DYNAMIC ITINERARY GENERATOR (v1.0.4) ──────────────────
function _mapGenVibe(quizVibe) {
  return ({ beach:'relaxed', party:'adventure', culture:'cultural', food:'gastronomic', relax:'relaxed', mix:null })[quizVibe] || null;
}

function _getActEmoji(type) {
  const m = { beach:'🏖️', museum:'🖼️', landmark:'🏛️', culture:'🎭', park:'🌳', sightseeing:'👀', trip:'🚌', boat:'⛵', 'theme park':'🎢', activity:'🚴', food:'🥘', walking:'🚶', tour:'🎧', nature:'🏔️', wildlife:'🦁', sport:'⚽', aquarium:'🐠', zoo:'🦒', nightlife:'🌙', entertainment:'🎪', shopping:'🛍️', relax:'😌', view:'🏞️', 'cable car':'🚡', 'water sport':'🏄', bike:'🚲', art:'🎨', cabaret:'🎭', 'food & drinks':'🍹' };
  for (const [k,v] of Object.entries(m)) { if ((type||'').toLowerCase().includes(k)) return v; }
  return '📍';
}

function _isEventOnDate(date, event) {
  if (!date || !event.monthNum || !event.dayStart) return false;
  const m = date.getMonth() + 1, d = date.getDate();
  return event.monthNum === m && d >= event.dayStart && d <= (event.dayEnd || event.dayStart);
}

function _findEventsForDay(date, fiestas) {
  if (!date || !fiestas) return [];
  return fiestas.filter(f => _isEventOnDate(date, f));
}

function _generateDynamicItinerary() {
  const db = window.SARAH_DATABASE && window.SARAH_DATABASE[_s.city];
  if (!db) return null;

  const totalDays = _s.days || 3;
  const genVibe = _mapGenVibe(_s.vibe);
  const isInland = db.region_type === 'inland';
  const startDate = _s.tripStartDate ? new Date(_s.tripStartDate + 'T00:00:00') : null;
  const days = [];
  const usedActivities = [];
  const usedRestaurants = [];

  // Pick a unique activity — progressively relaxes filters, never picks a used name
  function _pickNewActivity(activities, genVibe, dayType, isInland, seed) {
    if (!activities || !activities.length) return null;
    let pool = activities.filter(a => !usedActivities.includes(a.name));
    if (!pool.length) return null;
    // Energy filter (relax if it empties the pool)
    let f = dayType === 'high-energy' ? pool.filter(a => a.energy === 'high-energy') : pool.filter(a => a.energy === 'chill');
    if (f.length) pool = f;
    // Inland chill beach filter (relax if it empties)
    if (isInland && dayType === 'chill') { f = pool.filter(a => !(a.type||'').toLowerCase().includes('beach')); if (f.length) pool = f; }
    // Vibe filter (relax if it empties)
    if (genVibe) { f = pool.filter(a => a.vibes && a.vibes.includes(genVibe)); if (f.length) pool = f; }
    const picked = pool[Math.abs(seed) % pool.length];
    if (picked) usedActivities.push(picked.name);
    return picked;
  }

  // Pick a unique restaurant — never repeats across the trip
  function _pickNewRestaurant(restaurants, genVibe, mealTime, seed) {
    if (!restaurants || !restaurants.length) return null;
    let pool = restaurants.filter(r => !usedRestaurants.includes(r.name));
    if (!pool.length) return null;
    // Meal time filter (relax if it empties)
    let f = pool.filter(r => { const t = (r.time||'').toLowerCase(); return t.includes(mealTime.toLowerCase()) || t.includes('lunch & dinner'); });
    if (f.length) pool = f;
    // Vibe filter (relax if it empties)
    if (genVibe) { f = pool.filter(r => r.genVibes && r.genVibes.includes(genVibe)); if (f.length) pool = f; }
    const picked = pool[Math.abs(seed) % pool.length];
    if (picked) usedRestaurants.push(picked.name);
    return picked;
  }

  for (let d = 1; d <= totalDays; d++) {
    const dayType = (d % 2 === 1) ? 'high-energy' : 'chill';
    const currentDate = startDate ? new Date(startDate.getTime() + (d-1)*86400000) : null;
    const stops = [];
    const isArrival = d === 1;
    const isDeparture = d === totalDays;

    // Events on this date
    const dayEvents = _findEventsForDay(currentDate, db.fiestas);

    // Shared context for filler system
    const ctx = { dayType, dayNum: d, totalDays, vibe: _s.vibe, city: _s.city, isInland, isArrival, isDeparture };

    // ── ARRIVAL DAY (travel from UK — early start, hotel check-in ~2pm) ──
    if (isArrival && totalDays > 1) {
      stops.push({ time:'Arrive', emoji:'✈️', title:`Travel to ${_s.city}`, story:_sarahFillStory({ ...ctx, timeOfDay:'morning-start', stopTitle:`Arrival in ${_s.city}`, tip:`Early start from the UK. You'll land around midday — by the time you get through arrivals and transfer to your hotel, it'll be 2pm before you're in your room.`, price:null }) });

      // Late lunch after check-in
      const lunchRest = _pickNewRestaurant(db.restaurants, genVibe, 'Lunch', d);
      if (lunchRest) {
        stops.push({ time:'2:00pm', emoji:'🍽️', title:`Late lunch: ${lunchRest.name}`, story:_sarahFillStory({ ...ctx, timeOfDay:'lunch', stopTitle:`${lunchRest.name} — ${lunchRest.bestDish || lunchRest.vibe}`, tip:lunchRest.tip, price:lunchRest.price }), bookLink:lunchRest.bookLink });
      }

      // Light orientation walk (near hotel — keep it gentle after travel)
      stops.push({ time:'3:30pm', emoji:'👀', title:`Gentle orientation near your hotel`, story:_sarahFillStory({ ...ctx, timeOfDay:'afternoon', stopTitle:null, tip:`Nothing strenuous — just stretch your legs and get your bearings. You're on holiday now.`, price:null }) });

      // Inject matched events
      dayEvents.forEach(ev => {
        stops.push({ time:'6:00pm', emoji:ev.emoji || '🎉', title:`🎉 ${ev.e}`, story:ev.desc });
      });

      // Welcome dinner
      const dinnerRest = _pickNewRestaurant(db.restaurants, genVibe, 'Dinner', d + 3);
      if (dinnerRest) {
        stops.push({ time:'8:00pm', emoji:'🍷', title:`Welcome dinner: ${dinnerRest.name}`, story:_sarahFillStory({ ...ctx, timeOfDay:'dinner', stopTitle:`${dinnerRest.name} — ${dinnerRest.bestDish || dinnerRest.vibe}`, tip:dinnerRest.tip, price:dinnerRest.price }), bookLink:dinnerRest.bookLink });
      }

      // Early night or gentle evening intro
      const arrivalEve = _pickNewActivity(db.evening_activities, genVibe || 'relaxed', 'chill', isInland, d * 3);
      if (arrivalEve) {
        stops.push({ time:'10:00pm', emoji:_getActEmoji(arrivalEve.type), title:arrivalEve.name, story:_sarahFillStory({ ...ctx, timeOfDay:'evening', stopTitle:arrivalEve.name, tip:arrivalEve.tip, price:null, bookAhead:arrivalEve.bookAhead }) });
      }

    // ── DEPARTURE DAY (checkout by 12pm — morning only) ──
    } else if (isDeparture && totalDays > 1) {
      stops.push({ time:'8:00am', emoji:'☕', title:`Breakfast & pack up`, story:_sarahFillStory({ ...ctx, timeOfDay:'morning-start', stopTitle:null, tip:`Enjoy a relaxed breakfast and pack your bags. Checkout is midday — you've got the morning to enjoy.`, price:null }) });

      // Quick morning walk / last souvenir
      stops.push({ time:'9:30am', emoji:'🛍️', title:`Final wander & souvenirs`, story:_sarahFillStory({ ...ctx, timeOfDay:'shopping', stopTitle:null, tip:`A quick lap of the local market or nearest shops. Grab any last bits before you go.`, price:null }) });

      // Checkout
      stops.push({ time:'12:00pm', emoji:'🚪', title:`Checkout & goodbyes`, story:_sarahFillStory({ ...ctx, timeOfDay:'afternoon', stopTitle:null, tip:`Time to check out. Head to the airport — ${_s.city} will be here when you come back.`, price:null }) });

    // ── FULL DAYS (middle days) ──
    } else {
      // Morning activity
      const morningAct = _pickNewActivity(db.morning_activities, genVibe, dayType, isInland, d);
      if (morningAct) {
        stops.push({ time:'9:00am', emoji:_getActEmoji(morningAct.type), title:`${dayType === 'high-energy' ? '⚡ ' : '😎 '}${morningAct.name}`, story:_sarahFillStory({ ...ctx, timeOfDay:'morning-start', stopTitle:morningAct.name, tip:morningAct.tip, price:morningAct.price, bookAhead:morningAct.bookAhead }) });
      } else {
        stops.push({ time:'9:00am', emoji:'☕', title:`${dayType === 'high-energy' ? 'Explore' : 'Slow start'} in ${_s.city}`, story:_sarahFillStory({ ...ctx, timeOfDay:'morning-start', stopTitle:null, tip:`Ease into day ${d} of your ${_s.city} adventure.`, price:null }) });
      }

      // Lunch
      const lunchRest = _pickNewRestaurant(db.restaurants, genVibe, 'Lunch', d);
      if (lunchRest) {
        stops.push({ time:'1:00pm', emoji:'🍽️', title:`Lunch: ${lunchRest.name}`, story:_sarahFillStory({ ...ctx, timeOfDay:'lunch', stopTitle:`${lunchRest.name} — ${lunchRest.bestDish || lunchRest.vibe}`, tip:lunchRest.tip, price:lunchRest.price }), bookLink:lunchRest.bookLink });
      }

      // Afternoon activity
      const afternoonAct = _pickNewActivity(db.morning_activities, genVibe, dayType, isInland, d + totalDays);
      if (afternoonAct) {
        stops.push({ time:'3:00pm', emoji:_getActEmoji(afternoonAct.type), title:afternoonAct.name, story:_sarahFillStory({ ...ctx, timeOfDay:'afternoon', stopTitle:afternoonAct.name, tip:afternoonAct.tip, price:afternoonAct.price, bookAhead:afternoonAct.bookAhead }) });
      }

      // Inject matched events
      dayEvents.forEach(ev => {
        stops.push({ time: stops.length > 4 ? '7:00pm' : '5:00pm', emoji:ev.emoji || '🎉', title:`🎉 ${ev.e}`, story:ev.desc });
      });

      // Dinner
      const dinnerRest = _pickNewRestaurant(db.restaurants, genVibe, 'Dinner', d + 3);
      if (dinnerRest) {
        stops.push({ time:'8:00pm', emoji:'🍷', title:`Dinner: ${dinnerRest.name}`, story:_sarahFillStory({ ...ctx, timeOfDay:'dinner', stopTitle:`${dinnerRest.name} — ${dinnerRest.bestDish || dinnerRest.vibe}`, tip:dinnerRest.tip, price:dinnerRest.price }), bookLink:dinnerRest.bookLink });
      }

      // Evening activity
      const eveningAct = _pickNewActivity(db.evening_activities, genVibe, dayType, isInland, d * 3);
      if (eveningAct) {
        stops.push({ time:'10:00pm', emoji:_getActEmoji(eveningAct.type), title:eveningAct.name, story:_sarahFillStory({ ...ctx, timeOfDay:'evening', stopTitle:eveningAct.name, tip:eveningAct.tip, price:null, bookAhead:eveningAct.bookAhead }) });
      }
    }

    days.push({ stops });
  }
  return days;
}

function _getStopsForDay(cd, dayNum) {
  if (!cd) return [];
  // Use dynamic generator if database.js is loaded for this city
  if (window.SARAH_DATABASE && window.SARAH_DATABASE[_s.city] && (_s.days || 1) > 1) {
    if (!_s.dynamicItinerary) {
      _s.dynamicItinerary = _generateDynamicItinerary();
    }
    if (_s.dynamicItinerary && _s.dynamicItinerary[dayNum - 1]) {
      return _s.dynamicItinerary[dayNum - 1].stops || [];
    }
  }
  if (!cd || !cd.itinerary) return [];
  const duration = _s.days || 1;
  const itin = cd.itinerary;
  if (Array.isArray(itin)) {
    if (dayNum === 1) return itin;
    const gen = _generateDayStops(cd, dayNum, duration);
    return gen.stops;
  }
  const durationData = itin[duration];
  if (!durationData) {
    if (dayNum === 1) return itin[1] || [];
    const gen = _generateDayStops(cd, dayNum, duration);
    return gen.stops;
  }
  if (duration === 1) return durationData;
  const dayData = durationData[dayNum - 1];
  if (dayData) return dayData.stops || dayData;
  const gen = _generateDayStops(cd, dayNum, duration);
  return gen.stops;
}

function _getDayName(cd, dayNum) {
  // Dynamic generator day labels
  if (window.SARAH_DATABASE && window.SARAH_DATABASE[_s.city] && (_s.days || 1) > 1) {
    return '';
  }
  if (!cd || !cd.itinerary) return '';
  const duration = _s.days;
  const itin = cd.itinerary;
  if (Array.isArray(itin) || duration === 1) return '';
  const durationData = itin[duration];
  if (!durationData) {
    const gen = _generateDayStops(cd, dayNum, duration);
    return gen.name;
  }
  const dayData = durationData[dayNum - 1];
  if (dayData) return dayData.name || '';
  const gen = _generateDayStops(cd, dayNum, duration);
  return gen.name;
}

function _buildDayTabs() {
  const tabs = document.getElementById('sarah-day-tabs');
  if (!tabs) return;
  if (_s.days <= 1) { tabs.style.display = 'none'; return; }
  tabs.style.display = 'flex';
  tabs.innerHTML = '';
  for (let d = 1; d <= _s.days; d++) {
    const tab = document.createElement('button');
    tab.className = 'sarah-day-tab' + (d === _s.currentDay ? ' s-active' : '');
    const dayName = _getDayName(_s.cityData, d);
    tab.innerHTML = `📍 Day ${d}${dayName ? ' · ' + dayName : ''}`;
    tab.onclick = () => _sarahSwitchDay(d);
    tabs.appendChild(tab);
  }
}

function _sarahSwitchDay(day) {
  _s.currentDay = day;
  _renderTimeline();
  _buildDayTabs();
}

function _renderTimeline() {
  const cd = _s.cityData;
  if (!cd) return;
  const dayStops = _getStopsForDay(cd, _s.currentDay) || [];

  const intro = document.getElementById('sarah-itin-intro');
  if (intro) intro.textContent = (cd.itinIntro && (cd.itinIntro[_s.group] || cd.itinIntro.solo)) || 'Your day starts early and gets better from there.';

  const freeTimeline = document.getElementById('sarah-timeline-free');
  if (!freeTimeline) return;
  freeTimeline.innerHTML = '';

  dayStops.forEach((stop, i) => {
    const el = _buildStopEl(stop);
    freeTimeline.appendChild(el);
    setTimeout(() => el.classList.add('s-show'), i * 180 + 300);
  });
}

function _buildUnlockedContent() {
  document.getElementById('sarah-unlocked-content').style.display = 'block';
  const cd = _s.cityData;

  // Expenses
  _sarahLoadExpenses();
  _sarahRenderExpenses();
  // Clear form fields
  const amtInp = document.getElementById('sarah-expense-amount');
  const descInp = document.getElementById('sarah-expense-desc');
  if (amtInp) amtInp.value = '';
  if (descInp) descInp.value = '';

  // Restaurants
  document.getElementById('sarah-restaurants-grid').innerHTML =
    (cd.restaurants || []).map(r => `
      <div class="sarah-hotel-card">
        <div><div class="sarah-hotel-name">${r.name}</div><div class="sarah-hotel-desc">${r.desc}</div></div>
        <div class="sarah-hotel-price">${r.price}</div>
      </div>`).join('');

  // Activities
  document.getElementById('sarah-activities-grid').innerHTML =
    (cd.activities || []).map(a => `
      <div class="sarah-hotel-card">
        <div><div class="sarah-hotel-name">${a.name}</div><div class="sarah-hotel-desc">${a.desc}</div></div>
      </div>`).join('');

  // Transport & fiestas
  document.getElementById('sarah-transport-block').textContent = cd.transport || '';
  document.getElementById('sarah-fiestas-block').textContent = cd.fiestas || '';

  // Checklist
  _buildChecklist(cd.checklist || {});

  // Sarah knows (v1.0.4)
  _buildSarahKnows();
}

function _buildSarahKnows() {
  const db = window.SARAH_DATABASE && window.SARAH_DATABASE[_s.city];
  const sk = db && db.sarah_knows;
  const wrap = document.getElementById('sarah-knows-wrap');
  if (!wrap || !sk) { if (wrap) wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  document.getElementById('sarah-knows-body').innerHTML = `
    <div class="sarah-knows-item"><span class="sarah-knows-icon">✈️</span><div><strong>Airport</strong> ${sk.airport}<br><strong>To city</strong> ${sk.to_city}</div></div>
    <div class="sarah-knows-item"><span class="sarah-knows-icon">📅</span><div><strong>Best time</strong> ${sk.best_time}</div></div>
    <div class="sarah-knows-item"><span class="sarah-knows-icon">🍽️</span><div>${sk.eating.map(t => '• ' + t).join('<br>')}</div></div>
    <div class="sarah-knows-item"><span class="sarah-knows-icon">🛡️</span><div>${sk.safety.map(t => '• ' + t).join('<br>')}</div></div>
    <div class="sarah-knows-item"><span class="sarah-knows-icon">💡</span><div>${sk.local_tips.map(t => '• ' + t).join('<br>')}</div></div>
    <div class="sarah-knows-links"><a href="/phrases?city=${encodeURIComponent(_s.city)}" target="_blank" rel="noopener">🗣 Italian phrases ↗</a><br>🆘 For police, embassy, and emergency contacts — check the <strong>Help</strong> section in the app footer.</div>
  `;
  // Auto-open after a moment so users notice it
  setTimeout(() => { wrap.classList.add('sarah-knows-open'); }, 800);
}

// ── CHECKLIST ────────────────────────────────────────────────
function _buildChecklist(cl) {
  if (!cl || !Object.keys(cl).length) cl = _sarahDefaultChecklist();
  ['essentials','clothing','documents','tips'].forEach(cat => {
    const container = document.getElementById(`sarah-checklist-${cat}`);
    if (!container) return;
    let items = cl[cat] || [];
    // Prepend affiliate product picks to tips tab
    if (cat === 'tips') {
      const picks = SARAH_AFFILIATE_PICKS.map((p, i) =>
        `<a href="${p.url}" target="_blank" rel="noopener" class="sarah-affiliate-item" onclick="event.stopPropagation()">
          <span class="sarah-affiliate-icon">${p.icon}</span>
          <span class="sarah-affiliate-info">
            <span class="sarah-affiliate-tag">${p.tag}</span>
            <span class="sarah-affiliate-title">${p.title}</span>
            <span class="sarah-affiliate-desc">${p.desc}</span>
          </span>
          <span class="sarah-affiliate-arrow">›</span>
        </a>`
      ).join('');
      items = items.map((item, i) => {
        const key = `${_s.city}-${cat}-${i}`;
        const checked = _s.checklistState[key] || false;
        return `<div class="sarah-check-item${checked?' s-checked':''}" onclick="_sToggleCheck(this,'${key}')">
          <div class="sarah-check-box">${checked?'✓':''}</div>
          <span class="sarah-check-text">${item}</span>
        </div>`;
      });
      container.innerHTML = `<div class="sarah-affiliate-header">💼 Sarah's packing picks</div>${picks}<div class="sarah-affiliate-divider"></div>${items.join('')}`;
      return;
    }
    container.innerHTML = items.map((item, i) => {
      const key = `${_s.city}-${cat}-${i}`;
      const checked = _s.checklistState[key] || false;
      return `<div class="sarah-check-item${checked?' s-checked':''}" onclick="_sToggleCheck(this,'${key}')">
        <div class="sarah-check-box">${checked?'✓':''}</div>
        <span class="sarah-check-text">${item}</span>
      </div>`;
    }).join('');
  });
}

function _sTab(btn, cat) {
  document.querySelectorAll('#sarah-overlay .sarah-tab').forEach(t => t.classList.remove('s-active'));
  document.querySelectorAll('#sarah-overlay .sarah-checklist-content').forEach(c => c.classList.remove('s-active'));
  btn.classList.add('s-active');
  document.getElementById(`sarah-checklist-${cat}`).classList.add('s-active');
}

function _sToggleCheck(el, key) {
  el.classList.toggle('s-checked');
  const box = el.querySelector('.sarah-check-box');
  const checked = el.classList.contains('s-checked');
  box.textContent = checked ? '✓' : '';
  _s.checklistState[key] = checked;
  _saveChecklistState();
}

function _saveChecklistState() {
  try { localStorage.setItem('sarah_checklist', JSON.stringify(_s.checklistState)); } catch(e) {}
}
function _loadChecklistState() {
  try { _s.checklistState = JSON.parse(localStorage.getItem('sarah_checklist') || '{}'); } catch(e) { _s.checklistState = {}; }
}

// ── CHAT ─────────────────────────────────────────────────────
function _buildChat() {
  const sqs = {
    solo:   ['Is it safe solo?','Best area to stay?','How long do I need?'],
    girls:  ['Best bars for girls?','Safe at night?','Good Instagram spots?'],
    lads:   ['Best nightlife?','Cheapest drinks?','Any events on?'],
    family: ['Kid-friendly beaches?','Best time to visit?','Buggy-friendly?'],
    couple: ['Most romantic spots?','Best restaurants?','Weekend enough?'],
    group:  ['Good for big groups?','Group restaurant tips?','Best neighbourhood?'],
  };
  const qs = sqs[_s.group] || sqs.group;
  document.getElementById('sarah-suggested-qs').innerHTML =
    qs.map(q => `<button class="sarah-sq" onclick="_sarahAskQ('${q}')">${q}</button>`).join('');

  document.getElementById('sarah-chat-msgs').innerHTML = '';
  const limit = SARAH_PREMIUM_MODE && !_s.unlocked ? SARAH_FREE_CHATS : 999;
  _s.chatCount = 0;
  _addChatMsg('sarah', `Hi! I'm Sarah 👋 Any questions about ${_s.city}? ${SARAH_PREMIUM_MODE && !_s.unlocked ? `I've got ${limit} free answers for you.` : 'Ask me anything!'}`);
  _updateChatLimit();
}

function _sarahAskQ(q) {
  document.getElementById('sarah-chat-input').value = q;
  _sarahSendChat();
}

async function _sarahSendChat() {
  const maxChats = SARAH_PREMIUM_MODE && !_s.unlocked ? SARAH_FREE_CHATS : 9999;
  if (_s.chatCount >= maxChats) {
    _addChatMsg('locked', '🔒 Free questions used up. Unlock the full guide for unlimited chats with Sarah.');
    return;
  }
  const input = document.getElementById('sarah-chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.disabled = true;
  _addChatMsg('user', msg);
  _s.chatCount++;
  _updateChatLimit();

  const typingId = 'st' + Date.now();
  const te = document.createElement('div');
  te.className = 'sarah-msg s-sarah';
  te.id = typingId;
  te.innerHTML = '<div class="s-typing"><span></span><span></span><span></span></div>';
  document.getElementById('sarah-chat-msgs').appendChild(te);
  _scrollChat();

  const cd = _s.cityData;
  const prem = cd ? cd.premium : null;

  const budgetStr = prem && prem.budget && prem.budget[_s.budget] ? `Daily budget for ${_s.budget} tier: ${prem.budget[_s.budget]}` : '';
  const secretSpotsStr = prem && prem.secretSpots ? `Local gems (under-the-radar finds worth recommending): ${prem.secretSpots.map(s=>s.name+' - '+s.desc).join(' | ')}` : '';
  const rainyStr = prem && prem.rainyPlan ? `Rainy day plan: ${prem.rainyPlan}` : '';
  const restaurantStr = cd && cd.restaurants ? `Restaurants with booking links: ${cd.restaurants.map(r=>r.bookLink ? r.name+' (book via Google Maps)' : r.name).join(', ')}` : '';

  const premiumBlock = [budgetStr, secretSpotsStr, rainyStr, restaurantStr].filter(Boolean).join('\n\n');

  // Exchange rate info for system
  const xrRates = _sarahGetRates();
  const xrStr = xrRates ? `Exchange rates (for reference): €1 = £${xrRates.GBP} = $${xrRates.USD}. When mentioning prices, give the EUR amount and optionally the GBP/USD equivalent.` : '';

  const systemPrompt = `You are Sarah, a warm, direct, slightly funny British blonde woman who is a genuine expert on Italian cities. Honest advice — not tourist board fluff.

You're advising a ${_groupLabel(_s.group)} visiting ${_s.city} on a ${_s.budget||'mid-range'} budget. Their vibe is ${_s.vibe||'mixed'}.

Key don'ts for ${_s.city}: ${cd ? cd.donts.join(' | ') : ''}
Key activities: ${cd ? (cd.activities||[]).map(a=>a.name).join(', ') : ''}

${premiumBlock ? `PREMIUM DATA (use this in your answers):\n${premiumBlock}` : ''}

${xrStr}

You can offer to book restaurant tables via Google Maps.
When someone asks for local favourites, quieter alternatives, or things off the beaten path — suggest the local gems above. Vary your language: call them hidden corners, local secrets, lesser-known spots, quiet finds, under-the-radar places, or tucked-away treasures. Never use the same phrase twice in a conversation.
When asked about budget, give the daily estimate. For bad weather, suggest the rainy plan.
Vary your vocabulary generally — avoid repeating the same words for recommendations, prices, or descriptions across different exchanges.

Keep answers short (3-5 sentences). Warm, knowledgeable, a little cheeky, never corporate. End naturally. Never say you're an AI.`;

  try {
const data = await _nativeFetch('/sarah-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: msg }],
  }),
}).then(r => r.json());    document.getElementById(typingId)?.remove();
    _addChatMsg('sarah', data.content?.[0]?.text || "Ask me again — something went wrong on my end!");
    if (SARAH_PREMIUM_MODE && !_s.unlocked && _s.chatCount >= maxChats) {
      setTimeout(() => {
        _addChatMsg('locked', '🔒 That\'s your free questions! Unlock below for unlimited chats.');
        document.getElementById('sarah-chat-input').disabled = true;
      }, 700);
    }
  } catch (e) {
    document.getElementById(typingId)?.remove();
    _addChatMsg('sarah', "Oops — something went wrong. Try again in a moment!");
  }
  input.disabled = false;
  input.focus();
}

function _addChatMsg(type, text) {
  const el = document.createElement('div');
  el.className = `sarah-msg ${type === 'user' ? 's-user' : type === 'locked' ? 's-locked' : 's-sarah'}`;
  if (type === 'sarah') el.innerHTML = text; else el.textContent = text;
  document.getElementById('sarah-chat-msgs').appendChild(el);
  _scrollChat();
}
function _scrollChat() {
  const m = document.getElementById('sarah-chat-msgs');
  if (m) m.scrollTop = m.scrollHeight;
}
function _updateChatLimit() {
  const el = document.getElementById('sarah-chat-limit');
  if (!el) return;
  if (!SARAH_PREMIUM_MODE || _s.unlocked) {
el.innerHTML = 'Ask Sarah anything ✨';
  } else {
    const r = SARAH_FREE_CHATS - _s.chatCount;
    el.textContent = r > 0 ? `${r} free question${r !== 1 ? 's' : ''} remaining` : 'Free questions used — unlock for unlimited access';
  }
}

// ── UNLOCK / PAYWALL ─────────────────────────────────────────
function _sarahHandleUnlock() {
  // TODO: Replace with your Stripe payment link when live
  // window.open('https://your-stripe-link.com', '_blank');
  alert('💳 Payment coming soon!\n\nFor testing, enter code: TEST-1234');
}

function _sarahApplyCode() {
  const input = document.getElementById('sarah-code-input');
  const code = (input.value || '').trim().toUpperCase();
  const fb = document.getElementById('sarah-code-feedback');
  if (!code) { fb.className = 'sarah-code-feedback s-error'; fb.textContent = 'Please enter a code'; return; }
  if (SARAH_VALID_CODES.has(code)) {
    fb.className = 'sarah-code-feedback s-ok';
    fb.textContent = '✓ Code accepted! Unlocking your full guide...';
    setTimeout(_sarahDoUnlock, 800);
  } else {
    fb.className = 'sarah-code-feedback s-error';
    fb.textContent = 'That code isn\'t valid — check and try again.';
    input.focus();
  }
}

function _sarahDoUnlock() {
  _s.unlocked = true;
  document.getElementById('sarah-paywall-block').style.display = 'none';
  _buildUnlockedContent();
  _s.chatCount = 0;
  _updateChatLimit();
  document.getElementById('sarah-chat-input').disabled = false;
  setTimeout(() => {
    document.getElementById('sarah-unlocked-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

// ── SAVE TRIP ────────────────────────────────────────────────
function _sarahSaveTrip() {
  const btn = document.getElementById('sarah-save-btn');
  const cd = _s.cityData;
  if (!cd) return;
  try {
    const saved = JSON.parse(localStorage.getItem('sarah_saved_trips') || '[]');
    // Snapshot current checklist state for this city
    const cityPrefix = _s.city + '-';
    const cityChecklist = {};
    for (const [key, val] of Object.entries(_s.checklistState)) {
      if (key.startsWith(cityPrefix)) cityChecklist[key] = val;
    }
    const trip = {
      id: Date.now(),
      city: _s.city,
      emoji: cd.emoji,
      group: _s.group,
      vibe: _s.vibe,
      budget: _s.budget,
      days: _s.days,
      tripStartDate: _s.tripStartDate || '',
      tripEndDate: _s.tripEndDate || '',
      itinerary: _s.dynamicItinerary || null,
      date: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }),
      checklist: cityChecklist,
    };
    // Remove duplicate city
    const filtered = saved.filter(t => t.city !== _s.city);
    filtered.unshift(trip);
    localStorage.setItem('sarah_saved_trips', JSON.stringify(filtered.slice(0, 20)));
    btn.textContent = '✓ Saved!';
    btn.classList.add('s-saved');
    setTimeout(() => { btn.textContent = '💾 Save this itinerary'; btn.classList.remove('s-saved'); }, 2500);
    _loadSavedTrips();
  } catch (e) { console.warn('Sarah: could not save trip', e); }
}

function _loadSavedTrips() {
  try {
    const saved = JSON.parse(localStorage.getItem('sarah_saved_trips') || '[]');
    const list = document.getElementById('sarah-saved-list');
    if (!list) return;
    if (!saved.length) {
      list.innerHTML = `<div class="sarah-saved-empty">
        <div class="sarah-saved-empty-icon">✈️</div>
        <h3>No saved trips yet</h3>
        <p>Go through the quiz and save your itinerary — it'll appear here.</p>
      </div>`;
      return;
    }
    list.innerHTML = saved.map(t => `
      <div class="sarah-saved-card" onclick="_sarahLoadTrip('${t.city}')">
        <div class="sarah-saved-card-top">
          <span class="sarah-saved-city">${t.emoji} ${t.city}</span>
        </div>
        <div class="sarah-saved-card-meta">
          <span>👤 ${_groupLabel(t.group)}</span>
          <span>💳 ${t.budget}</span>
          <span>📅 ${t.days} day${t.days > 1 ? 's' : ''}</span>
        </div>
        <div class="sarah-saved-card-footer">
          <span class="sarah-saved-date">Saved ${t.date}</span>
          <button class="sarah-saved-delete" onclick="event.stopPropagation(); _sarahDeleteTrip(${t.id})">🗑️ Delete</button>
        </div>
      </div>`).join('');
  } catch (e) {}
}

function _sarahDeleteTrip(id) {
  try {
    const saved = JSON.parse(localStorage.getItem('sarah_saved_trips') || '[]');
    localStorage.setItem('sarah_saved_trips', JSON.stringify(saved.filter(t => t.id !== id)));
    _loadSavedTrips();
  } catch (e) {}
}

function _sarahLoadTrip(cityName) {
  const city = (window.SARAH_CITIES || []).find(c => c.name === cityName);
  if (!city) return;
  try {
    const saved = JSON.parse(localStorage.getItem('sarah_saved_trips') || []);
    const trip = saved.find(t => t.city === cityName);
    if (trip) {
      _s.group = trip.group;
      _s.vibe = trip.vibe;
      _s.budget = trip.budget;
      _s.days = trip.days || 1;
      _s.city = trip.city;
      _s.cityData = city;
      _s.tripStartDate = trip.tripStartDate || '';
      _s.tripEndDate = trip.tripEndDate || '';
      // Restore exact itinerary so it's identical every time
      _s.dynamicItinerary = trip.itinerary || null;
      // Restore checklist state from saved trip
      if (trip.checklist) {
        _s.checklistState = { ..._s.checklistState, ...trip.checklist };
        _saveChecklistState();
      }
    }
  } catch(e) {}
  _sarahChecklistBuilt = false;
  document.getElementById('sarah-checklist-panel')?.classList.remove('sarah-checklist-open');
  _sarahShowResults();
}

// ── LOADING SCREEN ───────────────────────────────────────────
const SARAH_LOADING_STATES = [
  { text: "Sarah is building your itinerary…", sub: "Finding the best restaurants, activities and local favourites for you" },
  { text: "Checking availability and dates…", sub: "Making sure everything lines up for your trip" },
  { text: "Adding Sarah's personal recommendations…", sub: "The spots only locals know about" },
  { text: "Polishing your personalised plan…", sub: "Almost there, just making it beautiful" },
];
let _loadingInterval = null;
function _startLoadingBar() {
  const fill = document.getElementById('sarah-loading-fill');
  const text = document.getElementById('sarah-loading-text');
  const sub = document.getElementById('sarah-loading-sub');
  if (!fill || !text || !sub) return;
  fill.style.width = '0%';
  let pct = 0;
  let stateIdx = 0;
  if (_loadingInterval) clearInterval(_loadingInterval);
  _loadingInterval = setInterval(() => {
    pct += Math.random() * 8 + 3;
    if (pct > 95) pct = 95;
    fill.style.width = Math.min(pct, 100) + '%';
    if (pct > 20 && stateIdx < 1) { stateIdx = 1; text.textContent = SARAH_LOADING_STATES[1].text; sub.textContent = SARAH_LOADING_STATES[1].sub; }
    if (pct > 45 && stateIdx < 2) { stateIdx = 2; text.textContent = SARAH_LOADING_STATES[2].text; sub.textContent = SARAH_LOADING_STATES[2].sub; }
    if (pct > 70 && stateIdx < 3) { stateIdx = 3; text.textContent = SARAH_LOADING_STATES[3].text; sub.textContent = SARAH_LOADING_STATES[3].sub; }
  }, 200);
  setTimeout(() => {
    if (_loadingInterval) clearInterval(_loadingInterval);
    fill.style.width = '100%';
  }, 1600);
}

// ── ROTATING PHRASES ──────────────────────────────────────────
const SARAH_PHRASES = [
  "Your adventure starts here…",
  "Let Sarah find your place in the sun…",
  "The perfect city is waiting for you…",
  "Your 10-minute escape starts now…",
  "Discover your destination, your way…",
  "Every trip begins with a dream…",
  "Sarah has travelled every corner so you don't have to…",
  "The trip you've been dreaming of starts in 10 minutes…",
  "A little sunshine, a lot of soul…",
  "Let me take you there…",
];

function _startRotatingPhrases() {
  const el = document.getElementById('sarah-rotating-phrase');
  if (!el) return;
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % SARAH_PHRASES.length;
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => {
      el.textContent = SARAH_PHRASES[idx];
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 400);
  }, 5000);
}

// ── SCROLL REVEAL ──────────────────────────────────────────────
let _sarahObserver = null;
function _sarahSetupScrollReveal(container) {
  if (_sarahObserver) _sarahObserver.disconnect();
  _sarahObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('s-visible');
        _sarahObserver.unobserve(entry.target);
      }
    });
  }, { root: container, rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  const targets = container.querySelectorAll(
    '.sarah-section-label, .sarah-hotel-card, .sarah-donts, .sarah-itin-intro, ' +
    '.sarah-info-block, .sarah-knows-wrap, .sarah-chat-wrap, .sarah-paywall, ' +
    '.sarah-unlocked-badge, .sarah-check-item, .sarah-saved-card, .sarah-day-tabs'
  );
  targets.forEach(el => {
    el.classList.add('s-reveal');
    _sarahObserver.observe(el);
  });
}

// ── HELPERS ──────────────────────────────────────────────────
function _groupLabel(g) {
  return ({ solo:'solo traveller', couple:'couple', girls:'girls group', lads:'lads group', family:'family', group:'group' })[g] || 'group';
}

function _resetState() {
  _s.group = null; _s.vibe = null; _s.budget = null; _s.days = null;
  _s.chatCount = 0; _s.unlocked = false; _s.step = 0; _s.currentDay = 1;
  _s.tripStartDate = null; _s.tripEndDate = null; _s.dynamicItinerary = null;
  // Preserve prefilled city through reset
  if (!_s.cityPrefilled) {
    _s.city = null; _s.cityData = null;
  }
  _loadChecklistState();
  _sarahChecklistBuilt = false;

  // Clear quiz selections
  document.querySelectorAll('#sarah-overlay .sarah-option, #sarah-overlay .sarah-city-btn')
    .forEach(el => el.classList.remove('s-selected'));
  document.querySelectorAll('#sarah-overlay .sarah-btn-next')
    .forEach(el => el.classList.remove('sarah-ready'));
  const notice = document.getElementById('sarah-redirect-notice');
  if (notice) notice.style.display = 'none';
}

// Back button closes Sarah instead of navigating away
window.addEventListener('popstate', function(e) {
  var overlay = document.getElementById('sarah-overlay');
  if (overlay && overlay.classList.contains('sarah-open')) {
    overlay.classList.remove('sarah-open');
    document.body.style.overflow = '';
  }
});
