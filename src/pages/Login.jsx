import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    selectedRole: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const { email, password, selectedRole } = form;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (!selectedRole) {
      setError('Please select a role.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('dummyUsers') || '[]');
    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const emailLower = email.trim().toLowerCase();
    let user = null;

    if (selectedRole === 'doctor') {
      user = doctors.find(
        (d) =>
          d.email.toLowerCase() === emailLower &&
          d.password === password &&
          d.role === 'doctor'
      );
      if (!user) {
        setError('Invalid email or password for doctor role.');
        return;
      }
    } else {
      user = users.find(
        (u) =>
          u.email.toLowerCase() === emailLower &&
          u.password === password &&
          u.role === selectedRole
      );
      if (!user) {
        setError(`Invalid email or password for ${selectedRole} role.`);
        return;
      }
    }

    localStorage.setItem('dummyCurrentUser', JSON.stringify(user));
    switch (selectedRole) {
      case 'admin':
        navigate('/admin');
        break;
      case 'doctor':
        navigate('/doctor');
        break;
      case 'patient':
        navigate('/patient');
        break;
      default:
        setError('Invalid role selected.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <div className="auth-form">
        <label>
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
            required
          />
        </label>
        <label>
          Role
          <select
            name="selectedRole"
            value={form.selectedRole}
            onChange={handleChange}
            required
          >
            <option value="">Select Role</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button onClick={handleSubmit}>Login</button>
      </div>
      <p>
        New user? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}