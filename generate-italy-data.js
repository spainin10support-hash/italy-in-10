// generate-italy-data.js — builds public/sarah/data/italy.js and database.js
// From data/italy.json (relative to project root)
const fs = require('fs');

// ── Read data ──────────────────────────────────────────────────
const RAW = JSON.parse(fs.readFileSync('./data/italy.json', 'utf8'));
const citiesRaw = RAW.cities;

const CITY_KEYS = ['rome','florence','venice','milan','naples','amalfi','cinque_terre','bologna','como','turin'];
const SLUG_MAP = { cinque_terre: 'cinque-terre' };
const REGION_MAP = { amalfi:'coastal', cinque_terre:'coastal', naples:'coastal' };
const FORK_CITY = { rome:'Roma', florence:'Firenze', venice:'Venezia', milan:'Milano', naples:'Napoli', amalfi:'Amalfi', cinque_terre:'Cinque+Terre', bologna:'Bologna', como:'Como', turin:'Torino' };

// ── Fiesta date parser ─────────────────────────────────────────
function _parseFiestaDate(m) {
  const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  function mn(s) { return months[s.toLowerCase().slice(0,3)] || 1; }
  let mm = (m || '').match(/^Early\s+(\w+)/i);
  if (mm) return { monthNum: mn(mm[1]), dayStart: 1, dayEnd: 7 };
  mm = (m || '').match(/^Mid\s+(\w+)/i);
  if (mm) return { monthNum: mn(mm[1]), dayStart: 10, dayEnd: 20 };
  mm = (m || '').match(/^Late\s+(\w+)/i);
  if (mm) return { monthNum: mn(mm[1]), dayStart: 20, dayEnd: 30 };
  mm = (m || '').match(/^(\d+)-(\d+)\s+(\w+)/);
  if (mm) return { monthNum: mn(mm[3]), dayStart: +mm[1], dayEnd: +mm[2] };
  mm = (m || '').match(/^(\d+)\s+(\w+)/);
  if (mm) return { monthNum: mn(mm[2]), dayStart: +mm[1], dayEnd: +mm[1] };
  mm = (m || '').match(/^(\w+)$/);
  if (mm && months[mm[1].toLowerCase().slice(0,3)]) return { monthNum: mn(mm[1]), dayStart: 1, dayEnd: 31 };
  return { monthNum: 1, dayStart: 1, dayEnd: 1 };
}

// ── Activity type → vibes + energy ─────────────────────────────
function _actVibes(type, name) {
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (t.includes('beach') || n.includes('beach')) return { v: ['beach','relax'], e: 'chill' };
  if (t.includes('food') || t.includes('drink') || n.includes('market') || n.includes('pizza') || n.includes('pesto') || n.includes('cooking') || n.includes('lemon')) return { v: ['food','culture'], e: 'chill' };
  if (t.includes('nightlife') || t.includes('club') || t.includes('bar')) return { v: ['party'], e: 'high-energy' };
  if (t.includes('museum') || t.includes('gallery') || t.includes('pinacoteca')) return { v: ['culture'], e: 'chill' };
  if (t.includes('landmark') || t.includes('historic') || t.includes('castle') || t.includes('cathedral') || t.includes('church') || t.includes('basilica') || t.includes('colosseum') || t.includes('palace') || t.includes('villa') || t.includes('tower') || t.includes('fort') || t.includes('duomo')) return { v: ['culture'], e: 'chill' };
  if (t.includes('park') || t.includes('garden') || t.includes('nature') || t.includes('borghese')) return { v: ['nature','relax'], e: 'chill' };
  if (t.includes('walk') || t.includes('trail') || t.includes('path') || t.includes('promenade') || t.includes('portico')) return { v: ['culture','nature'], e: 'chill' };
  if (t.includes('tour') || t.includes('trip') || t.includes('boat') || t.includes('ferry') || t.includes('funicular')) return { v: ['culture','nature'], e: 'chill' };
  if (t.includes('sightseeing') || t.includes('view') || t.includes('square') || n.includes('piazza')) return { v: ['culture'], e: 'chill' };
  if (t.includes('experience') || t.includes('neighbourhood') || t.includes('district') || t.includes('quarter') || n.includes('trastevere') || n.includes('dorsoduro') || n.includes('brera') || n.includes('navigli') || n.includes('spanish quarter') || n.includes('spaccanapoli')) return { v: ['culture'], e: 'chill' };
  if (t.includes('fountain') || n.includes('fountain') || n.includes('steps')) return { v: ['culture'], e: 'chill' };
  if (t.includes('island') || n.includes('island') || n.includes('burano') || n.includes('murano')) return { v: ['culture','nature'], e: 'chill' };
  if (t.includes('culture') || t.includes('sightseeing')) return { v: ['culture'], e: 'chill' };
  if (t.includes('cave') || n.includes('grotto')) return { v: ['nature'], e: 'chill' };
  return { v: ['culture'], e: 'chill' };
}

function _genVibes(vibe) {
  const v = (vibe || '').toLowerCase();
  if (v.includes('traditional') || v.includes('italian') || v.includes('roman') || v.includes('tuscan') || v.includes('neapolitan') || v.includes('venetian') || v.includes('sicilian')) return ['gastronomic','cultural'];
  if (v.includes('seafood') || v.includes('fish')) return ['gastronomic'];
  if (v.includes('pizza') || v.includes('trattoria') || v.includes('market')) return ['gastronomic','cultural'];
  if (v.includes('gourmet') || v.includes('michelin') || v.includes('fine')) return ['gastronomic','luxury'];
  if (v.includes('modern') || v.includes('contemporary') || v.includes('fusion')) return ['gastronomic','adventurous'];
  if (v.includes('casual') || v.includes('local') || v.includes('family')) return ['gastronomic','relaxed'];
  if (v.includes('wine') || v.includes('enoteca') || v.includes('bistro')) return ['gastronomic','relaxed'];
  if (v.includes('historic') || v.includes('classic') || v.includes('heritage')) return ['cultural','gastronomic'];
  if (v.includes('beachfront') || v.includes('seaside')) return ['relaxed','gastronomic'];
  if (v.includes('creative') || v.includes('instagram') || v.includes('trendy')) return ['adventurous','gastronomic'];
  if (v.includes('street food') || v.includes('sandwich') || v.includes('fast')) return ['food'];
  if (v.includes('rooftop') || v.includes('terrace')) return ['gastronomic','relaxed'];
  if (v.includes('cicchetti') || v.includes('aperitivo') || v.includes('cocktail')) return ['nightlife','gastronomic'];
  return ['gastronomic'];
}

function _needsBooking(name, type) {
  const n = (name || '').toLowerCase();
  const t = (type || '').toLowerCase();
  const BOOKABLES = ['colosseum','vatican museum','sistine chapel','uffizi','accademia','duomo','last supper','cenacolo','la scala','vesuvius','pompeii','herculaneum','capri','blue grotto','sirenuse','santa caterina','caruso','guggenheim','burano','murano','bellagio','varenna','villa del balbianello','villa carlotta','grand hotel tremezzo','villa d\'este','bellini','brunelleschi','boboli','superga','mole','egyptian museum','san gimignano','siena','chianti'];
  if (t.includes('theme park') || t.includes('museum')) return true;
  for (const kw of BOOKABLES) { if (n.includes(kw)) return true; }
  return false;
}

// ── Restaurant data per city (curated from sarah_knows context) ─
const QUIZ_RESTAURANTS = {
  rome: [
    { name:'Da Enzo al 29', desc:'Trastevere institution. Cacio e pepe that changes people.', price:'~£25pp' },
    { name:'Roscioli Salumeria con Cucina', desc:'Roman-Jewish deli meets restaurant. Book ahead.', price:'~£30pp' },
    { name:'Armando al Pantheon', desc:'Historic trattoria by the Pantheon. Carbonara the real way.', price:'~£28pp' },
  ],
  florence: [
    { name:'Trattoria Za Za', desc:'Tuscan classics, huge portions, Mercato Centrale location.', price:'~£25pp' },
    { name:'Gelateria dei Neri', desc:'The best gelato in Florence. Sarah\'s personal obsession.', price:'~£4pp' },
    { name:'Osteria Vini e Vecchi Sapori', desc:'Tiny, no reservations, extraordinary bistecca alla fiorentina.', price:'~£30pp' },
  ],
  venice: [
    { name:'Cantine del Vino già Schiavi', desc:'Cicchetti bar in Dorsoduro. Venice at its most authentic.', price:'~£15pp' },
    { name:'Osteria alle Testiere', desc:'Tiny seafood haven. Only 20 seats, book weeks ahead.', price:'~£40pp' },
    { name:'All\'Arco', desc:'Standing-room cicchetti near Rialto. €3-4 a piece, utterly brilliant.', price:'~£12pp' },
  ],
  milan: [
    { name:'Pasticceria Marchesi', desc:'Since 1824. Panettone, pastries, the most elegant breakfast in Milan.', price:'~£15pp' },
    { name:'Trattoria Milanese', desc:'Classic Milanese cooking. Cotoletta and risotto done right.', price:'~£28pp' },
    { name:'El Brellin', desc:'Navigli canal-side. Chic but not pretentious. Great aperitivo buffet.', price:'~£25pp' },
  ],
  naples: [
    { name:'L\'Antica Pizzeria da Michele', desc:'Two options: margherita or marinara. No debate. The best pizza on earth.', price:'~£10pp' },
    { name:'Sorbillo', desc:'Via dei Tribunali. Legendary pizza, always a queue, always worth it.', price:'~£12pp' },
    { name:'Caffe Gambrinus', desc:'Historic cafe on Piazza del Plebiscito. Overpriced but a rite of passage.', price:'~£8pp' },
  ],
  amalfi: [
    { name:'Da Adolfo', desc:'Beachside restaurant only reachable by boat. Book the free shuttle from Positano.', price:'~£35pp' },
    { name:'La Tagliata', desc:'Family-run on the hillside above Positano. Unlimited antipasti, infinite views.', price:'~£30pp' },
    { name:'Trattoria Da Emilia', desc:'Amalfi town. Fresh scialatielli ai frutti di mare. No frills, pure flavour.', price:'~£22pp' },
  ],
  cinque_terre: [
    { name:'Trattoria Gianni Franzi', desc:'Vernazza harbourfront. Pesto trofie with the best view in town.', price:'~£22pp' },
    { name:'Il Pescato Cucinato', desc:'Monterosso. Fried anchovies from a tiny window. Eat them on the beach.', price:'~£10pp' },
    { name:'Nessun Dorma', desc:'Manarola sunset spritz bar. The view that launched a thousand Instagram posts.', price:'~£12pp' },
  ],
  bologna: [
    { name:'Osteria dell\'Orsa', desc:'Student-friendly, no reservations, the best tagliatelle al ragu in town.', price:'~£15pp' },
    { name:'Trattoria Da Me', desc:'Seven tables, no menu, whatever Nonna cooked that day. Trust it.', price:'~£20pp' },
    { name:'Mercato di Mezzo', desc:'Food hall in a medieval building. Tortellini, mortadella, wine.', price:'~£18pp' },
  ],
  como: [
    { name:'Mistral at Grand Hotel Tremezzo', desc:'Michelin-starred lakeside dining. The pasta with lake perch is legendary.', price:'~£55pp' },
    { name:'La Punta', desc:'Varenna waterfront. Risotto con pesce persico overlooking the lake.', price:'~£30pp' },
    { name:'Trattoria del Glicine', desc:'Bellagio. Small, authentic, incredible lake fish. Book ahead.', price:'~£25pp' },
  ],
  turin: [
    { name:'Caffe San Carlo', desc:'Historic cafe under the porticos. Bicerin and pastries since 1842.', price:'~£10pp' },
    { name:'Trattoria Valenza', desc:'Family-run since 1920. Agnolotti del plin that will change your life.', price:'~£22pp' },
    { name:'Consorzio', desc:'Wine bar and restaurant near Porta Palazzo. Truffle pasta is extraordinary.', price:'~£28pp' },
  ],
};

