'use client';

// Interactive 3D globe of every upcoming event (/map). MapLibre GL in globe
// projection over OpenFreeMap's free vector tiles (no API key, no quota);
// venues are clustered client-side, so zooming out sums events per region and
// zooming in splits clusters down to individual venues. Clicking a venue opens
// its event list. Data: lib/geo.ts -> /api/geo -> backend GET /geo/events.

import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MlMap,
  MapLayerMouseEvent,
  Popup as MlPopup,
} from 'maplibre-gl';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { CATEGORIES } from '@/lib/categories';
import { countryCodeFor } from '@/lib/countryCodes';
import { useFormatPrice } from '@/lib/currency';
import { isoCurrencyFor } from '@/lib/format';
import { fetchGeoData, isoDayFromToday, searchKey, type GeoData, type GeoEvent } from '@/lib/geo';
import { eventHref, venueHref } from '@/lib/slug';
import type { CategoryId } from '@/lib/types';
import { CountryFlag } from './Flag';
import { Icon } from './Icon';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const SOURCE = 'venues';
const INITIAL_CENTER: [number, number] = [8, 28];
/** Whole globe in view: smaller zoom on narrow (phone) screens. */
function initialZoom(): number {
  if (typeof window === 'undefined') return 1.7;
  const w = window.innerWidth;
  return w < 480 ? 0.8 : w < 900 ? 1.2 : 1.7;
}
/** Globe spin: degrees per second while idle at low zoom. */
const SPIN_DEG_PER_SEC = 4;
const SPIN_MAX_ZOOM = 3.5;
const PANEL_PAGE = 60;
/** MapLibre keeps the last camera padding for later moves: reset it explicitly. */
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const CLUSTER_MAX_ZOOM = 13;

const LAND = '#1c1f38';
const SEA = '#070914';
const LABEL = '#a3a6cc';
const BASEMAP_RESKIN: Record<string, Record<string, string>> = {
  background: { 'background-color': LAND },
  water: { 'fill-color': SEA },
  waterway: { 'line-color': SEA },
  landcover_ice_shelf: { 'fill-color': '#262a48' },
  landcover_glacier: { 'fill-color': '#262a48' },
  landcover_wood: { 'fill-color': '#1f2340' },
  landuse_park: { 'fill-color': '#1f2340' },
  landuse_residential: { 'fill-color': '#23264a' },
  building: { 'fill-color': '#262948', 'fill-outline-color': '#31355c' },
  // Roads, rails and airports: the source style draws them near-black, which
  // reads as black scars on the lighter land — keep them a few shades above it.
  highway_path: { 'line-color': '#262a4a' },
  highway_minor: { 'line-color': '#262a4a' },
  highway_major_casing: { 'line-color': '#2c3054' },
  highway_major_inner: { 'line-color': '#24284a' },
  highway_major_subtle: { 'line-color': '#2e3256' },
  highway_motorway_casing: { 'line-color': '#363a64' },
  highway_motorway_inner: { 'line-color': '#2c3056' },
  highway_motorway_subtle: { 'line-color': '#343862' },
  railway: { 'line-color': '#2a2e50' },
  railway_minor: { 'line-color': '#2a2e50' },
  railway_transit: { 'line-color': '#2a2e50' },
  railway_dashline: { 'line-color': LAND },
  railway_minor_dashline: { 'line-color': LAND },
  railway_transit_dashline: { 'line-color': LAND },
  road_area_pier: { 'fill-color': LAND },
  road_pier: { 'line-color': LAND },
  'aeroway-area': { 'fill-color': '#23264a' },
  'aeroway-taxiway': { 'line-color': '#2a2e50' },
  'aeroway-runway-casing': { 'line-color': '#2c3054' },
  'aeroway-runway': { 'line-color': '#2a2e50' },
  highway_name_other: { 'text-color': '#7d81b0', 'text-halo-color': SEA },
  highway_name_motorway: { 'text-color': '#8a8eba' },
  boundary_state: { 'line-color': '#3a3e66' },
  'boundary_country_z0-4': { 'line-color': '#5a5f94' },
  'boundary_country_z5-': { 'line-color': '#5a5f94' },
  water_name: { 'text-color': '#4c5288', 'text-halo-color': SEA },
  place_other: { 'text-color': LABEL },
  place_suburb: { 'text-color': LABEL },
  place_village: { 'text-color': LABEL },
  place_town: { 'text-color': LABEL },
  place_city: { 'text-color': LABEL },
  place_city_large: { 'text-color': '#c9cbec' },
  place_state: { 'text-color': '#7d81b0' },
  place_country_other: { 'text-color': '#c9cbec' },
  place_country_minor: { 'text-color': '#c9cbec' },
  place_country_major: { 'text-color': '#dcdef5' },
};

