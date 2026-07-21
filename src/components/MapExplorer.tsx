import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowDownUp,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Factory,
  Globe2,
  Layers3,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UsersRound,
  X,
} from 'lucide-react';
import type { Company, CompanyLocation } from '../lib/types';
import './MapExplorer.css';

interface Props { companies: Company[] }
type SortKey = 'added-desc' | 'added-asc' | 'founded-desc' | 'founded-asc' | 'funding-desc' | 'funding-asc' | 'name-asc';
type MobileView = 'list' | 'map';

const COMPANY_SOURCE_ID = 'company-locations';
const CLUSTER_HALO_LAYER_ID = 'company-cluster-halo';
const CLUSTER_LAYER_ID = 'company-clusters';
const CLUSTER_COUNT_LAYER_ID = 'company-cluster-count';
const COMPANY_POINT_LAYER_ID = 'company-point-loader';

const formatHost = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const formatFunding = (company: Company) => {
  const funding = company.options?.funding;
  if (!funding) return 'Not listed';
  if (funding.amount == null) return funding.stage;
  const amount = funding.amount >= 1000
    ? `${(funding.amount / 1000).toFixed(funding.amount % 1000 === 0 ? 0 : 1)}B`
    : `${funding.amount}M`;
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  const currency = funding.currency ? (symbols[funding.currency] || funding.currency) : '';
  return `${currency}${amount} · ${funding.stage}`;
};
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function MapExplorer({ companies }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [country, setCountry] = useState('All Europe');
  const [employeeRange, setEmployeeRange] = useState('Any team size');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('added-desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('list');

  const allCategories = useMemo(() => [...new Set(companies.flatMap((company) => company.categories))].sort(), [companies]);
  const allCountries = useMemo(() => [...new Set(companies.flatMap((company) => company.locations.map((location) => location.country)))].sort(), [companies]);
  const employeeRanges = useMemo(() => [...new Set(companies.map((company) => company.options?.employees).filter(Boolean))] as string[], [companies]);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies
      .filter((company) => {
        const matchesQuery = !normalizedQuery || [company.name, company.links.website, company.description, ...company.categories]
          .join(' ').toLowerCase().includes(normalizedQuery);
        const matchesCategories = categories.length === 0 || categories.every((category) => company.categories.includes(category));
        const matchesCountry = country === 'All Europe' || company.locations.some((location) => location.country === country);
        const matchesEmployees = employeeRange === 'Any team size' || company.options?.employees === employeeRange;
        const matchesRemote = !remoteOnly || company.options?.remoteHiring === true;
        return matchesQuery && matchesCategories && matchesCountry && matchesEmployees && matchesRemote;
      })
      .sort((a, b) => {
        if (sort === 'name-asc') return a.name.localeCompare(b.name);
        if (sort.startsWith('added')) {
          const result = a.addedAt.localeCompare(b.addedAt);
          return sort.endsWith('desc') ? -result : result;
        }
        if (sort.startsWith('founded')) {
          const av = a.options?.founded ?? -Infinity;
          const bv = b.options?.founded ?? -Infinity;
          return sort.endsWith('desc') ? bv - av : av - bv;
        }
        const av = a.options?.funding?.amount ?? -Infinity;
        const bv = b.options?.funding?.amount ?? -Infinity;
        return sort.endsWith('desc') ? bv - av : av - bv;
      });
  }, [companies, query, categories, country, employeeRange, remoteOnly, sort]);

  const selectedCompany = useMemo(() => companies.find((company) => company.id === selectedId) ?? null, [companies, selectedId]);
  const activeFilterCount = categories.length + (country !== 'All Europe' ? 1 : 0) + (employeeRange !== 'Any team size' ? 1 : 0) + Number(remoteOnly);
  const locationGeoJson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredCompanies.flatMap((company) => company.locations.map((location) => ({
      type: 'Feature' as const,
      id: location.id,
      geometry: { type: 'Point' as const, coordinates: location.coordinates },
      properties: {
        companyId: company.id,
        locationId: location.id,
        companyName: company.name,
        city: location.city,
      },
    }))),
  }), [filteredCompanies]);

  const resetFilters = useCallback(() => {
    setQuery(''); setCategories([]); setCountry('All Europe'); setEmployeeRange('Any team size');
    setRemoteOnly(false); setSort('added-desc');
  }, []);

  const fitVisible = useCallback(() => {
    if (!mapRef.current || filteredCompanies.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    filteredCompanies.flatMap((company) => company.locations).forEach((location) => bounds.extend(location.coordinates));
    mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 6.2, duration: 850 });
  }, [filteredCompanies]);

  useEffect(() => {
    if (mapReady) fitVisible();
  }, [mapReady, fitVisible]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [8.2, 50.4],
      zoom: 3.45,
      minZoom: 2.2,
      maxZoom: 15,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', () => {
      map.addSource(COMPANY_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 6,
        clusterRadius: 42,
      });
      map.addLayer({
        id: CLUSTER_HALO_LAYER_ID,
        type: 'circle',
        source: COMPANY_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 25,
          'circle-color': 'rgba(228, 96, 67, 0.72)',
        },
      });
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: COMPANY_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 20,
          'circle-color': '#141414',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: COMPANY_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: COMPANY_POINT_LAYER_ID,
        type: 'circle',
        source: COMPANY_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 0, 'circle-opacity': 0 },
      });

      const expandCluster = async (event: maplibregl.MapMouseEvent) => {
        const cluster = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] })[0];
        if (cluster?.geometry.type !== 'Point') return;
        const source = map.getSource(COMPANY_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (!source) return;
        const zoom = await source.getClusterExpansionZoom(Number(cluster.properties?.cluster_id));
        map.easeTo({ center: cluster.geometry.coordinates as [number, number], zoom, duration: 650 });
      };

      map.on('click', CLUSTER_LAYER_ID, expandCluster);
      map.on('mouseenter', CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', CLUSTER_LAYER_ID, () => { map.getCanvas().style.cursor = ''; });
      setMapReady(true);
    });
    map.on('error', (event) => {
      if (!event.error?.message?.includes('sprite')) setMapFailed(true);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource(COMPANY_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(locationGeoJson);
  }, [locationGeoJson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (!map.getSource(COMPANY_SOURCE_ID)) return;

    const markerCache = new Map<string, maplibregl.Marker>();
    let markersOnScreen = new Map<string, maplibregl.Marker>();

    const makeLogoMarker = (company: Company, city: string) => {
      const element = document.createElement('button');
      element.className = `map-marker${selectedId === company.id ? ' is-selected' : ''}`;
      element.type = 'button';
      element.setAttribute('aria-label', `${company.name} in ${city}`);
      element.title = `${company.name} · ${city}`;

      const core = document.createElement('span');
      core.className = 'map-marker__core';
      const fallback = document.createElement('span');
      fallback.textContent = initials(company.name);

      if (company.links.logo) {
        const logo = document.createElement('img');
        logo.src = company.links.logo;
        logo.alt = '';
        logo.addEventListener('error', () => logo.replaceWith(fallback), { once: true });
        core.append(logo);
      } else {
        core.append(fallback);
      }

      element.append(core);
      element.addEventListener('click', () => {
        setSelectedId(company.id);
        setMobileView('map');
      });
      return new maplibregl.Marker({ element, anchor: 'bottom' });
    };

    const updateMarkers = () => {
      const nextMarkers = new Map<string, maplibregl.Marker>();
      const features = map.querySourceFeatures(COMPANY_SOURCE_ID);

      features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') return;
        const coordinates = feature.geometry.coordinates as [number, number];
        const properties = feature.properties ?? {};
        if (properties.cluster) return;
        const id = `location-${properties.locationId}`;
        if (nextMarkers.has(id)) return;

        let marker = markerCache.get(id);
        if (!marker) {
          const company = companies.find((item) => item.id === properties.companyId);
          if (!company) return;
          marker = makeLogoMarker(company, String(properties.city));
          markerCache.set(id, marker);
        }

        marker.setLngLat(coordinates);
        if (!markersOnScreen.has(id)) marker.addTo(map);
        nextMarkers.set(id, marker);
      });

      markersOnScreen.forEach((marker, id) => {
        if (!nextMarkers.has(id)) marker.remove();
      });
      markersOnScreen = nextMarkers;
    };

    map.on('render', updateMarkers);
    updateMarkers();
    return () => {
      map.off('render', updateMarkers);
      markerCache.forEach((marker) => marker.remove());
      markerCache.clear();
      markersOnScreen.clear();
    };
  }, [companies, mapReady, selectedId]);

  useEffect(() => {
    if (!selectedCompany || !mapRef.current) return;
    const headquarters = selectedCompany.locations.find((location) => location.type === 'headquarters') ?? selectedCompany.locations[0];
    mapRef.current.flyTo({ center: headquarters.coordinates, zoom: 7, duration: 950, essential: true, padding: { left: 0, right: 0, top: 0, bottom: 80 } });
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedId && !filteredCompanies.some((company) => company.id === selectedId)) setSelectedId(null);
  }, [filteredCompanies, selectedId]);

  return (
    <div className={`explorer mobile-view--${mobileView}`}>
      <aside className="directory-panel">
        <div className="directory-tools">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search companies</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, site, or field" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}
          </label>
          <button className={`filter-button ${filtersOpen ? 'active' : ''}`} type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
            <SlidersHorizontal size={16} /> Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </div>

        {filtersOpen && (
          <div className="filter-drawer">
            <div className="filter-drawer__top"><strong>Refine the atlas</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={17} /></button></div>
            <label><span>Location</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option>All Europe</option>{allCountries.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Team size</span><select value={employeeRange} onChange={(event) => setEmployeeRange(event.target.value)}><option>Any team size</option>{employeeRanges.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="filter-checks">
              <label><input type="checkbox" checked={remoteOnly} onChange={(event) => setRemoteOnly(event.target.checked)} /><span>Remote hiring</span></label>
            </div>
            <div className="filter-categories"><span>Categories</span><div>{allCategories.map((category) => <button className={categories.includes(category) ? 'selected' : ''} type="button" key={category} onClick={() => setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category])}>{category}</button>)}</div></div>
            {activeFilterCount > 0 && <button className="reset-button" type="button" onClick={resetFilters}><RotateCcw size={14} /> Reset all filters</button>}
          </div>
        )}

        <div className="results-bar">
          <span><strong>{filteredCompanies.length}</strong> {filteredCompanies.length === 1 ? 'company' : 'companies'} · {filteredCompanies.reduce((sum, company) => sum + company.locations.length, 0)} places</span>
          <label className="sort-control" title="Sort results">
            <ArrowDownUp size={14} />
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort companies">
              <option value="added-desc">Newest added</option><option value="added-asc">Oldest added</option>
              <option value="founded-desc">Founded: new–old</option><option value="founded-asc">Founded: old–new</option>
              <option value="funding-desc">Funding: high–low</option><option value="funding-asc">Funding: low–high</option>
              <option value="name-asc">Name: A–Z</option>
            </select>
          </label>
        </div>

        <div className="company-list" aria-live="polite">
          {filteredCompanies.map((company, index) => (
            <button className={`company-card ${selectedId === company.id ? 'is-selected' : ''}`} type="button" key={company.id} onClick={() => { setSelectedId(company.id); setMobileView('map'); }} style={{ '--delay': `${Math.min(index * 45, 360)}ms` } as React.CSSProperties}>
              <CompanyLogo company={company} />
              <span className="company-card__body">
                <span className="company-card__top"><strong>{company.name}</strong>{company.options?.remoteHiring && <span className="remote-tag"><Radio size={10} /> Remote</span>}</span>
                <span className="company-location"><MapPin size={12} /> {company.locations[0].city}, {company.locations[0].country}{company.locations.length > 1 && ` +${company.locations.length - 1}`}</span>
                <span className="company-description">{company.description}</span>
                <span className="category-row">{company.categories.slice(0, 2).map((category) => <span key={category}>{category}</span>)}</span>
              </span>
              <ChevronRight className="card-arrow" size={17} />
            </button>
          ))}
          {filteredCompanies.length === 0 && (
            <div className="empty-state"><span>0</span><h2>No coordinates found.</h2><p>Try removing one or two filters to widen the search.</p><button type="button" onClick={resetFilters}>Clear everything</button></div>
          )}
          <a className="list-cta" href="https://github.com/ahmedsulaiman/europe-robotics-map/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer"><span><b>Missing a company?</b><small>Add the next point to the map.</small></span><ArrowUpRight size={18} /></a>
        </div>
      </aside>

      <section className="map-stage" aria-label="Map of European robotics companies">
        <div className="map-grid" aria-hidden="true"></div>
        <div ref={mapContainerRef} className="map-container" />
        {!mapReady && !mapFailed && <div className="map-loading"><span></span>Plotting coordinates…</div>}
        {mapFailed && <div className="map-error"><MapIcon size={24} /><strong>Map tiles are offline</strong><span>The company index still works. Check your connection to load the geographic layer.</span></div>}

        {selectedCompany && (
          <CompanyDetail company={selectedCompany} onClose={() => setSelectedId(null)} onLocation={(location) => mapRef.current?.flyTo({ center: location.coordinates, zoom: 9, duration: 850, essential: true })} />
        )}
      </section>

      <div className="mobile-switcher" role="tablist" aria-label="Choose map or list view">
        <button role="tab" aria-selected={mobileView === 'list'} className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><List size={16} /> List</button>
        <button role="tab" aria-selected={mobileView === 'map'} className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapIcon size={16} /> Map <span>{filteredCompanies.length}</span></button>
      </div>
    </div>
  );
}