// ── Database restaurant data ───────────────────────────────────
const DB_RESTAURANTS = {
  rome: [
    { name:'Da Enzo al 29', vibe:'Traditional Roman', price:'€20-30', bestDish:'Cacio e Pepe', time:'12:30-15:00, 19:30-23:00', location:'Trastevere', family:true, tip:'No reservations, queue from 7:30pm', genVibes:['gastronomic','cultural'] },
    { name:'Roscioli Salumeria', vibe:'Roman-Jewish deli', price:'€25-40', bestDish:'Carbonara', time:'12:00-16:00, 19:00-23:30', location:'Campo de\' Fiori', family:false, tip:'Book at least a week ahead for dinner', genVibes:['gastronomic','cultural'] },
    { name:'Armando al Pantheon', vibe:'Historic Trattoria', price:'€22-35', bestDish:'Cacio e Pepe', time:'12:30-15:30, 19:30-23:00', location:'Piazza della Rotonda', family:true, tip:'Book ahead for lunch near the Pantheon', genVibes:['cultural','gastronomic'] },
    { name:'Trattoria Da Cesare al Casaletto', vibe:'Traditional Roman', price:'€18-25', bestDish:'Amatriciana', time:'12:30-15:00, 20:00-23:00', location:'Monteverde', family:true, tip:'Out of centre but worth the tram ride', genVibes:['gastronomic','relaxed'] },
    { name:'Enoteca Cavour 313', vibe:'Wine Bar / Bistro', price:'€20-30', bestDish:'Antipasti board', time:'12:00-23:00', location:'Via Cavour', family:true, tip:'Perfect pre-Colosseum lunch spot', genVibes:['gastronomic','relaxed'] },
  ],
  florence: [
    { name:'Trattoria Za Za', vibe:'Tuscan Traditional', price:'€18-28', bestDish:'Ribollita', time:'12:00-15:30, 19:00-23:00', location:'Mercato Centrale', family:true, tip:'Get the bistecca for two — share it', genVibes:['gastronomic','cultural'] },
    { name:'Gelateria dei Neri', vibe:'Artisan Gelato', price:'€3-5', bestDish:'Crema & Fior di Latte', time:'10:00-23:00', location:'Via dei Neri', family:true, tip:'Sarah\'s favourite gelato in Florence', genVibes:['food'] },
    { name:'Osteria Vini e Vecchi Sapori', vibe:'Tuscan Traditional', price:'€22-35', bestDish:'Bistecca alla Fiorentina', time:'12:30-14:30, 19:30-22:00', location:'Via dei Magazzini', family:false, tip:'Tiny — 6 tables. No reservations. Go early', genVibes:['gastronomic','cultural'] },
    { name:'All\'Antico Vinaio', vibe:'Street Food', price:'€5-8', bestDish:'Schiacciata con porchetta', time:'10:00-22:00', location:'Via dei Neri', family:true, tip:'Legendary sandwiches. Queue goes fast', genVibes:['food'] },
    { name:'Enoteca Pitti Gola e Cantina', vibe:'Wine Bar / Tuscan', price:'€15-25', bestDish:'Cheese & cured meat board', time:'11:00-23:00', location:'Piazza Pitti', family:true, tip:'Great after Boboli Gardens — book for dinner', genVibes:['gastronomic','relaxed'] },
  ],
  venice: [
    { name:'Cantine del Vino già Schiavi', vibe:'Cicchetti Bar', price:'€3-6 per piece', bestDish:'Cicchetti misti', time:'9:00-21:00', location:'Dorsoduro', family:true, tip:'Grab a plastic cup of wine and eat on the canal', genVibes:['nightlife','gastronomic'] },
    { name:'Osteria alle Testiere', vibe:'Seafood / Fine', price:'€35-50', bestDish:'Sarde in saor', time:'12:30-14:30, 19:30-22:00', location:'Castello', family:false, tip:'Only 20 seats — book WEEKS ahead', genVibes:['gastronomic','luxury'] },
    { name:'All\'Arco', vibe:'Cicchetti / Local', price:'€3-5 per piece', bestDish:'Baccala mantecato', time:'8:00-15:00', location:'San Polo', family:true, tip:'Cash only. Lunch only. Go before 1pm', genVibes:['food','cultural'] },
    { name:'Trattoria Al Gatto Nero', vibe:'Venetian Traditional', price:'€25-35', bestDish:'Linguine al nero di seppia', time:'12:00-15:00, 19:00-22:00', location:'Murano', family:true, tip:'Combine with Murano glass visit', genVibes:['gastronomic','cultural'] },
  ],
  milan: [
    { name:'Pasticceria Marchesi', vibe:'Historic Pastry', price:'€5-12', bestDish:'Panettone', time:'7:30-21:00', location:'Via Monte Napoleone', family:true, tip:'The original 1824 location. Buy the panettone', genVibes:['food','cultural'] },
    { name:'Trattoria Milanese', vibe:'Traditional Milanese', price:'€25-35', bestDish:'Cotoletta alla Milanese', time:'12:30-14:30, 19:30-22:30', location:'Via Santa Marta', family:true, tip:'Get the risotto AND the cotoletta — share both', genVibes:['gastronomic','cultural'] },
    { name:'El Brellin', vibe:'Navigli / Traditional', price:'€20-30', bestDish:'Risotto alla Milanese', time:'12:00-15:00, 19:00-23:00', location:'Navigli', family:true, tip:'Aperitivo buffet is included with your drink', genVibes:['gastronomic','relaxed'] },
    { name:'Tortino', vibe:'Modern Italian', price:'€30-45', bestDish:'Tasting menu', time:'12:30-14:30, 20:00-23:00', location:'Brera', family:false, tip:'Creative Milanese — book for the tasting', genVibes:['gastronomic','adventurous'] },
  ],
  naples: [
    { name:'L\'Antica Pizzeria da Michele', vibe:'Pizza / Legendary', price:'€5-8', bestDish:'Pizza Margherita', time:'11:00-23:00', location:'Via Cesare Sersale', family:true, tip:'Two options only. Queue is fast. Eat with hands.', genVibes:['gastronomic','cultural'] },
    { name:'Sorbillo', vibe:'Pizza / Neapolitan', price:'€6-10', bestDish:'Pizza Margherita', time:'12:00-15:30, 19:00-23:30', location:'Via dei Tribunali', family:true, tip:'Always a queue. Always worth it', genVibes:['gastronomic','cultural'] },
    { name:'Caffe Gambrinus', vibe:'Historic Cafe', price:'€5-8', bestDish:'Espresso', time:'7:00-01:00', location:'Piazza del Plebiscito', family:true, tip:'Overpriced but historic — pay the €1.50 to sit down', genVibes:['cultural','relaxed'] },
    { name:'Trattoria Da Nennella', vibe:'Neapolitan Traditional', price:'€12-18', bestDish:'Pasta e patate', time:'12:00-15:30, 19:30-22:30', location:'Spanish Quarter', family:true, tip:'Chaotic, loud, brilliant. Bring cash', genVibes:['gastronomic','relaxed'] },
    { name:'Pescheria Azzurra', vibe:'Seafood / Street Food', price:'€10-15', bestDish:'Frittura di paranza', time:'12:00-16:00', location:'Port area', family:true, tip:'Fried seafood to eat standing up', genVibes:['gastronomic','cultural'] },
  ],
  amalfi: [
    { name:'Da Adolfo', vibe:'Beachside / Seafood', price:'€30-40', bestDish:'Spaghetti alle vongole', time:'12:00-15:30', location:'Positano beach', family:true, tip:'Free shuttle boat from Positano harbour. Book ahead', genVibes:['relaxed','gastronomic'] },
    { name:'La Tagliata', vibe:'Family / Hillside', price:'€25-35', bestDish:'Unlimited antipasti', time:'12:00-15:30, 19:30-22:00', location:'Montepertuso (above Positano)', family:true, tip:'The view is as good as the food', genVibes:['gastronomic','cultural'] },
    { name:'Trattoria Da Emilia', vibe:'Amalfi Traditional', price:'€18-25', bestDish:'Scialatielli ai frutti di mare', time:'12:00-15:00, 19:00-22:00', location:'Amalfi town', family:true, tip:'True Amalfi cooking — no tourist menu', genVibes:['gastronomic','relaxed'] },
    { name:'La Caravella', vibe:'Gourmet Seafood', price:'€45-60', bestDish:'Tasting menu', time:'12:30-15:00, 19:30-22:30', location:'Amalfi town', family:false, tip:'Michelin star — book well ahead', genVibes:['gastronomic','luxury'] },
  ],
  cinque_terre: [
    { name:'Trattoria Gianni Franzi', vibe:'Ligurian / Harbour', price:'€18-25', bestDish:'Trofie al pesto', time:'12:00-15:00, 19:00-22:00', location:'Vernazza', family:true, tip:'Book a harbour-side table — worth it', genVibes:['gastronomic','cultural'] },
    { name:'Il Pescato Cucinato', vibe:'Street Food / Fish', price:'€5-10', bestDish:'Fried anchovies', time:'11:00-18:00', location:'Monterosso', family:true, tip:'Tiny takeaway window. Eat on the beach', genVibes:['food'] },
    { name:'Nessun Dorma', vibe:'Spritz Bar / View', price:'€8-12', bestDish:'Aperol Spritz', time:'11:00-22:00', location:'Manarola', family:false, tip:'Go at sunset. The view is the main course', genVibes:['nightlife','relaxed'] },
    { name:'La Cantina di Miky', vibe:'Ligurian / Modern', price:'€25-35', bestDish:'Pesce al sale', time:'12:15-15:00, 19:15-22:00', location:'Monterosso', family:true, tip:'One of the best restaurants in Cinque Terre', genVibes:['gastronomic','cultural'] },
  ],
  bologna: [
    { name:'Osteria dell\'Orsa', vibe:'Student / Traditional', price:'€10-15', bestDish:'Tagliatelle al ragu', time:'12:00-15:00, 19:30-23:00', location:'Via Mentana', family:true, tip:'No reservations, cheap, incredible', genVibes:['gastronomic','relaxed'] },
    { name:'Trattoria Da Me', vibe:'Family / No-menu', price:'€18-25', bestDish:'Whatever Nonna cooked', time:'12:30-15:00, 20:00-22:30', location:'Via San Felice', family:true, tip:'No menu — just eat what they serve', genVibes:['gastronomic','cultural'] },
    { name:'Mercato di Mezzo', vibe:'Food Hall', price:'€10-20', bestDish:'Tortellini', time:'10:00-23:00', location:'Via Pescherie Vecchie', family:true, tip:'Grab a table in the middle and share dishes', genVibes:['gastronomic','cultural'] },
    { name:'Osteria Bartolini', vibe:'Contemporary Bolognese', price:'€30-40', bestDish:'Tasting menu', time:'12:30-14:30, 20:00-22:30', location:'Via Riva Reno', family:false, tip:'Modern takes on classics — book ahead', genVibes:['gastronomic','adventurous'] },
  ],
  como: [
    { name:'Mistral at Grand Hotel Tremezzo', vibe:'Michelin / Lakeside', price:'€60-80', bestDish:'Risotto with lake perch', time:'19:30-22:00', location:'Tremezzo', family:false, tip:'Dinner only. Book MONTHS ahead in summer', genVibes:['gastronomic','luxury'] },
    { name:'La Punta', vibe:'Lakefront / Seafood', price:'€25-35', bestDish:'Risotto con pesce persico', time:'12:00-15:00, 19:00-22:00', location:'Varenna', family:true, tip:'Lakeside table is the best seat in town', genVibes:['gastronomic','relaxed'] },
    { name:'Trattoria del Glicine', vibe:'Bellagio / Local', price:'€20-30', bestDish:'Polenta e missultin', time:'12:00-14:30, 19:00-21:30', location:'Bellagio', family:true, tip:'Tiny, busy, authentic — book ahead', genVibes:['gastronomic','cultural'] },
    { name:'Locanda del Bacco', vibe:'Wine Bar / Regional', price:'€15-25', bestDish:'Cheese & cold cuts', time:'12:00-23:00', location:'Como city', family:true, tip:'Perfect for a light lunch with local wine', genVibes:['gastronomic','relaxed'] },
  ],
  turin: [
    { name:'Caffe San Carlo', vibe:'Historic Cafe', price:'€5-10', bestDish:'Bicerin', time:'8:00-22:00', location:'Piazza San Carlo', family:true, tip:'Sit at the marble tables and order the bicerin', genVibes:['food','cultural'] },
    { name:'Trattoria Valenza', vibe:'Traditional Piemontese', price:'€18-25', bestDish:'Agnolotti del plin', time:'12:30-14:30, 19:30-22:00', location:'Via Baretti', family:true, tip:'Family-run since 1920 — the agnolotti are the best in Turin', genVibes:['gastronomic','cultural'] },
    { name:'Consorzio', vibe:'Wine Bar / Modern', price:'€20-30', bestDish:'Tajarin al tartufo', time:'12:00-15:00, 19:00-23:00', location:'Via Monte di Pietà', family:true, tip:'Truffle pasta and Barolo — perfect combo', genVibes:['gastronomic','relaxed'] },
    { name:'Porta Palazzo Market', vibe:'Street Food / Market', price:'€5-10', bestDish:'Tramezzini', time:'7:00-19:00', location:'Piazza della Repubblica', family:true, tip:'Europe\'s largest outdoor market — eat everything', genVibes:['food'] },
  ],
};