type Period = 'all' | 'week' | 'month' | 'quarter';
const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { week: 7, month: 30, quarter: 91 };

const CAT_COLOR = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color])) as Record<CategoryId, string>;

type Status = 'loading' | 'ready' | 'error';

interface Suggestion {
  kind: 'city' | 'venue';
  label: string;
  sub: string;
  lng: number;
  lat: number;
  venue?: number;
  count: number;
}

export function EventsGlobe() {
  const t = useTranslations('Map');
  const tCat = useTranslations('Categories');
  const locale = useLocale();
  const formatPrice = useFormatPrice();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [data, setData] = useState<GeoData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [reload, setReload] = useState(0);

  const [cats, setCats] = useState<Set<CategoryId>>(() => new Set());
  const [period, setPeriod] = useState<Period>('all');
  const [selected, setSelected] = useState<number | null>(null);
  /** Venues of a cluster that can't split further (same spot): listed in the panel. */
  const [venueList, setVenueList] = useState<number[] | null>(null);
  const [panelLimit, setPanelLimit] = useState(PANEL_PAGE);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  // ---------- data ----------
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    fetchGeoData(ctrl.signal)
      .then((d) => {
        setData(d);
        setStatus('ready');
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error('[map] load failed', err);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [reload]);

  const filtered = useMemo<GeoEvent[]>(() => {
    if (!data) return [];
    const until = period === 'all' ? null : isoDayFromToday(PERIOD_DAYS[period]);
    return data.events.filter((e) => (cats.size === 0 || cats.has(e.category)) && (!until || e.date <= until));
  }, [data, cats, period]);

  /** Per venue: event count + the category with the most events (pin colour). */
  const venueStats = useMemo(() => {
    const stats = new Map<number, { n: number; byCat: Partial<Record<CategoryId, number>> }>();
    for (const e of filtered) {
      let s = stats.get(e.venue);
      if (!s) stats.set(e.venue, (s = { n: 0, byCat: {} }));
      s.n++;
      s.byCat[e.category] = (s.byCat[e.category] ?? 0) + 1;
    }
    return stats;
  }, [filtered]);

  const geojson = useMemo<FeatureCollection<Point>>(() => {
    const features: Feature<Point>[] = [];
    if (data) {
      venueStats.forEach((s, vi) => {
        const v = data.venues[vi];
        let top: CategoryId = 'music';
        let best = -1;
        for (const [cat, n] of Object.entries(s.byCat) as [CategoryId, number][]) {
          if (n > best) [top, best] = [cat, n];
        }
        features.push({
          type: 'Feature',
          id: vi,
          geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
          properties: { i: vi, n: s.n, c: CAT_COLOR[top], name: v.name },
        });
      });
    }
    return { type: 'FeatureCollection', features };
  }, [data, venueStats]);

  // ---------- map init (once) ----------
  const selectRef = useRef(setSelected);
  selectRef.current = setSelected;
  const listRef = useRef(setVenueList);
  listRef.current = setVenueList;
  const dataRef = useRef<GeoData | null>(null);
  dataRef.current = data;
  const statsRef = useRef(venueStats);
  statsRef.current = venueStats;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;
    let popup: MlPopup | null = null;
    let stopSpinRef: (() => void) | null = null;

    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !containerRef.current) return;
      // MapLibre v6 parses tiles in a module worker served as its own file,
      // copied into public/vendor/ by next.config.mjs.
      ml.setWorkerUrl(new URL(process.env.NEXT_PUBLIC_MAPLIBRE_WORKER_URL!, window.location.origin).toString());

      const hasHash = /^#\d/.test(window.location.hash);
      map = new ml.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: INITIAL_CENTER,
        zoom: initialZoom(),
        hash: true, // #zoom/lat/lng in the URL: views are shareable
        attributionControl: false,
        maxPitch: 70,
        renderWorldCopies: false,
      });
      mapRef.current = map;
      // Dev-only handle for debugging from the console.
      if (process.env.NODE_ENV !== 'production') (window as unknown as { __neopMap?: MlMap }).__neopMap = map;
      // Map controls sit at the inline end, opposite the stats/reset buttons
      // (which follow the reading direction): bottom-left in he/ar.
      const corner = document.documentElement.dir === 'rtl' ? 'bottom-left' : 'bottom-right';
      // Default attribution: full text on wide screens, a collapsed ⓘ on narrow ones.
      map.addControl(new ml.AttributionControl(), corner);
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), corner);
      map.addControl(
        new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, fitBoundsOptions: { maxZoom: 9 } }),
        corner,
      );

      map.on('style.load', () => {
        if (!map) return;
        map.setProjection({ type: 'globe' });
        map.setSky({
          'sky-color': '#0b0820',
          'horizon-color': '#2a1f5c',
          'fog-color': '#07070b',
          'sky-horizon-blend': 0.6,
          'horizon-fog-blend': 0.5,
          'fog-ground-blend': 0.3,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
        });
        // Re-skin OpenFreeMap's near-black "dark" style in neop's indigo
        // palette, with land lighter than sea so continents read on the globe.
        for (const [layer, props] of Object.entries(BASEMAP_RESKIN)) {
          if (!map.getLayer(layer)) continue;
          for (const [prop, value] of Object.entries(props)) map.setPaintProperty(layer, prop as Parameters<MlMap['setPaintProperty']>[1], value);
        }

        map.addSource(SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
          clusterProperties: { n: ['+', ['get', 'n']] },
        });

        const eventsSize: ExpressionSpecification = ['get', 'n'];
        map.addLayer({
          id: 'cluster-halo',
          type: 'circle',
          source: SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['interpolate', ['linear'], eventsSize, 1, '#24e2f0', 60, '#8b5cf6', 600, '#ec24ba'],
            'circle-radius': ['interpolate', ['linear'], eventsSize, 1, 22, 60, 30, 600, 44, 6000, 62],
            'circle-opacity': 0.18,
            'circle-blur': 0.6,
          },
        });
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['interpolate', ['linear'], eventsSize, 1, '#24e2f0', 60, '#8b5cf6', 600, '#ec24ba'],
            'circle-radius': ['interpolate', ['linear'], eventsSize, 1, 13, 60, 18, 600, 26, 6000, 36],
            'circle-opacity': 0.9,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.55)',
          },
        });
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: SOURCE,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': [
              'case',
              ['>=', eventsSize, 1000],
              ['concat', ['to-string', ['/', ['round', ['/', eventsSize, 100]], 10]], 'k'],
              ['to-string', eventsSize],
            ],
            'text-font': ['Noto Sans Bold'],
            'text-size': 12,
            'text-allow-overlap': true,
          },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: 'venue-selected',
          type: 'circle',
          source: SOURCE,
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'i'], -1]],
          paint: {
            'circle-radius': ['interpolate', ['linear'], eventsSize, 1, 13, 20, 17, 100, 22],
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#24e2f0',
          },
        });
        map.addLayer({
          id: 'venues',
          type: 'circle',
          source: SOURCE,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'c'],
            'circle-radius': ['interpolate', ['linear'], eventsSize, 1, 6, 20, 9, 100, 13],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.addLayer({
          id: 'venue-labels',
          type: 'symbol',
          source: SOURCE,
          minzoom: 11,
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 12,
            'text-offset': [0, 1.3],
            'text-anchor': 'top',
            'text-max-width': 10,
          },
          paint: { 'text-color': '#f5f4f8', 'text-halo-color': '#07070b', 'text-halo-width': 1.5 },
        });

        setMapReady(true);
      });

      // ---- interactions ----
      map.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!map || !f || f.geometry.type !== 'Point') return;
        const src = map.getSource(SOURCE) as GeoJSONSource;
        const center = f.geometry.coordinates as [number, number];
        const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id);
        if (zoom > CLUSTER_MAX_ZOOM) {
          // These venues share (almost) the same spot — typically several
          // only placed at their city centre — so zooming never splits them:
          // list them in the panel instead.
          const leaves = await src.getClusterLeaves(f.properties.cluster_id, 1000, 0);
          selectRef.current(null);
          listRef.current(leaves.map((l) => Number(l.properties?.i)));
          if (map.getZoom() < 11) map.easeTo({ center, zoom: 11, duration: 700 });
          return;
        }
        // At least +2 levels per click: the expansion zoom alone barely moves at
        // globe scale, where one cluster can hold a whole continent.
        const target = Math.min(Math.max(zoom + 0.3, map.getZoom() + 2), 16);
        map.easeTo({ center, zoom: target, duration: 700 });
      });
      map.on('click', 'venues', (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const vi = Number(f.properties.i);
        listRef.current((list) => (list?.includes(vi) ? list : null));
        selectRef.current(vi);
      });
      map.on('click', (e) => {
        if (!map) return;
        const hit = map.queryRenderedFeatures(e.point, { layers: ['venues', 'clusters'] });
        if (hit.length === 0) {
          selectRef.current(null);
          listRef.current(null);
        }
      });
      for (const layer of ['clusters', 'venues']) {
        map.on('mouseenter', layer, () => map && (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layer, () => map && (map.getCanvas().style.cursor = ''));
      }

      // Hover tooltip (pointer devices only).
      if (window.matchMedia('(hover: hover)').matches) {
        popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'globe-popup' });
        map.on('mousemove', 'venues', (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          const d = dataRef.current;
          if (!map || !popup || !f || !d || f.geometry.type !== 'Point') return;
          const v = d.venues[Number(f.properties.i)];
          const n = statsRef.current.get(Number(f.properties.i))?.n ?? 0;
          const el = document.createElement('div');
          const strong = document.createElement('strong');
          strong.textContent = v.name;
          const sub = document.createElement('span');
          sub.textContent = `${v.city} · ${tRef.current('eventsCount', { count: n })}`;
          el.append(strong, sub);
          popup.setLngLat(f.geometry.coordinates as [number, number]).setDOMContent(el).addTo(map);
        });
        map.on('mouseleave', 'venues', () => popup?.remove());
      }

      // Slow idle spin of the globe, stopped for good by the first interaction.
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let spinning = !hasHash && !reduceMotion;
      const stopSpin = () => {
        spinning = false;
      };
      const spin = () => {
        if (!map || !spinning || map.getZoom() > SPIN_MAX_ZOOM) return;
        const c = map.getCenter();
        c.lng -= SPIN_DEG_PER_SEC;
        map.easeTo({ center: c, duration: 1000, easing: (x) => x });
      };
      map.on('mousedown', stopSpin);
      map.on('touchstart', stopSpin);
      map.on('wheel', stopSpin);
      map.on('dragstart', stopSpin);
      stopSpinRef = stopSpin;
      window.addEventListener('hashchange', stopSpin);
      map.on('moveend', spin);
      map.once('load', spin);
    })();

    return () => {
      cancelled = true;
      if (stopSpinRef) window.removeEventListener('hashchange', stopSpinRef);
      popup?.remove();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Push filtered data into the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(geojson);
  }, [mapReady, geojson]);

  // Highlight + reset the panel's paging when the selection changes.
  useEffect(() => {
    setPanelLimit(PANEL_PAGE);
    const map = mapRef.current;
    if (!mapReady || !map) return;
    map.setFilter('venue-selected', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'i'], selected ?? -1]]);
  }, [mapReady, selected]);

  // A filter change that empties the selected venue closes the panel.
  useEffect(() => {
    if (selected != null && !venueStats.has(selected)) setSelected(null);
  }, [venueStats, selected]);

  // ---------- search ----------
  const searchIndex = useMemo(() => {
    if (!data) return null;
    const cities = new Map<string, { label: string; sub: string; lng: number; lat: number; k: number; count: number }>();
    data.venues.forEach((v) => {
      if (!v.city) return;
      const key = `${v.city}|${v.country}`;
      const c = cities.get(key);
      if (c) {
        c.lng += v.lng;
        c.lat += v.lat;
        c.k++;
      } else cities.set(key, { label: v.city, sub: v.country, lng: v.lng, lat: v.lat, k: 1, count: 0 });
    });
    for (const e of data.events) {
      const v = data.venues[e.venue];
      const c = cities.get(`${v.city}|${v.country}`);
      if (c) c.count++;
    }
    return {
      cities: Array.from(cities.values()).map((c) => ({ ...c, lng: c.lng / c.k, lat: c.lat / c.k, key: searchKey(c.label) })),
      venues: data.venues.map((v, i) => ({ i, key: searchKey(v.name), v })),
    };
  }, [data]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = searchKey(query);
    if (!searchIndex || q.length < 2) return [];
    const rank = (key: string) => (key.startsWith(q) ? 0 : key.includes(` ${q}`) ? 1 : key.includes(q) ? 2 : -1);
    const cityHits = searchIndex.cities
      .map((c) => ({ c, r: rank(c.key) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || b.c.count - a.c.count)
      .slice(0, 5)
      .map(({ c }): Suggestion => ({ kind: 'city', label: c.label, sub: c.sub, lng: c.lng, lat: c.lat, count: c.count }));
    const venueHits = searchIndex.venues
      .map((x) => ({ x, r: rank(x.key) }))
      .filter((y) => y.r >= 0)
      .sort((a, b) => a.r - b.r || (venueStats.get(b.x.i)?.n ?? 0) - (venueStats.get(a.x.i)?.n ?? 0))
      .slice(0, 5)
      .map(({ x }): Suggestion => ({
        kind: 'venue',
        label: x.v.name,
        sub: [x.v.city, x.v.country].filter(Boolean).join(', '),
        lng: x.v.lng,
        lat: x.v.lat,
        venue: x.i,
        count: venueStats.get(x.i)?.n ?? 0,
      }));
    return [...cityHits, ...venueHits];
  }, [query, searchIndex, venueStats]);

  const goTo = useCallback((s: Suggestion) => {
    const map = mapRef.current;
    setSearchOpen(false);
    setQuery(s.label);
    if (!map) return;
    // A venue opens the side panel (bottom sheet on phones): offset the camera
    // so the pin isn't hidden under it.
    const phone = window.innerWidth < 760;
    const rtl = document.documentElement.dir === 'rtl';
    const padding =
      s.kind !== 'venue' ? NO_PADDING : phone ? { bottom: window.innerHeight * 0.5 } : rtl ? { left: 410 } : { right: 410 };
    map.flyTo({ center: [s.lng, s.lat], zoom: s.kind === 'city' ? 10 : 14.5, speed: 1.4, essential: true, padding });
    setVenueList(null);
    setSelected(s.venue ?? null);
  }, []);

  const resetView = useCallback(() => {
    setSelected(null);
    setVenueList(null);
    mapRef.current?.flyTo({ center: INITIAL_CENTER, zoom: initialZoom(), pitch: 0, bearing: 0, speed: 1.2, padding: NO_PADDING });
  }, []);

  // ---------- derived UI ----------
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const selectedVenue = data && selected != null ? data.venues[selected] : null;
  const listedVenues = useMemo(
    () =>
      (venueList ?? [])
        .filter((vi) => venueStats.has(vi))
        .sort((a, b) => (venueStats.get(b)?.n ?? 0) - (venueStats.get(a)?.n ?? 0)),
    [venueList, venueStats],
  );
  const closePanel = useCallback(() => {
    setSelected(null);
    setVenueList(null);
  }, []);
  const selectedEvents = useMemo(
    () => (selected == null ? [] : filtered.filter((e) => e.venue === selected)),
    [filtered, selected],
  );
  const dateFmt = useMemo(() => {
    const day = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' });
    const month = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    const year = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: 'UTC' });
    return (iso: string) => {
      const d = new Date(`${iso}T00:00:00Z`);
      return { day: day.format(d), month: month.format(d), weekday: weekday.format(d), year: year.format(d) };
    };
  }, [locale]);
  const thisYear = String(new Date().getFullYear());

  function toggleCat(id: CategoryId) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="globe-wrap">
      <div ref={containerRef} className="globe-map" aria-label={t('mapLabel')} role="region" />

      {/* filters */}
      <div className="globe-controls">
        <div className="globe-search" role="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
              setActiveSuggestion(0);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            onKeyDown={(e) => {
              if (!suggestions.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion((i) => (i + 1) % suggestions.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                goTo(suggestions[activeSuggestion] ?? suggestions[0]);
              } else if (e.key === 'Escape') setSearchOpen(false);
            }}
          />
          {searchOpen && query.trim().length >= 2 && (
            <div className="globe-suggest" role="listbox">
              {suggestions.length === 0 ? (
                <div className="globe-suggest-empty">{status === 'loading' ? t('loading') : t('noResults')}</div>
              ) : (
                suggestions.map((s, i) => (
                  <button
                    key={`${s.kind}-${s.label}-${s.sub}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={i === activeSuggestion}
                    className={i === activeSuggestion ? 'active' : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo(s)}
                  >
                    <Icon name={s.kind === 'city' ? 'globe' : 'pin'} size={15} />
                    <span className="globe-suggest-text">
                      <strong>{s.label}</strong>
                      <span>{s.sub}</span>
                    </span>
                    <span className="globe-suggest-count">{t('eventsCount', { count: s.count })}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="globe-chips">
          <button
            type="button"
            className={`globe-chip${cats.size === 0 ? ' on' : ''}`}
            aria-pressed={cats.size === 0}
            onClick={() => setCats(new Set())}
          >
            {t('allCategories')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`globe-chip${cats.has(c.id) ? ' on' : ''}`}
              aria-pressed={cats.has(c.id)}
              style={{ '--chip-color': c.color } as React.CSSProperties}
              onClick={() => toggleCat(c.id)}
            >
              <span className="globe-dot" />
              {tCat(c.id)}
            </button>
          ))}
          <select
            className="globe-chip globe-select"
            value={period}
            aria-label={t('periodLabel')}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="all">{t('periodAll')}</option>
            <option value="week">{t('periodWeek')}</option>
            <option value="month">{t('periodMonth')}</option>
            <option value="quarter">{t('periodQuarter')}</option>
          </select>
        </div>
      </div>

      {/* stats + reset */}
      <div className="globe-footer">
        {status === 'ready' && (
          <span className="globe-stats" aria-live="polite">
            {t('stats', { events: filtered.length, venues: venueStats.size, eventsFmt: nf.format(filtered.length), venuesFmt: nf.format(venueStats.size) })}
          </span>
        )}
        <button type="button" className="globe-chip" onClick={resetView}>
          <Icon name="globe" size={15} /> {t('resetView')}
        </button>
      </div>

      {/* loading / error */}
      {status !== 'ready' && (
        <div className="globe-overlay" role="status">
          {status === 'loading' ? (
            <>
              <span className="globe-spinner" aria-hidden />
              {t('loading')}
            </>
          ) : (
            <>
              {t('error')}
              <button type="button" className="globe-chip on" onClick={() => setReload((n) => n + 1)}>
                {t('retry')}
              </button>
            </>
          )}
        </div>
      )}
      {status === 'ready' && filtered.length === 0 && <div className="globe-overlay">{t('empty')}</div>}

      {/* venue panel */}
      {selectedVenue && selected != null && (
        <aside className="globe-panel" aria-label={selectedVenue.name}>
          {listedVenues.includes(selected) && (
            <button type="button" className="globe-back" onClick={() => setSelected(null)}>
              <span aria-hidden>←</span> {t('back')}
            </button>
          )}
          <div className="globe-panel-head">
            <div style={{ minWidth: 0 }}>
              <h2>{selectedVenue.name}</h2>
              <div className="globe-panel-place">
                {countryCodeFor(selectedVenue.country) && (
                  <CountryFlag code={countryCodeFor(selectedVenue.country)!} width={18} />
                )}
                <span>{[selectedVenue.city, selectedVenue.country].filter(Boolean).join(', ')}</span>
              </div>
              {!selectedVenue.precise && <div className="globe-panel-note">{t('approxLocation')}</div>}
            </div>
            <button type="button" className="globe-close" aria-label={t('close')} onClick={closePanel}>
              ×
            </button>
          </div>
          <div className="globe-panel-meta">
            <span>{t('eventsCount', { count: selectedEvents.length })}</span>
            <Link href={venueHref(selectedVenue.id, selectedVenue.name)} prefetch={false}>
              {t('viewVenue')} <Icon name="arrow" size={13} />
            </Link>
          </div>
          <ul className="globe-events">
            {selectedEvents.slice(0, panelLimit).map((e) => {
              const d = dateFmt(e.date);
              return (
                <li key={e.id}>
                  <Link
                    href={eventHref({ id: e.id, title: e.title, artist: e.artist, city: selectedVenue.city })}
                    prefetch={false}
                  >
                    <span className="globe-date" style={{ '--chip-color': CAT_COLOR[e.category] } as React.CSSProperties}>
                      <span>{d.month}</span>
                      <strong>{d.day}</strong>
                    </span>
                    <span className="globe-event-text">
                      <strong>{e.title}</strong>
                      <span>
                        {d.weekday}
                        {d.year !== thisYear ? ` ${d.year}` : ''}
                        {e.time ? ` · ${e.time}` : ''} · {tCat(e.category)}
                      </span>
                    </span>
                    {e.price != null && (
                      <span className="globe-price">
                        {t('fromPrice', { price: formatPrice(e.price, isoCurrencyFor(selectedVenue.country)) })}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          {selectedEvents.length > panelLimit && (
            <button type="button" className="globe-more" onClick={() => setPanelLimit((n) => n + PANEL_PAGE)}>
              {t('showMore', { count: Math.min(PANEL_PAGE, selectedEvents.length - panelLimit) })}
            </button>
          )}
        </aside>
      )}

      {/* venues sharing one spot */}
      {selected == null && data && listedVenues.length > 0 && (
        <aside className="globe-panel" aria-label={t('venuesHere', { count: listedVenues.length })}>
          <div className="globe-panel-head">
            <div style={{ minWidth: 0 }}>
              <h2>{t('venuesHere', { count: listedVenues.length })}</h2>
              <div className="globe-panel-place">
                <span>{data.venues[listedVenues[0]].city}</span>
              </div>
            </div>
            <button type="button" className="globe-close" aria-label={t('close')} onClick={closePanel}>
              ×
            </button>
          </div>
          <ul className="globe-events globe-venue-list">
            {listedVenues.map((vi) => {
              const v = data.venues[vi];
              return (
                <li key={v.id}>
                  <button type="button" onClick={() => setSelected(vi)}>
                    <span className="globe-event-text">
                      <strong>{v.name}</strong>
                      <span>{t('eventsCount', { count: venueStats.get(vi)?.n ?? 0 })}</span>
                    </span>
                    <Icon name="arrow" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </div>
  );
}
