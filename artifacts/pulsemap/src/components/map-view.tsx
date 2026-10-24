import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Event } from "@workspace/api-client-react";
import { escapeHtml, ISTANBUL, spotsLeft } from "@/lib/pulse";

function AvailableTiles() {
  const map = useMap();
  useEffect(() => { map.attributionControl.setPrefix(false); }, [map]);
  return <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
    subdomains="abc"
    maxZoom={19}
  />;
}

export function pinIcon(emoji: string, pill: string | null, opts: { full?: boolean; selected?: boolean; pick?: boolean; isPrivate?: boolean; isPaid?: boolean; canceled?: boolean } = {}) {
  const cls = ["pm-pin", opts.selected ? "selected" : "", opts.pick ? "pick" : "", opts.canceled ? "canceled" : ""].join(" ");
  const badge = opts.isPrivate ? "pm-badge pm-private" : "pm-badge pm-public";
  return L.divIcon({
    className: "pm-pin-wrap",
    html: `<div class="${cls}"><div class="${badge}">${escapeHtml(emoji)}${opts.isPaid ? '<span class="pm-paid" aria-label="Paid">$</span>' : ""}</div>${
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
    map.flyTo([target[0], target[1]], Math.max(map.getZoom(), 15), { duration: 0.7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function EventMarker({ event, selected, onSelect }: { event: Event; selected: boolean; onSelect: (id: number) => void }) {
  const left = spotsLeft(event);
  const icon = useMemo(
    () => {
      const canceled = event.status === "canceled";
      return pinIcon(event.emoji, canceled ? "Canceled" : left === 0 ? "Full" : `${event.joinedCount}/${event.maxPeople}`, {
        full: left === 0 || canceled, selected, isPrivate: event.isPrivate, isPaid: event.isPaid, canceled,
      });
    },
    [event.emoji, event.joinedCount, event.maxPeople, left, selected, event.isPrivate, event.isPaid, event.status],
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

function CenterWatch({ onCenter }: { onCenter: (c: [number, number]) => void }) {
  const ref = useRef(onCenter);
  ref.current = onCenter;
  const map = useMapEvents({ moveend: () => { const c = map.getCenter(); ref.current([c.lat, c.lng]); } });
  useEffect(() => { const c = map.getCenter(); ref.current([c.lat, c.lng]); }, [map]);
  return null;
}

const meIcon = L.divIcon({ className: "pm-pin-wrap", html: '<div class="pm-me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

export function EventsMap({ events, selectedId, onSelect, onCenter, userLoc, locateTick = 0 }: { events: Event[]; selectedId: number | null; onSelect: (id: number) => void; onCenter?: (c: [number, number]) => void; userLoc?: [number, number] | null; locateTick?: number }) {
  const sel = events.find((e) => e.id === selectedId);
  return (
    <MapContainer center={ISTANBUL} zoom={13} zoomControl={false} className="h-full w-full" data-testid="map-events">
      <AvailableTiles />
      <AutoResize />
      <FlyTo target={sel ? [sel.lat, sel.lng] : null} />
      {onCenter && <CenterWatch onCenter={onCenter} />}
      {userLoc && <FlyTo target={locateTick ? [userLoc[0], userLoc[1], locateTick] as unknown as [number, number] : null} />}
      {userLoc && <Marker position={userLoc} icon={meIcon} interactive={false} />}
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
