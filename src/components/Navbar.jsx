import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Detects route changes

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('dummyCurrentUser'));
    setUser(storedUser);
  }, [location]); // Re-run whenever route changes

  const handleLogout = () => {
    localStorage.removeItem('dummyCurrentUser');
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Hospital Management</div>

      <ul className="navbar-links">
        {!user && (
          <>
            <li><Link to="/">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </>
        )}

        {user && (
          <>
            {user.role === 'patient' && <li><Link to="/patient">Patient Dashboard</Link></li>}
            {user.role === 'doctor' && <li><Link to="/doctor">Doctor Dashboard</Link></li>}
            {user.role === 'admin' && <li><Link to="/admin">Admin Dashboard</Link></li>}
          </>
        )}
      </ul>

      <div className="navbar-auth">
        {user && (
          <button onClick={handleLogout}>Logout</button>
        )}
      </div>
    </nav>
  );
}
