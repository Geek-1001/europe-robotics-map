import { readFile } from 'node:fs/promises';

const companies = JSON.parse(await readFile(new URL('../src/data/companies.json', import.meta.url), 'utf8'));
const ids = new Set();
const locationIds = new Set();
const locations = [];
const errors = [];

for (const [index, company] of companies.entries()) {
  const label = company.name || `entry ${index + 1}`;
  for (const field of ['id', 'name', 'description', 'categories', 'addedAt', 'links', 'locations']) {
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(company.addedAt || '')) errors.push(`${label}: addedAt must be YYYY-MM-DD`);
  if (company.options?.remoteHiring != null && typeof company.options.remoteHiring !== 'boolean') errors.push(`${label}: options.remoteHiring must be true or false`);
  if (company.options?.funding?.amount != null && !company.options.funding.currency) errors.push(`${label}: options.funding.currency is required when an amount is included`);
  for (const location of company.locations || []) {
    if (locationIds.has(location.id)) errors.push(`${label}: duplicate location id ${location.id}`);
    locationIds.add(location.id);
    locations.push({ ...location, company: label });
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location.id || '')) errors.push(`${label}: invalid location id ${location.id}`);
    for (const field of ['city', 'country', 'address']) {
      if (!location[field]) errors.push(`${label}: missing ${field} for ${location.id}`);
    }
    if (!['headquarters', 'office', 'factory'].includes(location.type)) errors.push(`${label}: invalid location type ${location.type}`);
    if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) errors.push(`${label}: invalid coordinates for ${location.id}`);
    else if (!location.coordinates.every(Number.isFinite) || Math.abs(location.coordinates[0]) > 180 || Math.abs(location.coordinates[1]) > 90) errors.push(`${label}: coordinates out of range for ${location.id}`);
    if (location.isApproximate != null && typeof location.isApproximate !== 'boolean') errors.push(`${label}: isApproximate must be true or false for ${location.id}`);
    if (location.isApproximate === false) errors.push(`${label}: omit isApproximate instead of setting it to false for ${location.id}`);
    if (location.isApproximate === true && !location.address.startsWith('Approximate')) errors.push(`${label}: approximate address must start with “Approximate” for ${location.id}`);
  }
}

const distanceInKm = (a, b) => {
  if (![a, b].every((location) => Array.isArray(location.coordinates) && location.coordinates.length === 2 && location.coordinates.every(Number.isFinite))) return Infinity;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(b.coordinates[1] - a.coordinates[1]);
  const longitudeDelta = radians(b.coordinates[0] - a.coordinates[0]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.coordinates[1])) * Math.cos(radians(b.coordinates[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(haversine));
};

for (const [index, location] of locations.entries()) {
  if (!location.isApproximate) continue;
  for (const other of locations.slice(index + 1)) {
    if (distanceInKm(location, other) < 1) errors.push(`${location.company}: approximate marker ${location.id} is less than 1 km from ${other.id}`);
  }
  for (const other of locations.slice(0, index)) {
    if (!other.isApproximate && distanceInKm(location, other) < 1) errors.push(`${location.company}: approximate marker ${location.id} is less than 1 km from ${other.id}`);
  }
}

if (errors.length) {
  console.error(`Company data failed validation:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Validated ${companies.length} companies and ${locationIds.size} European locations.`);