// ── Premium: Secret Spots (hidden gems) ─────────────────────────
const PREMIUM_SECRET_SPOTS = {
  rome: [
    { name:'Aventine Keyhole', desc:'Look through the keyhole of the Knights of Malta gate — a perfect view of St Peter\'s dome framed by hedges.', tip:'Free, always accessible, rarely crowded' },
    { name:'Quartiere Coppedè', desc:'An Art Nouveau fantasy neighbourhood that feels like a fairytale village.', tip:'Free, 20-min walk from Villa Borghese' },
    { name:'Protestant Cemetery', desc:'Keats and Shelley\'s graves in a peaceful garden oasis near Piramide.', tip:'Small entry fee, most visitors walk past' },
  ],
  florence: [
    { name:'Bardini Garden', desc:'The quieter, more romantic hill garden next to Boboli. Better view, fewer people.', tip:'€10, combi-ticket with Boboli, go at sunset' },
    { name:'Officina Profumo Farmaceutica di Santa Maria Novella', desc:'A 13th-century pharmacy that still hand-makes perfumes. Like a museum you can buy from.', tip:'Free entry, the potpourri sachets make great gifts' },
    { name:'San Miniato al Monte', desc:'A beautiful Romanesque church up the hill with the best panoramic view of Florence.', tip:'Free, 10-min walk past Piazzale Michelangelo' },
  ],
  venice: [
    { name:'Scala Contarini del Bovolo', desc:'A hidden spiral staircase with tiny arches — one of Venice\'s most romantic secret spots.', tip:'€7, usually empty, incredible view' },
    { name:'Garden of Paradise (Fondazione Giorgio Cini)', desc:'A secret garden on San Giorgio Maggiore with blooming wisteria.', tip:'Access via the foundation, check opening hours' },
    { name:'Libreria Acqua Alta', desc:'A bookshop where books are stored in bathtubs and gondolas to protect from floods.', tip:'Free, the book staircase is the best photo spot in Venice' },
  ],
  milan: [
    { name:'San Maurizio al Monastero Maggiore', desc:'Often called "Milan\'s Sistine Chapel" — walls and ceiling covered in 16th-century frescoes.', tip:'Free, 2 min from San Babila metro, nobody knows about it' },
    { name:'Villa Necchi Campiglio', desc:'A 1930s rationalist villa with period interiors, garden, and a secret pool.', tip:'€12, also used as a film location for "I Am Love"' },
    { name:'Torre Branca', desc:'A 1930s art deco tower in Parco Sempione. The best free panoramic view of Milan.', tip:'€5, open Thu-Sun, queue can be long at sunset' },
  ],
  naples: [
    { name:'Napoli Sotterranea', desc:'Ancient Greek and Roman underground city — tunnels, cisterns, and Roman theatres 40m below Naples.', tip:'€10 tour, wear sensible shoes, incredible in summer (cool underground)' },
    { name:'Certosa di San Martino', desc:'A former monastery with a cloister full of skull mosaics and the best view of Naples and Vesuvius.', tip:'€8, combined with Castel Sant\'Elmo' },
    { name:'Piazza del Gesù at 6am', desc:'See Naples wake up — old women hanging laundry, espresso bars opening, the city at its most authentic.', tip:'Free, the only time this square is quiet' },
  ],
  amalfi: [
    { name:'Path of the Lemons (Sentiero dei Limoni)', desc:'A lemon-scented trail from Maiori to Minori. Terraced lemon groves and sea views.', tip:'Free, 40-min walk, best in spring when lemons bloom' },
    { name:'Villa Cimbrone Gardens', desc:'Ravello\'s most beautiful garden — the Terrace of Infinity alone is worth the trip.', tip:'€10, go early to have it to yourself' },
    { name:'Fiordo di Furore', desc:'A tiny fjord with a single arched bridge spanning the opening. Perfect for a quiet swim.', tip:'Free, bus from Amalfi, bring your swimsuit' },
  ],
  cinque_terre: [
    { name:'San Pietro Church (Corniglia)', desc:'A 14th-century church on a clifftop with the most underrated view in Cinque Terre.', tip:'Free, 200 steps above Corniglia station' },
    { name:'Buranco Trail', desc:'An old mule track from Volastra to Manarola through vineyards. No crowds.', tip:'Free, 30-min walk, proper shoes needed' },
    { name:'Guvano Beach', desc:'The unofficial nudist beach between Corniglia and Vernazza. Secluded, quiet, stunning.', tip:'Free, access via an abandoned railway tunnel' },
  ],
  bologna: [
    { name:'Asinelli Tower at sunset', desc:'Climb the 498 steps for a 360° rooftop view as the city turns golden.', tip:'€5, climb after 5pm for the best light' },
    { name:'Finestrella (Little Window on the Canal)', desc:'A tiny window on Via Piella that reveals Bologna\'s hidden canal network.', tip:'Free, on Via Piella, blink and you\'ll miss it' },
    { name:'Santuario di San Luca', desc:'The longest portico in the world (666 arches) leads to this hilltop sanctuary.', tip:'Free, 30-min walk from city centre' },
  ],
  como: [
    { name:'Orrido di Bellano', desc:'A dramatic gorge with a waterfall and a walkway suspended over the chasm.', tip:'€5, on the eastern shore between Varenna and Colico' },
    { name:'Monte Grona', desc:'A moderate hike with the single best view of the entire lake from the summit.', tip:'Free, 4h round trip from Menaggio' },
    { name:'Isola Comacina', desc:'The only island on Lake Como — an archaeological site with a restaurant and peaceful trails.', tip:'€5 ferry from Ossuccio' },
  ],
  turin: [
    { name:'Mole Antonelliana Panoramic Lift', desc:'The tallest museum in the world. The glass lift gives you Turin\'s best skyline view.', tip:'€8, includes National Cinema Museum, go on a clear day' },
    { name:'Caffe Al Bicerin', desc:'The 1763 cafe where the bicerin (chocolate-coffee-cream drink) was invented.', tip:'€5 for the original bicerin, a Turin institution' },
    { name:'Monte dei Cappuccini', desc:'A hilltop church with a panoramic terrace that rivals the Mole but with zero crowds.', tip:'Free, 15-min walk from Po River, sunset is magic' },
  ],
};

