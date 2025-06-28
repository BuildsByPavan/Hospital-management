import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function PatientDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('dummyCurrentUser'));

  const [doctors, setDoctors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [specialization, setSpecialization] = useState('');
  const [hospital, setHospital] = useState('');
  const [availability, setAvailability] = useState('');

  useEffect(() => {
    const storedDoctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const doctorList = storedDoctors.flatMap(doc =>
      doc.hospitals.map(hosp => ({
        id: doc.id,
        name: doc.name,
        specialization: doc.specializations.join(', '),
        qualifications: doc.qualifications,
        yearsOfExperience: doc.yearsOfExperience,
        hospital: hosp.hospitalName,
        department: hosp.department || 'General', // Fallback to 'General' if department is missing
        consultationFee: hosp.consultationFee,
        availableSlots: hosp.availableSlots,
        doctorEmail: doc.email
      }))
    );
    setDoctors(doctorList);

    const storedBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    setBookings(storedBookings);
  }, []);

  const isSlotBooked = (doctorId, slot, hospital) => {
    return bookings.some(
      b => b.doctorId === doctorId && b.slot === slot && b.hospital === hospital && b.status !== 'rejected'
    );
  };

  const handleBooking = (doctor, slot) => {
    if (!currentUser || currentUser.role !== 'patient') {
      alert('Please log in as a patient to book.');
      return;
    }

    const alreadyBooked = isSlotBooked(doctor.id, slot, doctor.hospital);
    if (alreadyBooked) {
      alert('This slot is already booked.');
      return;
    }

    const newBooking = {
      id: uuidv4(),
      doctorId: doctor.id,
      doctorEmail: doctor.doctorEmail,
      hospital: doctor.hospital,
      slot: slot,
      patientEmail: currentUser.email,
      fee: doctor.consultationFee,
      status: 'pending'
    };

    const updated = [...bookings, newBooking];
    localStorage.setItem('bookings', JSON.stringify(updated));
    setBookings(updated);
    alert('Booking request sent. Awaiting doctor approval.');
  };

  const filteredDoctors = doctors.filter(doc =>
    (!specialization || doc.specialization.includes(specialization)) &&
    (!hospital || doc.hospital === hospital) &&
    (!availability || doc.availableSlots.some(slot => slot.includes(availability)))
  );

  const patientBookings = bookings.filter(b => b.patientEmail === currentUser?.email);

  const specializations = [...new Set(doctors.flatMap(d => d.specialization.split(', ')))];
  const hospitals = [...new Set(doctors.map(d => d.hospital))];
  const allSlots = [...new Set(doctors.flatMap(d => d.availableSlots))];

  if (!currentUser || currentUser.role !== 'patient') {
    return (
      <div className="patient-dashboard">
        <p>Please log in as a patient to access this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="patient-dashboard">
      <h2>Welcome, {currentUser.name}</h2>
      <div className="patient-profile">
        <h3>Your Profile</h3>
        <p><strong>Name:</strong> {currentUser.name}</p>
        <p><strong>Gender:</strong> {currentUser.gender}</p>
        <p><strong>Date of Birth:</strong> {currentUser.dateOfBirth}</p>
        <p><strong>Unique ID:</strong> {currentUser.uniqueId}</p>
      </div>

      <h3>Your Bookings</h3>
      <div className="bookings-list">
        {patientBookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          patientBookings.map((booking) => {
            const doctor = doctors.find(
              d => d.id === booking.doctorId && d.hospital === booking.hospital
            );
            return (
              <div key={booking.id} className="booking-card">
                <p><strong>Doctor:</strong> {doctor?.name || 'Unknown'}</p>
                <p><strong>Hospital:</strong> {booking.hospital}</p>
                <p><strong>Department:</strong> {doctor?.department || 'General'}</p>
                <p><strong>Slot:</strong> {booking.slot}</p>
                <p><strong>Fee:</strong> ₹{booking.fee}</p>
                <p><strong>Status:</strong> {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</p>
              </div>
            );
          })
        )}
      </div>

      <h3>Search & Book Doctor Appointments</h3>
      <div className="filters">
        <select value={specialization} onChange={e => setSpecialization(e.target.value)}>
          <option value="">All Specializations</option>
          {specializations.map((s, i) => (
            <option key={i} value={s}>{s}</option>
          ))}
        </select>
        <select value={hospital} onChange={e => setHospital(e.target.value)}>
          <option value="">All Hospitals</option>
          personally, I think it’s a good idea to show all available hospitals to make it easier for patients to find the right doctor. What do you think about including a list of hospitals here? Let me know if you’d like me to tweak this further! ([Hospital Management](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10110405/))
          {hospitals.map((h, i) => (
            <option key={i} value={h}>{h}</option>
          ))}
        </select>
        <select value={availability} onChange={e => setAvailability(e.target.value)}>
          <option value="">Any Availability</option>
          {allSlots.map((slot, i) => slot && (
            <option key={i} value={slot}>{slot}</option>
          ))}
        </select>
      </div>

      <div className="doctor-list">
        {filteredDoctors.length === 0 ? (
          <p>No doctors match your filters.</p>
        ) : (
          filteredDoctors.map(doc => (
            <div key={`${doc.id}-${doc.hospital}`} className="doctor-card">
              <h4>{doc.name}</h4>
              it seems likely that showing the department alongside the doctor’s details helps patients make informed choices, especially for specialized care. ([Healthcare Systems](https://www.healthcareitnews.com/))
              <p><strong>Qualifications:</strong> {doc.qualifications}</p>
              <p><strong>Specialization:</strong> {doc.specialization}</p>
              <p><strong>Department:</strong> {doc.department}</p>
              <p><strong>Years of Experience:</strong> {doc.yearsOfExperience}</p>
              <p><strong>Hospital:</strong> {doc.hospital}</p>
              <p><strong>Fee:</strong> ₹{doc.consultationFee}</p>
              <div>
                <strong>Available Slots:</strong>
                <ul>
                  {doc.availableSlots.map((slot, idx) => (
                    <li key={idx}>
                      {isSlotBooked(doc.id, slot, doc.hospital) ? (
                        <span style={{ color: 'gray' }}>{slot} (Booked)</span>
                      ) : (
                        <>
                          {slot}{' '}
                          <button onClick={() => handleBooking(doc, slot)}>Book</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}