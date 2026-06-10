const fs = require('fs');
const data = JSON.parse(fs.readFileSync('italy.json', 'utf8'));

const AID = '304433';
const BASE = (slug) => `https://www.booking.com/hotel/it/${slug}.en-gb.html?aid=${AID}`;

// Best-guess Booking.com slugs for all 90 hotels
const SLUGS = {
  // ROME
  'The RomeHello Hostel': 'the-romehello',
  'Generator Rome': 'generator-rome',
  'Hotel Katty': 'katty',
  'Hotel Artemide': 'artemide',
  'Hotel Colosseum': 'hotelcolosseum',
  'Nerva Boutique Hotel': 'nerva',
  'Hotel de Russie': 'de-russie',
  'The St. Regis Rome': 'stregisgrandroma',
  'Hotel Eden': 'eden-roma',

  // FLORENCE
  'Plus Florence Hostel': 'plus-florence',
  'Hostel Santa Monaca': 'ostello-santa-monaca',
  'Hotel Centro': 'centro-firenze',
  'Hotel La Scaletta': 'la-scaletta',
  'Hotel Davanzati': 'davanzati',
  'Hotel Casci': 'hotel-casci',
  'Hotel Brunelleschi': 'hotelbrunelleschi',
  'Four Seasons Florence': 'four-seasons-firenze',
  'Helvetia and Bristol': 'helvetia-bristol',

  // VENICE
  'Generator Venice': 'ostello-venezia',
  'Ostello Venezia': 'ostello-venezia',
  'Hotel Tintoretto': 'tintoretto',
  'Hotel San Cassiano Ca\' Favretto': 'hotelsancassiano',
  'Ca\' dei Dogi': 'ca-dei-dogi-venezia',
  'Hotel Palazzo Barbarigo': 'palazzo-barbarigo-sul-canal-grande',
  'Hotel Danieli': 'hoteldanielivenice',
  'Ca\' Maria Adele': 'camariaadelevanezia',
  'Palazzo Venart Luxury Hotel': 'palazzo-venart-luxury',

  // MILAN
  'Ostello Bello Grande': 'ostello-bello-grande',
  'Carlo Goldoni Hotel': 'carlo-goldoni',
  'NYX Hotel Milan': 'nyx-milan',
  'Room Mate Giulia': 'room-mate-giulia',
  'Hotel Spadari al Duomo': 'spadari-al-duomo',
  'NH Collection Milano President': 'nh-collection-milano-president',
  'Armani Hotel Milano': 'armani-milano',
  'Four Seasons Milan': 'four-seasons-milano',
  'Mandarin Oriental Milan': 'mandarin-oriental-milan',

  // NAPLES
  'Hostel of the Sun': 'hostelofthesunapoli',
  'Six Small Rooms': '6-small-rooms-napoli',
  'Hotel Potenza': 'potenzanapoli',
  'Hotel Piazza Bellini': 'hotel-piazza-bellini-apartments',
  'Costantinopoli 104': 'costantinopoli-104',
  'Hotel Il Convento': 'hotel-il-convento',
  'Grand Hotel Vesuvio': 'grand-hotel-vesuvio',
  'Romeo Hotel': 'romeo-hotel-naples',
  'Palazzo Caracciolo Napoli': 'palazzo-caracciolo-napoli',

  // AMALFI
  'Bella Napoli Positano': 'bella-napoli-positano',
  'Ammattaino House': 'ammattaino-house',
  'La Conca Azzurra': 'la-conca-azzurra',
  'Hotel Miramalfi': 'miramalfiamalfi',
  'Covo dei Saraceni': 'covo-dei-saraceni-positano',
  'Hotel Villa Franca': 'hotel-villa-franca',
  'Le Sirenuse': 'le-sirenuse',
  'Hotel Santa Caterina': 'hotel-santa-caterina',
  'Caruso Belmond': 'belmond-hotel-caruso',

  // CINQUE TERRE
  'Cinque Terre Rooms': 'cinque-terre-charme-rooms',
  'La Giovanna Ostello': 'casa-vacanze-giovanna',
  'Hotel Marina': 'marina-monterosso-al-mare',
  'Hotel Porto Roca': 'porto-roca',
  'La Locanda di Anaita': 'affittacamere-anita',
  'Villa Steno': 'villa-steno',
  'Grand Hotel Porto': 'grand-hotel-portovenere',
  'NH Collection Portofino': 'nh-collection-genova-marina',
  'Hotel Margherita': 'margherita-monterosso',

  // BOLOGNA
  'We_Bologna Hostel': 'we-bologna',
  'Hotel Commercio': 'hotel-commercio',
  'Panorama': 'albergo-panorama-bologna',
  'Hotel Cavour': 'cavour-bologna',
  'Art Hotel Commercianti': 'commercianti',
  'Hotel Corona d\'Oro': 'hotel-corona-d-oro',
  'Grand Hotel Majestic Gia Baglioni': 'grandhotelbaglioni',
  'Bologna Art Hotel Fiera': 'hotel-bologna-fiera',
  'Hotel Metropolitan': 'hotel-metropolitan',

  // COMO
  'Ostello Bello Lake Como': 'ostello-bello-lago-di-como',
  'Hotel Firenze': 'hotel-firenze',
  'La Locanda del Vapore': 'locanda-del-vapore',
  'Hotel Villa Flori': 'hotel-villa-flori',
  'Palazzo Albricci Peregrini': 'palazzo-albricci-peregrini',
  'Albergo Terminus': 'albergo-terminus',
  'Grand Hotel Tremezzo': 'grand-hotel-tremezzo',
  'Villa d\'Este': 'villa-d-este',
  'Mandarin Oriental Lago di Como': 'mandarin-oriental-lago-di-como',

  // TURIN
  'Hostel Turin': 'turin-metro-hostel',
  'Hotel Dogana Vecchia': 'dogana-vecchia',
  'Hotel Principi di Piemonte': 'principi-di-piemonte',
  'NH Collection Torino Santo Stefano': 'nh-collection-torino-santo-stefano',
  'Hotel Liberty': 'residence-liberty',
  'Grand Hotel Sitea': 'grandhotelsitea',
  'Le Meridien Lingotto': 'nh-torino-lingotto-tech',
};

// The city keys in the JSON
const CITY_KEYS = ['rome', 'florence', 'venice', 'milan', 'naples', 'amalfi', 'cinque_terre', 'bologna', 'como', 'turin'];
const TIERS = ['budget', 'mid', 'luxury'];

let found = 0;
let missed = [];

for (const cityKey of CITY_KEYS) {
  const city = data.cities[cityKey];
  if (!city || !city.hotels) continue;
  for (const tier of TIERS) {
    const hotels = city.hotels[tier];
    if (!hotels) continue;
    for (const h of hotels) {
      const slug = SLUGS[h.name];
      if (slug) {
        h.bookingLink = BASE(slug);
        found++;
      } else {
        missed.push(`${cityKey}/${tier}: ${h.name}`);
      }
    }
  }
}

if (missed.length > 0) {
  console.log('MISSED:', missed);
} else {
  console.log(`All ${found} hotels mapped successfully.`);
}

fs.writeFileSync('italy.json', JSON.stringify(data, null, 2), 'utf8');
console.log('italy.json updated.');