// ── Premium: Budget estimates per person per day ────────────────
const PREMIUM_BUDGET = {
  rome: { budget:'~£70/day: Hostel dorm, street food/pizza meals, free attractions, walking everywhere.',
          mid:'~£150/day: 3-star hotel, trattoria dinners, 1-2 paid attractions, some taxis.',
          luxury:'~£350/day: 4-5 star hotel, fine dining, private tours, all attractions, private transfers.' },
  florence: { budget:'~£65/day: Hostel, sandwich lunches, free churches and gardens, walking.',
              mid:'~£140/day: 3-star B&B, trattoria dinners, Uffizi/Accademia tickets, local buses.',
              luxury:'~£330/day: Historic hotel, Florentine steak dinners, private gallery tours, taxi.' },
  venice: { budget:'~£80/day: Hostel on mainland, pizza/al fresco meals, walking only, no gondola.',
            mid:'~£160/day: 3-star in Cannaregio, cicchetti crawl, one paid attraction, vaporetto pass.',
            luxury:'~£380/day: Canal-view hotel, fine seafood dinner, private gondola, all attraction passes.' },
  milan: { budget:'~£75/day: Hostel, panzerotto/aperitivo dinner, free sights, metro.',
           mid:'~£155/day: 3-star hotel, restaurant dinners, Last Supper ticket, some shopping.',
           luxury:'~£400/day: 5-star hotel in Brera, Michelin dinner, private tours, designer shopping.' },
  naples: { budget:'~£55/day: Hostel, pizza every meal (worth it), free sights, walking.',
            mid:'~£120/day: 3-star hotel, seafood dinner, Pompeii day trip, metro.',
            luxury:'~£300/day: Boutique hotel, Michelin pizza (!), private Pompeii tour, taxis.' },
  amalfi: { budget:'~£100/day: Hostel in Amalfi town, packed lunch, beach days, SITA bus.',
            mid:'~£200/day: 3-star with sea view, seafood pasta dinners, boat to Capri, ferry.',
            luxury:'~£500/day: Positano 5-star, private boat charter, Michelin dinner, driver.' },
  cinque_terre: { budget:'~£75/day: Hostel in Corniglia/La Spezia, focaccia lunches, hiking trails, train.',
                  mid:'~£155/day: Room in Vernazza/Monterosso, seafood dinner, boat pass, Cinque Terre card.',
                  luxury:'~£350/day: Harbour-view room, fine dining, private boat tour, all passes.' },
  bologna: { budget:'~£60/day: Hostel, pasta from Mercato di Mezzo, free portico walks, walking.',
             mid:'~£130/day: 3-star hotel, trattoria dinner, food tour, Asinelli Tower climb.',
             luxury:'~£300/day: Boutique hotel, tasting menu, Parmigiano factory tour, taxis.' },
  como: { budget:'~£80/day: Hostel in Como town, panini lunches, free lakeside walks, public ferry.',
          mid:'~£170/day: B&B in Varenna/Bellagio, lakeside dinner, ferry day pass, Villa entry.',
          luxury:'~£450/day: Grand hotel lake-view room, Michelin dinner, private boat, all villas.' },
  turin: { budget:'~£55/day: Hostel, street food from Porta Palazzo, free museums (first Sun), walking.',
           mid:'~£125/day: 3-star hotel, Piemontese dinner, Mole+Egyptian Museum, metro.',
           luxury:'~£300/day: Grand hotel in centre, truffle tasting menu, wine tour in Langhe, taxi.' },
};

// ── Premium: Rainy day backup plans ─────────────────────────────
const PREMIUM_RAINY_PLAN = {
  rome: 'Head to the Vatican Museums or Galleria Borghese — both world-class indoor options. The Capuchin Crypt (bones!) is a unique rainy-day activity. End with a long lunch in Trastevere — Italian rain makes trattorias feel even cosier.',
  florence: 'The Uffizi and Accademia are obvious choices. But also try the Vasari Corridor (reserved indoor tour) or the Palazzo Vecchio. Free: the Basilica of San Lorenzo and the Medici Chapels — stunning and covered.',
  venice: 'Venice in the rain is romantic. Hit the Doge\'s Palace, the Correr Museum, or the Peggy Guggenheim Collection. Shopping under the Procuratie arcades in St Mark\'s Square is a classic. Hot chocolate at Caffè Florian while the rain clears.',
  milan: 'The Galleria Vittorio Emanuele II is the world\'s most beautiful shopping arcade — free to browse. Add the Sforza Castle museums, or the Pinacoteca di Brera. The Duomo roof is covered — still worth visiting.',
  naples: 'The Archaeological Museum is the obvious choice — the best Pompeii artefacts in the world. Also try the Veiled Christ museum, or the underground Napoli Sotterranea tour. Pizza in a covered trattoria is always the answer.',
  amalfi: 'The Amalfi coast in heavy rain is tough. Visit Amalfi Cathedral (stunning interior), the Paper Museum, or a lemon grove tour with tasting. Best backup: drive to a agriturismo for a long lunch with local wine.',
  cinque_terre: 'Cinque Terre in heavy rain is soggy — trails close for safety. The churches in each village are lovely. Best bet: take the train to Genoa for the aquarium (Europe\'s largest) or do a pesto-making class indoors.',
  bologna: 'Bologna is one of Italy\'s best rainy-day cities — 40km of porticoes mean you barely get wet. Visit the National Art Gallery, the anatomical theatre, or do a food tour through the covered markets.',
  como: 'Lakeside rain can linger. Visit Villa del Balbianello (indoor tour), the Como Silk Museum, or Brunate by funicular (the clouds make it atmospheric). Best option: a long lunch with lake views from a covered terrace.',
  turin: 'Turin is made for rainy days — the Egyptian Museum, the Cinema Museum in the Mole, and the Savoy palaces are all indoors. The arcaded streets mean 18km of covered shopping without getting wet.',
};

// ── Activity type (for database morning_activities) ────────────
function menuTypeFromName(name, desc) {
  const n = ((name || '') + ' ' + (desc || '')).toLowerCase();
  if (n.includes('museum') || n.includes('gallery') || n.includes('pinacoteca')) return 'museum';
  if (n.includes('beach')) return 'beach';
  if (n.includes('pizza') || n.includes('market') || n.includes('pesto') || n.includes('cooking') || n.includes('lemon')) return 'food';
  if (n.includes('trail') || n.includes('walk') || n.includes('path') || n.includes('stroll') || n.includes('portico')) return 'walk';
  if (n.includes('park') || n.includes('garden') || n.includes('borghese') || n.includes('nature')) return 'nature';
  if (n.includes('funicular') || n.includes('boat') || n.includes('ferry') || n.includes('trip') || n.includes('hike')) return 'nature';
  if (n.includes('piazza') || n.includes('square') || n.includes('steps') || n.includes('fountain')) return 'sightseeing';
  if (n.includes('class') || n.includes('tour') || n.includes('viewpoint')) return 'experience';
  if (n.includes('neighbourhood') || n.includes('district') || n.includes('quarter') || n.includes('bridge')) return 'experience';
  if (n.includes('cathedral') || n.includes('basilica') || n.includes('church') || n.includes('chapel')) return 'culture';
  if (n.includes('island')) return 'nature';
  return 'landmark';
}

function getPrice(name, attractions) {
  const n = (name || '').toLowerCase();
  if (attractions) {
    for (const a of attractions) {
      if (a.name && a.name.toLowerCase() === n && a.price) return a.price;
    }
  }
  if (n.includes('free') || n.includes('park') || n.includes('square') || n.includes('piazza') || n.includes('garden') || n.includes('trail') || n.includes('walk')) return 'Free';
  if (n.includes('colosseum')) return '€16';
  if (n.includes('vatican')) return '€17';
  if (n.includes('pantheon')) return '€5';
  if (n.includes('uffizi')) return '€12';
  if (n.includes('accademia') || n.includes('david')) return '€12';
  if (n.includes('duomo') && (n.includes('climb') || n.includes('roof'))) return '€8-15';
  if (n.includes('duomo')) return 'Free';
  if (n.includes('museum') || n.includes('gallery') || n.includes('pinacoteca')) return '€8-15';
  if (n.includes('pompeii')) return '€18';
  if (n.includes('herculaneum')) return '€13';
  if (n.includes('castel') || n.includes('castle')) return '€6-10';
  if (n.includes('funicular')) return '€3-8';
  if (n.includes('tower') && n.includes('climb')) return '€5-8';
  return '€5-15';
}

// ── Prices from day_trips ──────────────────────────────────────
function parseDayTripPrice(price) {
  if (!price) return '€10-20';
  const m = price.match(/€(\d+)/);
  if (!m) return '€10-20';
  return price;
}

