import { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, DollarSign, X, CreditCard } from 'lucide-react';
import api from '../services/api';

export default function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [payModal, setPayModal] = useState(null); // { id, user_name, total_earned, current_paid, remaining }
  const [customPayAmount, setCustomPayAmount] = useState('');

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll?month=${month}&year=${year}`);
      setPayrolls(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await api.post('/payroll/calculate', { month, year });
      await fetchPayroll();
    } catch (err) {
      alert('Hisoblashda xatolik yuz berdi');
    } finally {
      setCalculating(false);
    }
  };

  const handlePayAll = async () => {
    if (window.confirm("Barcha hodimlarga maosh to'liq to'langan deb belgilamoqchimisiz?")) {
      try {
        await api.put('/payroll/status', { month, year, status: 'paid' });
        await fetchPayroll();
      } catch (err) {
        alert('Xatolik yuz berdi');
      }
    }
  };

  const openPayModal = (p) => {
    const totalEarned = Math.round((p.base_salary || 0) + (p.overtime_pay || 0) - (p.penalties || 0));
    const currentPaid = p.advance_payment || 0;
    const remaining = Math.max(0, totalEarned - currentPaid);

    setPayModal({
      id: p.id,
      user_name: p.user?.full_name || 'Hodim',
      total_earned: totalEarned,
      current_paid: currentPaid,
      remaining: remaining,
      status: p.status
    });
    setCustomPayAmount(remaining.toString());
  };

  const handleSavePayment = async () => {
    if (!payModal) return;
    const amount = Number(customPayAmount);
    if (isNaN(amount) || amount < 0) return alert("Summani to'g'ri kiriting");

    try {
      // Yangi avans/to'langan summa = eski to'langan + yangi to'lov
      const newTotalPaid = (payModal.current_paid || 0) + amount;
      const newStatus = newTotalPaid >= payModal.total_earned ? 'paid' : 'draft';

      await api.put(`/payroll/${payModal.id}/advance`, { advance_payment: newTotalPaid });
      if (newStatus === 'paid') {
        await api.put(`/payroll/${payModal.id}/status`, { status: 'paid' });
      }

      setPayModal(null);
      await fetchPayroll();
    } catch (err) {
      alert("To'lovni saqlashda xatolik yuz berdi");
    }
  };

  const handleExport = () => {
    window.open(`http://localhost:3000/api/payroll/export/excel?month=${month}&year=${year}`, '_blank');
  };

  const formatMoney = (amount) => new Intl.NumberFormat('uz-UZ').format(Math.round(amount || 0));

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Oylik Maosh Hisoboti & Qisman To'lov</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Hodimlarning ishlangan kuni, soati va kunlik stavkasi bo'yicha real maosh hamda qisman to'lovlar (avans) hisobi.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--border-color)' }}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--border-color)' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}-yil</option>)}
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Jami Hisoblangan Maosh</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--success)' }}>
              {formatMoney(payrolls.reduce((s, p) => s + (p.base_salary + (p.overtime_pay || 0) - (p.penalties || 0)), 0))} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>so'm</span>
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Jami Berilgan (Avans / Qisman)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f59e0b' }}>
              {formatMoney(payrolls.reduce((s, p) => s + (p.advance_payment || 0), 0))} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>so'm</span>
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Jami Qolgan Haqiqiy Summa</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
              {formatMoney(payrolls.reduce((s, p) => s + p.net_salary, 0))} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>so'm</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)' }} onClick={handleCalculate} disabled={calculating}>
            <RefreshCw size={18} className={calculating ? 'spin' : ''} />
            {calculating ? 'Hisoblanmoqda...' : 'Qayta Hisoblash'}
          </button>
          <button className="btn" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}
            onClick={handlePayAll} disabled={payrolls.length === 0 || payrolls.every(p => p.status === 'paid')}>
            <CheckCircle size={18} />
            Barchasini To'lash
          </button>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.07)', color: 'white' }} onClick={handleExport} disabled={payrolls.length === 0}>
            <Download size={18} />
            Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Maoshlar yuklanmoqda...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hodim</th>
                  <th>Ish kunlari & Soat</th>
                  <th>Asosiy maosh</th>
                  <th>Overtime</th>
                  <th>Jarimalar</th>
                  <th style={{ color: '#f59e0b' }}>To'langan (Avans)</th>
                  <th style={{ color: 'var(--success)' }}>Qolgan Summa</th>
                  <th>Status</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map(p => {
                  const totalEarned = Math.round((p.base_salary || 0) + (p.overtime_pay || 0) - (p.penalties || 0));
                  const paid = p.advance_payment || 0;
                  const remaining = Math.max(0, totalEarned - paid);

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{p.user?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.user?.department} • {p.user?.position}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{p.total_worked_days} kun</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.total_hours?.toFixed(1)} soat</div>
                      </td>
                      <td>{formatMoney(p.base_salary)}</td>
                      <td style={{ color: 'var(--accent-primary)' }}>+{formatMoney(p.overtime_pay)}</td>
                      <td style={{ color: 'var(--danger)' }}>-{formatMoney(p.penalties)}</td>

                      {/* PAID / ADVANCE AMOUNT */}
                      <td>
                        <div style={{ color: paid > 0 ? '#f59e0b' : 'var(--text-secondary)', fontWeight: '600' }}>
                          {paid > 0 ? `-${formatMoney(paid)} so'm` : '0 so\'m'}
                        </div>
                      </td>

                      {/* REMAINING REAL BALANCE */}
                      <td>
                        <div style={{ fontWeight: '800', color: remaining > 0 ? 'var(--success)' : 'var(--text-secondary)', fontSize: '1.05rem' }}>
                          {formatMoney(remaining)} so'm
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${p.status === 'paid' ? 'success' : paid > 0 ? 'warning' : 'danger'}`}>
                          {p.status === 'paid' ? "To'la To'langan" : paid > 0 ? "Qisman To'langan" : "To'lanmagan"}
                        </span>
                      </td>

                      <td>
                        <button 
                          onClick={() => openPayModal(p)}
                          className="btn"
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            background: p.status === 'paid' ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.15)',
                            color: p.status === 'paid' ? 'var(--text-secondary)' : 'var(--success)',
                            border: `1px solid ${p.status === 'paid' ? 'var(--border-color)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}
                        >
                          <DollarSign size={14} />
                          {p.status === 'paid' ? 'To\'lovlar' : 'To\'lash / Avans'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {payrolls.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      Maosh hali hisoblanmagan. Yuqoridagi <strong>"Qayta Hisoblash"</strong> tugmasini bosing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOM PAYMENT / ADVANCE ENTRY MODAL */}
      {payModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="glass-panel" style={{ width:'100%', maxWidth:'420px', borderRadius:'16px', overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontWeight:'700', fontSize:'1.1rem', margin:0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard color="var(--success)" size={20} /> Maosh To'lovini Kiritish
              </h2>
              <button onClick={() => setPayModal(null)} style={{ background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer' }}>
                <X size={22} />
              </button>
            </div>
            
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ padding: '0.85rem', background: 'rgba(15,23,42,0.6)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Hodim: <strong style={{ color: 'white' }}>{payModal.user_name}</strong></div>
                <div style={{ color: 'var(--text-secondary)' }}>Jami Hisoblangan Maosh: <strong style={{ color: 'var(--success)' }}>{formatMoney(payModal.total_earned)} so'm</strong></div>
                <div style={{ color: 'var(--text-secondary)' }}>Ilgari To'langan (Avans): <strong style={{ color: '#f59e0b' }}>{formatMoney(payModal.current_paid)} so'm</strong></div>
                <div style={{ color: 'var(--text-secondary)' }}>Hozirgi Qolgan Haqiqiy Summa: <strong style={{ color: 'var(--accent-primary)' }}>{formatMoney(payModal.remaining)} so'm</strong></div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Hozir to'lanayotgan summa (so'm):
                </label>
                <input 
                  type="number"
                  placeholder="Masalan: 100000"
                  value={customPayAmount}
                  onChange={e => setCustomPayAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', fontWeight: '700', color: 'var(--success)', borderColor: 'var(--success)' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Istalgan summani (avans yoki qisman to'lov) kiritishingiz mumkin.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setPayModal(null)} className="btn" style={{ background: 'var(--bg-secondary)', color: 'white' }}>Bekor qilish</button>
                <button onClick={handleSavePayment} className="btn btn-primary" style={{ background: 'var(--success)' }}>
                  💾 To'lovni Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
