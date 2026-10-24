import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetMapConfig, getGetMapConfigQueryKey, type Event } from "@workspace/api-client-react";
import { escapeHtml, ISTANBUL, spotsLeft } from "@/lib/pulse";

function AvailableTiles() {
  const { data, isError } = useGetMapConfig({ query: {
    queryKey: getGetMapConfigQueryKey(), staleTime: 5 * 60000, retry: 1,
  } });
  if (!data) return <div className="absolute bottom-8 left-3 z-[500] rounded-lg bg-white px-3 py-2 text-xs text-slate-700" role="status">
    {isError ? "Map provider unavailable. Event details are still available." : "Loading neighborhood map…"}
  </div>;
  return <>
    <TileLayer key={data.url} url={data.url} attribution={data.attribution} subdomains="abcd" maxZoom={data.maxZoom} />
    {data.fallback && <div className="absolute bottom-7 left-3 right-3 z-[500] w-fit max-w-[calc(100%-1.5rem)] rounded-lg bg-white/95 px-3 py-1.5 text-[10px] text-slate-600 shadow-sm" role="status">{data.notice}</div>}
  </>;
}

export function pinIcon(emoji: string, pill: string | null, opts: { full?: boolean; selected?: boolean; pick?: boolean } = {}) {
  const cls = ["pm-pin", opts.selected ? "selected" : "", opts.pick ? "pick" : ""].join(" ");
  return L.divIcon({
    className: "pm-pin-wrap",
    html: `<div class="${cls}"><div class="pm-badge">${escapeHtml(emoji)}</div>${
      pill ? `<span class="pm-pill ${opts.full ? "full" : ""}">${escapeHtml(pill)}</span>` : ""
    }<div class="pm-tail"></div></div>`,
    iconSize: [64, 84],
    iconAnchor: [32, 80],
  });
}

function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const key = target ? target.join(",") : "";
  useEffect(() => {
    if (!target) return;
    map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function EventMarker({ event, selected, onSelect }: { event: Event; selected: boolean; onSelect: (id: number) => void }) {
  const left = spotsLeft(event);
  const icon = useMemo(
    () => pinIcon(event.emoji, left === 0 ? "Full" : `${event.joinedCount}/${event.maxPeople}`, { full: left === 0, selected }),
    [event.emoji, event.joinedCount, event.maxPeople, left, selected],
  );
  return (
    <Marker
      position={[event.lat, event.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      title={event.title}
      keyboard
      eventHandlers={{ click: () => onSelect(event.id) }}
    />
  );
}

export function EventsMap({ events, selectedId, onSelect }: { events: Event[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const sel = events.find((e) => e.id === selectedId);
  return (
    <MapContainer center={ISTANBUL} zoom={13} zoomControl={false} className="h-full w-full" data-testid="map-events">
      <AvailableTiles />
      <AutoResize />
      <FlyTo target={sel ? [sel.lat, sel.lng] : null} />
      {events.map((e) => (
        <EventMarker key={e.id} event={e} selected={e.id === selectedId} onSelect={onSelect} />
      ))}
    </MapContainer>
  );
}

function ClickPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)) });
  return null;
}

export function PickerMap({ lat, lng, emoji, onPick }: { lat: number | null; lng: number | null; emoji: string; onPick: (lat: number, lng: number) => void }) {
  const icon = useMemo(() => pinIcon(emoji || "📍", null, { pick: true }), [emoji]);
  return (
    <MapContainer center={lat != null && lng != null ? [lat, lng] : ISTANBUL} zoom={14} className="h-full w-full cursor-crosshair" data-testid="map-picker">
      <AvailableTiles />
      <AutoResize />
      <ClickPick onPick={onPick} />
      {lat != null && lng != null && <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
  );
}
