import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

const AdmitCardGenerator = () => {
  const classes = [
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
    "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
  ];

  // Sessions list
  const sessions = ["2024-25", "2025-26", "2026-27"];

  const [selectedClass, setSelectedClass] = useState("Class 1");
  const [selectedSession, setSelectedSession] = useState("2025-26"); // Default Session
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true); // Loader State
  const [showAdmitCard, setShowAdmitCard] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [classTimetable, setClassTimetable] = useState([]);

  const printRef = useRef(null);

  /* ================= 1. FETCH STUDENTS (With Session Filter) ================= */
  useEffect(() => {
    setLoading(true); // Fetch shuru hote hi loader on
    const q = query(
      collection(db, "students"),
      where("className", "==", selectedClass),
      where("session", "==", selectedSession) // Session filter added
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setStudents(data.sort((a, b) => a.rollNumber - b.rollNumber));
      setLoading(false); // Data milne ke baad loader off
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedClass, selectedSession]); // Dono change hone par refresh hoga

  /* ================= 2. FETCH TIMETABLE HELPER ================= */
  const fetchTimetableData = async (className) => {
    try {
      const ref = doc(db, "Timetables", className);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return [...snap.data().exams].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
      }
      return [];
    } catch (e) {
      console.error("Timetable fetch error:", e);
      return [];
    }
  };

  /* ================= 3. SHARED PRINT STYLES ================= */
  const sharedStyles = `
  @page { size: A4; margin: 10mm; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: white; }
  .page-container { width: 100%; page-break-after: always; page-break-inside: avoid; box-sizing: border-box; padding: 5mm; }
  .card-outer { border: 4px double #1e1b4b; padding: 15px; position: relative; border-radius: 10px; min-height: 260mm; display: flex; flex-direction: column; box-sizing: border-box; }
  .school-name { text-align: center; font-size: 28px; font-weight: 900; color: #1e1b4b; margin: 0; text-transform: uppercase; }
  .school-addr { text-align: center; font-size: 12px; margin-bottom: 8px; color: #444; font-weight: 600; }
  .card-title { text-align: center; background: #1e1b4b; color: #fff; padding: 6px; font-weight: bold; margin-bottom: 20px; border-radius: 4px; font-size: 15px; }
  .header-info { display: flex; justify-content: space-between; margin-bottom: 15px; gap: 15px; }
  .student-details { flex-grow: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .photo-box { width: 100px; height: 120px; border: 2px solid #1e1b4b; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f8f8f8; flex-shrink: 0; }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .detail-item { font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
  .detail-item b { color: #1e1b4b; margin-right: 5px; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th, td { border: 1px solid #1e1b4b; padding: 8px; text-align: left; font-size: 12px; }
  th { background-color: #f1f5f9; color: #1e1b4b; text-transform: uppercase; }
  .footer { margin-top: auto; padding: 40px 20px 10px 20px; display: flex; justify-content: space-between; }
  .sig-box { text-align: center; width: 150px; }
  .sig-line { border-top: 1.5px solid #1e1b4b; margin-bottom: 5px; }
  .sig-text { font-size: 11px; font-weight: bold; color: #1e1b4b; }
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(30, 27, 75, 0.04); z-index: -1; font-weight: 900; pointer-events: none; white-space: nowrap; }
`;

  const formatDate = (d) => {
    if (!d) return "TBD";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  /* ================= 4. PRINT ALL LOGIC ================= */
  const handlePrintAll = async () => {
    if (students.length === 0) return alert("Is class aur session mein koi student nahi mila!");
    
    const timetable = await fetchTimetableData(selectedClass);
    const printWindow = window.open("", "_blank");
    
    let allCardsHTML = "";
    students.forEach((stu) => {
      allCardsHTML += `
        <div class="page-container">
          <div class="card-outer">
            <div class="watermark">SUNSHINE</div>
            <div class="header">
              <h1 class="school-name">SUNSHINE PUBLIC SCHOOL</h1>
              <p class="school-addr">123, Education Hub, City Name, State - 123456</p>
              <div class="card-title">ANNUAL EXAMINATION ADMIT CARD (${selectedSession})</div>
            </div>
            
            <div class="header-info">
              <div class="student-details">
                <div class="detail-item"><b>Student Name:</b> ${stu.name?.toUpperCase()}</div>
                <div class="detail-item"><b>Roll Number:</b> ${stu.rollNumber}</div>
                <div class="detail-item"><b>Father's Name:</b> ${stu.fatherName?.toUpperCase()}</div>
                <div class="detail-item"><b>Class:</b> ${stu.className}</div>
                <div class="detail-item"><b>Gender:</b> ${stu.gender || '---'}</div>
                <div class="detail-item"><b>Date of Birth:</b> ${stu.dob || '---'}</div>
              </div>
              <div class="photo-box">
                ${stu.photoURL ? `<img src="${stu.photoURL}" />` : `<span style="font-size:10px; font-weight:bold; color:#999; text-align:center;">PASTE<br>PHOTO</span>`}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 25%">Date & Day</th>
                  <th style="width: 50%">Subject</th>
                  <th style="width: 25%">Timing</th>
                </tr>
              </thead>
              <tbody>
                ${timetable.length > 0 
                  ? timetable.map(e => `
                      <tr>
                        <td style="font-weight:bold;">${formatDate(e.date)}</td>
                        <td style="text-transform:uppercase; font-weight:700;">${e.subject}</td>
                        <td>${e.time}</td>
                      </tr>`).join('')
                  : `<tr><td colspan="3" style="text-align:center; padding:30px;">Timetable not updated for this class</td></tr>`
                }
              </tbody>
            </table>

            <div class="footer">
              <div class="sig-box"><div class="sig-line"></div><div class="sig-text">Student's Signature</div></div>
              <div class="sig-box"><div class="sig-line"></div><div class="sig-text">Principal's Signature</div></div>
            </div>
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Bulk Admit Cards - ${selectedClass} (${selectedSession})</title>
          <style>${sharedStyles}</style>
        </head>
        <body>
          ${allCardsHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 700);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  /* ================= 5. SINGLE PRINT LOGIC ================= */
  const openSingleCard = async (student) => {
    setCurrentStudent(student);
    const tt = await fetchTimetableData(student.className);
    setClassTimetable(tt);
    setShowAdmitCard(true);
  };

  const handleSinglePrint = () => {
    const printWindow = window.open("", "_blank");
    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head><style>${sharedStyles}</style></head>
        <body>
          <div class="page-container">${content}</div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      {/* TOP NAV / ACTIONS */}
      <div className="max-w-6xl mx-auto bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">
            Admit Card <span className="text-indigo-600">Portal</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Session {selectedSession}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SESSION SELECT */}
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-indigo-600 focus:border-indigo-600 outline-none bg-white transition-all cursor-pointer"
          >
            {sessions.map((s) => (
              <option key={s} value={s}>Session {s}</option>
            ))}
          </select>

          {/* CLASS SELECT */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 focus:border-indigo-600 outline-none bg-white transition-all cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={handlePrintAll}
            disabled={loading || students.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            PRINT CLASS ({students.length})
          </button>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full border-none">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-4 border-none text-[10px] tracking-widest">ROLL NO</th>
                <th className="p-4 border-none text-[10px] tracking-widest">STUDENT NAME</th>
                <th className="p-4 border-none text-[10px] tracking-widest">FATHER'S NAME</th>
                <th className="p-4 border-none text-[10px] tracking-widest text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                /* LOADER ROW */
                <tr>
                  <td colSpan="4" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-500 font-bold animate-pulse">Loading Students...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="p-4 font-mono font-black text-indigo-600">{stu.rollNumber}</td>
                    <td className="p-4 font-bold text-slate-800 uppercase">{stu.name}</td>
                    <td className="p-4 text-slate-500 uppercase text-sm font-medium">{stu.fatherName}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openSingleCard(stu)}
                        className="bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all"
                      >
                        View Card
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-400 font-bold italic">
                    Is class/session mein koi student registered nahi hai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE CARD MODAL */}
      {showAdmitCard && currentStudent && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
              <span className="font-bold text-slate-700">Preview: {currentStudent.name} ({selectedSession})</span>
              <div className="flex gap-2">
                <button onClick={handleSinglePrint} className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold text-sm">PRINT NOW</button>
                <button onClick={() => setShowAdmitCard(false)} className="bg-rose-600 text-white px-5 py-2 rounded-lg font-bold text-sm">CLOSE</button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto flex-grow bg-slate-200">
              <div ref={printRef} className="bg-white shadow-lg mx-auto" style={{width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box'}}>
                <div className="card-outer">
                  <div className="watermark">SUNSHINE</div>
                  <h1 className="school-name">SUNSHINE PUBLIC SCHOOL</h1>
                  <p className="school-addr">123, Education Hub, City Name, State - 123456</p>
                  <div className="card-title uppercase">Examination Admit Card ({selectedSession})</div>
                  
                  <div className="header-info">
                    <div className="student-details">
                      <div className="detail-item"><b>Name:</b> {currentStudent.name?.toUpperCase()}</div>
                      <div className="detail-item"><b>Roll No:</b> {currentStudent.rollNumber}</div>
                      <div className="detail-item"><b>Father's Name:</b> {currentStudent.fatherName?.toUpperCase()}</div>
                      <div className="detail-item"><b>Class:</b> {currentStudent.className}</div>
                      <div className="detail-item"><b>Gender:</b> {currentStudent.gender}</div>
                      <div className="detail-item"><b>DOB:</b> {currentStudent.dob}</div>
                    </div>
                    <div className="photo-box">
                      {currentStudent.photoURL ? <img src={currentStudent.photoURL} alt="student" /> : <span className="text-[10px] font-bold text-slate-400">PHOTO</span>}
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr><th>Date & Day</th><th>Subject</th><th>Timing</th></tr>
                    </thead>
                    <tbody>
                      {classTimetable.map((e, i) => (
                        <tr key={i}>
                          <td className="font-bold">{formatDate(e.date)}</td>
                          <td className="font-bold uppercase">{e.subject}</td>
                          <td>{e.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="footer">
                    <div className="sig-box"><div className="sig-line"></div><div className="sig-text">Student's Signature</div></div>
                    <div className="sig-box"><div className="sig-line"></div><div className="sig-text">Principal's Signature</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmitCardGenerator;