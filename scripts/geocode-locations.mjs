import { readFile, writeFile } from 'node:fs/promises';

const companiesUrl = new URL('../src/data/companies.json', import.meta.url);
const cacheUrl = new URL('../src/data/geocode-cache.json', import.meta.url);
const companies = JSON.parse(await readFile(companiesUrl, 'utf8'));
const cache = JSON.parse(await readFile(cacheUrl, 'utf8'));
const endpoint = process.env.EUROPE_ROBOTICS_MAP_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let requests = 0;
let changed = false;

const geocode = async (query) => {
  if (requests > 0) await delay(1100);
  const url = new URL(endpoint);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { 'User-Agent': 'EuropeRoboticsMap/0.1 (https://github.com/Geek-1001/europe-robotics-map)' },
  });
  requests += 1;
  if (!response.ok) throw new Error(`Geocoder returned ${response.status} for “${query}”.`);
  const [result] = await response.json();
  if (!result) throw new Error(`No geocoding result found for “${query}”.`);
  return [Number(result.lon), Number(result.lat)];
};

const resolveEntry = async (collection, key, query) => {
  if (collection[key]?.query === query) return;
  collection[key] = { query, coordinates: await geocode(query) };
  changed = true;
  console.log(`Geocoded ${query}`);
};

const currentLocationIds = new Set();
const currentCityKeys = new Set();
for (const company of companies) {
  for (const location of company.locations) {
    if (location.address) {
      currentLocationIds.add(location.id);
      await resolveEntry(cache.locations, location.id, [location.address, location.city, location.country].join(', '));
    } else {
      const key = `${location.country}|${location.city}`;
      currentCityKeys.add(key);
      await resolveEntry(cache.cities, key, `${location.city}, ${location.country}`);
    }
  }
}

for (const id of Object.keys(cache.locations)) {
  if (!currentLocationIds.has(id)) { delete cache.locations[id]; changed = true; }
}
for (const key of Object.keys(cache.cities)) {
  if (!currentCityKeys.has(key)) { delete cache.cities[key]; changed = true; }
}

if (changed) await writeFile(cacheUrl, `${JSON.stringify(cache, null, 2)}\n`);
console.log(requests ? `Updated geocoding cache with ${requests} request${requests === 1 ? '' : 's'}.` : 'Geocoding cache is current.');
