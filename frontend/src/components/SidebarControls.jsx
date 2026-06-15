import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Truck, MapPin, Eye, Zap, ShieldAlert, AlertTriangle, Cpu, Trash2 } from 'lucide-react';

export default function SidebarControls({
  vehicles,
  stops,
  algorithm,
  setAlgorithm,
  mapMode,
  setMapMode,
  simulationTime,
  setSimulationTime,
  isPlaying,
  setIsPlaying,
  speedFactor,
  setSpeedFactor,
  onOptimize,
  onReset,
  onClearWorkspace,
  onToggleVehicle,
  onAddVehicle,
  onDeleteVehicle,
  onAddStop,
  onDeleteStop,
  onClearTraffic,
  onDeleteTraffic,
  routes = [],
  trafficZones = [],
  depot,
  onUpdateDepot,
}) {
  const [newStopName, setNewStopName] = useState('');
  const [newStopSearch, setNewStopSearch] = useState('');
  const [newStopDemand, setNewStopDemand] = useState(10);
  const [newStopTWStart, setNewStopTWStart] = useState(9.0);
  const [newStopTWEnd, setNewStopTWEnd] = useState(17.0);
  const [stopSearching, setStopSearching] = useState(false);
  const [stopError, setStopError] = useState('');

  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(30);

  const [editDepotName, setEditDepotName] = useState(depot ? depot.name : 'Main Distribution Center');
  const [editDepotSearch, setEditDepotSearch] = useState('');
  const [depotSearching, setDepotSearching] = useState(false);
  const [depotError, setDepotError] = useState('');

  // Helper function to geocode location query using Nominatim API
  const geocodeLocation = async (query) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'SmartRouteOptimizationConsole/1.0' }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          x: parseFloat(data[0].lon),
          y: parseFloat(data[0].lat),
          displayName: data[0].display_name
        };
      }
      return null;
    } catch (e) {
      console.error('Geocoding error:', e);
      return null;
    }
  };

  // Format decimal hours to 12h/24h string
  const formatTime = (time) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  const handleCreateStopSubmit = async (e) => {
    e.preventDefault();
    if (!newStopSearch) return;
    setStopError('');
    setStopSearching(true);
    const result = await geocodeLocation(newStopSearch);
    setStopSearching(false);

    if (result) {
      onAddStop({
        name: newStopName || newStopSearch.split(',')[0],
        x: result.x,
        y: result.y,
        demand: Number(newStopDemand),
        timeWindowStart: Number(newStopTWStart),
        timeWindowEnd: Number(newStopTWEnd),
        serviceTime: 0.25,
      });
      setNewStopName('');
      setNewStopSearch('');
    } else {
      setStopError('City/Location not found. Please try another search term.');
    }
  };

  const handleCreateVehicleSubmit = (e) => {
    e.preventDefault();
    if (!newVehicleName) return;

    onAddVehicle({
      name: newVehicleName,
      capacity: Number(newVehicleCapacity),
      fuelConsumptionRate: 1.5,
      costPerKm: 30.0,
      speed: 40.0,
      active: true,
    });

    setNewVehicleName('');
  };

  const handleDepotSubmit = async (e) => {
    e.preventDefault();
    if (!depot) return;
    setDepotError('');

    if (editDepotSearch.trim() !== '') {
      setDepotSearching(true);
      const result = await geocodeLocation(editDepotSearch);
      setDepotSearching(false);
      if (result) {
        onUpdateDepot({
          ...depot,
          name: editDepotName || result.displayName.split(',')[0],
          x: result.x,
          y: result.y
        });
        setEditDepotSearch('');
      } else {
        setDepotError('Location not found. Try another city name.');
      }
    } else {
      onUpdateDepot({
        ...depot,
        name: editDepotName
      });
    }
  };

  // Sync state if depot name updates remotely
  React.useEffect(() => {
    if (depot) {
      setEditDepotName(depot.name);
    }
  }, [depot]);

  return (
    <>
      {/* Start Location Config */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <MapPin size={16} /> Start Location (Depot Configuration)
        </h2>
        <form onSubmit={handleDepotSubmit} className="flex-col">
          <div className="flex-col" style={{ gap: '2px' }}>
            <label className="input-label">Depot Label Name</label>
            <input
              type="text"
              value={editDepotName}
              onChange={(e) => setEditDepotName(e.target.value)}
              className="input-field"
              placeholder="e.g. Main Distribution Center"
            />
          </div>
          <div className="flex-col" style={{ gap: '2px' }}>
            <label className="input-label">Search City / Address</label>
            <input
              type="text"
              value={editDepotSearch}
              onChange={(e) => setEditDepotSearch(e.target.value)}
              className="input-field"
              placeholder="e.g. Noida, India"
            />
          </div>
          {depotSearching && <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)' }}>Searching coordinates...</span>}
          {depotError && <span style={{ fontSize: '0.65rem', color: 'var(--accent-rose)' }}>{depotError}</span>}
          <button type="submit" disabled={depotSearching} className="btn-outline mt-2" style={{ padding: '0.4rem', fontSize: '0.7rem' }}>
            {depotSearching ? 'Searching...' : 'Save Depot Settings'}
          </button>
        </form>
      </div>

      {/* Algorithm Config */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <Cpu size={16} /> Route Strategy
        </h2>
        
        <div className="flex-row">
          <button
            onClick={() => setAlgorithm('GA')}
            className={`btn-outline ${algorithm === 'GA' ? 'active' : ''}`}
          >
            Cost-Balanced Strategy
          </button>
          <button
            onClick={() => setAlgorithm('SA')}
            className={`btn-outline ${algorithm === 'SA' ? 'active' : ''}`}
          >
            Time-Optimized Strategy
          </button>
        </div>

        <button onClick={onOptimize} className="btn-neon-indigo mt-2">
          <Zap size={16} fill="white" /> CALCULATE OPTIMAL ROUTES
        </button>
      </div>

      {/* Simulation Controller */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <Eye size={16} /> Live Fleet View
        </h2>

        {/* Time HUD */}
        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
          <span className="input-label">SIM TIME</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {formatTime(simulationTime)}
          </span>
        </div>

        {/* Timeline Slider */}
        <div className="flex-col">
          <input
            type="range"
            min="8.0"
            max="18.0"
            step="0.05"
            value={simulationTime}
            onChange={(e) => setSimulationTime(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-indigo)', height: '6px', borderRadius: '4px', cursor: 'pointer' }}
          />
          <div className="flex-row" style={{ justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            <span>08:00 AM</span>
            <span>01:00 PM</span>
            <span>06:00 PM</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex-row" style={{ alignItems: 'center' }}>
          <button onClick={() => setIsPlaying(!isPlaying)} className="btn-outline">
            {isPlaying ? <><Pause size={14} /> Pause</> : <><Play size={14} fill="white" /> Play</>}
          </button>
          
          <button onClick={() => setSimulationTime(8.0)} className="btn-outline" style={{ flex: '0 0 auto', padding: '0.5rem 0.75rem' }} title="Reset timeline">
            <RotateCcw size={14} />
          </button>

          <select
            value={speedFactor}
            onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
            className="input-field"
            style={{ flex: 1, cursor: 'pointer' }}
          >
            <option value="0.1">0.1x Speed</option>
            <option value="0.25">0.25x Speed</option>
            <option value="0.5">0.5x Speed</option>
            <option value="1.0">1.0x Speed</option>
          </select>
        </div>
      </div>

      {/* Map Brush Tools */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <ShieldAlert size={16} /> Map Tools
        </h2>

        <div className="flex-row">
          <button
            onClick={() => setMapMode('select')}
            className={`btn-outline ${mapMode === 'select' ? 'active' : ''}`}
            style={{ flexDirection: 'column', gap: '4px', padding: '0.5rem 0' }}
          >
            <span style={{ fontSize: '0.65rem' }}>Stop Mode</span>
          </button>
          <button
            onClick={() => setMapMode('traffic')}
            className={`btn-outline ${mapMode === 'traffic' ? 'active-amber' : ''}`}
            style={{ flexDirection: 'column', gap: '4px', padding: '0.5rem 0' }}
          >
            <AlertTriangle size={14} /> <span style={{ fontSize: '0.65rem' }}>Traffic</span>
          </button>
          <button
            onClick={() => setMapMode('roadblock')}
            className={`btn-outline ${mapMode === 'roadblock' ? 'active-rose' : ''}`}
            style={{ flexDirection: 'column', gap: '4px', padding: '0.5rem 0' }}
          >
            <ShieldAlert size={14} /> <span style={{ fontSize: '0.65rem' }}>Block</span>
          </button>
        </div>
        
        <div className="flex-row">
          <button onClick={onClearTraffic} className="btn-warning">
            Clear Traffic zones
          </button>
          <button onClick={onReset} className="btn-outline" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            Load Demo Data
          </button>
        </div>

        {trafficZones.length > 0 && (
          <div className="flex-col mt-1" style={{ maxHeight: '150px', overflowY: 'auto' }}>
            <span className="input-label" style={{ marginBottom: '4px' }}>Active Hazards ({trafficZones.length})</span>
            {trafficZones.map(tz => (
              <div key={tz.id} className="list-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '6px', borderLeft: tz.severity >= 900 ? '3px solid #ef4444' : '3px solid #f59e0b' }}>
                <div className="flex-col" style={{ gap: '2px' }}>
                  <span className="list-item-title" style={{ fontSize: '0.7rem' }}>Sector {tz.id} {tz.severity >= 900 ? '(Roadblock)' : '(Traffic)'}</span>
                </div>
                <button
                  onClick={() => onDeleteTraffic(tz.id)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                  title="Remove Hazard"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-row mt-1">
          <button onClick={onClearWorkspace} className="btn-danger" style={{ width: '100%' }}>
            Clear All Data (Start Fresh)
          </button>
        </div>
      </div>

      {/* Fleet Dispatch List */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <Truck size={16} /> Available Vehicles
        </h2>

        <div className="flex-col">
          {vehicles.map((v) => {
            let currentLoad = 0;
            const route = routes.find(r => r.vehicle.id === v.id);
            if (route && route.stopSequence) {
               const stopsCount = route.stopSequence.split(',').length;
               currentLoad = Math.min(v.capacity, stopsCount * 14.5);
            }
            const isOverloaded = currentLoad > v.capacity * 0.9;
            
            return (
            <div key={v.id} className="list-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex-col" style={{ gap: '2px' }}>
                <span className="list-item-title">{v.name}</span>
                <span className="list-item-subtitle">
                  Cap: {v.capacity}kg | Cost: ₹{v.costPerKm}/km
                </span>
                <span className="list-item-subtitle" style={{ color: isOverloaded ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                  Load: {currentLoad.toFixed(1)}kg ({((currentLoad/v.capacity)*100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex-row" style={{ alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={v.active}
                  onChange={() => onToggleVehicle(v.id)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-indigo)', cursor: 'pointer' }}
                />
                <button
                  onClick={() => onDeleteVehicle(v.id)}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s', display: 'flex' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  title="Delete Vehicle"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )})}
        </div>

        <form onSubmit={handleCreateVehicleSubmit} className="flex-col mt-2" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <span className="input-label">Add Custom Vehicle</span>
          <input
            type="text"
            placeholder="Vehicle Name"
            value={newVehicleName}
            onChange={(e) => setNewVehicleName(e.target.value)}
            className="input-field"
          />
          <div className="flex-col mt-1" style={{ gap: '2px' }}>
            <label className="input-label">Capacity (kg)</label>
            <input type="number" value={newVehicleCapacity} onChange={(e) => setNewVehicleCapacity(e.target.value)} className="input-field" />
          </div>
          <button type="submit" className="btn-outline mt-2" style={{ padding: '0.5rem' }}>
            + Create Vehicle
          </button>
        </form>
      </div>

      {/* Destination locations management */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <MapPin size={16} /> Destination Locations ({stops.length})
        </h2>

        <form onSubmit={handleCreateStopSubmit} className="flex-col" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <span className="input-label">Add Stop (Destination)</span>
          <div className="flex-col" style={{ gap: '2px' }}>
            <label className="input-label">Stop Label Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Retailer Alpha"
              value={newStopName}
              onChange={(e) => setNewStopName(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex-col" style={{ gap: '2px' }}>
            <label className="input-label">City Search / Location (Required)</label>
            <input
              type="text"
              placeholder="e.g. Chandigarh, India"
              value={newStopSearch}
              onChange={(e) => setNewStopSearch(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div className="flex-row">
            <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
              <label className="input-label">Demand(kg)</label>
              <input type="number" value={newStopDemand} onChange={(e) => setNewStopDemand(e.target.value)} className="input-field" />
            </div>
            <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
              <label className="input-label">Open(hr)</label>
              <input type="number" step="0.5" value={newStopTWStart} onChange={(e) => setNewStopTWStart(e.target.value)} className="input-field" />
            </div>
            <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
              <label className="input-label">Close(hr)</label>
              <input type="number" step="0.5" value={newStopTWEnd} onChange={(e) => setNewStopTWEnd(e.target.value)} className="input-field" />
            </div>
          </div>
          {stopSearching && <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)' }}>Searching coordinates...</span>}
          {stopError && <span style={{ fontSize: '0.65rem', color: 'var(--accent-rose)' }}>{stopError}</span>}
          <button type="submit" disabled={stopSearching} className="btn-neon-indigo" style={{ padding: '0.5rem', marginTop: '0.5rem' }}>
            {stopSearching ? 'Searching...' : 'Create Stop'}
          </button>
        </form>

        <div className="flex-col" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
          {stops.map((stop) => (
            <div key={stop.id} className="list-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex-col" style={{ gap: '2px' }}>
                <span className="list-item-title">{stop.name}</span>
                <span className="list-item-subtitle">
                  Demand: {stop.demand}kg | Window: {stop.timeWindowStart}h-{stop.timeWindowEnd}h
                </span>
              </div>
              <button
                onClick={() => onDeleteStop(stop.id)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

    </>
  );
}
