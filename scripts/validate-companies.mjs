import { readFile } from 'node:fs/promises';

const companies = JSON.parse(await readFile(new URL('../src/data/companies.json', import.meta.url), 'utf8'));
const ids = new Set();
const locationIds = new Set();
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
    if (!['headquarters', 'office', 'factory'].includes(location.type)) errors.push(`${label}: invalid location type ${location.type}`);
    if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) errors.push(`${label}: invalid coordinates for ${location.id}`);
  }
}

if (errors.length) {
  console.error(`Company data failed validation:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Validated ${companies.length} companies and ${locationIds.size} European locations.`);
