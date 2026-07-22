const MIN_MARKER_DISTANCE_KM = 1;
const MAX_PLACEMENT_ATTEMPTS = 512;

const cityKey = (location) => `${location.country}|${location.city}`;

const hash = (value) => {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const random = (seed) => {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

export const distanceInKm = (a, b) => {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(b[1] - a[1]);
  const longitudeDelta = radians(b[0] - a[0]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(haversine));
};

const placeNearCity = (location, centre, occupied) => {
  const seed = hash(location.id);
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
    const angle = random(seed + attempt * 2) * Math.PI * 2;
    const radiusInKm = 0.8 + random(seed + attempt * 2 + 1) * 3.2;
    const latitude = centre[1] + Math.sin(angle) * radiusInKm / 111.32;
    const longitude = centre[0] + Math.cos(angle) * radiusInKm / (111.32 * Math.cos(centre[1] * Math.PI / 180));
    const candidate = [Number(longitude.toFixed(5)), Number(latitude.toFixed(5))];
    if (occupied.every((coordinates) => distanceInKm(candidate, coordinates) >= MIN_MARKER_DISTANCE_KM)) return candidate;
  }
  throw new Error(`Could not place ${location.id} near ${location.city} without overlapping another marker.`);
};

export const resolveCompanyLocations = (companies, geocodeCache) => {
  const occupied = Object.values(geocodeCache.locations).map((entry) => entry.coordinates);
  const resolvedPoints = new Map(Object.entries(geocodeCache.locations).map(([id, entry]) => [id, entry.coordinates]));
  const approximateLocations = companies
    .flatMap((company) => company.locations)
    .filter((location) => !location.address)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const location of approximateLocations) {
    const centre = geocodeCache.cities[cityKey(location)]?.coordinates;
    if (!centre) throw new Error(`No internal city centre is configured for ${location.city}, ${location.country}.`);
    const coordinates = placeNearCity(location, centre, occupied);
    occupied.push(coordinates);
    resolvedPoints.set(location.id, coordinates);
  }

  return companies.map((company) => ({
    ...company,
    locations: company.locations.map((location) => {
      const coordinates = resolvedPoints.get(location.id);
      if (!coordinates) throw new Error(`No internal coordinates are configured for ${location.id}.`);
      if (location.address) return { ...location, coordinates };
      return {
        ...location,
        address: `Approximate location in ${location.city}, ${location.country}`,
        coordinates,
        isApproximate: true,
      };
    }),
  }));
};
