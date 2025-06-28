import { Routes, Route } from 'react-router-dom';
import Login             from './pages/Login.jsx';
import Register          from './pages/Register.jsx';
import PatientDashboard  from './pages/PatientDashboard.jsx';
import DoctorDashboard   from './pages/DoctorDashboard.jsx';
import AdminDashboard    from './pages/AdminDashboard.jsx';
import Navbar from './components/Navbar.jsx';

export default function App() {
  return (
    <>
    <Navbar/>
     <Routes>
      <Route path="/"         element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/patient"  element={<PatientDashboard />} />
      <Route path="/doctor"   element={<DoctorDashboard />} />
      <Route path="/admin"    element={<AdminDashboard />} />
    </Routes>
    </>
  );
}