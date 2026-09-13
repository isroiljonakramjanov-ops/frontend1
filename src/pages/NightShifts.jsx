import { useState, useEffect } from 'react';
import { Moon, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Phone, ShieldCheck, UserCheck, Clock, UserX } from 'lucide-react';
import api from '../services/api';

export default function NightShifts() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNightShifts(selectedDate);
  }, [selectedDate]);

  const fetchNightShifts = async (dateStr) => {
    setLoading(true);
    try {
      const res = await api.get(`/shifts?start_date=${dateStr}&end_date=${dateStr}`);
      // Faqat tungi smenalarni ajratib olamiz
      const nightShifts = res.data.filter(s => s.shift_type === 'night');
      setShifts(nightShifts);
    } catch (err) {
      console.error('Tungi smenalarni olishda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDateByDays = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getDayDaysList = () => {
    const list = [];
    const base = new Date(selectedDate);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d);
    }
    return list;
  };

  const dayDays = getDayDaysList();
  const dayNamesUz = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha'];

  const formattedDateHeader = new Date(selectedDate).toLocaleDateString('uz-UZ', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Moon size={32} color="#8b5cf6" />
            Tungi Dijurantlar Paneli (Kunlik Tizim)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Kunlar bo'yicha tungi smena dijurantlarining aniq va batafsil ro'yxati.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}
          />
          <button 
            className="btn"
            style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.4)' }}
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            Bugun
          </button>
        </div>
      </div>

      {/* Kunlar navigatsiyasi strip (Kunlik tanlash slider) */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <button 
            onClick={() => changeDateByDays(-1)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', flex: 1, justifyContent: 'center' }}>
            {dayDays.map((d) => {
              const dStr = d.toISOString().split('T')[0];
              const isSelected = dStr === selectedDate;
              const isToday = dStr === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={dStr}
                  onClick={() => setSelectedDate(dStr)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '70px',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(139, 92, 246, 0.2)' : isToday ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: isSelected ? '#c4b5fd' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {dayNamesUz[d.getDay()]}
                  </span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '700', marginTop: '0.2rem' }}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => changeDateByDays(1)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tanlangan kun sarlavhasi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={20} color="#8b5cf6" />
          <span>{formattedDateHeader}</span>
        </h2>
        <div style={{ fontSize: '0.875rem', color: '#c4b5fd', background: 'rgba(139, 92, 246, 0.15)', padding: '0.3rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          Jami tungi dijurantlar: <strong>{shifts.length} ta</strong>
        </div>
      </div>

      {/* Tungi Dijurantlar Ro'yxati */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Ma'lumotlar yuklanmoqda...</div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <Moon size={56} style={{ opacity: 0.2, marginBottom: '1rem', color: '#8b5cf6' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Ushbu kunga tungi dijurant tayinlanmagan
            </h3>
            <p style={{ fontSize: '0.875rem' }}>
              <strong>Dijurlik</strong> jadvali sahifasidan yangi tungi smena biriktirishingiz mumkin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {shifts.map(shift => {
              const emp = shift.user || {};
              return (
                <div key={shift.id} style={{ 
                  background: 'rgba(139, 92, 246, 0.06)', 
                  border: '1px solid rgba(139, 92, 246, 0.25)', 
                  borderRadius: '16px', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Glowing Top Accent Line */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #8b5cf6, #c4b5fd)' }} />

                  {/* Header: Avatar + Info */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '60px', height: '60px', borderRadius: '50%', 
                      background: 'var(--bg-primary)', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      border: '2px solid rgba(139, 92, 246, 0.4)',
                      flexShrink: 0
                    }}>
                      {emp.avatar_url ? (
                        <img src={`http://localhost:3000${emp.avatar_url}`} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{emp.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '1.125rem', color: 'white' }}>{emp.full_name || 'Noma\'lum'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#c4b5fd', marginTop: '0.1rem' }}>
                        {emp.department || 'Bo\'limsiz'} • {emp.position || 'Hodim'}
                      </div>
                      {emp.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                          <Phone size={12} color="#8b5cf6" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shift details */}
                  <div style={{ 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    borderRadius: '10px', 
                    padding: '0.75rem 1rem', 
                    display: 'flex', 
                    justify: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <Clock size={16} color="#c4b5fd" />
                      <span>Smena vaqti:</span>
                    </div>
                    <div style={{ fontWeight: '700', color: '#c4b5fd', fontSize: '0.95rem' }}>
                      {shift.start_time} - {shift.end_time}
                    </div>
                  </div>

                  {/* Status footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <span style={{ 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '6px', 
                      fontWeight: '600',
                      background: shift.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: shift.status === 'completed' ? 'var(--success)' : '#c4b5fd',
                      border: `1px solid ${shift.status === 'completed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                    }}>
                      {shift.status === 'completed' ? '✔ Bajarildi' : '🌙 Rejalashtirilgan'}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
