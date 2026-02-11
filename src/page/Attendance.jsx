import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import toast from "react-hot-toast";

export default function Attendance() {
  /* ---------------- STATES (UNCHANGED) ---------------- */
  const sessions = ["2024-25", "2025-26", "2026-27"];
  const [session, setSession] = useState("2025-26");
  const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const today = new Date();
  const currentMonthName = today.toLocaleString("en-US", { month: "long" });
  const currentDay = today.getDate();

  const [month, setMonth] = useState(currentMonthName);
  const [className, setClassName] = useState("Class 10");
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [holidays, setHolidays] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);

  /* ---------------- LOAD DATA (ORDERED BY ROLL NUMBER) ---------------- */
  useEffect(() => {
    // Yahan maine rollNumber ascending set kar diya hai
    const q = query(collection(db, "students"), orderBy("rollNumber", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const holidayDocRef = doc(db, "metadata", `holidays_${session}_${month}`);
    const unsub = onSnapshot(holidayDocRef, (docSnap) => {
      setHolidays(docSnap.exists() ? docSnap.data() : {});
    });
    return () => unsub();
  }, [session, month]);

  /* ---------------- HELPERS (UNCHANGED) ---------------- */
  const getActualYear = () => {
    const mIndex = months.indexOf(month);
    const startYear = parseInt(session.split("-")[0]);
    return mIndex >= 9 ? startYear + 1 : startYear;
  };

  const getDaysInMonth = () => {
    const actualYear = getActualYear();
    const dateObj = new Date(`${month} 1, ${actualYear}`);
    return new Date(actualYear, dateObj.getMonth() + 1, 0).getDate();
  };

  const isSunday = (day) => {
    const actualYear = getActualYear();
    return new Date(`${month} ${day}, ${actualYear}`).getDay() === 0;
  };

  /* ---------------- PRINT LOGIC (Solid Borders) ---------------- */
  const handlePrint = () => {
    const printContent = document.getElementById("attendance-table-to-print");
    
    let holidayGridHTML = `<table style="width:100%; border:1px solid black; margin-top:15px; border-collapse:collapse;">
                            <tr><th colspan="4" style="background:#f2f2f2; padding:5px; border:1px solid black; font-size:12px;">🚩 HOLIDAY DETAILS</th></tr>
                            <tr>`;
    
    let count = 0;
    [...Array(getDaysInMonth())].forEach((_, i) => {
      const day = i + 1;
      const dayKey = `day_${day}`;
      if (holidays[dayKey]) {
        if (count > 0 && count % 4 === 0) holidayGridHTML += `</tr><tr>`;
        holidayGridHTML += `
          <td style="border:1px solid black; padding:5px; font-size:10px; text-align:left;">
            <b>Day ${day}:</b> ${holidays[dayKey + "_reason"] || "Holiday"}
          </td>`;
        count++;
      }
    });
    
    while (count % 4 !== 0 && count !== 0) {
      holidayGridHTML += `<td style="border:1px solid black;"></td>`;
      count++;
    }
    holidayGridHTML += `</tr></table>`;

    const WinPrint = window.open('', '', 'width=1200,height=900');
    WinPrint.document.write(`
      <html>
        <head>
          <title>Register - ${className}</title>
          <style>
            @page { size: landscape; margin: 5mm; }
            body { font-family: sans-serif; padding: 10px; margin: 0; color: black; background: #fff; }
            .main-border { border: 2px solid black; padding: 15px; min-height: 92vh; box-sizing: border-box; }
            .header-print { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 15px; }
            h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
            .info-bar { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse !important; border: 1px solid black !important; margin-top: 10px; }
            th, td { border: 1px solid black !important; padding: 4px !important; text-align: center; font-size: 10px; }
            .student-info { text-align: left; width: 180px; font-weight: bold; }
            .footer-sign { margin-top: 50px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
            .no-print { display: none !important; }
            .status-val { font-weight: bold; font-size: 12px; }
            .holiday-bg { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div class="main-border">
            <div class="header-print">
              <h1>Student Attendance Register</h1>
              <div class="info-bar">
                <span>Class: ${className}</span>
                <span>Month: ${month} ${getActualYear()}</span>
                <span>Session: ${session}</span>
              </div>
            </div>
            ${printContent.innerHTML}
            ${count > 0 ? holidayGridHTML : ""}
            <div class="footer-sign">
              <span>Teacher's Signature: ________________</span>
              <span>Principal's Signature: ________________</span>
            </div>
          </div>
        </body>
      </html>
    `);

    const buttons = WinPrint.document.querySelectorAll('button');
    buttons.forEach(btn => btn.remove());
    WinPrint.document.close();
    WinPrint.focus();
    setTimeout(() => {
      WinPrint.print();
      WinPrint.close();
    }, 500);
  };

  /* ---------------- ACTIONS (UNCHANGED) ---------------- */
  const toggleHoliday = async (day) => {
    if (isSunday(day)) return toast.error("Sunday is default holiday");
    const dayKey = `day_${day}`;
    if (holidays[dayKey]) return toast.error("Holiday is already locked!");
    let holidayReason = prompt(`Enter Holiday Reason for Day ${day}:`);
    if (!holidayReason) return;
    try {
      const actualYear = getActualYear();
      const holidayDate = `${day} ${month} ${actualYear}`;
      await setDoc(doc(db, "metadata", `holidays_${session}_${month}`), { [dayKey]: true, [`${dayKey}_reason`]: holidayReason }, { merge: true });
      await addDoc(collection(db, "notices"), {
        title: "Holiday Notice 🚩",
        description: `School closed on ${holidayDate} for: ${holidayReason}`,
        date: holidayDate, createdAt: serverTimestamp(), audience: "student", type: "holiday", session: session
      });
      toast.success("Holiday Locked!");
    } catch (e) { toast.error("Failed!"); }
  };

  const markAttendance = async (student, day, status) => {
    if (holidays[`day_${day}`] || isSunday(day)) return toast.error("Locked!");
    const dayKey = `${month}_day_${day}`;
    const monthData = student.attendance?.[month] || {};
    const prevStatus = monthData[dayKey];
    if (prevStatus === status) return;
    const selectedMonthOrder = months.indexOf(month);
    const currentMonthOrder = months.indexOf(currentMonthName);
    const isPastDate = session < "2024-25" || selectedMonthOrder < currentMonthOrder || (selectedMonthOrder === currentMonthOrder && day < currentDay);
    if (isPastDate && prevStatus) return toast.error("Past Attendance Locked!");
    let present = monthData.present || 0;
    let absent = monthData.absent || 0;
    if (prevStatus === "P") present--; if (prevStatus === "A") absent--;
    if (status === "P") present++; if (status === "A") absent++;
    try {
      await updateDoc(doc(db, "students", student.id), {
        [`attendance.${month}.${dayKey}`]: status,
        [`attendance.${month}.present`]: present,
        [`attendance.${month}.absent`]: absent,
      });
      toast.success("Updated!");
    } catch (e) { toast.error("Error!"); }
  };

  /* ---------------- FILTER & SORT (ASCENDING ROLL NUMBER) ---------------- */
  const filteredData = students
    .filter(s => s.className === className && s.session === session && s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // Numbers ko sahi se sort karne ke liye (1, 2, 10...)
      return parseInt(a.rollNumber || 0) - parseInt(b.rollNumber || 0);
    });

  return (
    <div className="min-h-screen bg-gray-50 px-2 py-4 sm:px-6 md:py-8 font-sans" onClick={() => setActiveTooltip(null)}>
      <style>{`
        #attendance-table-to-print table { border-collapse: collapse; width: 100%; }
        #attendance-table-to-print th, #attendance-table-to-print td { border: 1px solid #000000; }
      `}</style>

      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Attendance Pro <span className="text-blue-600 block sm:inline">({session})</span></h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              🖨️ Print Register
            </button>
            <p className="text-xs font-bold text-gray-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase">📅 {month}, {getActualYear()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:flex lg:flex-nowrap gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <select value={session} onChange={(e) => setSession(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm w-full outline-none">{sessions.map(s => <option key={s}>{s}</option>)}</select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm w-full outline-none">{months.map(m => <option key={m}>{m}</option>)}</select>
          <select value={className} onChange={(e) => setClassName(e.target.value)} className="border border-gray-300 p-2 rounded-lg text-sm w-full outline-none">{Array.from({ length: 12 }, (_, i) => <option key={i}>Class {i + 1}</option>)}</select>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="border border-gray-300 p-2.5 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div id="attendance-table-to-print" className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[65vh] relative">
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="sticky left-0 z-40 bg-slate-800 p-4 text-left w-[140px] sm:w-[200px] border-b border-slate-700 shadow-md">Student Info</th>
                  {[...Array(getDaysInMonth())].map((_, i) => {
                    const day = i + 1;
                    const sun = isSunday(day);
                    return (
                      <th key={i} className={`p-2 text-center border-b border-slate-700 w-[50px] sm:w-[55px] ${day === currentDay && month === currentMonthName ? "bg-orange-500" : ""}`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold">{day}</span>
                          <button onClick={() => toggleHoliday(day)} className={`no-print text-[9px] px-1 py-0.5 rounded border transition-all ${sun ? "bg-red-700 text-white border-red-800" : holidays[`day_${day}`] ? "bg-red-50 text-white border-red-400" : "bg-slate-700 text-gray-400 border-slate-600 hover:text-white"}`}>{sun ? "S" : holidays[`day_${day}`] ? "H" : "D"}</button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredData.map(student => {
                  const monthData = student.attendance?.[month] || {};
                  return (
                    <tr key={student.id} className="group hover:bg-blue-50/20">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50 p-3 sm:p-4 border-r border-gray-100 font-bold text-xs sm:text-sm text-gray-800 truncate student-info">
                        {student.name}
                        <div className="text-[9px] text-gray-400 font-normal italic no-print">Roll: {student.rollNumber}</div>
                      </td>

                      {[...Array(getDaysInMonth())].map((_, i) => {
                        const day = i + 1;
                        const sun = isSunday(day);
                        const dayKey = `day_${day}`;
                        const isH = holidays[dayKey] || sun;
                        const status = monthData[`${month}_day_${day}`];
                        const tooltipKey = `${student.id}_${day}`;
                        const reason = sun ? "SUNDAY" : (holidays[`${dayKey}_reason`] || "HOLIDAY");

                        return (
                          <td key={day} className={`text-center p-1 sm:p-2 relative group/cell ${isH ? "bg-red-50/40 holiday-bg" : ""}`}>
                            {isH ? (
                              <div 
                                className="relative flex items-center justify-center h-[55px] w-full cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip(activeTooltip === tooltipKey ? null : tooltipKey);
                                }}
                              >
                                <span className={`text-[8px] font-black rotate-[-90deg] uppercase tracking-tighter ${sun ? "text-red-800" : "text-red-500"} holiday-label`}>
                                  {sun ? "S" : "H"}
                                </span>

                                {(activeTooltip === tooltipKey) && (
                                  <div className="fixed z-[1000] -translate-y-20 -translate-x-1/2 left-1/2 md:absolute md:-translate-y-24 md:left-1/2 pointer-events-auto no-print">
                                    <div className="bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 min-w-[180px] max-w-[260px] text-center animate-in fade-in zoom-in duration-200">
                                      <div className="text-[10px] font-bold text-red-400 uppercase mb-2 tracking-[0.2em] border-b border-slate-700 pb-2">🚩 Reason</div>
                                      <div className="text-sm font-extrabold text-slate-100 leading-relaxed italic">"{reason}"</div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-slate-900"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 items-center justify-center min-h-[55px]">
                                <div className="no-print flex flex-col gap-1">
                                  <button onClick={() => markAttendance(student, day, "P")} className={`w-9 h-7 text-[10px] font-black rounded-lg ${status === "P" ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-400 hover:bg-green-100"}`}>P</button>
                                  <button onClick={() => markAttendance(student, day, "A")} className={`w-9 h-7 text-[10px] font-black rounded-lg ${status === "A" ? "bg-red-600 text-white shadow-md" : "bg-gray-100 text-gray-400 hover:bg-red-100"}`}>A</button>
                                </div>
                                <span className="hidden print:block status-val">{status || "-"}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}