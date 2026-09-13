import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Edit2, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [date]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance?date=${date}`);
      setLogs(res.data);
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
    const newOutDate = new Date(`${date}T${hh || '18'}:${mm || '00'}:${ss || '00'}`);

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

  // Format timestamp explicitly as HH:MM:SS
  const formatTimeSeconds = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  // Format worked hours into human readable text (e.g. 0.02 soat (1 daq 9 sek))
  const formatWorkedHours = (checkIn, checkOut, hoursNum) => {
    if (!checkIn || !checkOut) return '0 soat';
    const diffMs = new Date(checkOut) - new Date(checkIn);
    if (diffMs <= 0) return '0 soat';
    
    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    let timeText = '';
    if (h > 0) timeText += `${h} soat `;
    if (m > 0) timeText += `${m} daq `;
    if (s > 0 || (h === 0 && m === 0)) timeText += `${s} sek`;

    return `${hoursNum || (diffMs/(1000*3600)).toFixed(2)} soat (${timeText.trim()})`;
  };

  const filteredLogs = logs.filter(log => 
    log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={30} color="var(--accent-primary)" />
            Davomat Jurnali va Hisoboti
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Kunlik real keldi-ketdi yozuvlari (soat:minut:sekund), kechikish va ishlangan soatlar hisobi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={fetchLogs}
            className="btn"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)' }}
          >
            <RefreshCw size={16} /> Yangilash
          </button>
          
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
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
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Davomat yuklanmoqda...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hodim</th>
                  <th>Kelgan vaqti (HH:MM:SS)</th>
                  <th>Ketgan vaqti (HH:MM:SS)</th>
                  <th>Kechikish</th>
                  <th>Ishlangan soat</th>
                  <th>Holati</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} style={{ background: log.is_manual_override ? 'rgba(245, 158, 11, 0.04)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                          {log.user?.avatar_url ? (
                            <img src={`http://localhost:3000${log.user.avatar_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{log.user?.full_name?.charAt(0) || 'H'}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{log.user?.full_name || 'Noma\'lum'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.user?.department || 'Bo\'limsiz'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--success)', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                        {formatTimeSeconds(log.check_in)}
                      </div>
                    </td>
                    <td>
                      {log.check_out ? (
                        <div style={{ fontWeight: '700', color: '#60a5fa', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                          {formatTimeSeconds(log.check_out)}
                        </div>
                      ) : (
                        <span className="badge danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={12} /> Bino ichida (Ketmagan)
                        </span>
                      )}
                    </td>
                    <td>
                      {log.late_minutes > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: '600' }}>{log.late_minutes} daq.</span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: '500' }}>0 daq. (O'z vaqtida)</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                        {formatWorkedHours(log.check_in, log.check_out, log.worked_hours)}
                      </div>
                      {log.overtime_hours > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>+{log.overtime_hours} (overtime)</div>
                      )}
                    </td>
                    <td>
                      {log.is_manual_override ? (
                        <span className="badge warning" title={log.override_reason}>Qo'lda tahrirlangan</span>
                      ) : (
                        <span className="badge success">Turniket (Avto)</span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleManualOverride(log.id, log.check_out)}
                        style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        title="Tahrirlash"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      Ushbu sanada davomat yozuvlari topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
