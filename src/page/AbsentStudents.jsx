import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy, getDocs, where } from "firebase/firestore";
import { 
  HiOutlinePhone, 
  HiOutlineEye, 
  HiX, 
  HiPhoneIncoming, 
  HiChatAlt2, 
  HiArrowsExpand,
  HiOutlineCalendar,
  HiChevronLeft,
  HiChevronRight
} from "react-icons/hi";

export default function AbsentStudents() {
  const [students, setStudents] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null); 
  const [fullImage, setFullImage] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  // --- Date & Session State ---
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(months[today.getMonth()]);
  const [session, setSession] = useState("2025-26");
  const [className, setClassName] = useState("All");

  // 1. Students Collection fetch
  useEffect(() => {
    const q = query(collection(db, "students"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => !s.deletedAt);
      setStudents(list);
    });
    return () => unsub();
  }, []);

  // 2. Application Fetch Logic
  const handleViewApplication = async (student) => {
    setLoadingId(student.id);
    try {
      const appRef = collection(db, "applications");
      const q = query(appRef, where("studentId", "==", student.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const appData = querySnapshot.docs[0].data();
        setSelectedApp({ 
          ...appData, 
          studentPhone: student.phone,
          displayClass: student.className,
          displayRoll: student.rollNumber 
        });
      } else {
        alert("Is student ki koi photo application record mein nahi mili.");
      }
    } catch (err) {
      console.error("Firebase Error:", err);
    }
    setLoadingId(null);
  };

  // --- Updated Filter Logic ---
  const absentList = students.filter((s) => {
    const matchesSession = s.session === session;
    const matchesClass = className === "All" ? true : s.className === className;
    // Dynamic key based on state
    const dayKey = `${selectedMonth}_day_${selectedDate}`;
    return matchesClass && matchesSession && s.attendance?.[selectedMonth]?.[dayKey] === "A";
  });

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* 🔝 HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
              Absentees Board
            </h2>
            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
               <HiOutlineCalendar className="text-blue-600" />
               <span className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em]">
                 Attendance for: <span className="text-blue-600">{selectedDate} {selectedMonth}</span>
               </span>
            </div>
          </div>
          
          {/* 📅 DATE & CLASS SELECTORS */}
          <div className="flex flex-wrap gap-3 bg-slate-50 p-2 rounded-3xl border border-slate-100">
            {/* Day Selector */}
            <select 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(Number(e.target.value))}
              className="bg-white px-4 py-2 rounded-2xl font-black text-[11px] text-slate-700 outline-none shadow-sm border-none"
            >
              {[...Array(31)].map((_, i) => (
                <option key={i+1} value={i+1}>Day {i+1}</option>
              ))}
            </select>

            {/* Month Selector */}
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white px-4 py-2 rounded-2xl font-black text-[11px] text-slate-700 outline-none shadow-sm border-none"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* Class Selector */}
            <select 
              value={className} 
              onChange={(e) => setClassName(e.target.value)} 
              className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-[11px] outline-none shadow-sm"
            >
              <option value="All">All Classes</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 📋 TABLE SECTION (Same as yours) */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <tr>
                  <th className="p-7">Student Information</th>
                  <th className="p-7 hidden md:table-cell">Contact Info</th>
                  <th className="p-7 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {absentList.length > 0 ? (
                  absentList.map((student) => (
                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-all">
                      <td className="p-7">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white shadow-lg">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-800 uppercase text-sm group-hover:text-blue-600">
                              {student.name}
                            </div>
                            <div className="text-[10px] font-bold text-red-500 uppercase">
                              {student.className} • Roll: #{student.rollNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-7 hidden md:table-cell">
                        <div className="text-sm font-black text-slate-700">{student.phone}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                          F: {student.fatherName}
                        </div>
                      </td>
                      <td className="p-7 text-center">
                        <button 
                          onClick={() => handleViewApplication(student)}
                          disabled={loadingId === student.id}
                          className="px-6 py-3 bg-slate-100 text-slate-800 rounded-2xl font-black text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                        >
                          {loadingId === student.id ? "..." : "VIEW APP"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-20 text-center text-slate-300 font-black uppercase tracking-widest text-sm italic">
                      No Absentees on {selectedDate} {selectedMonth}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALS (Application and Zoom - Keep as they were) */}
      {/* ... (Existing Modal Code) ... */}
    </div>
  );
}