import { useState, useEffect } from 'react';
import { Users, Clock, CalendarCheck, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/admin');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container">Yuklanmoqda...</div>;
  if (!stats) return null;

  return (
    <div className="page-container">
      <h1 className="page-title">Asosiy panel</h1>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Jami hodimlar</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.totalEmployees}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px' }}>
            <CalendarCheck size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Bugun ishda</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.todayPresent} / {stats.todayShifts}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{stats.presentPercent}% davomat</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '12px' }}>
            <Clock size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Kechikishlar</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.todayLate}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px' }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Chiqish qayd etilmagan</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.incompleteCheckouts}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Oxirgi 7 kunlik davomat</h2>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weeklyAttendance}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-secondary)" 
                  tick={{fill: 'var(--text-secondary)'}} 
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}.${d.getMonth() + 1}`;
                  }}
                />
                <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="count" name="Kelganlar" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>So'nggi kirish/chiqishlar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.recentEvents.map((event) => (
              <div key={event.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
                    {event.user.full_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500' }}>{event.user.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{event.user.department}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                    {new Date(event.check_in).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className={`badge ${event.check_out ? 'danger' : 'success'}`} style={{ fontSize: '0.7rem' }}>
                    {event.check_out ? 'Chiqdi' : 'Kirdi'}
                  </span>
                </div>
              </div>
            ))}
            {stats.recentEvents.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                Bugun hali hech kim kelmadi
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
