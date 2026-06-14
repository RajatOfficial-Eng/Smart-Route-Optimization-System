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
  const [newStopDemand, setNewStopDemand] = useState(10);
  const [newStopTWStart, setNewStopTWStart] = useState(9.0);
  const [newStopTWEnd, setNewStopTWEnd] = useState(17.0);

  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(30);

  const [editDepotName, setEditDepotName] = useState(depot ? depot.name : 'Main Distribution Center');
  const [editDepotX, setEditDepotX] = useState(depot ? depot.x : 50.0);
  const [editDepotY, setEditDepotY] = useState(depot ? depot.y : 50.0);

  // Format decimal hours to 12h/24h string
  const formatTime = (time) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  const handleCreateStopSubmit = (e) => {
    e.preventDefault();
    if (!newStopName) return;

    // Random coordinates inside 10-90 bound for visual convenience
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;

    onAddStop({
      name: newStopName,
      x,
      y,
      demand: Number(newStopDemand),
      timeWindowStart: Number(newStopTWStart),
      timeWindowEnd: Number(newStopTWEnd),
      serviceTime: 0.25,
    });

    setNewStopName('');
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

  const handleDepotSubmit = (e) => {
    e.preventDefault();
    if (depot) {
      onUpdateDepot({
        ...depot,
        name: editDepotName,
        x: Number(editDepotX),
        y: Number(editDepotY)
      });
    }
  };

  // Sync state if depot updates remotely
  React.useEffect(() => {
    if (depot) {
      setEditDepotName(depot.name);
      setEditDepotX(depot.x);
      setEditDepotY(depot.y);
    }
  }, [depot]);

  return (
    <>
      {/* Depot Configuration */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <MapPin size={16} /> Depot Configuration
        </h2>
        <form onSubmit={handleDepotSubmit} className="flex-col">
          <input
            type="text"
            value={editDepotName}
            onChange={(e) => setEditDepotName(e.target.value)}
            className="input-field"
            placeholder="Depot Name"
          />
          <div className="flex-row mt-1">
            <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
              <label className="input-label">Coord X (0-100)</label>
              <input type="number" step="0.1" value={editDepotX} onChange={(e) => setEditDepotX(e.target.value)} className="input-field" />
            </div>
            <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
              <label className="input-label">Coord Y (0-100)</label>
              <input type="number" step="0.1" value={editDepotY} onChange={(e) => setEditDepotY(e.target.value)} className="input-field" />
            </div>
          </div>
          <button type="submit" className="btn-outline mt-2" style={{ padding: '0.4rem', fontSize: '0.7rem' }}>
            Save Depot Settings
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

      {/* Stops management */}
      <div className="glass-panel sidebar-panel">
        <h2 className="panel-title">
          <MapPin size={16} /> Delivery Stops ({stops.length})
        </h2>

        <form onSubmit={handleCreateStopSubmit} className="flex-col" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <span className="input-label">Add Delivery Stop</span>
          <input
            type="text"
            placeholder="Stop Name"
            value={newStopName}
            onChange={(e) => setNewStopName(e.target.value)}
            className="input-field"
          />
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
          <button type="submit" className="btn-neon-indigo" style={{ padding: '0.5rem', marginTop: '0.5rem' }}>
            Create Stop
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
