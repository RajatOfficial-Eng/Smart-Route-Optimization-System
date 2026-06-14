import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ShieldAlert, AlertTriangle, Navigation } from 'lucide-react';

// Fix Leaflet marker icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { TileLayer } from 'react-leaflet';

// Define real-world bounds (New Delhi region roughly)
const LAT_MIN = 28.4;
const LAT_MAX = 28.8;
const LNG_MIN = 77.0;
const LNG_MAX = 77.5;

// Convert 0-100 grid to real Lat/Lng
const toLatLng = (x, y) => {
  return [
    LAT_MIN + (y / 100.0) * (LAT_MAX - LAT_MIN),
    LNG_MIN + (x / 100.0) * (LNG_MAX - LNG_MIN)
  ];
};

// Convert real Lat/Lng back to 0-100 grid
const toGrid = (lat, lng) => {
  return [
    ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100.0,
    ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100.0
  ];
};

// Map click handler to paint traffic zones or roadblocks
const MapClickHandler = ({ mapMode, onMapClick }) => {
  const map = useMap();
  useEffect(() => {
    const handler = (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const [x, y] = toGrid(lat, lng);
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        onMapClick(x, y);
      }
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, mapMode, onMapClick]);
  return null;
};

// Helper function to interpolate position along a path for animated vehicles
const getPositionAlongPath = (path, progress) => {
  if (!path || path.length === 0) return [50, 50];
  if (path.length === 1) return [path[0][1], path[0][0]];

  const totalPoints = path.length;
  const targetIndex = (totalPoints - 1) * progress;
  const baseIndex = Math.floor(targetIndex);
  const diff = targetIndex - baseIndex;

  if (baseIndex >= totalPoints - 1) {
    const endPoint = path[totalPoints - 1];
    return [endPoint[1], endPoint[0]];
  }

  const p1 = path[baseIndex];
  const p2 = path[baseIndex + 1];

  const x = p1[0] + (p2[0] - p1[0]) * diff;
  const y = p1[1] + (p2[1] - p1[1]) * diff;

  return [y, x];
};

const routeColors = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
];

const routeGlowClasses = [
  'glow-path-emerald',
  'glow-path-blue',
  'glow-path-indigo',
  'glow-path-amber',
  'glow-path-pink',
];

