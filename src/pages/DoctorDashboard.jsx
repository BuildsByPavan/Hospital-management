import { useEffect, useState } from 'react';

export default function DoctorDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('dummyCurrentUser'));
  const currentDoctorEmail = currentUser?.email;

  const [doctorData, setDoctorData] = useState(null);
  const [totalConsults, setTotalConsults] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [earningsByHospital, setEarningsByHospital] = useState({});
  const [bookings, setBookings] = useState([]);
  const [newHospital, setNewHospital] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [newFee, setNewFee] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [newFees, setNewFees] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
  if (!currentDoctorEmail || currentUser?.role !== 'doctor') {
    return;
  }

  const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
  const doctor = doctors.find(d => d.email === currentDoctorEmail);
  setDoctorData(doctor);

  const bookingsData = JSON.parse(localStorage.getItem('bookings') || '[]');
  setBookings(bookingsData);

  let consults = 0;
  let earnings = 0;
  const hospitalMap = {};

  if (doctor?.hospitals) {
    doctor.hospitals.forEach(hosp => {
      const docBookings = bookingsData.filter(b => 
        b.doctorEmail === currentDoctorEmail && 
        b.hospital === hosp.hospitalName && 
        b.status === 'accepted'
      );
      consults += docBookings.length;
      const hospEarnings = docBookings.length * hosp.consultationFee * 0.6;
      earnings += hospEarnings;
      hospitalMap[hosp.hospitalName] = hospEarnings;
    });
  }

  setTotalConsults(consults);
  setTotalEarnings(earnings);
  setEarningsByHospital(hospitalMap);
}, [currentDoctorEmail]);

  useEffect(() => {
    if (newHospital && doctorData) {
      const hospitalDepts = JSON.parse(localStorage.getItem(`departments_${newHospital}`) || '[]');
      const matchingDepts = hospitalDepts.filter(dept => doctorData.specializations.includes(dept));
      setAvailableDepartments(matchingDepts);
      setNewDepartment('');
    } else {
      setAvailableDepartments([]);
      setNewDepartment('');
    }
  }, [newHospital, doctorData]);

  const timeToMinutes = (timeStr) => {
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match = timeStr.match(timeRegex);
    if (!match) {
      throw new Error('Invalid time format');
    }
    const [, hh, mm, period] = match;
    let hours = parseInt(hh, 10);
    const minutes = parseInt(mm, 10);
    if (period.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  };

  const isValidSlot = (slot) => {
    const slotRegex = /^[A-Za-z]+ \d{1,2}:\d{2} (AM|PM)$/i;
    return slotRegex.test(slot);
  };

  const hasSlotOverlap = (newSlot, hospitalName) => {
    if (!doctorData?.hospitals) return false;
    const [newDay, newTime] = newSlot.split(' ', 2);
    try {
      const newStart = timeToMinutes(newTime);
      const newEnd = newStart + 60;

      return doctorData.hospitals.some(hosp => {
        if (hosp.hospitalName === hospitalName) return false;
        return hosp.availableSlots.some(slot => {
          const [day, time] = slot.split(' ', 2);
          if (day.toLowerCase() !== newDay.toLowerCase()) return false;
          try {
            const start = timeToMinutes(time);
            const end = start + 60;
            return newStart < end && start < newEnd;
          } catch {
            return false;
          }
        });
      });
    } catch {
      return false;
    }
  };

  const handleAddHospital = (e) => {
    e.preventDefault();
    setError('');
    if (!newHospital || !newFee || isNaN(newFee) || Number(newFee) <= 0 || !newDepartment) {
      setError('Please select a hospital, department, and enter a valid consultation fee.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('dummyUsers') || '[]');
    const hospitalAdmin = users.find(u => u.role === 'admin' && u.hospitalName === newHospital);
    if (!hospitalAdmin) {
      setError('Selected hospital is not registered.');
      return;
    }

    const hospitalDepts = JSON.parse(localStorage.getItem(`departments_${newHospital}`) || '[]');
    if (!hospitalDepts.includes(newDepartment)) {
      setError('Selected department does not exist in the hospital.');
      return;
    }
    if (!doctorData.specializations.includes(newDepartment)) {
      setError('Selected department does not match your specializations.');
      return;
    }

    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const updatedDoctor = { ...doctorData };
    if (!updatedDoctor.hospitals) updatedDoctor.hospitals = [];
    if (updatedDoctor.hospitals.some(h => h.hospitalName === newHospital)) {
      setError('You are already associated with this hospital.');
      return;
    }

    updatedDoctor.hospitals.push({
      hospitalName: newHospital,
      department: newDepartment,
      consultationFee: Number(newFee),
      availableSlots: []
    });

    const doctorIndex = doctors.findIndex(d => d.email === currentDoctorEmail);
    if (doctorIndex !== -1) {
      doctors[doctorIndex] = updatedDoctor;
    } else {
      doctors.push(updatedDoctor);
    }
    localStorage.setItem('doctors', JSON.stringify(doctors));
    setDoctorData(updatedDoctor);
    setNewFees(prev => ({ ...prev, [newHospital]: newFee }));
    setNewHospital('');
    setNewDepartment('');
    setNewFee('');
  };

  const handleAddSlot = (hospitalName, e) => {
    e.preventDefault();
    setError('');
    if (!newSlot.trim()) {
      setError('Please enter a time slot (e.g., Monday 10:00 AM).');
      return;
    }
    if (!isValidSlot(newSlot)) {
      setError('Please enter a valid time slot in the format: Day HH:MM AM/PM (e.g., Monday 10:00 AM).');
      return;
    }

    if (hasSlotOverlap(newSlot, hospitalName)) {
      setError('This slot overlaps with an existing slot at another hospital.');
      return;
    }

    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const updatedDoctor = { ...doctorData };
    const hospital = updatedDoctor.hospitals.find(h => h.hospitalName === hospitalName);
    hospital.availableSlots.push(newSlot.trim());

    const doctorIndex = doctors.findIndex(d => d.email === currentDoctorEmail);
    doctors[doctorIndex] = updatedDoctor;
    localStorage.setItem('doctors', JSON.stringify(doctors));
    setDoctorData(updatedDoctor);
    setNewSlot('');
  };

  const handleRemoveSlot = (hospitalName, slot) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const isSlotBooked = bookings.some(b => b.hospital === hospitalName && b.slot === slot && b.status !== 'rejected');
    if (isSlotBooked) {
      setError('Cannot remove slot with active bookings.');
      return;
    }

    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const updatedDoctor = { ...doctorData };
    const hospital = updatedDoctor.hospitals.find(h => h.hospitalName === hospitalName);
    hospital.availableSlots = hospital.availableSlots.filter(s => s !== slot);

    const doctorIndex = doctors.findIndex(d => d.email === currentDoctorEmail);
    doctors[doctorIndex] = updatedDoctor;
    localStorage.setItem('doctors', JSON.stringify(doctors));
    setDoctorData(updatedDoctor);
  };

  const handleUpdateFee = (hospitalName) => {
    setError('');
    const newFeeStr = newFees[hospitalName];
    if (!newFeeStr || isNaN(newFeeStr) || Number(newFeeStr) <= 0) {
      setError('Please enter a valid consultation fee.');
      return;
    }
    const newFee = Number(newFeeStr);

    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const updatedDoctor = { ...doctorData };
    const hospital = updatedDoctor.hospitals.find(h => h.hospitalName === hospitalName);
    if (hospital) {
      hospital.consultationFee = newFee;
    } else {
      setError('Hospital association not found.');
      return;
    }

    const doctorIndex = doctors.findIndex(d => d.email === currentDoctorEmail);
    if (doctorIndex !== -1) {
      doctors[doctorIndex] = updatedDoctor;
      localStorage.setItem('doctors', JSON.stringify(doctors));
      setDoctorData(updatedDoctor);
    } else {
      setError('Doctor data not found.');
    }
  };
 const handleBookingAction = (bookingId, action) => {
  const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
  const updatedBookings = bookings.map(b => 
    b.id === bookingId ? { ...b, status: action } : b
  );
  setBookings(updatedBookings);
  localStorage.setItem('bookings', JSON.stringify(updatedBookings));
};
  if (!currentDoctorEmail || currentUser?.role !== 'doctor') {
    return <div className="doctor-dashboard"><p>Please log in as a doctor.</p></div>;
  }

  const availableHospitals = JSON.parse(localStorage.getItem('dummyUsers') || '[]')
    .filter(u => u.role === 'admin')
    .map(u => u.hospitalName);

  const pendingBookings = bookings.filter(b => 
    b.doctorEmail === currentDoctorEmail && b.status === 'pending'
  );

  return (
    <div className="doctor-dashboard">
      <h2>Doctor Dashboard - {doctorData?.name}</h2>
      <div className="metrics-container">
        <p><strong>Total Consultations:</strong> {totalConsults}</p>
        <p><strong>Total Earnings (60%):</strong> ₹{totalEarnings.toFixed(2)}</p>
      </div>
      <h3>Earnings by Hospital</h3>
      <ul>
        {Object.entries(earningsByHospital).map(([hospital, amount]) => (
          <li key={hospital}>{hospital}: ₹{amount.toFixed(2)}</li>
        ))}
      </ul>
      <div className="hospital-management">
        <h3>Associate with a Hospital</h3>
        {error && <p className="error">{error}</p>}
        <div className="hospital-form">
          <label>
            Hospital
            <select value={newHospital} onChange={e => setNewHospital(e.target.value)}>
              <option value="">Select a hospital</option>
              {availableHospitals.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          {newHospital && (
            availableDepartments.length > 0 ? (
              <label>
                Department
                <select value={newDepartment} onChange={e => setNewDepartment(e.target.value)}>
                  <option value="">Select a department</option>
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p>No departments match your specializations in this hospital.</p>
            )
          )}
          <label>
            Consultation Fee (₹)
            <input
              type="number"
              value={newFee}
              onChange={e => setNewFee(e.target.value)}
              placeholder="Enter fee"
            />
          </label>
          <button onClick={handleAddHospital}>Associate</button>
        </div>
      </div>
      <div className="pending-bookings">
        <h3>Pending Bookings</h3>
        {pendingBookings.length === 0 ? (
          <p>No pending bookings.</p>
        ) : (
          <ul>
            {pendingBookings.map(booking => (
              <li key={booking.id}>
                <p><strong>Patient:</strong> {booking.patientEmail}</p>
                <p><strong>Hospital:</strong> {booking.hospital}</p>
                <p><strong>Slot:</strong> {booking.slot}</p>
                <p><strong>Fee:</strong> ₹{booking.fee}</p>
                <button onClick={() => handleBookingAction(booking.id, 'accepted')}>Accept</button>
                <button className="remove-btn" onClick={() => handleBookingAction(booking.id, 'rejected')}>Reject</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {doctorData?.hospitals?.map(hosp => (
        <div key={hosp.hospitalName} className="hospital-section">
          <h3>{hosp.hospitalName} ({hosp.department})</h3>
          <div className="metrics-container">
            <p><strong>Consultation Fee:</strong> ₹{hosp.consultationFee}</p>
          </div>
          <div className="fee-form">
            <label>
              Update Consultation Fee (₹)
              <input
                type="number"
                value={newFees[hosp.hospitalName] || ''}
                onChange={e => setNewFees(prev => ({ ...prev, [hosp.hospitalName]: e.target.value }))}
                placeholder="Enter new fee"
              />
            </label>
            <button onClick={() => handleUpdateFee(hosp.hospitalName)}>Update Fee</button>
          </div>
          <h4>Availability Slots</h4>
          <div className="slot-form">
            <label>
              New Slot (e.g., Monday 10:00 AM)
              <input
                value={newSlot}
                onChange={e => setNewSlot(e.target.value)}
                placeholder="Enter slot (e.g., Monday 10:00 AM)"
              />
            </label>
            <button onClick={(e) => handleAddSlot(hosp.hospitalName, e)}>Add Slot</button>
          </div>
          <ul>
            {hosp.availableSlots.length === 0 ? (
              <p>No slots defined.</p>
            ) : (
              hosp.availableSlots.map(slot => (
                <li key={slot}>
                  {slot} <button className="remove-btn" onClick={() => handleRemoveSlot(hosp.hospitalName, slot)}>Remove</button>
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}