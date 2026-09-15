import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Activity, UserCheck, UserX, Clock, RefreshCw } from 'lucide-react';
import api, { getImageUrl } from '../services/api';

export default function LiveMonitor() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });
  const [socketStatus, setSocketStatus] = useState('Ulanmoqda...');

  const fetchInitialData = () => {
    api.get('/dashboard/admin').then(res => {
      setStats({
        present: res.data.todayPresent || 0,
        total: res.data.totalEmployees || 0
      });
      setEvents(res.data.recentEvents || []);
    }).catch(err => {
      console.error('LiveMonitor fetch error:', err);
    });
  };

  useEffect(() => {
    fetchInitialData();

    // Socket.io dynamic host connection
    const socketHost = `${window.location.protocol}//${window.location.hostname}:3000`;
    const socket = io(socketHost);

    socket.on('connect', () => {  
      setSocketStatus('Ulangan');
      socket.emit('join_monitor');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Uzilgan');
    });

    socket.on('turnstile_event', (data) => {
      console.log('📡 Real-time turnstile event received:', data);
      
      const isCheckIn = data.event === 'CHECK_IN';
      const eventTime = data.time || new Date().toISOString();

      const newEvent = {
        id: data.attendance?.id || Date.now(),
        check_in: isCheckIn ? eventTime : (data.attendance?.check_in || eventTime),
        check_out: !isCheckIn ? eventTime : null,
        user: data.user
      };
      
      setEvents(prev => [newEvent, ...prev].slice(0, 50));
      
      // Statlarni real-vaqt yangilash
      if (isCheckIn) {
        setStats(prev => ({ ...prev, present: prev.present + 1 }));
      } else if (data.event === 'CHECK_OUT') {
        setStats(prev => ({ ...prev, present: Math.max(0, prev.present - 1) }));
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="page-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--danger)" size={28} />
            Real-Time Turniket Monitoring Oqimi
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                background: socketStatus === 'Ulangan' ? 'var(--success)' : 'var(--warning)',
                boxShadow: socketStatus === 'Ulangan' ? '0 0 10px var(--success)' : 'none'
              }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Status: <strong>{socketStatus}</strong></span>
            </div>
            <span style={{ opacity: 0.3 }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>Jonli WebSocket alohida kanalida ishlamoqda</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={fetchInitialData} 
            className="btn" 
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)' }}
          >
            <RefreshCw size={16} /> Yangilash
          </button>

          <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Hozir bino ichida</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                {stats.present} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ {stats.total} hodim</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Stream Grid */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {events.map((event, idx) => {
            const isCheckIn = !event.check_out;
            const eventDateObj = new Date(isCheckIn ? event.check_in : event.check_out);
            const timeStr = eventDateObj.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = eventDateObj.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
            const emp = event.user || {};

            return (
              <div 
                key={`${event.id}-${idx}`}
                style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(30, 41, 59, 0.85)', 
                  borderLeft: `5px solid ${isCheckIn ? 'var(--success)' : 'var(--danger)'}`,
                  borderRadius: '14px',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  boxShadow: idx === 0 ? '0 0 20px rgba(59, 130, 246, 0.25)' : 'none',
                  animation: idx === 0 ? 'pulse 2s ease-in-out' : 'none'
                }}
              >
                <div style={{ 
                  width: '56px', height: '56px', borderRadius: '50%', 
                  background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', overflow: 'hidden',
                  flexShrink: 0, border: '2px solid var(--glass-border)'
                }}>
                  {emp.avatar_url ? (
                    <img src={getImageUrl(emp.avatar_url)} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    emp.full_name?.charAt(0) || 'H'
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'white' }}>{emp.full_name || 'Noma\'lum Hodim'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {emp.department || 'Bo\'limsiz'} • {emp.position || 'Hodim'}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem' }}>
                    <div style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: '700',
                      background: isCheckIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isCheckIn ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${isCheckIn ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      display: 'flex', alignItems: 'center', gap: '0.3rem'
                    }}>
                      {isCheckIn ? <UserCheck size={14} /> : <UserX size={14} />}
                      {isCheckIn ? 'KIRDI' : 'CHIQDI'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Clock size={13} color="var(--accent-primary)" />
                      <span>{dateStr}, <strong>{timeStr}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {events.length === 0 && (
             <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
               <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
               <p style={{ fontSize: '1rem', fontWeight: '500' }}>Hozircha real-vaqt turniket oqimi bo'sh</p>
               <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                 <strong>Face Scanner</strong> sahifasidan keldi-ketdini skaner qilganingizda ushbu oynada darhol paydo bo'ladi.
               </p>
             </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1.02); }
          50% { transform: scale(1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