export default function RouteMap({
  depot,
  stops,
  vehicles,
  routes,
  trafficZones,
  mapMode,
  onMapClick,
  simulationTime,
}) {
  const bounds = [[0, 0], [100, 100]];

  const depotIcon = L.divIcon({
    className: 'custom-depot-marker',
    html: `
      <div style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; background:rgba(245,158,11,0.2); border:2px solid #f59e0b; box-shadow:0 0 15px rgba(245,158,11,0.5);" class="pulsing-marker">
        <div style="width:16px; height:16px; border-radius:4px; background:#f59e0b;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <>
      {/* HUD Header */}
      <div className="map-hud-header glass-panel">
        <Navigation size={18} className="icon-pulse" style={{ color: 'var(--accent-indigo)' }} />
        <div className="flex-col" style={{ gap: '2px' }}>
          <div className="hud-title">REAL-WORLD SATELLITE LINK ACTIVE</div>
          <div className="hud-subtitle">OpenStreetMap: New Delhi Logistics Sector</div>
        </div>
      </div>

      {/* Map Mode Overlay */}
      {mapMode !== 'select' && (
        <div className="map-mode-overlay glass-panel">
          {mapMode === 'roadblock' ? (
            <>
              <ShieldAlert size={14} style={{ color: 'var(--accent-rose)' }} />
              <span className="mode-text">Roadblock Placement Active</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} style={{ color: 'var(--accent-amber)' }} />
              <span className="mode-text" style={{ color: 'var(--accent-amber)' }}>Traffic Jam Painting Active</span>
            </>
          )}
        </div>
      )}

      <MapContainer
        bounds={[[LAT_MIN, LNG_MIN], [LAT_MAX, LNG_MAX]]}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapClickHandler mapMode={mapMode} onMapClick={onMapClick} />

        {/* Depot Marker */}
        {depot && (
          <Marker position={toLatLng(depot.x, depot.y)} icon={depotIcon}>
            <Popup>
              <div style={{ padding: '4px', fontSize: '0.75rem', color: 'white' }}>
                <p style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)', color: 'var(--accent-amber)', marginBottom: '4px' }}>{depot.name}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Distribution Depot Hub</p>
                <p style={{ fontSize: '0.65rem' }}>Coordinates: [{depot.x.toFixed(1)}, {depot.y.toFixed(1)}]</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery Stop Markers */}
        {stops.map((stop) => {
          let statusColor = '#3b82f6';
          let pulseClass = '';
          if (stop.status === 'DELIVERED') {
            statusColor = '#10b981';
          } else if (stop.status === 'LATE') {
            statusColor = '#f43f5e';
          } else if (stop.status === 'EN_ROUTE') {
            statusColor = '#8b5cf6';
            pulseClass = 'pulsing-marker';
          }

          const stopIcon = L.divIcon({
            className: 'custom-stop-marker',
            html: `
              <div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:rgba(15,16,21,0.8); border:1px solid rgba(255,255,255,0.1); box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                <div class="${pulseClass}" style="width:14px; height:14px; border-radius:50%; background:${statusColor}; border:1px solid rgba(255,255,255,0.2); box-shadow:inset 0 2px 4px rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:7px; color:white; font-weight:bold;">
                  ${stop.id}
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          return (
            <Marker key={stop.id} position={toLatLng(stop.x, stop.y)} icon={stopIcon}>
              <Popup>
                <div style={{ padding: '8px', fontSize: '0.75rem', color: '#f1f5f9', minWidth: '160px' }}>
                  <p style={{ fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>{stop.name}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.65rem', color: '#94a3b8' }}>
                    <span>Demand:</span> <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{stop.demand} kg</span>
                    <span>Window:</span> <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{stop.timeWindowStart.toFixed(1)}h-{stop.timeWindowEnd.toFixed(1)}h</span>
                    <span>Service:</span> <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{(stop.serviceTime * 60).toFixed(0)} mins</span>
                    <span>Status:</span> <span style={{ fontWeight: 'bold', color: statusColor }}>{stop.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Traffic Zones */}
        {trafficZones.map((zone) => {
          const isRoadblock = zone.severity >= 900;
          let zoneColor = '#10b981'; // Green
          if (zone.severity > 2 && zone.severity <= 8) zoneColor = '#f59e0b'; // Yellow
          if (isRoadblock) zoneColor = '#ef4444'; // Red
          
          return (
            <Circle
              key={zone.id}
              center={toLatLng(zone.x, zone.y)}
              radius={zone.radius * 440} // 1 grid unit ~ 440m
              pathOptions={{
                fillColor: zoneColor,
                fillOpacity: isRoadblock ? 0.35 : 0.2,
                color: isRoadblock ? '#f43f5e' : zoneColor,
                weight: 1.5,
                dashArray: isRoadblock ? '3, 4' : undefined,
              }}
            >
              <Popup>
                <div style={{ padding: '4px', fontSize: '0.75rem', color: 'white' }}>
                  <p style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)', color: zoneColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isRoadblock ? 'ROADBLOCK' : 'HEAVY TRAFFIC'}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Radius: {zone.radius.toFixed(1)} units</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Severity Delay: {isRoadblock ? 'IMPASSABLE' : `${zone.severity.toFixed(1)}x`}</p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Optimized Polylines for each route */}
        {routes.map((route, idx) => {
          let coords = [];
          try {
            coords = JSON.parse(route.pathCoordinatesJson);
          } catch (e) {
            console.error('Failed to parse route path coordinates', e);
          }

          if (coords.length === 0) return null;

          // Convert to real Lat/Lng
          const latLngs = coords.map((c) => toLatLng(c[0], c[1]));

          const color = routeColors[idx % routeColors.length];
          const glowClass = routeGlowClasses[idx % routeGlowClasses.length];

          return (
            <React.Fragment key={route.id}>
              {/* Shadow/Glow Line */}
              <Polyline
                positions={latLngs}
                pathOptions={{
                  color: color,
                  weight: 6,
                  opacity: 0.15,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Core Neon Flowing Line */}
              <Polyline
                positions={latLngs}
                pathOptions={{
                  color: color,
                  weight: 3,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                  className: glowClass,
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Animated Vehicles moving along their routes */}
        {routes.map((route, idx) => {
          let coords = [];
          try {
            coords = JSON.parse(route.pathCoordinatesJson);
          } catch (e) {
            console.error(e);
          }

          if (coords.length < 2) return null;

          const routeStart = 8.0;
          const routeEnd = routeStart + route.totalDuration;

          let progress = 0;
          if (simulationTime >= routeEnd) {
            progress = 1.0;
          } else if (simulationTime <= routeStart) {
            progress = 0.0;
          } else {
            progress = (simulationTime - routeStart) / route.totalDuration;
          }

          const currentGridPos = getPositionAlongPath(coords, progress);
          const currentPos = toLatLng(currentGridPos[1], currentGridPos[0]); // getPositionAlongPath returns [y, x]
          
          const vehicleColor = routeColors[idx % routeColors.length];
          const vehicleIcon = L.divIcon({
            className: 'custom-vehicle-marker',
            html: `
              <div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:#0a0b10; border:2px solid ${vehicleColor}; box-shadow:0 0 12px ${vehicleColor};">
                <div style="font-size:9px; font-weight:bold; color:${vehicleColor};">${route.vehicle.name.slice(0, 2).toUpperCase()}</div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          return (
            <Marker key={`veh-${route.id}`} position={currentPos} icon={vehicleIcon}>
              <Popup>
                <div style={{ padding: '8px', fontSize: '0.75rem', color: '#e2e8f0', minWidth: '150px' }}>
                  <p style={{ fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-display)' }}>{route.vehicle.name}</p>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Capacity: {route.vehicle.capacity} kg</p>
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Fuel usage: {route.vehicle.fuelConsumptionRate} L/100u</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)', fontWeight: 600, marginTop: '4px' }}>
                    Route Progress: {(progress * 100).toFixed(0)}%
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)' }}>
                    Est. Arrival back: {(8.0 + route.totalDuration).toFixed(2)}h
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
}
