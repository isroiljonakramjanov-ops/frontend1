import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, Camera, DollarSign, CalendarCheck } from 'lucide-react';
import api, { getImageUrl } from '../services/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '', department: '', position: '', phone: '', card_id: '',
    daily_rate: 200000, penalty_per_minute: 0, overtime_coefficient: 1.5
  });
  
  // Image Upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get(`/employees?search=${search}`);
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setEditEmployee(employee);
      setFormData({
        full_name: employee.full_name,
        department: employee.department || '',
        position: employee.position || '',
        phone: employee.phone || '',
        card_id: employee.card_id || '',
        daily_rate: employee.daily_rate || 200000,
        penalty_per_minute: employee.penalty_per_minute || 0,
        overtime_coefficient: employee.overtime_coefficient || 1.5,
      });
      setAvatarPreview(getImageUrl(employee.avatar_url));
    } else {
      setEditEmployee(null);
      setFormData({
        full_name: '', department: '', position: '', phone: '', card_id: '',
        daily_rate: 200000, penalty_per_minute: 0, overtime_coefficient: 1.5
      });
      setAvatarPreview(null);
    }
    setAvatarFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return editEmployee ? editEmployee.avatar_url : null;
    
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.avatar_url;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const avatar_url = await uploadAvatar();
      const payload = { ...formData, avatar_url };

      if (editEmployee) {
        await api.put(`/employees/${editEmployee.id}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || "Xatolik yuz berdi");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Rostdan ham bu hodimni o'chirmoqchimisiz?")) {
      try {
        setEmployees(prev => prev.filter(e => e.id !== id));
        await api.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (err) {
        alert(err.response?.data?.error || "O'chirishda xatolik yuz berdi");
        fetchEmployees();
      }
    }
  };

  const formatMoney = (amount) => new Intl.NumberFormat('uz-UZ').format(Math.round(amount || 0));

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Hodimlar Boshqaruvi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Tizimdagi barcha hodimlar, ularning kunlik maosh stavkalari hamda karta ID-lari.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} />
          Yangi Hodim Qo'shish
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Ism, telefon yoki karta ID bo'yicha qidirish..." 
              style={{ width: '100%', paddingLeft: '3rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Hodimlar yuklanmoqda...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hodim</th>
                  <th>Bo'lim & Lavozim</th>
                  <th>Telefon</th>
                  <th>Karta ID (RFID)</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ 
                          width: '44px', height: '44px', borderRadius: '50%', 
                          background: 'var(--bg-primary)', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                          border: '2px solid var(--glass-border)'
                        }}>
                          {emp.avatar_url ? (
                            <img src={getImageUrl(emp.avatar_url)} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{emp.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{emp.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: #{emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{emp.department || 'Bo\'limsiz'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{emp.position || 'Hodim'}</div>
                    </td>
                    <td>{emp.phone || '—'}</td>
                    <td>
                      {emp.card_id ? (
                        <span className="badge success" style={{ fontFamily: 'monospace' }}>{emp.card_id}</span>
                      ) : (
                        <span className="badge warning">Biriktirilmagan</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenModal(emp)} style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Tahrirlash">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="O'chirish">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      Hodimlar topilmadi. Yangi hodim qo'shing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRUD MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{editEmployee ? 'Hodim Malumotlarini Tahrirlash' : 'Yangi Hodim Qo\'shish'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Avatar Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  style={{ 
                    width: '90px', height: '90px', borderRadius: '50%', 
                    background: 'var(--bg-secondary)', border: '2px dashed var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    overflow: 'hidden', position: 'relative'
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera color="var(--accent-primary)" size={32} />
                  )}
                  <div style={{ position: 'absolute', bottom: 0, background: 'rgba(0,0,0,0.7)', width: '100%', textAlign: 'center', fontSize: '0.7rem', padding: '2px 0', color: 'white' }}>Rasm yuklash</div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>F.I.O *</label>
                  <input required type="text" placeholder="Ism va Familiya" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Telefon raqam</label>
                  <input type="text" placeholder="+998901234567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Bo'lim</label>
                  <input type="text" placeholder="Masalan: Sotuv, IT, Moliya" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Lavozim</label>
                  <input type="text" placeholder="Masalan: Menejer" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Karta ID (RFID Turniket Karta)</label>
                  <input type="text" value={formData.card_id} onChange={e => setFormData({...formData, card_id: e.target.value})} style={{ width: '100%' }} placeholder="Karta kodi (masalan: CARD001)" />
                </div>
                
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn" style={{ background: 'var(--bg-secondary)', color: 'white' }}>Bekor qilish</button>
                <button type="submit" className="btn btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
