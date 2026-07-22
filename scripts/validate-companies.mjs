import { readFile } from 'node:fs/promises';
import { distanceInKm, resolveCompanyLocations } from '../src/lib/resolve-company-locations.js';

const companies = JSON.parse(await readFile(new URL('../src/data/companies.json', import.meta.url), 'utf8'));
const geocodeCache = JSON.parse(await readFile(new URL('../src/data/geocode-cache.json', import.meta.url), 'utf8'));
const ids = new Set();
const locationIds = new Set();
const locationsById = new Map();
const errors = [];

for (const [index, company] of companies.entries()) {
  const label = company.name || `entry ${index + 1}`;
  for (const field of ['id', 'name', 'description', 'categories', 'links', 'locations']) {
    if (!company[field] || (Array.isArray(company[field]) && company[field].length === 0)) {
      errors.push(`${label}: missing ${field}`);
    }
  }
  if (ids.has(company.id)) errors.push(`${label}: duplicate id ${company.id}`);
  ids.add(company.id);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(company.id || '')) errors.push(`${label}: invalid id ${company.id}`);
  if (!/^https:\/\//.test(company.links?.website || '')) errors.push(`${label}: links.website must use HTTPS`);
  for (const link of ['careers', 'logo']) {
    if (company.links?.[link] && !/^https:\/\//.test(company.links[link])) errors.push(`${label}: links.${link} must use HTTPS`);
  }
  if (company.options?.remoteHiring != null && typeof company.options.remoteHiring !== 'boolean') errors.push(`${label}: options.remoteHiring must be true or false`);
  if (company.options?.funding?.amount != null && !company.options.funding.currency) errors.push(`${label}: options.funding.currency is required when an amount is included`);
  for (const location of company.locations || []) {
    if (locationIds.has(location.id)) errors.push(`${label}: duplicate location id ${location.id}`);
    locationIds.add(location.id);
    locationsById.set(location.id, location);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location.id || '')) errors.push(`${label}: invalid location id ${location.id}`);
    for (const field of ['city', 'country']) {
      if (!location[field]) errors.push(`${label}: missing ${field} for ${location.id}`);
    }
    if (!['headquarters', 'office', 'factory'].includes(location.type)) errors.push(`${label}: invalid location type ${location.type}`);
    if ('coordinates' in location || 'isApproximate' in location) errors.push(`${label}: coordinates and approximation flags are managed internally for ${location.id}`);
    if (location.address) {
      const query = [location.address, location.city, location.country].join(', ');
      if (geocodeCache.locations[location.id]?.query !== query) errors.push(`${label}: geocoding cache is missing or stale for ${location.id}`);
    } else {
      const key = `${location.country}|${location.city}`;
      if (geocodeCache.cities[key]?.query !== `${location.city}, ${location.country}`) errors.push(`${label}: geocoding cache is missing or stale for ${location.city}, ${location.country}`);
    }
  }
}

for (const id of Object.keys(geocodeCache.locations)) {
  const location = locationsById.get(id);
  if (!location) errors.push(`Geocoding cache references unknown location ${id}`);
  else if (!location.address) errors.push(`Approximate location ${id} should not have an exact-address cache entry`);
}

let resolvedCompanies = [];
try {
  resolvedCompanies = resolveCompanyLocations(companies, geocodeCache);
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

const resolvedLocations = resolvedCompanies.flatMap((company) => company.locations);
for (const location of resolvedLocations) {
  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2 || !location.coordinates.every(Number.isFinite)) {
    errors.push(`Invalid resolved coordinates for ${location.id}`);
  } else if (Math.abs(location.coordinates[0]) > 180 || Math.abs(location.coordinates[1]) > 90) {
    errors.push(`Resolved coordinates out of range for ${location.id}`);
  }
}

for (const [index, location] of resolvedLocations.entries()) {
  if (!location.isApproximate) continue;
  for (const other of resolvedLocations.slice(index + 1)) {
    if (distanceInKm(location.coordinates, other.coordinates) < 1) errors.push(`Approximate marker ${location.id} is less than 1 km from ${other.id}`);
  }
  for (const other of resolvedLocations.slice(0, index)) {
    if (!other.isApproximate && distanceInKm(location.coordinates, other.coordinates) < 1) errors.push(`Approximate marker ${location.id} is less than 1 km from ${other.id}`);
  }
}

if (errors.length) {
  console.error(`Company data failed validation:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Validated ${companies.length} companies and ${locationIds.size} European locations.`);
