import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useLiveScore } from '../../hooks/useLiveScore';
import { useAuth } from '../../components/AuthContext';
import GatekeeperModal from '../../components/GatekeeperModal';

export default function PublicViewPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isKiosk = searchParams.get('display') === 'kiosk';
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState(null);
  const [scoreboard, setScoreboard] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGatekeeperOpen, setIsGatekeeperOpen] = useState(false);

  useEffect(() => {
    if (!loading && data && !isAuthenticated && !isKiosk) {
      const dismissed = sessionStorage.getItem(`gatekeeper_dismissed_${slug}`);
      if (dismissed !== 'true') {
        setIsGatekeeperOpen(true);
      }
    }
  }, [loading, data, isAuthenticated, isKiosk, slug]);

  const handleCloseGatekeeper = () => {
    setIsGatekeeperOpen(false);
    sessionStorage.setItem(`gatekeeper_dismissed_${slug}`, 'true');
  };

  const fetchAllData = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const [dataRes, scoreRes, tickerRes, eventsRes] = await Promise.all([
        fetch(`${baseUrl}/api/public/${slug}`),
        fetch(`${baseUrl}/api/public/${slug}/scoreboard`),
        fetch(`${baseUrl}/api/public/${slug}/ticker`),
        fetch(`${baseUrl}/api/public/${slug}/events`),
      ]);

      if (dataRes.ok) setData((await dataRes.json()).data);
      if (scoreRes.ok) setScoreboard((await scoreRes.json()).data);
      if (tickerRes.ok) setTicker((await tickerRes.json()).data);
      if (eventsRes.ok) setEvents((await eventsRes.json()).data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching public data', err);
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAllData();
    // Fallback polling every 30s
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Use SSE to trigger instant updates
  useLiveScore(slug, (updateData) => {
    console.log('Live update triggered refresh:', updateData);
    fetchAllData();
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading Live Feed...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">Competition not found.</div>;
  }

  // Calculate event progress
  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const progressPercent = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

  return (
    <div className={`min-h-screen font-sans bg-neutral-950 text-neutral-100 ${isKiosk ? 'overflow-hidden' : ''}`}>
      {/* Header */}
      {!isKiosk && (
        <header className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              {data.name}
            </h1>
            <p className="text-sm text-neutral-400">Live Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-emerald-400 font-medium tracking-wide">LIVE</span>
          </div>
        </header>
      )}

      {isKiosk && (
        <div className="absolute top-6 right-8 flex items-center gap-3">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </span>
          <span className="text-xl text-emerald-400 font-bold tracking-widest uppercase">LIVE</span>
        </div>
      )}

      <main className={`mx-auto p-6 ${isKiosk ? 'max-w-[100%] h-screen flex flex-col pt-12' : 'max-w-6xl space-y-8'}`}>
        
        {/* Kiosk Title */}
        {isKiosk && (
          <h1 className="text-6xl font-black text-center mb-12 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            {data.name}
          </h1>
        )}

        <div className={`grid gap-6 ${isKiosk ? 'flex-1 grid-cols-12' : 'grid-cols-1 lg:grid-cols-12'}`}>
          
          {/* Mega Scoreboard */}
          <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 lg:col-span-8 flex flex-col ${isKiosk ? 'col-span-8 h-full shadow-2xl shadow-blue-900/20' : ''}`}>
            <h2 className={`font-bold mb-6 text-neutral-300 flex items-center gap-2 ${isKiosk ? 'text-4xl' : 'text-xl'}`}>
              <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Standings
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {scoreboard.length === 0 ? (
                <div className="text-center text-neutral-500 py-12">No scores available yet.</div>
              ) : (
                scoreboard.map((group, index) => (
                  <div 
                    key={group._id} 
                    className={`relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all duration-500 ${
                      index === 0 ? 'bg-blue-900/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-neutral-800/50 border-neutral-700/50'
                    } ${isKiosk ? 'p-6 mb-6' : ''}`}
                  >
                    {index === 0 && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                    )}
                    <div className="flex items-center gap-4 z-10">
                      <div className={`font-black text-neutral-500 flex items-center justify-center ${
                        isKiosk ? 'text-5xl w-16' : 'text-2xl w-8'
                      }`}>
                        {index + 1}
                      </div>
                      <div className={`font-bold text-white ${isKiosk ? 'text-5xl ml-4' : 'text-lg'}`}>
                        {group.name}
                      </div>
                    </div>
                    <div className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-400 ${
                      isKiosk ? 'text-7xl' : 'text-3xl'
                    }`}>
                      {group.total_score || 0}
                      <span className={`text-neutral-500 ml-2 font-medium ${isKiosk ? 'text-3xl' : 'text-sm'}`}>pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Ticker & Progress */}
          <div className={`flex flex-col gap-6 lg:col-span-4 ${isKiosk ? 'col-span-4 h-full' : ''}`}>
            
            {/* Event Progress */}
            <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${isKiosk ? 'flex-none' : ''}`}>
              <h2 className={`font-bold mb-4 text-neutral-300 ${isKiosk ? 'text-3xl mb-6' : 'text-lg'}`}>Event Progress</h2>
              <div className="flex justify-between items-end mb-2">
                <span className={`font-bold text-white ${isKiosk ? 'text-5xl' : 'text-3xl'}`}>{progressPercent}%</span>
                <span className={`text-neutral-400 font-medium ${isKiosk ? 'text-xl' : 'text-sm'}`}>{completedEvents} / {totalEvents} Events</span>
              </div>
              <div className={`w-full bg-neutral-800 rounded-full overflow-hidden ${isKiosk ? 'h-6' : 'h-3'}`}>
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Live Ticker */}
            <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex-1 flex flex-col ${isKiosk ? 'overflow-hidden' : ''}`}>
              <h2 className={`font-bold mb-4 text-neutral-300 flex items-center gap-2 ${isKiosk ? 'text-3xl mb-8' : 'text-lg'}`}>
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Recent Updates
              </h2>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {ticker.length === 0 ? (
                  <div className="text-center text-neutral-500 py-6">No recent results.</div>
                ) : (
                  ticker.slice(0, isKiosk ? 8 : 5).map((result) => (
                    <div key={result._id} className={`border-l-2 border-indigo-500 pl-4 py-2 ${isKiosk ? 'mb-6' : ''}`}>
                      <div className={`text-indigo-400 font-semibold uppercase tracking-wider mb-1 ${isKiosk ? 'text-xl' : 'text-xs'}`}>
                        {result.event_id?.name || 'Event'}
                      </div>
                      <div className={`text-white font-medium ${isKiosk ? 'text-2xl leading-tight' : 'text-sm'}`}>
                        <span className="text-neutral-400">{result.position}{result.position === 1 ? 'st' : result.position === 2 ? 'nd' : result.position === 3 ? 'rd' : 'th'} Place: </span>
                        {result.group_id?.name || 'Unknown'}
                      </div>
                      <div className={`text-emerald-400 font-bold mt-1 ${isKiosk ? 'text-xl' : 'text-sm'}`}>
                        +{result.points * (result.multiplier || 1)} points
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <GatekeeperModal 
        isOpen={isGatekeeperOpen}
        onClose={handleCloseGatekeeper}
        competitionName={data?.name}
        competitionSlug={slug}
      />
    </div>
  );
}
