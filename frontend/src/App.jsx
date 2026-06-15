import React, { useState, useEffect, useRef } from 'react';
import RouteMap from './components/RouteMap';
import SidebarControls from './components/SidebarControls';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

const API_BASE = 'https://smart-route-backend-cosl.onrender.com/api';

export default function App() {
  const [depot, setDepot] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trafficZones, setTrafficZones] = useState([]);
  
  // Solver controls
  const [algorithm, setAlgorithm] = useState('GA'); // GA or SA
  const [mapMode, setMapMode] = useState('select'); // select, traffic, roadblock
  
  // Connection / Loading state
  const [isConnected, setIsConnected] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Simulation controls
  const [simulationTime, setSimulationTime] = useState(8.0); // 8:00 AM
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedFactor, setSpeedFactor] = useState(0.25);
  const [logs, setLogs] = useState([]);
  const [lastClickedCoords, setLastClickedCoords] = useState(null);

  const simulationRef = useRef(null);

  // Initial Fetches
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Test endpoint and fetch essential collections
      const depotRes = await fetch(`${API_BASE}/depot`);
      if (!depotRes.ok) throw new Error('Failed to fetch depot');
      const depotData = await depotRes.json();
      setDepot(depotData);

      const vehRes = await fetch(`${API_BASE}/vehicles`);
      const vehData = await vehRes.json();
      setVehicles(vehData);

      const stopsRes = await fetch(`${API_BASE}/stops`);
      const stopsData = await stopsRes.json();
      setStops(stopsData);

      const trafficRes = await fetch(`${API_BASE}/traffic`);
      const trafficData = await trafficRes.json();
      setTrafficZones(trafficData);

      const routesRes = await fetch(`${API_BASE}/routes`);
      const routesData = await routesRes.json();
      setRoutes(routesData);

      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting to backend:', error);
      setIsConnected(false);
    }
  };

  // Run Route Optimization API
  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      addLog('Triggering backend pathfinders and VRP solvers...');
      const start = Date.now();
      const res = await fetch(`${API_BASE}/optimize?algorithm=${algorithm}`, {
        method: 'POST'
      });
      const data = await res.json();
      setRoutes(data);
      const duration = Date.now() - start;

      // Update local stops status based on routes output
      const updatedStopsRes = await fetch(`${API_BASE}/stops`);
      const updatedStops = await updatedStopsRes.json();
      setStops(updatedStops);

      addLog(`Optimization complete in ${duration}ms using ${algorithm}. Dispatched ${data.length} vehicles.`);
    } catch (e) {
      addLog('Failed to optimize routes. Ensure backend server is running.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Map Click Handler
  const handleMapClick = async (x, y) => {
    setLastClickedCoords([x, y]);
    if (mapMode === 'roadblock') {
      try {
        addLog(`Placing roadblock coordinates [${x.toFixed(4)}, ${y.toFixed(4)}]`);
        const res = await fetch(`${API_BASE}/traffic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x, y, radius: 0.027, severity: 999.0 }) // ~2.7km radius roadblock
        });
        const newZone = await res.json();
        setTrafficZones([...trafficZones, newZone]);
        
        // Auto re-optimize to route around roadblock!
        handleOptimize();
      } catch (err) {
        addLog('Failed to add roadblock.');
      }
    } else if (mapMode === 'traffic') {
      try {
        addLog(`Painting traffic jam zone coordinates [${x.toFixed(4)}, ${y.toFixed(4)}]`);
        const res = await fetch(`${API_BASE}/traffic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x, y, radius: 0.036, severity: 5.0 }) // ~3.5km radius traffic zone
        });
        const newZone = await res.json();
        setTrafficZones([...trafficZones, newZone]);

        // Auto re-optimize to find fastest path!
        handleOptimize();
      } catch (err) {
        addLog('Failed to add traffic zone.');
      }
    } else {
      // Add standard stop
      try {
        addLog(`Reverse geocoding click at [${x.toFixed(4)}, ${y.toFixed(4)}]...`);
        let stopName = `Stop ${String.fromCharCode(65 + stops.length)}`;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${y}&lon=${x}&format=json`, {
            headers: { 'User-Agent': 'SmartRouteOptimizationConsole/1.0' }
          });
          const data = await response.json();
          if (data && data.address) {
            const address = data.address;
            const parts = [];
            const local = address.suburb || address.neighbourhood || address.city_district || address.road;
            const city = address.city || address.town || address.village || address.county;
            if (local) parts.push(local);
            if (city) parts.push(city);
            if (parts.length > 0) {
              stopName = parts.join(', ');
            } else if (data.display_name) {
              stopName = data.display_name.split(',')[0];
            }
          } else if (data && data.display_name) {
            stopName = data.display_name.split(',')[0];
          }
        } catch (e) {
          console.error('Reverse geocoding error:', e);
        }

        addLog(`Creating delivery stop: ${stopName} at coordinate [${x.toFixed(4)}, ${y.toFixed(4)}]`);
        const res = await fetch(`${API_BASE}/stops`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: stopName,
            x,
            y,
            demand: 15.0,
            timeWindowStart: 9.0,
            timeWindowEnd: 17.0,
            serviceTime: 0.25,
            status: 'PENDING'
          })
        });
        const newStop = await res.json();
        setStops([...stops, newStop]);

        // Auto re-optimize to include new stop!
        handleOptimize();
      } catch (err) {
        addLog('Failed to add stop.');
      }
    }
  };

  // Toggle Vehicle Availability
  const handleToggleVehicle = async (id) => {
    const v = vehicles.find((veh) => veh.id === id);
    if (!v) return;

    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, active: !v.active })
      });
      const updated = await res.json();
      setVehicles(vehicles.map((veh) => (veh.id === id ? updated : veh)));
      addLog(`Vehicle ${v.name} status updated: ${updated.active ? 'ACTIVE' : 'INACTIVE'}`);
    } catch (e) {
      addLog('Failed to toggle vehicle.');
    }
  };

  // Add Vehicle
  const handleAddVehicle = async (vehicleData) => {
    try {
      addLog(`Adding custom vehicle: ${vehicleData.name}`);
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
      });
      const newVehicle = await res.json();
      setVehicles([...vehicles, newVehicle]);
      handleOptimize();
    } catch (e) {
      addLog('Failed to add vehicle.');
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (id) => {
    try {
      await fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
      setVehicles(vehicles.filter((v) => v.id !== id));
      addLog(`Vehicle #${id} removed from fleet.`);
      handleOptimize();
    } catch (e) {
      addLog('Failed to delete vehicle.');
    }
  };

  // Add Stop via sidebar form
  const handleAddStopSidebar = async (stopData) => {
    try {
      addLog(`Adding custom target stop: ${stopData.name}`);
      const res = await fetch(`${API_BASE}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stopData)
      });
      const newStop = await res.json();
      setStops([...stops, newStop]);
      handleOptimize();
    } catch (e) {
      addLog('Failed to add stop.');
    }
  };

  // Delete Stop
  const handleDeleteStop = async (id) => {
    try {
      await fetch(`${API_BASE}/stops/${id}`, { method: 'DELETE' });
      setStops(stops.filter((s) => s.id !== id));
      addLog(`Stop #${id} removed from delivery list.`);
      handleOptimize();
    } catch (e) {
      addLog('Failed to delete stop.');
    }
  };

  // Clear Traffic Zones
  const handleClearTraffic = async () => {
    try {
      await fetch(`${API_BASE}/traffic/clear`, { method: 'DELETE' });
      setTrafficZones([]);
      addLog('All traffic zones and roadblocks cleared.');
      handleOptimize();
    } catch (e) {
      addLog('Failed to clear traffic.');
    }
  };

  // Delete specific traffic zone
  const handleDeleteTrafficZone = async (id) => {
    try {
      await fetch(`${API_BASE}/traffic/${id}`, { method: 'DELETE' });
      setTrafficZones(trafficZones.filter((z) => z.id !== id));
      addLog(`Hazard zone ${id} removed.`);
      handleOptimize(); // Auto re-optimize
    } catch (e) {
      addLog('Failed to remove hazard zone.');
    }
  };

  // Reset System (Load Seed Data)
  const handleResetSystem = async () => {
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      const data = await res.json();
      addLog(data.message);
      fetchData();
    } catch (e) {
      addLog('Failed to reset system.');
    }
  };

  // Clear Workspace (Empty Slate)
  const handleClearWorkspace = async () => {
    try {
      const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
      const data = await res.json();
      addLog(data.message);
      fetchData();
    } catch (e) {
      addLog('Failed to clear workspace.');
    }
  };

  // Update Depot
  const handleUpdateDepot = async (depotData) => {
    try {
      const res = await fetch(`${API_BASE}/depot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depotData)
      });
      const updated = await res.json();
      setDepot(updated);
      addLog(`Depot updated to: ${updated.name} at [${updated.x.toFixed(1)}, ${updated.y.toFixed(1)}]`);
      handleOptimize();
    } catch (e) {
      addLog('Failed to update depot.');
    }
  };

  // Dynamic simulation runner
  useEffect(() => {
    if (isPlaying) {
      simulationRef.current = setInterval(() => {
        setSimulationTime((prev) => {
          const nextVal = prev + 0.05 * speedFactor;
          if (nextVal >= 18.0) {
            setIsPlaying(false);
            addLog('Simulation shift complete. All vehicles returned to depot.');
            return 18.0;
          }
          
          // Check route events (e.g. stop deliveries matching time)
          routes.forEach((route) => {
            const startHour = 8.0;
            const endHour = startHour + route.totalDuration;
            
            // Check if vehicle has arrived back
            if (prev < endHour && nextVal >= endHour) {
              addLog(`Sim Log: ${route.vehicle.name} has completed its route and returned to depot.`);
            }
          });

          return nextVal;
        });
      }, 100);
    } else {
      clearInterval(simulationRef.current);
    }

    return () => clearInterval(simulationRef.current);
  }, [isPlaying, speedFactor, routes]);

  const addLog = (message) => {
    const date = new Date();
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    setLogs((prev) => [{ time: timeStr, message }, ...prev].slice(0, 50));
  };

  return (
    <div className="app-container">
      
      {/* Top Banner Navigation */}
      <header className="app-header glass-panel">
        <div className="header-title-container">
          <div className="header-icon-box">
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="header-title">
              SMART ROUTE OPTIMIZATION CONSOLE
            </h1>
            <p className="header-subtitle">
              DYNAMIC ROUTING • ROADBLOCK AVOIDANCE • EMISSIONS TRACKING
            </p>
          </div>
        </div>

        {/* Engine Connectivity Status */}
        <button
          onClick={fetchData}
          className={`connection-btn ${isConnected ? 'online' : 'offline'}`}
        >
          {isConnected ? (
            <>
              <Wifi size={14} /> ROUTING ENGINE ONLINE
            </>
          ) : (
            <>
              <WifiOff size={14} /> RECONNECT ENGINE
            </>
          )}
        </button>
      </header>

      {/* Main split dashboard view */}
      <main className="main-content">
        
        {/* Left Side: Parameters panel */}
        <section className="sidebar-section">
          <SidebarControls
            vehicles={vehicles}
            stops={stops}
            routes={routes}
            trafficZones={trafficZones}
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            mapMode={mapMode}
            setMapMode={setMapMode}
            simulationTime={simulationTime}
            setSimulationTime={setSimulationTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            speedFactor={speedFactor}
            setSpeedFactor={setSpeedFactor}
            onOptimize={handleOptimize}
            onReset={handleResetSystem}
            onClearWorkspace={handleClearWorkspace}
            onToggleVehicle={handleToggleVehicle}
            onAddVehicle={handleAddVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onAddStop={handleAddStopSidebar}
            onDeleteStop={handleDeleteStop}
            onClearTraffic={handleClearTraffic}
            onDeleteTraffic={handleDeleteTrafficZone}
            depot={depot}
            onUpdateDepot={handleUpdateDepot}
            lastClickedCoords={lastClickedCoords}
          />
        </section>

        {/* Center/Right Side: Map visualization & Analytics */}
        <section className="center-section">
          
          {/* Map canvas */}
          <div className="map-container-wrapper">
            <RouteMap
              depot={depot}
              stops={stops}
              vehicles={vehicles}
              routes={routes}
              trafficZones={trafficZones}
              mapMode={mapMode}
              onMapClick={handleMapClick}
              simulationTime={simulationTime}
            />

            {/* Optimizing Overlay */}
            {isOptimizing && (
              <div className="overlay-spinner">
                <div className="spinner"></div>
                <span className="overlay-text">
                  Re-Optimizing Dispatch Matrices...
                </span>
              </div>
            )}

            {/* Empty State Onboarding Overlay */}
            {!isOptimizing && stops.length === 0 && vehicles.length === 0 && (
              <div className="onboarding-overlay glass-panel">
                <h2 className="onboarding-title">Welcome to Smart Route Optimization Console!</h2>
                <p className="onboarding-text">Your workspace is completely empty. Build your custom scenario:</p>
                <ul className="onboarding-list">
                  <li><strong>1. Add Vehicles:</strong> Create your fleet in the sidebar with custom capacities.</li>
                  <li><strong>2. Edit Depot:</strong> Configure your central distribution hub.</li>
                  <li><strong>3. Add Stops:</strong> Click directly on the map or use the sidebar to add delivery targets.</li>
                  <li><strong>4. Add Traffic:</strong> Use Map Tools to simulate roadblocks and bottlenecks.</li>
                  <li><strong>5. Optimize:</strong> Click 'Calculate Optimal Routes' to watch the AI engine work!</li>
                </ul>
                <button onClick={handleResetSystem} className="btn-outline" style={{ marginTop: '1rem', width: '100%' }}>
                  Or Load Demo Scenario
                </button>
              </div>
            )}
          </div>

          {/* Analytics area */}
          <div className="analytics-container">
            <AnalyticsDashboard routes={routes} logs={logs} algorithm={algorithm} />
          </div>

        </section>
      </main>

      {/* Connectivity Loss Alert Modal */}
      {!isConnected && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-icon-wrapper">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">ROUTING ENGINE OFFLINE</h3>
            <p className="modal-text">
              The Java Spring Boot backend could not be reached. Please check that the backend service is running and connected to the MySQL server on port 8080.
            </p>
            <button
              onClick={fetchData}
              className="btn-neon-indigo"
              style={{ marginTop: '0.5rem' }}
            >
              RETRACT RADAR AND RE-PING
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