// ── Transform city for italy.js (quiz) ─────────────────────────
function buildQuizCity(slug, c) {
  const name = c.name;
  // Build itinerary: 6-7 items with real stories
  const itinerary = getItinerary(slug, c);
  // Fiestas summary string
  const fiestaStr = (c.fiestas || []).map(f => `${f.e} (${f.m}) — ${f.desc.replace(/\.$/, '')}`).join('. ');

  return {
    name, emoji: c.emoji,
    taglines: c.taglines,
    vibes: c.vibes,
    hotels: c.hotels,
    donts: c.donts || [],
    itinIntro: getItinIntro(slug, name),
    itinerary,
    restaurants: (QUIZ_RESTAURANTS[slug] || [
      { name:`Local Osteria in ${name}`, desc:'Great spot for local cuisine', price:'~£20pp' },
      { name:`Trattoria in ${name} Center`, desc:'Traditional home cooking', price:'~£25pp' },
      { name:`Wine Bar in ${name}`, desc:'Local wines and antipasti', price:'~£18pp' },
    ]).map(r => ({ ...r, bookLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ' ' + (FORK_CITY[slug] || name) + ' Italy')}` })),
    activities: (c.attractions || []).map(a => ({ name:a.name, desc:a.desc })),
    transport: c.transport || '',
    fiestas: fiestaStr,
    checklist: getChecklist(name),
    premium: {
      airport: c.airport || null,
      attractionPrices: c.attractionPrices || null,
      dayTrips: c.dayTrips || null,
      secretSpots: PREMIUM_SECRET_SPOTS[slug] || null,
      budget: PREMIUM_BUDGET[slug] || null,
      rainyPlan: PREMIUM_RAINY_PLAN[slug] || null,
    },
  };
}

// ── Itinerary intro (city-specific) ────────────────────────────
function getItinIntro(slug, name) {
  const intros = {
    rome: {
      girls: 'Right, Rome mornings should start slowly — espresso at a pavement bar, watching Trastevere wake up. The city rewards patience.',
      lads: 'Rome mornings are for coffee and carbs. Get to the Colosseum by 8:30am before the queues form and the heat hits.',
      solo: 'Solo Rome is extraordinary. The Colosseum at opening time, a coffee in the Jewish Quarter — the whole city feels like yours.',
      couple: 'Morning Rome is impossibly romantic — empty squares, fountain sounds, breakfast in a hidden courtyard in Trastevere.',
      family: 'Rome with kids in the morning works perfectly — the Colosseum comes alive when they see it for the first time. Just go early.',
      group: 'A group morning in Rome means one thing: assign someone to get the cornetti while the rest of you head to the Colosseum.',
    },
    florence: {
      girls: 'Florence mornings are made for coffee at a Piazza della Signoria cafe and watching the city wake up beneath the Duomo.',
      lads: 'Get the Uffizi out of the way early — book the first slot, be done by lunch, then steak and Chianti for the afternoon.',
      solo: 'Solo in Florence is a conversation with art. The Accademia first, then a slow walk across the Ponte Vecchio — all yours.',
      couple: 'Florence at dawn is the Renaissance at its most intimate. Climb the Duomo together before anyone else is awake.',
      family: 'Florence with kids: the Duomo climb is an adventure, the gelato rewards are unlimited, and the museums have family trails.',
      group: 'Florence in a group means splitting up for museums and regrouping for lunch. Mercato Centrale is your reunion point.',
    },
    venice: {
      girls: 'Venice mornings mean pastries in a Cannaregio courtyard, then getting lost on purpose before the crowds arrive.',
      lads: 'Venice for lads: skip the gondola, hit the cicchetti bars in Dorsoduro, and take the vaporetto to Burano for sunset.',
      solo: 'Solo Venice is a dream. The quiet backstreets at dawn, a coffee in a campo with nobody else around — pure magic.',
      couple: 'Venice was built for two. Morning gondola under the Rialto Bridge before the crowds is as romantic as it gets.',
      family: 'Venice with kids is brilliant — Murano glass demo in the morning, gelato on St. Mark\'s Square, vaporetto as a ride.',
      group: 'Group Venice: split for an hour to explore, meet at the Rialto Market at 10, then cicchetti crawl through Cannaregio.',
    },
    milan: {
      girls: 'Milan mornings start with a cornetto at Pasticceria Marchesi, then shopping on Via Monte Napoleone before the city stirs.',
      lads: 'Milan for lads: skip the designer stores and head straight to the Duomo roof. The view is the real status symbol.',
      solo: 'Solo in Milan is stylish — coffee in Brera, The Last Supper (booked months ahead, right?), then aperitivo in Navigli.',
      couple: 'Milan mornings are for two — the Duomo roof at 9am, Galleria Vittorio Emanuele at 10am, and nowhere to be until lunch.',
      family: 'Milan with kids: the Duomo roof, Sforza Castle grounds, and the Leonardo da Vinci museum — science meets wonder.',
      group: 'Group Milan: Duomo first (the roof queue builds fast), then Galleria, then split for shopping and meet for aperitivo.',
    },
    naples: {
      girls: 'Naples mornings start with espresso at Gambrinus and a sfogliatella from a pasticceria. Then pizza. Yes, before noon.',
      lads: 'Naples for lads: pizza at Da Michele at 11am (before the queue), then Pompeii for the afternoon. This is the move.',
      solo: 'Solo Naples is an adventure. The chaos is part of the charm — Spaccanapoli, the market, the incredible street food.',
      couple: 'Naples is raw and romantic in a way no other Italian city is. Morning espresso at a historic cafe, then the archaeological museum.',
      family: 'Naples with kids: Pompeii will blow their minds, pizza for lunch, and Castel dell\'Ovo for sunset — a perfect formula.',
      group: 'Group Naples: hit the Spanish Quarter, eat pizza at Sorbillo, and let the chaos of Spaccanapoli be your guide.',
    },
    amalfi: {
      girls: 'Amalfi mornings are for lemon granita overlooking the sea. Positano before the crowds, then a boat to a hidden cove.',
      lads: 'Amalfi for lads: hike the Path of the Gods in the morning cool, then jump off the rocks at Fiordo di Furore after.',
      solo: 'Solo on the Amalfi Coast is the ultimate reset. Morning coffee in Ravello, reading a book overlooking the Tyrrhenian Sea.',
      couple: 'Amalfi mornings are made for romance — pastel houses, lemon groves, and a breakfast terrace over the Mediterranean.',
      family: 'Amalfi with kids: take the ferry to Amalfi town, visit the cathedral, swim at the beach club. Easy and spectacular.',
      group: 'Group on the Amalfi Coast: Positano photo walk in the morning, then the Path of the Gods for the adventurers, beach for the rest.',
    },
    cinque_terre: {
      girls: 'Cinque Terre mornings are perfect for a slow walk between the villages, a spritz stop, and photos from every angle.',
      lads: 'Cinque Terre for lads: hike the whole Blue Trail, swim at Monterosso beach, and eat everything in sight.',
      solo: 'Solo in Cinque Terre: walk when you want, swim when you want, eat pesto at a harbourfront table alone. Bliss.',
      couple: 'Cinque Terre for two: Via dell\'Amore at sunrise, sunset in Manarola, wine and focaccia in a quiet Corniglia piazza.',
      family: 'Cinque Terre with kids: the train is your friend, Monterosso has the best beach, and the pesto always wins.',
      group: 'Cinque Terre with a group: pick a base village, train between the others, and regroup for sunset spritz in Manarola.',
    },
    bologna: {
      girls: 'Bologna mornings mean coffee in Piazza Maggiore, then hitting the Quadrilatero market for mortadella and parmesan.',
      lads: 'Bologna for lads: the Asinelli Tower climb, then the heaviest tagliatelle al ragu you\'ve ever experienced. Repeat.',
      solo: 'Solo Bologna is Italy\'s best food city all to yourself. Markets, porticoes, and the most welcoming people in Emilia.',
      couple: 'Bologna mornings are quiet and romantic — hand in hand under the porticoes, espresso in a medieval piazza.',
      family: 'Bologna with kids: climb the towers, explore the market, eat fresh pasta. The porticoes keep everyone shaded.',
      group: 'Group Bologna: Quadrilatero market first, then split for museum/food according to taste, meet for tortellini at lunch.',
    },
    como: {
      girls: 'Como mornings are for a lakeside breakfast, then a ferry to Bellagio. The lake is most beautiful when the mist lifts.',
      lads: 'Como for lads: hike up to Brunate for the view, then a boat trip around the lake with plenty of stops.',
      solo: 'Solo on Lake Como is restorative — the villa gardens, the ferry rides, the quiet mountain air above the lake.',
      couple: 'Como mornings are impossibly romantic — Bellagio cobblestones, a private boat ride, and lunch on a lake-view terrace.',
      family: 'Como with kids: the ferry is an adventure, Villa Carlotta\'s gardens are a playground, and everyone loves the funicular.',
      group: 'Group Como: ferry to Bellagio, explore together, then split for lunch — reconvene at a lakefront bar for spritz.',
    },
    turin: {
      girls: 'Turin mornings start at Caffe San Carlo for a bicerin, then the Egyptian Museum before the queues. This is the elegant life.',
      lads: 'Turin for lads: Mole Antonelliana for the view, then a vermouth at one of the historic cafes. Underrated and excellent.',
      solo: 'Solo Turin is a pleasure — arcaded streets, grand piazzas, the best chocolate in Italy. Nobody rushes you here.',
      couple: 'Turin is the most elegant city in Italy for two. Morning coffee under the porticos, then the Cinema Museum together.',
      family: 'Turin with kids: the Cinema Museum is a hit for all ages, Porta Palazzo market is an adventure, and the chocolate wins.',
      group: 'Group Turin: Mole Antonelliana first, then Egyptian Museum for the culture crowd, market lunch for the foodies.',
    },
  };
  const def = {
    girls: `Right, your morning in ${name} starts slowly — which is exactly right.`,
    lads: `${name} mornings are for recovery and coffee. Here's how to do it properly.`,
    solo: `Mornings in ${name} are your secret weapon — the crowds haven't arrived.`,
    couple: `${name} reveals itself slowly. Mornings feel like having the whole city to yourselves.`,
    family: `${name} with kids is brilliant if you time it right. Early mornings are your golden window.`,
    group: `A group morning in ${name} means one thing: someone has to go get the pastries.`,
  };
  return intros[slug] || def;
}

// ── Itinerary items ────────────────────────────────────────────
function getItinerary(slug, c) {
  const items = {
    rome: [
      { time:'7:30am', emoji:'☕', title:'Colosseum at dawn — before everyone else', story:'Book the earliest underground tour slot. The Colosseum opens at 8:30am in summer. You want the first group in. Walking through the gladiator tunnels before the heat and the crowds arrive is a genuinely moving experience — the only sounds are your footsteps and 2,000 years of history pressing in.' },
      { time:'10:00am', emoji:'⛪', title:'Vatican Museums and the Sistine Chapel', story:'You\'ve booked ahead (right?). Go straight to the Sistine Chapel — it\'s at the end of the museum route but going directly there first means you get 10 minutes of near-silence under Michelangelo\'s ceiling before the tour groups arrive. Then double back through the galleries at your own pace.' },
      { time:'1:30pm', emoji:'🍝', title:'Lunch in Trastevere — the real Rome', story:'Cross the Tiber to Trastevere. Find a trattoria on a side street — Da Enzo al 29 if you can get a table, otherwise any place where the menu is handwritten in Italian and there are no photos. Cacio e pepe, carbonara, amatriciana. A carafe of house wine. Two hours minimum.' },
      { time:'4:00pm', emoji:'⛲', title:'Trevi Fountain and the Pantheon', story:'The Pantheon is free, astonishing, and takes 20 minutes — the best ancient building in Rome by preservation. Then walk to the Trevi Fountain. It will be heaving. That\'s fine — throw your coin over your left shoulder into the fountain (it guarantees your return to Rome) and move on.' },
      { time:'6:00pm', emoji:'🏘', title:'Spanish Steps at sunset', story:'Walk up to the Spanish Steps via Via dei Condotti. The steps themselves are a meeting point, not really a destination — but the view from the top over the rooftops of Rome at sunset is worth the climb. There\'s a €10 spritz bar at the top. Treat yourself.' },
      { time:'8:30pm', emoji:'🍷', title:'Dinner and evening walk', story:'Eat in Trastevere or the Jewish Quarter — both are beautiful at night. After dinner, walk through the lit ruins. The Colosseum floodlit from below is somehow even more extraordinary than in daylight. The Roman Forum lit up looks like a stage set. Rome after dark is Rome at its most romantic.' },
    ],
    florence: [
      { time:'8:00am', emoji:'☕', title:'Coffee under the Duomo', story:'Find a cafe on Piazza del Duomo — any of them — and order a cappuccino and a cornetto. The Duomo\'s pink, white, and green marble facade catches the morning sun. This is the correct way to start a day in Florence. You have nowhere urgent to be until 8:45am.' },
      { time:'9:00am', emoji:'🎨', title:'Accademia — David, before the queue', story:'You book ahead. Walk past the queue of people who didn\'t. David stands at the end of a long hallway, and the first moment you see him from a distance, framed by the corridor, is one of those travel moments that stays with you forever. Give it 45 minutes.' },
      { time:'10:30am', emoji:'⛪', title:'Uffizi Gallery — the Renaissance in one building', story:'Book for 10:30am. Three hours minimum. Botticelli\'s Birth of Venus, Leonardo\'s Annunciation, Raphael\'s Madonnas. It\'s overwhelming. Don\'t try to see everything — pick a few rooms and go deep. The Uffizi is a museum you date, not one you marry in a day.' },
      { time:'2:00pm', emoji:'🥩', title:'Lunch at Mercato Centrale', story:'Upstairs at the Mercato Centrale is a modern food hall in a 19th-century building. Fresh pasta, truffle dishes, Chianti by the glass — and the best people-watching in Florence. Go upstairs. Order the truffle pasta. You will dream about it later.' },
      { time:'5:00pm', emoji:'🌅', title:'Piazzale Michelangelo for sunset', story:'Walk up to Piazzale Michelangelo for sunset. The whole city spreads out below you — the Duomo, the bell tower, the Arno snaking through. This is the view every postcard of Florence uses. Bring a bottle of wine. Stay until the lights come on.' },
      { time:'8:30pm', emoji:'🍽️', title:'Bistecca alla Fiorentina', story:'Dinner in Florence means T-bone steak. Find a trattoria that advertises bistecca alla fiorentina on a chalkboard. Order it rare. Order Chianti Classico. The steak arrives on a wooden board, charred outside, blood-rare inside, seasoned with salt, olive oil, and three thousand years of Tuscan tradition.' },
    ],
    venice: [
      { time:'7:30am', emoji:'☕', title:'St. Mark\'s Square — before the flood', story:'St. Mark\'s Square at 7:30am is a different world. The only people are delivery workers, cafe staff setting up, and you. Walk through the square without a crowd. St. Mark\'s Basilica\'s Byzantine mosaics catch the first light. The Campanile casts a long shadow across the piazza. Have this moment before the day takes it away.' },
      { time:'9:00am', emoji:'⛪', title:'St. Mark\'s Basilica and Doge\'s Palace', story:'Book tickets for the first slot. The Basilica\'s gold mosaics cover every surface — 8,000 square metres of Byzantine art. The Doge\'s Palace next door is the seat of Venetian power for 1,000 years. Walk across the Bridge of Sighs to the prison and wonder how it felt to see the lagoon through those bars.' },
      { time:'12:00pm', emoji:'🌉', title:'Rialto Market and cicchetti', story:'The Rialto fish market is best in the morning — the catch comes straight from the lagoon. Wander through, then find a cicchetti bar nearby. All\'Arco is tiny and perfect — grab a plastic cup of wine and a few €3 cicchetti, stand in the street, eat, move to the next bar.' },
      { time:'2:30pm', emoji:'🚣', title:'Grand Canal by vaporetto', story:'Take vaporetto line 1 from Rialto to St. Mark\'s — the slow boat that stops at every landing. It\'s the cheapest tour in Venice. Palazzos float past, the Rialto Bridge arches overhead, the dome of Salute rises at the end. Stay on for the full loop. Read the names of the stops. This is Venice.' },
      { time:'5:00pm', emoji:'🏘', title:'Dorsoduro — the real Venice', story:'Cross the Accademia Bridge to Dorsoduro, the quietest sestiere. Narrow streets, laundry overhead, campo after campo with locals on benches. The Peggy Guggenheim Collection is here. So is the best gelato (try Gelateria Nico). Walk without a map. Get lost. Find a tiny bar. This is Venetian life.' },
      { time:'8:00pm', emoji:'🍷', title:'Cicchetti crawl in Cannaregio', story:'Cannaregio is where Venetians actually eat. The Jewish Ghetto is here — the oldest in the world. The bars around the Ghetto and along the Cannaregio canal are cheaper, better, and more authentic than anything near Rialto. A spritz costs €4. A cicchetto costs €3. Eat dinner across 4 bars.' },
    ],
    milan: [
      { time:'8:30am', emoji:'☕', title:'Breakfast at Pasticceria Marchesi', story:'Pasticceria Marchesi on Via Monte Napoleone has been open since 1824. Walk past the designer shops before they open and step into a time capsule of gilded mirrors, marble counters, and the best pastries in Milan. Order a cappuccino and a cornetto alla crema. Stand at the bar like a Milanese. This is the most elegant breakfast in Italy.' },
      { time:'9:30am', emoji:'⛪', title:'Duomo di Milano — the roof, always the roof', story:'The cathedral took 600 years to build. Take the lift (or the stairs if you\'re feeling virtuous) to the roof. The view over Milan is extraordinary — the city sprawls to the Alps on clear days. Up close, the marble spires and statues are impossibly detailed. Allow an hour up here.' },
      { time:'11:00am', emoji:'🎨', title:'The Last Supper — 15 minutes of genius', story:'You booked this months ago (right?). The Cenacolo Vinciano gives you 15 minutes in a room with Leonardo\'s Last Supper. It\'s enough. The painting has been fading since 1498 but the drama, the composition, the moment Jesus says \'one of you will betray me\' — it\'s still all there. 15 minutes that stay forever.' },
      { time:'1:00pm', emoji:'🏛', title:'Galleria and aperitivo prep', story:'Walk through the Galleria Vittorio Emanuele II — the world\'s oldest shopping mall. Spin on the bull\'s testicles on the mosaic floor (tradition says it brings luck). Then wander into the Brera district for lunch. The streets here are lined with galleries, boutiques, and tiny trattorias.' },
      { time:'5:00pm', emoji:'🚤', title:'Navigli for aperitivo', story:'The Navigli district is Milan at its most relaxed. The canals were Leonardo\'s design. Go at 5pm for aperitivo — you buy a drink (€8-12) and get access to a buffet that constitutes dinner. The atmosphere peaks at 7pm. Find a canal-side table. Order a Negroni Sbagliato. Watch Milan unwind.' },
      { time:'9:00pm', emoji:'🍽️', title:'Dinner — the Milanese way', story:'Dinner in Milan is later than the south — 9pm is standard. Go for cotoletta alla Milanese (breaded veal chop) or risotto alla Milanese (saffron risotto). El Brellin on the Navigli is excellent. So is Trattoria Milanese. Order a bottle of Franciacorta — Italy\'s answer to Champagne.' },
    ],
    naples: [
      { time:'8:00am', emoji:'☕', title:'Coffee at Caffe Gambrinus', story:'Caffe Gambrinus on Piazza del Plebiscito has been a Neapolitan institution since 1860. Order an espresso at the bar (€1.20) and drink it standing up. Neapolitans drink more espresso than anyone else in Italy — they know what they\'re doing. The coffee is short, black, intense, and perfect.' },
      { time:'9:00am', emoji:'🏛', title:'Pompeii — before the heat', story:'Take the Circumvesuviana train from Garibaldi to Pompeii Scavi (€2.80, 30min). Book entry tickets in advance. A full Roman city frozen in time — bakeries with bread still in the ovens, frescoes still bright, the plaster casts of bodies in their final moments. Allow 3 hours minimum. Bring water.' },
      { time:'1:00pm', emoji:'🍕', title:'THE pizza — Da Michele', story:'L\'Antica Pizzeria da Michele on Via Cesare Sersale has two options: margherita (tomato, mozzarella, basil) or marinara (tomato, garlic, oregano). That\'s it. No menu. No debate. The pizza costs €5. It is the best pizza on earth. Eat it with your hands. Fold it. Accept no substitutes.' },
      { time:'3:30pm', emoji:'🏺', title:'National Archaeological Museum', story:'Via Toledo towards the museum. The collection of Pompeii and Herculaneum artefacts here is better than what\'s in situ — the frescoes, mosaics, and everyday objects that tell you how Romans actually lived. The Farnese sculptures are astonishing. Allow 2 hours minimum.' },
      { time:'6:00pm', emoji:'🏰', title:'Castel dell\'Ovo at sunset', story:'Castel dell\'Ovo (Castle of the Egg) is free and sits on the seafront. The sunset from here over the Bay of Naples, with Vesuvius in the background, is one of the great Italian sunset experiences. Walk along the seafront promenade after — the passeggiata is a Neapolitan ritual.' },
      { time:'9:00pm', emoji:'🍝', title:'Sfogliatella and a night walk', story:'After dinner, find a pasticceria still open for sfogliatella — the shell-shaped pastry filled with ricotta. Walk through Spaccanapoli at night, the ancient street that splits the old town. The alleys are lit, chaotic, and alive. This is Naples being entirely itself after dark.' },
    ],
    amalfi: [
      { time:'8:00am', emoji:'🍋', title:'Morning in Positano — the quiet hour', story:'Positano before 9am is still waking up. The pastel houses cascade down the cliff to the sea in near-silence. Find a cafe on the main street and order a granita al limone — crushed ice with Amalfi lemon syrup. The lemons here are sfusato, the local variety, and they taste entirely different to any lemon you\'ve had before.' },
      { time:'10:00am', emoji:'🥾', title:'Path of the Gods — the best walk in Europe', story:'Sentiero degli Dei from Bomerano to Nocelle. The path clings to the cliff 500 metres above the sea. The views down to Positano and the coast are so spectacular that the phrase \'take your breath away\' stops being a cliché. Allow 2.5 hours. Wear proper shoes. Bring water. Take a swim at the bottom.' },
      { time:'1:00pm', emoji:'🚤', title:'Lunch at Da Adolfo — boat only', story:'Da Adolfo is a restaurant on a pebble beach reachable only by their free shuttle boat from Positano harbour. The wooden boat with the red flag picks you up. Fresh grilled fish, spaghetti alle vongole, wine served in a jug. Swim between courses. This is the Amalfi Coast at its most magical.' },
      { time:'4:00pm', emoji:'🏛', title:'Amalfi town and the Cathedral', story:'Take the ferry to Amalfi town (€8, 20min). The Duomo dominates the main square — a flight of 62 steps leads up to an Arab-Norman facade of gold and blue. Inside, the cloister is a paradise of interlaced arches and palm trees. The town was a maritime republic before Venice. History drips from every stone.' },
      { time:'6:30pm', emoji:'🌺', title:'Ravello — the view from heaven', story:'Take the bus up to Ravello. Villa Rufolo\'s gardens inspired Wagner\'s Parsifal. Villa Cimbrone has the \'Terrace of Infinity\' — a balcony lined with marble busts that seems to float over the sea. The view from here at sunset is the most photographed on the coast. You will stand there in silence.' },
      { time:'9:00pm', emoji:'🌙', title:'Dinner with a view', story:'Dinner on the Amalfi Coast happens late and happens with a view. La Tagliata above Positano serves unlimited antipasti and grilled meat on a terrace that overlooks the sea. The family has been cooking here for generations. The lemon cake for dessert is the work of the nonna. Do not skip it.' },
    ],
    cinque_terre: [
      { time:'7:30am', emoji:'☕', title:'Breakfast in Monterosso', story:'Monterosso wakes up when the sun clears the hills. Find the focaccia bakery on Via Roma — the one that opens at 6am. Order a slice of focaccia di Recco (stuffed with stracchino cheese) at 7:30am and eat it on the beach. The sea is calm, the sand is clean, and you have the whole village to yourself for about an hour.' },
      { time:'9:00am', emoji:'🥾', title:'Sentiero Azzurro — hike between villages', story:'The Blue Trail from Monterosso to Vernazza is the most spectacular section — 90 minutes of cliffside path with the sea 100 metres below. Go early before the heat. The views back to Monterosso and forward to Vernazza appear around every corner. Vernazza\'s harbour square when you arrive is your reward.' },
      { time:'12:00pm', emoji:'🍝', title:'Pesto in Vernazza', story:'Trattoria Gianni Franzi in the harbour square serves trofie al pesto that defines the Ligurian coast. The basil is local, the pine nuts are from the hills above, the parmesan melts into everything. Sit at a table facing the harbour. The boats bob. The water is turquoise. Life is very, very good.' },
      { time:'2:00pm', emoji:'🏖️', title:'Corniglia or a swim at Monterosso', story:'Two options: climb the 377 steps to Corniglia (the only village not on the water) for the most panoramic views, or swim at Monterosso beach — the only real sandy beach in Cinque Terre. The water is clear, clean, and cold. Both options are correct. Pick based on energy levels.' },
      { time:'5:00pm', emoji:'💕', title:'Via dell\'Amore and Manarola', story:'The Via dell\'Amore (Lover\'s Lane) connects Riomaggiore to Manarola — a 20-minute cliffside walk covered in padlocks and declarations of love. Manarola at 5pm is golden. The pastel houses tumble down the cliff. Find Nessun Dorma for sunset — a terrace bar with the view that made Cinque Terre famous.' },
      { time:'8:00pm', emoji:'🍷', title:'Dinner and evening wine', story:'Dinner in Riomaggiore or back at Vernazza. The evening crowd is different — more relaxed, the day-trippers gone. A glass of Sciacchetra (the local dessert wine) with cantucci biscuits. The stars come out over the Ligurian Sea. The villages light up across the cliffs. This is the Cinque Terre that stays with you.' },
    ],
    bologna: [
      { time:'8:00am', emoji:'☕', title:'Coffee in Piazza Maggiore', story:'The largest medieval square in Europe is quiet at 8am. Find a cafe under the porticoes and order a cappuccino and a cornetto. The Basilica of San Petronio\'s unfinished facade looms above — half marble, half brick, a monument to a civic ambition that ran out of money. It\'s more beautiful unfinished than most cathedrals are finished.' },
      { time:'9:30am', emoji:'🗼', title:'Climb the Asinelli Tower', story:'498 steps up the Asinelli Tower — the taller of Bologna\'s two leaning towers. The staircase is narrow, wooden, and claustrophobic in places. The view from the top is worth every one of those steps — Bologna\'s red rooftops stretch to the hills, the porticoes snake through the city, and on a clear day you can see the Alps.' },
      { time:'11:30am', emoji:'🥩', title:'Quadrilatero Market', story:'The Quadrilatero is Bologna\'s ancient food market — a network of narrow streets filled with shops selling tortellini, mortadella, parmesan, balsamic vinegar, and fresh pasta. The vendors offer samples. Take them all. Buy a piece of mortadella from the counter and eat it standing up. This is how Bologna has shopped for 800 years.' },
      { time:'1:30pm', emoji:'🍝', title:'Tagliatelle al ragu — the real thing', story:'It\'s NOT spaghetti bolognese. The pasta is fresh egg tagliatelle. The ragu is slow-cooked meat sauce. Osteria dell\'Orsa on Via Mentana does the best version for €10. The pasta is made daily. The sauce has been simmering for hours. Eat it. Say \'che buono\'. Order another portion.' },
      { time:'4:00pm', emoji:'🏛', title:'Portico walk to San Luca', story:'Walk the longest covered portico in the world — 4 kilometres, 666 arches, from the city centre up to the Sanctuary of San Luca on the hill. The walk takes about 40 minutes uphill. The view from the top is over the entire city. The porticoes are UNESCO-listed and they\'ve sheltered Bolognese from rain and sun for centuries.' },
      { time:'8:00pm', emoji:'🍷', title:'Aperitivo on Via del Pratello', story:'Via del Pratello is Bologna\'s student nightlife hub. The bars here are cheap, the atmosphere is electric, and the aperitivo (€5-8 for a drink and buffet) is the best value in Italy. Join the students spilling out onto the street. Bologna at night is young, loud, and full of joy.' },
    ],
    como: [
      { time:'8:00am', emoji:'☕', title:'Lakeside breakfast in Como town', story:'Find a cafe on the lakefront promenade in Como town. Order a cappuccino and a pastry. The lake is still, the mountains are reflected in the water, and the only sound is the occasional water taxi. This is why people come to Lake Como — not for the famous names but for moments like this one.' },
      { time:'9:30am', emoji:'🚢', title:'Ferry to Bellagio', story:'The ferry from Como to Bellagio takes 2 hours and is the best €15 you\'ll spend on the lake. The boat stops at every village — Tremezzo with its grand hotels, Menaggio with its lively waterfront, Varenna with its medieval charm. Stay on the deck. The villas along the shore get more spectacular with every stop.' },
      { time:'12:00pm', emoji:'🏘', title:'Bellagio — the Pearl of the Lake', story:'Bellagio sits at the point where the lake splits into its two southern arms. The cobbled streets climb steeply from the waterfront. The views from every high point are extraordinary. Walk up to the Punta Spartivento for the view down both branches of the lake — a panorama that justifies every superlative ever written about this place.' },
      { time:'2:00pm', emoji:'🏛', title:'Villa del Balbianello or Villa Carlotta', story:'Villa del Balbianello in Lenno (Star Wars filming location) has gardens that seem to float on the lake. Villa Carlotta in Tremezzo has azaleas and rhododendrons that explode in spring. Either choice is correct. Both have terraces with views that will stop conversation mid-sentence.' },
      { time:'5:00pm', emoji:'🚡', title:'Funicular to Brunate', story:'Back in Como town, the funicular to Brunate climbs 500 metres in 7 minutes. The village of Brunate sits above the lake with a panoramic view of the entire southern basin. At sunset, the lake turns gold and silver. There\'s a restaurant at the top — have an early dinner here with the city of Como spread out below.' },
      { time:'8:30pm', emoji:'🍷', title:'Dinner in Varenna', story:'Varenna is quieter than Bellagio and more romantic. La Punta restaurant on the waterfront serves risotto con pesce persico (perch risotto) — the classic lake dish. The terrace is literally on the water. The ferry back to Como runs until late. The lake at night under the stars is a different kind of beauty.' },
    ],
    turin: [
      { time:'8:30am', emoji:'☕', title:'Bicerin at Caffe San Carlo', story:'Caffe San Carlo on Piazza San Carlo has marble tables, gilded mirrors, and waiters in bow ties. Order a bicerin — Turin\'s signature drink, layers of espresso, chocolate, and cream in a small glass. It\'s not a coffee. It\'s not a hot chocolate. It\'s something else entirely. This is how Turin starts its day.' },
      { time:'10:00am', emoji:'🗼', title:'Mole Antonelliana and the Cinema Museum', story:'The Mole is Turin\'s Eiffel Tower — a 167-metre spire that dominates the skyline. The lift takes you to the top for a 360-degree view of the city and the Alps. Inside, the National Cinema Museum is one of the world\'s best — immersive, fascinating, and completely unexpected. Allow 2.5 hours.' },
      { time:'1:00pm', emoji:'🏛', title:'Egyptian Museum — the best outside Cairo', story:'The Museo Egizio is the most important Egyptian collection outside Egypt. The statues are enormous. The papyri are pristine. The mummies are... exactly what you\'d expect. The museum is quieter than the Louvre or the British Museum, which means you get to experience it without being jostled. Give it 2 hours.' },
      { time:'3:30pm', emoji:'🥬', title:'Porta Palazzo Market', story:'Europe\'s largest outdoor market occupies a whole square. Fruit, vegetables, cheese, meat, fish — and the most extraordinary food diversity you\'ll find in Italy. The covered market hall next door has fresh pasta, truffles, and the best street food in Turin. Grab a tramezzino (triangular sandwich) and a glass of something cold.' },
      { time:'6:00pm', emoji:'🌳', title:'Valentino Park and the Po River', story:'Valentino Park runs along the Po River. A medieval castle sits in the middle of it. The path along the river is Turin\'s evening promenade — locals jogging, couples walking, the lights of the city reflecting on the water. The Mole in the distance, the Alps on the horizon, the smell of coffee from the park kiosks.' },
      { time:'9:00pm', emoji:'🍽️', title:'Dinner — truffles and Barolo', story:'Dinner in Turin means truffles (in autumn) or agnolotti del plin (always). Consorzio on Via Monte di Pietà pairs tajarin (thin egg pasta) with truffles and a glass of Barolo that\'s so good you\'ll want to move here. Turin\'s food is Italy\'s best-kept culinary secret — Piedmont is the Burgundy of Italy.' },
    ],
  };
  return items[slug] || [
    { time:'9:00am', emoji:'☕', title:`Morning coffee in ${c.name}`, story:`Start your day in ${c.name} the Italian way — an espresso at a local cafe, standing at the bar like a local.` },
    { time:'12:00pm', emoji:'🍝', title:'Lunch at a local trattoria', story:'Find a trattoria where the menu is in Italian only. Order the pasta of the day. Drink the house wine. Take your time.' },
    { time:'3:00pm', emoji:'🏛️', title:'Explore the historic centre', story:'Walk without a plan. The best discoveries in Italian cities happen when you turn down a random street.' },
    { time:'6:00pm', emoji:'🍷', title:'Aperitivo hour', story:'Italians do pre-dinner drinks at 6pm — wine, olives, a plate of cured meats. Join them.' },
    { time:'8:00pm', emoji:'🍽️', title:'Dinner — late, as it should be', story:'Dinner at 8pm is early by Italian standards. Order a second course. Have gelato for dessert.' },
    { time:'10:00pm', emoji:'🌙', title:'Evening passeggiata', story:'The evening stroll is a sacred Italian ritual. Join the locals walking the main streets before bed.' },
  ];
}

// ── Checklist ───────────────────────────────────────────────────
function getChecklist(name) {
  return {
    essentials: ['Sunscreen SPF50+','Comfortable walking shoes (cobblestones everywhere)','Power adapter (Type C/F)','European health card (EHIC/GHIC)'],
    clothing: ['Light layers for evenings','Smart casual for dinner','Hat for daytime','Comfortable shoes for walking'],
    documents: ['Passport','Travel insurance','Hotel confirmations','Major attraction tickets pre-booked'],
    tips: ['Learn 5 Italian phrases — locals appreciate it enormously','Book major attractions in advance — they sell out daily','Restaurant reservations are needed for anywhere good on weekends','Carry cash — many smaller places don\'t accept cards'],
  };
}

// ── Transform city for database.js ─────────────────────────────
function buildDatabaseCity(slug, c) {
  const region = REGION_MAP[slug] || 'inland';
  const attrs = c.attractions || [];

  const morning = attrs.map(a => {
    const type = menuTypeFromName(a.name, a.desc);
    const ve = _actVibes(type, a.name).v;
    const price = getPrice(a.name);
    const needsBook = _needsBooking(a.name, type);
    return {
      name: a.name, type, price, family: true,
      tip: a.desc ? a.desc.split('.')[0] : 'Worth visiting',
      vibes: ve, energy: type === 'landmark' || type === 'culture' ? 'high-energy' : 'chill',
      bookAhead: needsBook,
      bookLink: needsBook ? `https://www.getyourguide.com/s?q=${encodeURIComponent(a.name + ' ' + c.name)}` : '',
    };
  });

  const evening = attrs.slice(0, 4).map(a => {
    const types = ['food','food','experience','food'];
    const family = [false, false, true, false];
    const i = attrs.indexOf(a);
    return {
      name: `${a.name} evening`,
      type: types[i] || 'food',
      price: '€15-30',
      family: family[i] || i === 2,
      tip: 'Best experienced after dark — the atmosphere transforms',
      vibes: ['culture','nightlife'],
      energy: 'high-energy',
      bookAhead: false,
      bookLink: '',
    };
  }) || [];
  // Add city-specific evening activities
  const eveningAddons = getEveningAddons(slug, c);
  const combinedEvening = [...evening, ...eveningAddons].slice(0, 6);

  const restaurants = (DB_RESTAURANTS[slug] || [
    { name:'Local Trattoria', vibe:'traditional', price:'€15-25', bestDish:'Pasta of the day', time:'12:30-22:00', location:'Historic center', family:true, tip:'Go early for the best tables', genVibes:['gastronomic','relaxed'] },
    { name:'Rooftop Restaurant', vibe:'upscale', price:'€30-50', bestDish:'Grilled seafood', time:'19:00-23:00', location:'City center', family:false, tip:'Best at sunset', genVibes:['gastronomic','cultural'] },
    { name:'Wine Bar & Bistro', vibe:'casual', price:'€12-20', bestDish:'Antipasti selection', time:'18:00-00:00', location:'Near main square', family:true, tip:'Great for aperitivo', genVibes:['cultural','relaxed'] },
    { name:'Family-run Osteria', vibe:'rustic', price:'€10-18', bestDish:'Homemade pasta', time:'12:00-21:30', location:'Side street', family:true, tip:'Cash only sometimes', genVibes:['gastronomic','relaxed'] },
    { name:'Modern Italian', vibe:'contemporary', price:'€25-40', bestDish:'Tasting menu', time:'19:30-22:30', location:'City center', family:false, tip:'Book a few days ahead', genVibes:['gastronomic','adventurous'] },
  ]).map(r => ({ ...r, bookLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ' ' + (FORK_CITY[slug] || c.name) + ' Italy')}` }));

  const fiestas = (c.fiestas || []).map(f => ({
    ..._parseFiestaDate(f.m),
    season: f.season || 'spring',
    m: f.m || '',
    emoji: f.emoji || '🎉',
    e: f.e || '',
    desc: f.desc || '',
  }));

  const day_trips = (c.day_trips || []).map(d => ({ name:d.name, duration:d.duration, price:d.price, tip:d.tip }));
  const family_specific = attrs.slice(0, 2).map(a => ({ name:a.name, desc:'Great for all ages', tip:'Go early to avoid crowds' }));
  const party_specific = combinedEvening.slice(0, 2).map(e => ({ name:e.name, desc:'Nightlife hotspot', tip:'Peaks after 11pm' }));

  const sk = c.sarah_knows || {};
  const sarah_knows = {
    airport: sk.airport || `${c.name} Airport`,
    to_city: sk.to_city || 'Various transport options',
    best_time: sk.best_time || 'Spring (Apr-Jun) or Autumn (Sep-Oct) for best weather',
    eating: sk.eating || ['Eat where the locals eat — if the menu is in many languages, keep walking','Try the local speciality first','Lunch is the main meal in Italy'],
    safety: sk.safety || ['Keep belongings secure in crowded areas','Emergency: 112 (EU-wide)'],
    local_tips: sk.local_tips || ['Learn a few Italian phrases','Visit major attractions early in the morning','Carry some cash'],
  };

  return {
    region_type: region,
    morning_activities: morning,
    evening_activities: combinedEvening,
    restaurants, fiestas, day_trips, family_specific, party_specific,
    sarah_knows,
    premium: {
      secretSpots: PREMIUM_SECRET_SPOTS[slug] || null,
      budget: PREMIUM_BUDGET[slug] || null,
      rainyPlan: PREMIUM_RAINY_PLAN[slug] || null,
    },
  };
}

function getEveningAddons(slug, c) {
  const addons = {
    rome: [
      { name:'Aperitivo in Trastevere', type:'food', price:'€8-12', family:true, tip:'Go around 6pm — the streets fill with locals', vibes:['food','culture'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Night walk through Roman Forum', type:'sightseeing', price:'Free', family:true, tip:'The illuminated ruins are magical after dark', vibes:['culture','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    florence: [
      { name:'Sunset at Piazzale Michelangelo', type:'sightseeing', price:'Free', family:true, tip:'Bring a bottle of wine — it\'s a local tradition', vibes:['nature','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Gelato walk along the Arno', type:'food', price:'€3-5', family:true, tip:'Gelateria della Passera does the best', vibes:['food','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    venice: [
      { name:'Sunset from the Accademia Bridge', type:'sightseeing', price:'Free', family:true, tip:'The view of the Salute dome at sunset is the best in Venice', vibes:['culture','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Cicchetti crawl in Cannaregio', type:'food', price:'€3-5 per piece', family:true, tip:'Visit 3-4 bars — one per course', vibes:['food','culture'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    milan: [
      { name:'Aperitivo in Navigli', type:'food', price:'€8-15', family:true, tip:'Drink comes with dinner buffet — skip actual dinner', vibes:['food','party'], energy:'high-energy', bookAhead:false, bookLink:'' },
      { name:'Rooftop drink at Duomo view bar', type:'experience', price:'€12-20', family:false, tip:'Terrazza Aperol has the best Duomo view for €10', vibes:['culture','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    naples: [
      { name:'Seafood dinner at the port', type:'food', price:'€15-25', family:true, tip:'Pescheria Azzurra — fried seafood to eat standing up', vibes:['food','culture'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Night walk through Spaccanapoli', type:'experience', price:'Free', family:true, tip:'The ancient street is magical at night', vibes:['culture'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    amalfi: [
      { name:'Sunset drink in Positano', type:'food', price:'€10-15', family:true, tip:'Franco\'s bar has the best sunset view in Positano', vibes:['relaxed','culture'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Evening walk through Amalfi town', type:'experience', price:'Free', family:true, tip:'The town is beautiful when the day-trippers leave', vibes:['culture'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    cinque_terre: [
      { name:'Sunset spritz in Manarola', type:'food', price:'€8-12', family:true, tip:'Nessun Dorma — the view is the main attraction', vibes:['relaxed','food'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Seafood dinner in Vernazza harbour', type:'food', price:'€20-30', family:true, tip:'The harbour square is magical after dark', vibes:['gastronomic','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    bologna: [
      { name:'Aperitivo on Via del Pratello', type:'food', price:'€5-8', family:true, tip:'Student bars — cheap drinks, generous buffets', vibes:['food','party'], energy:'high-energy', bookAhead:false, bookLink:'' },
      { name:'Evening walk through the porticoes', type:'experience', price:'Free', family:true, tip:'The illuminated porticoes are beautiful at night', vibes:['culture'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    como: [
      { name:'Sunset ferry across the lake', type:'nature', price:'€5-10', family:true, tip:'The last ferry of the day has the best light', vibes:['nature','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Lakeside dinner in Varenna', type:'food', price:'€20-30', family:true, tip:'La Punta — risotto with lake perch on the water', vibes:['gastronomic','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
    turin: [
      { name:'Aperitivo at Piazza San Carlo', type:'food', price:'€8-12', family:true, tip:'The most elegant square in Italy for pre-dinner drinks', vibes:['cultural','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
      { name:'Valentino Park evening stroll', type:'walk', price:'Free', family:true, tip:'Along the Po River at sunset', vibes:['nature','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
    ],
  };
  return addons[slug] || [
    { name:'Evening passeggiata', type:'walk', price:'Free', family:true, tip:'Join the locals for their evening stroll', vibes:['culture'], energy:'chill', bookAhead:false, bookLink:'' },
    { name:'Aperitivo at a local bar', type:'food', price:'€8-12', family:true, tip:'Pre-dinner drinks and snacks from 6pm', vibes:['food','relaxed'], energy:'chill', bookAhead:false, bookLink:'' },
  ];
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════
const quizCities = [];
const dbCities = {};

for (const key of CITY_KEYS) {
  const c = citiesRaw[key];
  if (!c) { console.warn(`⚠ Missing city: ${key}`); continue; }
  quizCities.push(buildQuizCity(key, c));
  dbCities[c.name] = buildDatabaseCity(key, c);
}

// ── Write italy.js ─────────────────────────────────────────────
const quizPreamble = `// ============================================================
//  ITALY.JS — City database for Sarah Advisor
//  Auto-generated by generate-italy-data.js
// ============================================================

window.SARAH_COUNTRY = {
  code: 'it',
  name: 'Italy',
  flag: '🇮🇹',
  cityCount: ${quizCities.length},
  sarahIntro: "I've spent years exploring Italy so you don't have to start from scratch. Tell me who's going and what you want — I'll give you the honest version.",
};

window.SARAH_CITIES =`;

const quizBody = JSON.stringify(quizCities, null, 2)
  .replace(/"\s*\+\s*"/g, '')  // clean up any string concat artifacts
  .replace(/\u2000/g, ' ');

const quizOut = quizPreamble + '\n' + quizBody + ';\n';

fs.writeFileSync('public/sarah/data/italy.js', quizOut, 'utf8');
console.log(`✓ Generated public/sarah/data/italy.js (${quizCities.length} cities)`);

// ── Write database.js ──────────────────────────────────────────
const dbPreamble = `// Auto-generated by generate-italy-data.js
// DO NOT EDIT

window.SARAH_DATABASE =`;

const dbBody = JSON.stringify(dbCities, null, 2);
const dbOut = dbPreamble + '\n' + dbBody + ';\n';

fs.writeFileSync('public/sarah/data/database.js', dbOut, 'utf8');
console.log(`✓ Generated public/sarah/data/database.js (${Object.keys(dbCities).length} cities)`);
