import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('dummyCurrentUser'));
  const myHospital = currentUser?.hospitalName;

  const [myHospitalStats, setMyHospitalStats] = useState({
    doctors: [],
    totalRevenue: 0,
    totalConsults: 0,
    revenuePerDoctor: {},
    revenuePerDepartment: {}
  });
  const [bookings, setBookings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || !myHospital) {
      return;
    }

    const bookingsData = JSON.parse(localStorage.getItem('bookings') || '[]');
    setBookings(bookingsData);

    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const myHospitalDoctors = doctors.filter(doc => 
      doc.hospitals.some(h => h.hospitalName === myHospital)
    );
    const myHospitalBookings = bookingsData.filter(b => b.hospital === myHospital && b.status === 'accepted');

    const stats = {
      doctors: myHospitalDoctors,
      totalRevenue: 0,
      totalConsults: 0,
      revenuePerDoctor: {},
      revenuePerDepartment: {}
    };

    myHospitalDoctors.forEach(doctor => {
      const { id, name } = doctor;
      const doctorHospital = doctor.hospitals.find(h => h.hospitalName === myHospital);
      if (doctorHospital) {
        const { consultationFee, department } = doctorHospital;
        const docBookings = myHospitalBookings.filter(b => b.doctorId === id);
        const hospitalShare = docBookings.length * consultationFee * 0.4;

        stats.totalConsults += docBookings.length;
        stats.totalRevenue += hospitalShare;

        if (!stats.revenuePerDoctor[name]) {
          stats.revenuePerDoctor[name] = 0;
        }
        stats.revenuePerDoctor[name] += hospitalShare;

        if (!stats.revenuePerDepartment[department]) {
          stats.revenuePerDepartment[department] = 0;
        }
        stats.revenuePerDepartment[department] += hospitalShare;
      }
    });

    setMyHospitalStats(stats);

    const storedDepartments = JSON.parse(localStorage.getItem(`departments_${myHospital}`) || '[]');
    setDepartments(storedDepartments);
  }, [myHospital]);

  const handleAddDepartment = (e) => {
    e.preventDefault();
    setError('');

    if (!newDepartment.trim()) {
      setError('Department name is required.');
      return;
    }
    if (departments.includes(newDepartment.trim())) {
      setError('Department already exists.');
      return;
    }

    const updatedDepartments = [...departments, newDepartment.trim()];
    setDepartments(updatedDepartments);
    localStorage.setItem(`departments_${myHospital}`, JSON.stringify(updatedDepartments));
    setNewDepartment('');
  };

  const handleRemoveDepartment = (dept) => {
    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const hasDoctorsInDept = doctors.some(doc => 
      doc.hospitals.some(h => h.hospitalName === myHospital && h.department === dept)
    );
    if (hasDoctorsInDept) {
      setError('Cannot remove department with associated doctors.');
      return;
    }

    const updatedDepartments = departments.filter(d => d !== dept);
    setDepartments(updatedDepartments);
    localStorage.setItem(`departments_${myHospital}`, JSON.stringify(updatedDepartments));
  };

  if (!currentUser || currentUser.role !== 'admin' || !myHospital) {
    return <div className="admin-dashboard"><p>Please log in as a hospital admin.</p></div>;
  }

  return (
    <div className="admin-dashboard">
      <h2>{myHospital} Admin Dashboard</h2>
      <div className="hospital-section">
        <h3>Statistics</h3>
        <div className="metrics-container">
          <p><strong>Total Consultations:</strong> {myHospitalStats.totalConsults}</p>
          <p><strong>Total Revenue (40%):</strong> ₹{myHospitalStats.totalRevenue.toFixed(2)}</p>
        </div>
        <h4>Associated Doctors</h4>
        <ul>
          {myHospitalStats.doctors.map(doc => (
            <li key={doc.id}>
              {doc.name} ({doc.hospitals.find(h => h.hospitalName === myHospital)?.department})
            </li>
          ))}
        </ul>
        <h4>Revenue per Doctor</h4>
        <ul>
          {Object.entries(myHospitalStats.revenuePerDoctor).map(([name, amount]) => (
            <li key={name}>{name}: ₹{amount.toFixed(2)}</li>
          ))}
        </ul>
        <h4>Revenue per Department</h4>
        <ul>
          {Object.entries(myHospitalStats.revenuePerDepartment).map(([dept, amount]) => (
            <li key={dept}>{dept}: ₹{amount.toFixed(2)}</li>
          ))}
        </ul>
      </div>
      <div className="department-management">
        <h3>Manage Departments</h3>
        {error && <p className="error">{error}</p>}
        <div className="department-form">
          <label>
            New Department Name
            <input
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Enter department name"
            />
          </label>
          <button onClick={handleAddDepartment}>Add Department</button>
        </div>
        <h4>Current Departments</h4>
        {departments.length === 0 ? (
          <p>No departments defined.</p>
        ) : (
          <ul>
            {departments.map(dept => (
              <li key={dept}>
                {dept} <button className="remove-btn" onClick={() => handleRemoveDepartment(dept)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}