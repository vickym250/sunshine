import React, { useState, useEffect } from "react";
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
  const [school, setSchool] = useState({
    name: "SUNSHINE PUBLIC SCHOOL",
    address: "",
    logoUrl: "",
    affiliation: "",
    phone: ""
  });

  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); 
    const currentYear = now.getFullYear();
    return currentMonth >= 3 
      ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` 
      : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  };

  const getSessionOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      `${currentYear + 1}-${(currentYear + 2).toString().slice(-2)}`,
    ];
  };

  const [selectedClass, setSelectedClass] = useState("Class 1");
  const [selectedSession, setSelectedSession] = useState(getCurrentSession()); 
  // 🔥 New State for Exam Type
  const [selectedExam, setSelectedExam] = useState("Half-Yearly"); 
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [timetableExists, setTimetableExists] = useState(false); // 🔥 State for validation

  const examTypes = ["Quarterly", "Half-Yearly", "Annual", "Pre-Board"];

  useEffect(() => {
    const fetchSchoolSettings = async () => {
      try {
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists()) {
          setSchool(schoolSnap.data());
        }
      } catch (err) { console.error(err); }
    };
    fetchSchoolSettings();
  }, []);

  // 🔥 Modified useEffect: Timetable check karega phir student fetch karega
  useEffect(() => {
    const checkAndFetch = async () => {
      setLoading(true);
      setStudents([]); 
      
      try {
        // 1. Timetable check karein
        const ttRef = doc(db, "Timetables", selectedClass);
        const ttSnap = await getDoc(ttRef);
        
        if (ttSnap.exists() && ttSnap.data()[selectedExam] && ttSnap.data()[selectedExam].length > 0) {
          setTimetableExists(true);
          
          // 2. Timetable milne par students fetch karein
          const q = query(
            collection(db, "students"),
            where("className", "==", selectedClass),
            where("session", "==", selectedSession)
          );

          const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((stu) => !stu.deletedAt); 
            
            setStudents(data.sort((a, b) => Number(a.rollNumber) - Number(b.rollNumber)));
            setLoading(false);
          });
          return unsub;
        } else {
          setTimetableExists(false);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    checkAndFetch();
  }, [selectedClass, selectedSession, selectedExam]);

  const fetchTimetableData = async (className) => {
    try {
      const ref = doc(db, "Timetables", className);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const allExams = snap.data();
        const selectedExamTable = allExams[selectedExam] || [];
        return selectedExamTable.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      return [];
    } catch (e) { return []; }
  };

  const executePrint = async (studentDataList) => {
    if (studentDataList.length === 0) return alert("No students selected!");
    
    setIsPrinting(true);
    const timetable = await fetchTimetableData(selectedClass);

    // Final safety check
    if (!timetable || timetable.length === 0) {
      setIsPrinting(false);
      return alert(`Bhai, is class ke liye ${selectedExam} ka timetable nahi mila!`);
    }

    let printFrame = document.getElementById("printFrameAdmit");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "printFrameAdmit";
      printFrame.style.visibility = "hidden";
      printFrame.style.position = "fixed";
      document.body.appendChild(printFrame);
    }

    const formatDate = (d) => {
      if (!d) return "TBD";
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    };

    // --- 📄 Cards Content ---
    let cardsHTML = studentDataList.map(stu => `
      <div class="card-outer">
        <div class="top-header">
          <div class="top-header-left">
             ${school.logoUrl ? `<img src="${school.logoUrl}" class="school-logo"/>` : ''}
          </div>
          <div class="top-header-center">
             <h1 class="board-name">${school.name.toUpperCase()}</h1>
             <p class="board-subtext">${school.address}</p>
             <p style="font-size:10px; font-weight:bold; color:#1e3a8a; margin:2px 0;">${selectedExam.toUpperCase()} EXAMINATION</p>
          </div>
          <div class="top-header-right">
             <div class="admit-label">प्रवेश पत्र</div>
             <div class="session-label">${selectedSession}</div>
          </div>
        </div>

        <div class="student-info-grid">
          <div class="info-table">
             <div class="row"><span>अनुक्रमांक (Roll No):</span> <b>${stu.rollNumber}</b></div>
             <div class="row"><span>नाम (Name):</span> <b>${stu.name?.toUpperCase()}</b></div>
             <div class="row"><span>पिता (Father):</span> ${stu.fatherName?.toUpperCase()}</div>
             <div class="row"><span>माता (Mother):</span> ${stu.motherName || '---'}</div>
          </div>
          <div class="photo-area">
             <div class="photo-box">
                ${stu.photoURL ? `<img src="${stu.photoURL}" />` : `PHOTO`}
             </div>
          </div>
        </div>

        <table class="exam-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Date</th>
              <th>Timing</th>
            </tr>
          </thead>
          <tbody>
            ${timetable.map(e => `
              <tr>
                <td>${e.subject.toUpperCase()}</td>
                <td>${formatDate(e.date)}</td>
                <td>${e.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer-sigs">
          <div class="sig-box">
             <div class="sig-line"></div>
             <div>प्रधानाचार्य</div>
          </div>
          <div class="sig-box">
             <div class="sig-line"></div>
             <div>परीक्षार्थी</div>
          </div>
        </div>
      </div>
    `).join('');

    const style = `
      <style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: #fff; }
        .print-wrapper { display: flex; flex-direction: column; }
        .card-outer { 
          width: 210mm; min-height: 99mm; border-bottom: 1px dashed #aaa; padding: 5mm 10mm;
          box-sizing: border-box; display: flex; flex-direction: column; page-break-inside: avoid;
        }
        .card-outer:nth-child(3n) { page-break-after: always; }
        .top-header { display: flex; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 3px; margin-bottom: 6px; align-items: center; }
        .top-header-left { width: 10%; }
        .top-header-center { width: 80%; text-align: center; }
        .top-header-right { width: 10%; text-align: right; }
        .school-logo { height: 35px; object-fit: contain; }
        .board-name { font-size: 16px; color: #1e3a8a; margin: 0; font-weight: 900; }
        .board-subtext { font-size: 8px; margin: 1px 0; color: #444; }
        .admit-label { background: #1e3a8a; color: white; padding: 2px; font-weight: bold; font-size: 10px; text-align: center; border-radius: 2px; }
        .session-label { font-size: 8px; margin-top: 2px; font-weight: bold; }
        .student-info-grid { display: flex; gap: 10px; margin-bottom: 6px; }
        .info-table { flex: 1; }
        .row { border-bottom: 0.5px solid #f1f1f1; padding: 2px 0; font-size: 10px; display: flex; }
        .row span { width: 110px; color: #555; }
        .photo-area { width: 80px; text-align: right; }
        .photo-box { width: 70px; height: 85px; border: 1px solid #1e3a8a; overflow: hidden; background: #fafafa; display:flex; align-items:center; justify-content:center; }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .exam-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        .exam-table th { background: #f8fafc; border: 1px solid #1e3a8a; padding: 3px; font-size: 9px; text-align: left; }
        .exam-table td { border: 1px solid #1e3a8a; padding: 3px; font-size: 9px; }
        .footer-sigs { margin-top: auto; display: flex; justify-content: space-between; padding: 10px 10px 2px; }
        .sig-box { text-align: center; width: 120px; font-size: 9px; font-weight: bold; }
        .sig-line { border-top: 0.8px solid #333; margin-bottom: 2px; }
        @media print { -webkit-print-color-adjust: exact; }
      </style>`;

    const pri = printFrame.contentWindow;
    pri.document.open();
    pri.document.write(`<html><head>${style}</head><body><div class="print-wrapper">${cardsHTML}</div></body></html>`);
    pri.document.close();

    const images = pri.document.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      return new Promise(resolve => {
        if (img.complete) resolve();
        else { img.onload = resolve; img.onerror = resolve; }
      });
    }));

    setTimeout(() => {
      setIsPrinting(false);
      pri.focus();
      pri.print();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md mb-8 flex flex-wrap gap-4 justify-between items-center no-print">
        <div>
          <h1 className="text-xl font-bold text-indigo-900 uppercase">ADMIT CARD GENERATOR</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{school.name}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* 🔥 Exam Type Dropdown */}
          <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="border p-2 rounded-xl bg-violet-50 text-violet-700 font-bold outline-none cursor-pointer">
            {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="border p-2 rounded-xl bg-indigo-50 font-semibold outline-none cursor-pointer">
            {getSessionOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>

          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="border p-2 rounded-xl outline-none cursor-pointer">
            {["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button 
            onClick={() => executePrint(students)} 
            disabled={loading || !timetableExists || students.length === 0 || isPrinting} 
            className={`px-8 py-2 rounded-xl font-black text-xs uppercase shadow-xl transition-all ${(!timetableExists || students.length === 0) ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:scale-105'}`}
          >
            {isPrinting ? "⏳ Preparing..." : `Print ${selectedExam} Cards`}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden no-print">
        {loading ? (
          <div className="p-20 text-center animate-pulse font-bold text-slate-500">
             <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             Verifying Timetable & Students...
          </div>
        ) : !timetableExists ? (
          // 🔥 Timetable na milne par student list ki jagah ye dikhega
          <div className="p-20 text-center">
             <div className="text-6xl mb-4">🚫</div>
             <h2 className="text-2xl font-black text-slate-800 uppercase italic">Timetable Not Found!</h2>
             <p className="text-slate-500 mt-2 font-medium">Bhai, pehle <span className="text-indigo-600 font-bold">Exam Planner</span> mein jaakar <br/> {selectedClass} ka {selectedExam} datesheet generate karein.</p>
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
                <tr key={stu.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold">#{stu.rollNumber}</td>
                  <td className="p-4 uppercase">{stu.name}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => executePrint([stu])} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-colors">
                      Print Single 🖨️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdmitCardGenerator;