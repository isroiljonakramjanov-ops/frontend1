import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Activity, 
  Clock, 
  Banknote,
  Moon,
  ScanFace,
  LogOut
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/employees', label: 'Hodimlar', icon: <Users size={20} /> },
    { path: '/schedule', label: 'Dijurlik', icon: <Calendar size={20} /> },
    { path: '/night-shifts', label: 'Tungi Dijurantlar', icon: <Moon size={20} /> },
    { path: '/monitor', label: 'Live Monitor', icon: <Activity size={20} /> },
    { path: '/attendance', label: 'Davomat', icon: <Clock size={20} /> },
    { path: '/face-terminal', label: 'Turniket / Skaner', icon: <ScanFace size={20} /> },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div style={{ padding: '1rem 0 2rem 0' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
            TURNIKET
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Admin Panel</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive ? '600' : '500',
                transition: 'all 0.2s'
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: '600' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user?.position}</div>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={20} />
            Chiqish
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
