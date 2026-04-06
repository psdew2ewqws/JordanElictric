"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Marker {
  lat: number;
  lng: number;
  label: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  REPORTED: "#EF4444",
  ACKNOWLEDGED: "#3B9ECF",
  CREW_DISPATCHED: "#A855F7",
  RESOLVED: "#22C55E",
  UNDER_REVIEW: "#3B9ECF",
  ACTION_TAKEN: "#F59E0B",
  CLOSED: "#8899A6",
};

export default function MapView({ markers }: { markers: Marker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Default center: Amman, Jordan
    const map = L.map(mapRef.current, {
      center: [31.95, 35.93],
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    // Add markers
    markers.forEach((m) => {
      const color = STATUS_COLORS[m.status] || "#8899A6";
      L.circleMarker([m.lat, m.lng], {
        radius: 8,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4,
      })
        .addTo(map)
        .bindPopup(`<b style="font-family:monospace;font-size:11px">${m.label}</b><br><span style="font-size:10px;color:#666">${m.status}</span>`);
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [markers]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
