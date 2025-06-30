import { useEffect, useState } from 'react';

// Helper to safely parse localStorage
const safeParse = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export default function DoctorDashboard() {
  // — Core identity —
  const currentUser        = safeParse('dummyCurrentUser', {});
  const currentDoctorEmail = currentUser?.email;

  // — STATE: core data —
  const [doctorData, setDoctorData] = useState(null);
  const [bookings,   setBookings]   = useState([]);

  // — STATE: computed metrics —
  const [totalConsults,     setTotalConsults]     = useState(0);
  const [totalEarnings,     setTotalEarnings]     = useState(0);
  const [earningsByHospital, setEarningsByHospital] = useState({});

  // — STATE: UI/forms —
  const [newHospital, setNewHospital]                   = useState('');
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [newDepartment, setNewDepartment]               = useState('');
  const [newFee, setNewFee]                             = useState('');
  const [newFees, setNewFees]                           = useState({});
  const [newSlotInputs, setNewSlotInputs]               = useState({}); // keyed by hospitalName
  const [error, setError]                               = useState('');

  // 1️⃣ Load doctorData & bookings when component mounts or doctor changes
  useEffect(() => {
    if (currentUser.role !== 'doctor' || !currentDoctorEmail) {
      setDoctorData(undefined);
      return;
    }
    const doctors  = safeParse('doctors', []);
    const allBkgs  = safeParse('bookings', []);
    const me       = doctors.find(d => d.email === currentDoctorEmail) || null;
    setDoctorData(me);
    setBookings(allBkgs);
  }, [currentDoctorEmail, currentUser.role]);

  // 2️⃣ Recompute metrics whenever doctorData or bookings change
  useEffect(() => {
    if (!doctorData) return;

    let consults = 0;
    let earnings = 0;
    const byHospital = {};

    for (const hosp of doctorData.hospitals || []) {
      const accepted = bookings.filter(b =>
        b.doctorEmail === currentDoctorEmail &&
        b.hospital     === hosp.hospitalName &&
        b.status       === 'accepted'
      );
      consults += accepted.length;
      const hospEarn = accepted.length * hosp.consultationFee * 0.6;
      earnings += hospEarn;
      byHospital[hosp.hospitalName] = hospEarn;
    }

  setTotalConsults(consults);
  setTotalEarnings(earnings);
  setEarningsByHospital(hospitalMap);
}, [currentDoctorEmail]);

  // 3️⃣ When hospital dropdown changes, update department list
  useEffect(() => {
    if (newHospital && doctorData) {
      const depts = safeParse(`departments_${newHospital}`, []);
      const matches = depts.filter(d => doctorData.specializations.includes(d));
      setAvailableDepartments(matches);
    } else {
      setAvailableDepartments([]);
    }
    setNewDepartment('');
  }, [newHospital, doctorData]);

  // — Utilities: time parsing & overlap check —
  const timeToMinutes = timeStr => {
    const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) throw new Error('Invalid time');
    let [ , hh, mm, period ] = m;
    let h = parseInt(hh, 10), mins = parseInt(mm, 10);
    if (period.toUpperCase() === 'PM' && h < 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + mins;
  };

  const isValidSlot = slot =>
    /^[A-Za-z]+ \d{1,2}:\d{2} (AM|PM)$/i.test(slot);

  const hasSlotOverlap = (slotText, hospitalName) => {
    try {
      const [dayNew, timeNew] = slotText.split(' ', 2);
      const startNew = timeToMinutes(timeNew);
      const endNew   = startNew + 60;
      return (doctorData.hospitals || []).some(hosp => {
        if (hosp.hospitalName === hospitalName) return false;
        return hosp.availableSlots.some(slot => {
          const [day, time] = slot.split(' ', 2);
          if (day.toLowerCase() !== dayNew.toLowerCase()) return false;
          const s = timeToMinutes(time);
          return startNew < s + 60 && s < endNew;
        });
      });
    } catch {
      return false;
    }
  };

  // — Handlers —

  // 1️⃣ Accept or reject a booking
  const handleBookingAction = (bookingId, action) => {
    const all = safeParse('bookings', []);
    const updated = all.map(b =>
      b.id === bookingId
        ? { ...b, status: action }
        : b
    );
    setBookings(updated);
    localStorage.setItem('bookings', JSON.stringify(updated));
  };

  // 2️⃣ Associate with a new hospital
  const handleAddHospital = e => {
    e.preventDefault();
    setError('');
    if (!newHospital || !newDepartment || !newFee || Number(newFee) <= 0) {
      setError('Select hospital, department, and enter a valid fee.');
      return;
    }

    const admins = safeParse('dummyUsers', []).filter(u => u.role === 'admin');
    if (!admins.find(a => a.hospitalName === newHospital)) {
      setError('Hospital not registered.');
      return;
    }

    const depts = safeParse(`departments_${newHospital}`, []);
    if (!depts.includes(newDepartment)) {
      setError('Department not offered by this hospital.');
      return;
    }

    if (!doctorData.specializations.includes(newDepartment)) {
      setError('You are not specialized in that department.');
      return;
    }

    // deep clone
    const updatedDoc = JSON.parse(JSON.stringify(doctorData));
    updatedDoc.hospitals = updatedDoc.hospitals || [];
    if (updatedDoc.hospitals.some(h => h.hospitalName === newHospital)) {
      setError('Already associated.');
      return;
    }
    updatedDoc.hospitals.push({
      hospitalName:   newHospital,
      department:     newDepartment,
      consultationFee: Number(newFee),
      availableSlots:  []
    });

    const allDocs = safeParse('doctors', []);
    const idx     = allDocs.findIndex(d => d.email === currentDoctorEmail);
    if (idx >= 0) allDocs[idx] = updatedDoc;
    else          allDocs.push(updatedDoc);
    localStorage.setItem('doctors', JSON.stringify(allDocs));

    setDoctorData(updatedDoc);
    setNewFees(prev => ({ ...prev, [newHospital]: newFee }));
    setNewHospital(''); setNewDepartment(''); setNewFee('');
  };

  // 3️⃣ Add a new slot to a hospital
  const handleAddSlot = (hospitalName, e) => {
    e.preventDefault();
    setError('');

    const slotText = (newSlotInputs[hospitalName] || '').trim();
    if (!slotText || !isValidSlot(slotText)) {
      setError('Enter slot e.g., Monday 10:00 AM');
      return;
    }
    if (hasSlotOverlap(slotText, hospitalName)) {
      setError('This slot overlaps another.');
      return;
    }

    const updatedDoc = JSON.parse(JSON.stringify(doctorData));
    const hosp = updatedDoc.hospitals.find(h => h.hospitalName === hospitalName);
    hosp.availableSlots.push(slotText);

    const allDocs = safeParse('doctors', []);
    const idx     = allDocs.findIndex(d => d.email === currentDoctorEmail);
    allDocs[idx] = updatedDoc;
    localStorage.setItem('doctors', JSON.stringify(allDocs));

    setDoctorData(updatedDoc);
    setNewSlotInputs(prev => ({ ...prev, [hospitalName]: '' }));
  };

  // 4️⃣ Remove a slot
  const handleRemoveSlot = (hospitalName, slot) => {
    const allBkgs = safeParse('bookings', []);
    if (allBkgs.some(b => b.hospital===hospitalName && b.slot===slot && b.status!=='rejected')) {
      setError('Cannot remove a slot with active bookings.');
      return;
    }

    const updatedDoc = JSON.parse(JSON.stringify(doctorData));
    const hosp = updatedDoc.hospitals.find(h => h.hospitalName === hospitalName);
    hosp.availableSlots = hosp.availableSlots.filter(s => s !== slot);

    const allDocs = safeParse('doctors', []);
    const idx     = allDocs.findIndex(d => d.email === currentDoctorEmail);
    allDocs[idx] = updatedDoc;
    localStorage.setItem('doctors', JSON.stringify(allDocs));

    setDoctorData(updatedDoc);
  };

  // 5️⃣ Update consultation fee
  const handleUpdateFee = hospitalName => {
    setError('');
    const feeStr = newFees[hospitalName];
    if (!feeStr || Number(feeStr) <= 0) {
      setError('Enter a valid fee.');
      return;
    }

    const updatedDoc = JSON.parse(JSON.stringify(doctorData));
    const hosp = updatedDoc.hospitals.find(h => h.hospitalName === hospitalName);
    hosp.consultationFee = Number(feeStr);

    const allDocs = safeParse('doctors', []);
    const idx     = allDocs.findIndex(d => d.email === currentDoctorEmail);
    allDocs[idx] = updatedDoc;
    localStorage.setItem('doctors', JSON.stringify(allDocs));

    setDoctorData(updatedDoc);
  };

  // — Render guards —
  if (currentUser.role !== 'doctor') {
    return <div>Please log in as a doctor.</div>;
  }
  if (doctorData === null) {
    return <div>Loading...</div>;
  }
  if (!doctorData) {
    return <div>No doctor found for {currentDoctorEmail}</div>;
  }

  // Derived lists
  const pendingBookings = bookings.filter(b =>
    b.doctorEmail === currentDoctorEmail && b.status === 'pending'
  );
  const availableHospitals = safeParse('dummyUsers', [])
    .filter(u => u.role === 'admin')
    .map(u => u.hospitalName);

  return (
    <div className="doctor-dashboard">
      <h2>Doctor Dashboard — {doctorData.name}</h2>

      {/* Metrics */}
      <div className="metrics-container">
        <p><strong>Total Consultations:</strong> {totalConsults}</p>
        <p><strong>Total Earnings (60%):</strong> ₹{totalEarnings.toFixed(2)}</p>
      </div>

      <h3>Earnings by Hospital</h3>
      <ul>
        {Object.entries(earningsByHospital).map(([hosp, amt]) => (
          <li key={hosp}>{hosp}: ₹{amt.toFixed(2)}</li>
        ))}
      </ul>

      {/* Pending Bookings */}
      <section className="pending-bookings">
        <h3>Pending Bookings</h3>
        {pendingBookings.length === 0 ? (
          <p>No pending bookings.</p>
        ) : (
          <ul>
            {pendingBookings.map(b => (
              <li key={b.id}>
                <p><strong>Patient:</strong> {b.patientEmail}</p>
                <p><strong>Hospital:</strong> {b.hospital}</p>
                <p><strong>Slot:</strong> {b.slot}</p>
                <p><strong>Fee:</strong> ₹{b.fee}</p>
                <button onClick={() => handleBookingAction(b.id, 'accepted')}>
                  Accept
                </button>
                <button onClick={() => handleBookingAction(b.id, 'rejected')}>
                  Reject
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Associate with Hospital */}
      <section className="hospital-management">
        <h3>Associate with a Hospital</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleAddHospital} className="hospital-form">
          <label>
            Hospital
            <select
              value={newHospital}
              onChange={e => setNewHospital(e.target.value)}
            >
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
                <select
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                >
                  <option value="">Select a department</option>
                  {availableDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p>No departments match your specializations.</p>
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
          <button type="submit">Associate</button>
        </form>
      </section>

      {/* Hospital Sections */}
      {doctorData.hospitals.map(hosp => (
        <section key={hosp.hospitalName} className="hospital-section">
          <h3>{hosp.hospitalName} ({hosp.department})</h3>
          <div className="metrics-container">
            <p><strong>Consultation Fee:</strong> ₹{hosp.consultationFee}</p>
          </div>

          {/* Update Fee */}
          <div className="fee-form">
            <label>
              Update Fee (₹)
              <input
                type="number"
                value={newFees[hosp.hospitalName] || ''}
                onChange={e =>
                  setNewFees(prev => ({
                    ...prev,
                    [hosp.hospitalName]: e.target.value
                  }))
                }
                placeholder="New fee"
              />
            </label>
            <button onClick={() => handleUpdateFee(hosp.hospitalName)}>
              Update
            </button>
          </div>

          {/* Availability Slots */}
          <h4>Availability Slots</h4>
          <div className="slot-form">
            <input
              placeholder="e.g., Monday 10:00 AM"
              value={newSlotInputs[hosp.hospitalName] || ''}
              onChange={e =>
                setNewSlotInputs(prev => ({
                  ...prev,
                  [hosp.hospitalName]: e.target.value
                }))
              }
            />
            <button onClick={e => handleAddSlot(hosp.hospitalName, e)}>
              Add Slot
            </button>
            {error && <p className="error">{error}</p>}
          </div>
          <ul>
            {hosp.availableSlots.length === 0 ? (
              <p>No slots defined.</p>
            ) : (
              hosp.availableSlots.map(slot => (
                <li key={slot}>
                  {slot}{' '}
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveSlot(hosp.hospitalName, slot)}
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
