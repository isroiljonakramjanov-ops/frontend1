import { useState, useEffect } from 'react';
import { Search, Edit2, Clock, RefreshCw, Calendar } from 'lucide-react';
import api, { getImageUrl } from '../services/api';

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [date, viewMode, selectedMonth]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/attendance?date=${date}`;
      if (viewMode === 'monthly') {
        const [year, month] = selectedMonth.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        url = `/attendance?start_date=${selectedMonth}-01&end_date=${selectedMonth}-${lastDay}`;
      }
      const res = await api.get(url);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Davomat ma\'lumotlarini olishda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async (id, currentOut) => {
    const defaultTimeStr = currentOut ? new Date(currentOut).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '18:00:00';
    const newTime = prompt("Ketish vaqtini kiriting (HH:MM:SS formatda):", defaultTimeStr);
    if (!newTime) return;

    const [hh, mm, ss] = newTime.split(':');
    const targetDate = date;
    const newOutDate = new Date(`${targetDate}T${hh || '18'}:${mm || '00'}:${ss || '00'}`);

    const reason = prompt("Tahrirlash sababini kiriting:", "Turniketda qayd etilmagan / qo'lda tuzatish");
    if (!reason) return;

    try {
      await api.put(`/attendance/${id}/override`, {
        check_out: newOutDate.toISOString(),
        override_reason: reason
      });
      fetchLogs();
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  const formatTimeSeconds = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatWorkedHours = (checkIn, checkOut, hoursNum) => {
    if (!checkIn || !checkOut) return '0 soat';
    const diffMs = new Date(checkOut) - new Date(checkIn);
    if (diffMs <= 0) return '0 soat';
    
    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);

    let timeText = '';
    if (h > 0) timeText += `${h} soat `;
    if (m > 0) timeText += `${m} daq`;

    return timeText.trim() || '1 daqiqadan kam';
  };

  const filteredLogs = logs.filter(log => 
    log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={30} color="var(--accent-primary)" />
            Davomat Jurnali va Hisoboti
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {viewMode === 'monthly' ? '1 Oylik to\'liq keldi-ketdi jurnali rasmlari bilan' : 'Kunlik real keldi-ketdi yozuvlari'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('daily')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '600', fontSize: '0.85rem',
                background: viewMode === 'daily' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'daily' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              📅 Kunlik
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '600', fontSize: '0.85rem',
                background: viewMode === 'monthly' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'monthly' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              🗓 1 Oylik to'liq
            </button>
          </div>

          <button 
            onClick={fetchLogs}
            className="btn"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)' }}
          >
            <RefreshCw size={16} /> Yangilash
          </button>
          
          {viewMode === 'daily' ? (
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
            />
          ) : (
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
            />
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {/* Search Bar & Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Hodim ismi yoki bo'limi bo'yicha saralash..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.75rem' }}
            />
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Jami yozuvlar: <strong style={{ color: 'var(--accent-primary)' }}>{filteredLogs.length} ta</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Davomat yuklanmoqda...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {viewMode === 'monthly' && <th>Sana</th>}
                  <th>Hodim</th>
                  <th>Kelgan vaqti (HH:MM:SS)</th>
                  <th>Ketgan vaqti (HH:MM:SS)</th>
                  <th>Ishlangan vaqt</th>
                  <th>Holati</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} style={{ background: log.is_manual_override ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                    {viewMode === 'monthly' && (
                      <td style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {formatDate(log.check_in)}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--accent-primary)', flexShrink: 0 }}>
                          {log.user?.avatar_url ? (
                            <img src={getImageUrl(log.user.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent-primary)' }}>{log.user?.full_name?.charAt(0) || 'H'}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{log.user?.full_name || 'Noma\'lum'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.user?.department || 'Bo\'limsiz'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--success)', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                        📥 {formatTimeSeconds(log.check_in)}
                      </div>
                    </td>
                    <td>
                      {log.check_out ? (
                        <div style={{ fontWeight: '700', color: '#60a5fa', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                          📤 {formatTimeSeconds(log.check_out)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hali ketmadi</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                        {formatWorkedHours(log.check_in, log.check_out, log.worked_hours)}
                      </div>
                    </td>
                    <td>
                      {log.check_out ? (
                        <span className="badge success">✅ Yakunlangan</span>
                      ) : (
                        <span className="badge warning">⏳ Ishda</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleManualOverride(log.id, log.check_out)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                        title="Tahrirlash"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