function CompanyDetail({ company, onClose, onLocation }: { company: Company; onClose: () => void; onLocation: (location: CompanyLocation) => void }) {
  return (
    <article className="company-detail">
      <div className="detail-handle" aria-hidden="true"></div>
      <div className="detail-heading">
        <CompanyLogo company={company} large />
        <div><span className="eyebrow">COMPANY PROFILE</span><h2>{company.name}</h2><a href={company.links.website} target="_blank" rel="noreferrer">{formatHost(company.links.website)} <ArrowUpRight size={12} /></a></div>
        <button type="button" onClick={onClose} aria-label="Close company details"><X size={18} /></button>
      </div>
      <p className="detail-description">{company.description}</p>
      <div className="detail-categories">{company.categories.map((category) => <span key={category}>{category}</span>)}</div>
      <dl className="detail-metrics">
        <div><dt><Calendar size={14} /> Founded</dt><dd>{company.options?.founded ?? 'Not listed'}</dd></div>
        <div><dt><UsersRound size={14} /> Team</dt><dd>{company.options?.employees ?? 'Not listed'}</dd></div>
        <div><dt><CircleDollarSign size={14} /> Funding</dt><dd>{formatFunding(company)}</dd></div>
      </dl>
      <div className="detail-locations">
        <span className="detail-section-label"><Layers3 size={13} /> European presence</span>
        <div>{company.locations.map((location) => <button type="button" key={location.id} onClick={() => onLocation(location)}><span className={`location-icon location-icon--${location.type}`}>{location.type === 'factory' ? <Factory size={13} /> : location.type === 'headquarters' ? <Building2 size={13} /> : <MapPin size={13} />}</span><span><b>{location.city}</b><small>{location.type} · {location.country}</small></span><LocateFixed size={14} /></button>)}</div>
      </div>
      {company.options?.remoteHiring && <div className="remote-note"><Radio size={15} /><span><b>Remote-friendly hiring</b><small>This company lists remote-friendly opportunities.</small></span></div>}
      <div className="detail-actions">
        {company.links.careers && <a className="primary-action" href={company.links.careers} target="_blank" rel="noreferrer"><BriefcaseBusiness size={15} /> View open roles <ArrowUpRight size={14} /></a>}
        <a className="secondary-action" href={company.links.website} target="_blank" rel="noreferrer"><Globe2 size={15} /> Website</a>
      </div>
      <small className="data-note">Added to the collection · {company.addedAt}</small>
    </article>
  );
}

function CompanyLogo({ company, large = false }: { company: Company; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const className = `company-logo${large ? ' company-logo--large' : ''}`;

  return (
    <span className={className} aria-hidden="true">
      {!failed && company.links.logo
        ? <img src={company.links.logo} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <span>{initials(company.name)}</span>}
    </span>
  );
}
