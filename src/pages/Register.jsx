import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'patient',
    hospitalName: '',
    hospitalLocation: '',
    qualifications: '',
    specializations: '',
    yearsOfExperience: '',
    gender: '',
    dateOfBirth: '',
    uniqueId: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const {
      name,
      email,
      password,
      confirm,
      role,
      hospitalName,
      hospitalLocation,
      qualifications,
      specializations,
      yearsOfExperience,
      gender,
      dateOfBirth,
      uniqueId
    } = form;

    // Common validations
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('A valid email is required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords must match.');
      return;
    }

    // Role-specific validations
    if (role === 'admin') {
      if (!hospitalName.trim()) {
        setError('Hospital name is required for Hospital Admin.');
        return;
      }
      if (!hospitalLocation.trim()) {
        setError('Hospital location is required for Hospital Admin.');
        return;
      }
      const users = JSON.parse(localStorage.getItem('dummyUsers') || '[]');
      if (users.some(u => u.hospitalName === hospitalName)) {
        setError('Hospital name is already registered.');
        return;
      }
    }

    if (role === 'doctor') {
      if (!qualifications.trim()) {
        setError('Qualifications are required for doctors.');
        return;
      }
      const specList = specializations.split(',').map(s => s.trim()).filter(s => s);
      if (specList.length === 0) {
        setError('At least one specialization is required for doctors.');
        return;
      }
      if (!yearsOfExperience || isNaN(yearsOfExperience) || Number(yearsOfExperience) < 0) {
        setError('Valid years of experience are required for doctors.');
        return;
      }
    }

    if (role === 'patient') {
      if (!gender) {
        setError('Gender is required for patients.');
        return;
      }
      if (!dateOfBirth) {
        setError('Date of birth is required for patients.');
        return;
      }
      const dob = new Date(dateOfBirth);
      const today = new Date();
      if (isNaN(dob.getTime()) || dob >= today) {
        setError('Please provide a valid date of birth in the past.');
        return;
      }
      if (!uniqueId.trim() || !/^[A-Za-z0-9-]{8,}$/.test(uniqueId)) {
        setError('Unique ID must be at least 8 characters (letters, numbers, or hyphens).');
        return;
      }
    }

    // Check for email and uniqueId uniqueness
    const users = JSON.parse(localStorage.getItem('dummyUsers') || '[]');
    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');

    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || 
        doctors.find((d) => d.email.toLowerCase() === email.toLowerCase())) {
      setError('That email is already registered.');
      return;
    }

    if (role === 'patient' && users.find((u) => u.uniqueId === uniqueId)) {
      setError('That unique ID is already registered.');
      return;
    }

    // Store user or doctor
    if (role === 'doctor') {
      const newDoctor = {
        id: uuidv4(),
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        qualifications: qualifications.trim(),
        specializations: specializations.split(',').map(s => s.trim()).filter(s => s),
        yearsOfExperience: Number(yearsOfExperience),
        hospitals: []
      };
      doctors.push(newDoctor);
      localStorage.setItem('doctors', JSON.stringify(doctors));
    } else {
      const newUser = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(role === 'admin' && { hospitalName: hospitalName.trim(), hospitalLocation: hospitalLocation.trim() }),
        ...(role === 'patient' && { gender, dateOfBirth, uniqueId: uniqueId.trim() })
      };
      users.push(newUser);
      localStorage.setItem('dummyUsers', JSON.stringify(users));
      if (role === 'admin') {
        localStorage.setItem(`departments_${hospitalName.trim()}`, JSON.stringify([]));
      }
    }

    alert('Registration successful! Please log in.');
    navigate('/');
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      <div className="auth-form">
        <label>
          Full Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />
        </label>
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
          Confirm Password
          <input
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={handleChange}
            placeholder="Confirm password"
            required
          />
        </label>
        <label>
          Select Role
          <select name="role" value={form.role} onChange={handleChange} required>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Hospital Admin</option>
          </select>
        </label>
        {form.role === 'admin' && (
          <div>
            <h4>Hospital Details</h4>
            <label>
              Hospital Name
              <input
                name="hospitalName"
                value={form.hospitalName}
                onChange={handleChange}
                placeholder="Enter hospital name"
                required
              />
            </label>
            <label>
              Hospital Location
              <input
                name="hospitalLocation"
                value={form.hospitalLocation}
                onChange={handleChange}
                placeholder="Enter hospital location"
                required
              />
            </label>
          </div>
        )}
        {form.role === 'doctor' && (
          <div>
            <h4>Doctor Details</h4>
            <label>
              Qualifications
              <input
                name="qualifications"
                value={form.qualifications}
                onChange={handleChange}
                placeholder="e.g., MBBS, MD"
                required
              />
            </label>
            <label>
              Specializations (comma-separated)
              <input
                name="specializations"
                value={form.specializations}
                onChange={handleChange}
                placeholder="e.g., Cardiology, Pediatrics"
                required
              />
            </label>
            <label>
              Years of Experience
              <input
                name="yearsOfExperience"
                type="number"
                value={form.yearsOfExperience}
                onChange={handleChange}
                placeholder="Enter years"
                min="0"
                required
              />
            </label>
          </div>
        )}
        {form.role === 'patient' && (
          <div>
            <h4>Patient Details</h4>
            <label>
              Gender
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Date of Birth
              <input
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Unique ID (e.g., Aadhar, Passport)
              <input
                name="uniqueId"
                value={form.uniqueId}
                onChange={handleChange}
                placeholder="e.g., 1234-5678-9012"
                required
              />
            </label>
          </div>
        )}
        <button onClick={handleSubmit}>Register</button>
      </div>
      <p>
        Already have an account? <Link to="/">Login here</Link>
      </p>
    </div>
  );
}