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
  // --- 🟢 Auto Session Calculation Logic ---
  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = Jan, 3 = April
    const currentYear = now.getFullYear();
    
    if (currentMonth >= 3) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  };

  // Dynamic Session Options (Pichla, Current aur Agla saal)
  const getSessionOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      `${currentYear + 1}-${(currentYear + 2).toString().slice(-2)}`,
    ];
  };

  const classes = [
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
    "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
  ];

  const [selectedClass, setSelectedClass] = useState("Class 1");
  const [selectedSession, setSelectedSession] = useState(getCurrentSession()); // 👈 Auto default
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showAdmitCard, setShowAdmitCard] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  /* ================= PHOTO PRELOADER HELPER ================= */
  const preloadAllPhotos = (studentList) => {
    const promises = studentList.map((stu) => {
      return new Promise((resolve) => {
        if (!stu.photoURL) return resolve();
        const img = new Image();
        img.src = stu.photoURL;
        img.crossOrigin = "anonymous";
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    return Promise.all(promises);
  };

  /* ================= FETCH LOGIC (With Session Filter) ================= */
  useEffect(() => {
    setLoading(true);
    
    const q = query(
      collection(db, "students"),
      where("className", "==", selectedClass),
      where("session", "==", selectedSession) // 👈 Session filter active
    );

    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      
      const sortedData = data.sort((a, b) => Number(a.rollNumber) - Number(b.rollNumber));

      if (sortedData.length > 0) {
        await preloadAllPhotos(sortedData);
      }
      
      setStudents(sortedData);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedClass, selectedSession]); // 👈 Dono change hone pe refresh hoga

  const fetchTimetableData = async (className) => {
    try {
      const ref = doc(db, "Timetables", className);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().exams) {
        return [...snap.data().exams].sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      return [];
    } catch (e) { return []; }
  };

  const sharedStyles = `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: 'Segoe UI', sans-serif; }
    .page-container { width: 210mm; height: 297mm; padding: 10mm; box-sizing: border-box; page-break-after: always; position: relative; }
    .card-outer { border: 4px double #1e1b4b; padding: 15px; border-radius: 12px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; background: #fff; }
    .header { text-align: center; margin-bottom: 15px; }
    .school-name { font-size: 28px; font-weight: 900; color: #1e1b4b; margin: 0; }
    .card-title { background: #1e1b4b; color: #fff; padding: 6px; font-weight: bold; border-radius: 4px; font-size: 14px; margin-top: 5px; text-transform: uppercase; text-align: center;}
    .header-info { display: flex; justify-content: space-between; margin-top: 15px; }
    .student-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-grow: 1; }
    .photo-box { width: 110px; height: 130px; border: 2px solid #1e1b4b; display: flex; align-items: center; justify-content: center; background: #f8f8f8; overflow: hidden; margin-left: 15px;}
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .detail-item { font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #1e1b4b; padding: 8px; text-align: left; font-size: 12px; }
    .footer { margin-top: auto; display: flex; justify-content: space-between; padding: 20px 10px 10px; }
    .sig-box { text-align: center; width: 150px; }
    .sig-line { border-top: 1.5px solid #1e1b4b; margin-bottom: 5px; }
  `;

  const formatDate = (d) => {
    if (!d) return "TBD";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const handlePrintAll = async () => {
    if (students.length === 0) return alert("No students found!");
    setIsPrinting(true);
    const timetable = await fetchTimetableData(selectedClass);

    const printWindow = window.open("", "_blank");
    const content = students.map(stu => `
      <div class="page-container">
        <div class="card-outer">
          <div class="header">
            <h1 class="school-name">SUNSHINE PUBLIC SCHOOL</h1>
            <div class="card-title">EXAMINATION ADMIT CARD (${selectedSession})</div>
          </div>
          <div class="header-info">
            <div class="student-details">
              <div class="detail-item"><b>Name:</b> ${stu.name?.toUpperCase()}</div>
              <div class="detail-item"><b>Roll No:</b> ${stu.rollNumber}</div>
              <div class="detail-item"><b>Father:</b> ${stu.fatherName?.toUpperCase()}</div>
              <div class="detail-item"><b>Class:</b> ${stu.className}</div>
              <div class="detail-item"><b>DOB:</b> ${stu.dob || '---'}</div>
            </div>
            <div class="photo-box">
              ${stu.photoURL ? `<img src="${stu.photoURL}"/>` : `<b>PHOTO</b>`}
            </div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Subject</th><th>Timing</th></tr></thead>
            <tbody>
              ${timetable.map(e => `<tr><td><b>${formatDate(e.date)}</b></td><td>${e.subject.toUpperCase()}</td><td>${e.time}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div class="sig-box"><div class="sig-line"></div><div>Student</div></div>
            <div class="sig-box"><div class="sig-line"></div><div>Principal</div></div>
          </div>
        </div>
      </div>`).join('');

    printWindow.document.write(`<html><head><style>${sharedStyles}</style></head><body>${content}
      <script>window.onload=()=>{ setTimeout(()=>{window.print();window.close();},500);};</script>
    </body></html>`);
    printWindow.document.close();
    setIsPrinting(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md mb-8 flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-900">ADMIT CARD GENERATOR</h1>
        
        <div className="flex flex-wrap gap-3">
          {/* Session Selector */}
          <select 
            value={selectedSession} 
            onChange={(e) => setSelectedSession(e.target.value)} 
            className="border p-2 rounded-xl bg-indigo-50 font-semibold"
          >
            {getSessionOptions().map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Class Selector */}
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)} 
            className="border p-2 rounded-xl"
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button 
            onClick={handlePrintAll} 
            disabled={loading || students.length === 0} 
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold disabled:bg-slate-300"
          >
            {loading ? "Loading..." : `Print ${students.length} Admit Cards`}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
             <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
             <p className="font-bold text-slate-500">Processing Data & Photos...</p>
          </div>
        ) : (
          <>
            {students.length === 0 ? (
               <div className="p-20 text-center text-slate-400 font-bold">
                 No students found in {selectedClass} for session {selectedSession}
               </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-indigo-900 text-white">
                  <tr>
                    <th className="p-4">Roll</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(stu => (
                    <tr key={stu.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-bold">#{stu.rollNumber}</td>
                      <td className="p-4 uppercase">{stu.name}</td>
                      <td className="p-4 text-right">
                          <span className="text-green-600 text-xs font-bold mr-4">READY ✅</span>
                          <button onClick={() => { setCurrentStudent(stu); setShowAdmitCard(true); }} className="text-indigo-600 font-bold hover:underline">Preview</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdmitCardGenerator;