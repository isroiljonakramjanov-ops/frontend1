import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api, { getImageUrl } from '../services/api';

const SHIFT_TYPES = [
  { value: 'day', label: '☀️ Ertalabki', start: '09:00', end: '18:00', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)' },
  { value: 'night', label: '🌙 Tungi', start: '20:00', end: '08:00', color: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)' },
  { value: 'custom', label: '⚙️ Maxsus', start: '08:00', end: '17:00', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
];

const DAYS_UZ = ['Yak', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

function dateStr(d) { return d.toISOString().split('T')[0]; }

export default function Schedule() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Quick-add form
  const [showForm, setShowForm] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [formDate, setFormDate] = useState(dateStr(new Date()));
  const [shiftType, setShiftType] = useState('day');
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailShift, setDetailShift] = useState(null);

  useEffect(() => { fetchData(); }, [currentDate]);

  const weekStart = () => {
    const d = new Date(currentDate);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0,0,0,0);
    return d;
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart());
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const ws = weekStart();
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      const [sr, er] = await Promise.all([
        api.get(`/shifts?start_date=${dateStr(ws)}&end_date=${dateStr(we)}`),
        api.get('/employees'),
      ]);
      setShifts(sr.data);
      setEmployees(er.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(empSearch.toLowerCase())
  );

  const getShift = (empId, date) =>
    shifts.find(s => s.user_id === empId && s.shift_date === dateStr(date));

  const handleSave = async () => {
    if (!selectedEmp) return alert('Hodimni tanlang');
    setSaving(true);
    const st = SHIFT_TYPES.find(t => t.value === shiftType);
    try {
      await api.post('/shifts', {
        user_id: selectedEmp.id,
        shift_date: formDate,
        shift_type: shiftType,
        start_time: shiftType === 'custom' ? customStart : st.start,
        end_time: shiftType === 'custom' ? customEnd : st.end,
      });
      setShowForm(false);
      setSelectedEmp(null);
      setEmpSearch('');
      fetchData();
    } catch (e) { alert('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (shift) => {
    if (!window.confirm(`${shift.user?.full_name || ''} — ${shift.shift_date} kungi smenani o'chirasizmi?`)) return;
    try {
      await api.delete(`/shifts/${shift.id}`);
      setDetailShift(null);
      fetchData();
    } catch (e) { alert('Xatolik'); }
  };

  const shiftStyle = (type) => SHIFT_TYPES.find(t => t.value === type) || SHIFT_TYPES[0];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>📅 Dijurlik Jadvali</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormDate(dateStr(new Date())); }}>
          <Plus size={18} /> Smena Qo'shish
        </button>
      </div>

      {/* Week navigator */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()-7); setCurrentDate(d); }}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontWeight: '600', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="var(--accent-primary)" />
          {weekDays[0].getDate()} {MONTHS_UZ[weekDays[0].getMonth()]} — {weekDays[6].getDate()} {MONTHS_UZ[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setCurrentDate(new Date())}
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent-primary)', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
            Bugun
          </button>
          <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()+7); setCurrentDate(d); }}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'left', width: '200px', background: 'rgba(255,255,255,0.02)' }}>Hodim</th>
                  {weekDays.map((d, i) => {
                    const isToday = dateStr(d) === dateStr(new Date());
                    return (
                      <th key={i} style={{
                        padding: '0.75rem 0.5rem', textAlign: 'center', minWidth: '110px',
                        background: isToday ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                        borderLeft: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{DAYS_UZ[d.getDay()]}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: isToday ? 'var(--accent-primary)' : 'white', marginTop: '0.1rem' }}>
                          {d.getDate()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{MONTHS_UZ[d.getMonth()]}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1.25rem', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', flexShrink: 0, overflow: 'hidden' }}>
                          {emp.avatar_url
                            ? <img src={getImageUrl(emp.avatar_url)} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                            : emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{emp.full_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{emp.department}</div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((d, i) => {
                      const shift = getShift(emp.id, d);
                      const st = shift ? shiftStyle(shift.shift_type) : null;
                      return (
                        <td key={i} style={{ padding: '0.4rem', borderLeft: '1px solid var(--border-color)', background: dateStr(d) === dateStr(new Date()) ? 'rgba(59,130,246,0.04)' : 'transparent', verticalAlign: 'middle' }}>
                          {shift ? (
                            <div onClick={() => setDetailShift(shift)} style={{
                              background: st.bg, border: `1px solid ${st.border}`, color: st.color,
                              borderRadius: '8px', padding: '0.4rem 0.5rem', textAlign: 'center',
                              cursor: 'pointer', transition: 'transform 0.15s', fontSize: '0.75rem', fontWeight: '600'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform='scale(1.03)'}
                            onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                              {shift.shift_type === 'day' ? '☀️' : shift.shift_type === 'night' ? '🌙' : '⚙️'}
                              <div style={{ fontSize: '0.68rem', marginTop: '0.15rem', opacity: 0.85 }}>{shift.start_time}-{shift.end_time}</div>
                            </div>
                          ) : (
                            <div onClick={() => { setShowForm(true); setFormDate(dateStr(d)); setSelectedEmp(emp); setEmpSearch(emp.full_name); }}
                              style={{ height: '50px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                              className="add-cell">
                              <Plus size={16} color="var(--text-secondary)" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Hodimlar topilmadi. Avval hodim qo'shing.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK ADD MODAL */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="glass-panel" style={{ width:'100%', maxWidth:'480px', borderRadius:'16px', overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontWeight:'700', fontSize:'1.1rem', margin:0 }}>➕ Yangi Smena</h2>
              <button onClick={() => { setShowForm(false); setSelectedEmp(null); setEmpSearch(''); }} style={{ background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Employee search */}
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'0.4rem', display:'block' }}>👤 Hodim ismi</label>
                <div style={{ position:'relative' }}>
                  <Search size={16} style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)' }} />
                  <input value={empSearch} onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); }}
                    placeholder="Ismni yozing..."
                    style={{ width:'100%', paddingLeft:'2.25rem', paddingRight:'1rem', padding:'0.65rem 1rem 0.65rem 2.25rem', background:'var(--bg-primary)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'white', fontSize:'0.9rem' }} />
                </div>
                {empSearch && !selectedEmp && (
                  <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border-color)', borderRadius:'8px', marginTop:'0.3rem', maxHeight:'180px', overflowY:'auto' }}>
                    {filtered.length === 0
                      ? <div style={{ padding:'0.75rem', color:'var(--text-secondary)', fontSize:'0.85rem' }}>Topilmadi</div>
                      : filtered.map(e => (
                        <div key={e.id} onClick={() => { setSelectedEmp(e); setEmpSearch(e.full_name); }}
                          style={{ padding:'0.65rem 1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.6rem', borderBottom:'1px solid var(--border-color)' }}
                          onMouseEnter={el => el.currentTarget.style.background='rgba(255,255,255,0.05)'}
                          onMouseLeave={el => el.currentTarget.style.background='transparent'}>
                          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:'700' }}>
                            {e.full_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight:'600', fontSize:'0.85rem' }}>{e.full_name}</div>
                            <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)' }}>{e.department}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {selectedEmp && (
                  <div style={{ marginTop:'0.4rem', padding:'0.5rem 0.75rem', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:'8px', fontSize:'0.8rem', color:'var(--accent-primary)' }}>
                    ✅ Tanlandi: <strong>{selectedEmp.full_name}</strong> ({selectedEmp.department})
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'0.4rem', display:'block' }}>📅 Sana</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  style={{ width:'100%', padding:'0.65rem 1rem', background:'var(--bg-primary)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'white', fontSize:'0.9rem' }} />
              </div>

              {/* Shift type */}
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:'0.5rem', display:'block' }}>🕐 Smena turi</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.6rem' }}>
                  {SHIFT_TYPES.map(t => (
                    <div key={t.value} onClick={() => setShiftType(t.value)} style={{
                      padding:'0.75rem 0.5rem', textAlign:'center', borderRadius:'10px', cursor:'pointer',
                      border: shiftType === t.value ? `2px solid ${t.color}` : '1px solid var(--border-color)',
                      background: shiftType === t.value ? t.bg : 'transparent',
                      transition:'all 0.15s'
                    }}>
                      <div style={{ fontWeight:'700', fontSize:'0.8rem', color: shiftType === t.value ? t.color : 'white' }}>{t.label}</div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-secondary)', marginTop:'0.25rem' }}>
                        {t.value !== 'custom' ? `${t.start} - ${t.end}` : 'O\'zi belgilaydi'}
                      </div>
                    </div>
                  ))}
                </div>
                {shiftType === 'custom' && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginTop:'0.75rem' }}>
                    <div>
                      <label style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginBottom:'0.3rem', display:'block' }}>Boshlanish</label>
                      <input type="time" value={customStart} onChange={e => setCustomStart(e.target.value)}
                        style={{ width:'100%', padding:'0.5rem', background:'var(--bg-primary)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'white' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginBottom:'0.3rem', display:'block' }}>Tugash</label>
                      <input type="time" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                        style={{ width:'100%', padding:'0.5rem', background:'var(--bg-primary)', border:'1px solid var(--border-color)', borderRadius:'8px', color:'white' }} />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleSave} disabled={saving || !selectedEmp} className="btn btn-primary" style={{ marginTop:'0.5rem', opacity: saving || !selectedEmp ? 0.5 : 1 }}>
                {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailShift && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onClick={() => setDetailShift(null)}>
          <div className="glass-panel" style={{ width:'100%', maxWidth:'380px', borderRadius:'16px', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontWeight:'700', margin:0, fontSize:'1rem' }}>📋 Smena Ma'lumoti</h2>
              <button onClick={() => setDetailShift(null)} style={{ background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {[
                ['👤 Hodim', detailShift.user?.full_name],
                ['🏢 Bo\'lim', detailShift.user?.department],
                ['📅 Sana', detailShift.shift_date],
                ['🕐 Vaqt', `${detailShift.start_time} — ${detailShift.end_time}`],
                ['🌗 Tur', detailShift.shift_type === 'day' ? '☀️ Ertalabki' : detailShift.shift_type === 'night' ? '🌙 Tungi' : '⚙️ Maxsus'],
                ['📌 Status', detailShift.status === 'completed' ? '✅ Tugallandi' : '🔵 Rejalashtirilgan'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{k}</span>
                  <span style={{ fontWeight:'600', fontSize:'0.85rem' }}>{v || '—'}</span>
                </div>
              ))}
              <button onClick={() => handleDelete(detailShift)} className="btn" style={{ marginTop:'0.5rem', background:'rgba(239,68,68,0.1)', color:'var(--danger)', border:'1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={16} /> Smenani O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.add-cell:hover { opacity: 1 !important; background: rgba(255,255,255,0.04) !important; }`}</style>
    </div>
  );
}
