import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, addDoc, getDocs, query, where, serverTimestamp,
  doc, deleteDoc, updateDoc, 
  getDoc
} from "firebase/firestore";




import toast, { Toaster } from "react-hot-toast";

/* ==========================================
   1. REPORT CARD MODAL (WITH LOGO & PHOTO)
   ========================================== */
/* ==========================================
   1. REPORT CARD MODAL (PRINT OPTIMIZED)
   ========================================== */

import { useNavigate } from "react-router-dom";





const ReportCardModal = ({ data, onClose }) => {
  const navigate = useNavigate();
  const [school, setSchool] = useState({
    name: "Sun Shine School",
    address: "Mahanua",
    affiliation: "UP BOARD",
    contact: "234565467",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/jnschool-6e62e.firebasestorage.app/o/school_logo%2Fmain_logo?alt=media&token=deddab30-5313-4f49-af39-7b15b6ddb9e3"
  });

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists()) {
          setSchool(schoolSnap.data());
        }
      } catch (err) {
        console.error("School data fetch error:", err);
      }
    };
    fetchSchool();
  }, []);

  useEffect(() => {
    if (data?.exam === "Annual" && data?.studentId) {
      navigate(`/marksheet/${data.studentId}`, { replace: true });
    }
  }, [data, navigate]);

  if (!data || data.exam === "Annual") return null;

  const { rows } = data;
  const grandTotalObt = rows.reduce((s, r) => s + (Number(r.marks) || 0), 0);
  const grandTotalMax = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const percent = grandTotalMax ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : "0.00";
  const grade = Number(percent) >= 33 ? "PASS" : "FAIL";

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/90 z-[999] flex justify-center items-start overflow-y-auto p-4 md:p-10">
      
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #printable-area, #printable-area * { visibility: visible !important; }
            #printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 10mm !important;
              border: 12px double #1e3a8a !important;
              box-shadow: none !important;
              background-color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page { size: A4 portrait; margin: 0; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* MAIN CONTAINER */}
      <div
        id="printable-area"
        className="relative bg-white w-full max-w-[850px] border-[12px] border-double border-blue-900 p-8 md:p-10 font-serif shadow-2xl mb-10"
      >
        {/* ACTION BUTTONS */}
        <div className="absolute -top-12 right-0 flex gap-3 no-print">
          <button onClick={handlePrint} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-lg hover:bg-emerald-700">
            🖨️ PRINT MARKSHEET
          </button>
          <button onClick={onClose} className="px-6 py-2 bg-white text-red-600 font-bold rounded-lg shadow-lg">
            CLOSE
          </button>
        </div>

        {/* --- HEADER SECTION --- */}
        <div className="flex items-center justify-between border-b-[4px] border-blue-900 pb-4 mb-4">
          {/* School Logo */}
          <div className="w-24 h-24 flex-shrink-0">
            <img 
              src={school.logoUrl} 
              alt="School Logo" 
              className="w-full h-full object-contain"
              onError={(e) => e.target.style.display='none'} 
            />
          </div>

          {/* School Details */}
          <div className="flex-1 text-center px-2">
            <p className="text-blue-800 font-black text-xs uppercase tracking-[0.3em] mb-1">
              Affiliated to: {school.affiliation}
            </p>
            <h1 className="text-3xl md:text-4xl font-black uppercase text-blue-900 leading-tight">
              {school.name}
            </h1>
            <p className="text-[13px] font-bold text-gray-700 uppercase mt-1">
              {school.address}
            </p>
            <p className="text-[11px] font-bold text-blue-700 mt-1">
              📞 Contact: {school.contact}
            </p>
          </div>

          {/* Session Info */}
          <div className="w-24 text-right flex flex-col justify-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Academic</span>
            <span className="text-lg font-black text-blue-900 italic">2025-26</span>
          </div>
        </div>

        {/* --- REPORT TITLE --- */}
        <div className="text-center mb-6">
          <h2 className="inline-block border-2 border-blue-900 text-blue-900 px-6 py-1 rounded-md font-black text-sm uppercase bg-blue-50">
            Progress Report Card (Provisional)
          </h2>
        </div>

        {/* STUDENT PERSONAL INFO */}
        <div className="flex flex-row justify-between items-start gap-4 mb-6">
          <div className="flex-1 grid grid-cols-1 gap-y-2 text-[14px]">
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">STUDENT NAME:</span>
              <span className="uppercase font-black text-gray-800">{data.name}</span>
            </div>
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">FATHER'S NAME:</span>
              <span className="uppercase font-medium text-gray-700">{data.fatherName}</span>
            </div>
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">ROLL NUMBER:</span>
              <span className="font-mono font-black text-blue-900 tracking-tighter text-lg">{data.roll}</span>
            </div>
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">CLASS / SECTION:</span>
              <span className="uppercase font-medium text-gray-700">{data.className}</span>
            </div>
          </div>

          {/* Student Photo */}
          <div className="w-32 h-36 border-4 border-blue-900 bg-white p-0.5 shadow-sm">
            <div className="w-full h-full border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
              {data.photoURL ? (
                <img src={data.photoURL} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-gray-300 font-bold">PHOTO</span>
              )}
            </div>
          </div>
        </div>

        {/* MARKS TABLE */}
        <table className="w-full border-collapse border-[1.5px] border-black mb-6 text-[13px]">
          <thead>
            <tr className="bg-blue-900 text-white print:bg-blue-900">
              <th className="border border-black p-2.5 w-12">S.N</th>
              <th className="border border-black p-2.5 text-left">SUBJECTS</th>
              <th className="border border-black p-2.5 w-24">MAX MARKS</th>
              <th className="border border-black p-2.5 w-24">OBTAINED</th>
              <th className="border border-black p-2.5 w-24">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="even:bg-gray-50">
                <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                <td className="border border-black p-2 uppercase font-black text-blue-900">{r.subject}</td>
                <td className="border border-black p-2 text-center">{r.total}</td>
                <td className="border border-black p-2 text-center font-black text-base italic">{r.marks}</td>
                <td className="border border-black p-2 text-center font-bold text-[10px]">
                  {Number(r.marks) >= (Number(r.total) * 0.33) ? "PASS" : "FAIL"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-100 font-black border-t-2 border-black">
              <td colSpan="2" className="border border-black p-3 text-right uppercase">Total Marks Obtained:</td>
              <td className="border border-black p-3 text-center">{grandTotalMax}</td>
              <td className="border border-black p-3 text-center text-xl text-blue-900 italic">{grandTotalObt}</td>
              <td className="border border-black p-3 text-center uppercase">{grade}</td>
            </tr>
          </tfoot>
        </table>

        {/* SUMMARY SECTION */}
        <div className="grid grid-cols-3 gap-0 border-2 border-blue-900 rounded-lg overflow-hidden mb-8 text-center bg-white">
            <div className="p-3 border-r-2 border-blue-900">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Percentage</p>
                <p className="text-xl font-black text-blue-900">{percent}%</p>
            </div>
            <div className="p-3 border-r-2 border-blue-900 bg-blue-50/50">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Grade</p>
                <p className="text-xl font-black text-blue-900">
                    {percent >= 80 ? "A+" : percent >= 60 ? "A" : percent >= 45 ? "B" : "C"}
                </p>
            </div>
            <div className="p-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Result Status</p>
                <p className={`text-xl font-black ${grade === "PASS" ? "text-green-600" : "text-red-600"}`}>
                    {grade}
                </p>
            </div>
        </div>

        {/* SIGNATURES */}
        <div className="flex justify-between mt-16 px-4">
          <div className="text-center">
            <div className="w-32 border-b-2 border-black mb-1"></div>
            <p className="text-[10px] font-black uppercase text-gray-500">Class Teacher</p>
          </div>
          
          {/* Middle Seal Placeholder */}
          <div className="hidden md:flex items-center justify-center opacity-10">
             <div className="w-20 h-20 border-4 border-blue-900 rounded-full flex items-center justify-center rotate-12">
                <span className="text-[8px] font-bold text-center uppercase">School Seal<br/>Verified</span>
             </div>
          </div>

          <div className="text-center">
            <div className="w-48 border-b-2 border-blue-900 mb-1"></div>
            <p className="text-[10px] font-black uppercase text-blue-900">Principal Signature</p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-10 pt-2 border-t border-gray-100 flex justify-between text-[8px] text-gray-400 font-bold uppercase italic tracking-tighter">
          <span>{school.name} - Official Student Record</span>
          <span>Printed On: {new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>
    </div>
  );
};



/* ==========================================
   2. MAIN DASHBOARD PAGE
   ========================================== */
export default function FinalResultPage() {
  const [session, setSession] = useState("2025-26");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  
  const [allStudents, setAllStudents] = useState([]); 
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentPhoto, setSelectedStudentPhoto] = useState(""); // Photo State
  const [studentSearch, setStudentSearch] = useState("");
  const [name, setName] = useState("");
  const [cls, setCls] = useState("Class 10");
  const [exam, setExam] = useState("Annual");
  const [rows, setRows] = useState([{ subject: "", total: "100", marks: "" }]);
  
  const [resultList, setResultList] = useState([]);
  const [filterClass, setFilterClass] = useState("Class 10");
  const [filterExam, setFilterExam] = useState("Annual");

  const classesList = Array.from({length: 12}, (_, i) => `Class ${i+1}`);
  const examTypes = ["Quarterly", "Half-Yearly", "Annual"];
  const navigate =useNavigate()
 const subjectMaster = {
  "Class 1": ["Hindi", "English", "Math"],
  "Class 2": ["Hindi", "English", "Math", "EVS"],
  "Class 3": ["Hindi", "English", "Math", "EVS"],
  "Class 4": ["Hindi", "English", "Math", "Science", "GK"],
  "Class 5": ["Hindi", "English", "Math", "Science", "Social"],
  "Class 6": ["Hindi", "English", "Math", "Science", "Social", "Computer"],
  "Class 7": ["Hindi", "English", "Math", "Science", "Social", "Computer"],
  "Class 8": ["Hindi", "English", "Math", "Science", "Social", "Computer"],
  "Class 9": ["Hindi", "English", "Math", "Science", "Social"],
  "Class 10": ["Hindi", "English", "Math", "Science", "Social"],
};

  useEffect(() => {
    const fetchStudents = async () => {
      const q = query(collection(db, "students"), where("className", "==", cls));
      const snap = await getDocs(q);
      setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    fetchStudents();

 if (!editingId && subjectMaster[cls]) {
    const autoSubjects = subjectMaster[cls].map(sub => ({
      subject: sub,
      total: "100",
      marks: ""
    }));
    setRows(autoSubjects);
  }

  }, [cls]);

  const loadResults = async () => {
    setLoading(true);
    const q = query(collection(db, "examResults"), where("className", "==", filterClass), where("exam", "==", filterExam));
    const snap = await getDocs(q);
    setResultList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { loadResults(); }, [filterClass, filterExam, session]);

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

 const saveResult = async () => {
  if (!selectedStudentId || !exam)
    return toast.error("Bhai, student aur exam select karo!");

  const student = allStudents.find(s => s.id === selectedStudentId);
  if (!student) return toast.error("Student nahi mila!");

  // 🔹 Clean rows
  const cleanRows = rows
    .filter(r => r.subject && r.total !== "" && r.marks !== "")
    .map(r => ({
      subject: r.subject.trim(),
      total: Number(r.total) || 0,
      marks: Number(r.marks) || 0
    }));

  if (cleanRows.length === 0)
    return toast.error("Kam se kam ek subject bharo!");

  setLoading(true);

  try {
    const payload = {
      session,
      studentId: student.id,
      name: student.name || "",
      className: cls || student.className || "",
      roll: student.rollNumber || "",
      fatherName: student.fatherName || "",
      photoURL: student.photoURL || "",
      exam,
      rows: cleanRows,
      updatedAt: serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, "examResults", editingId), payload);
      toast.success("Result Updated Successfully!");
    } else {
      await addDoc(collection(db, "examResults"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      toast.success("Result Saved Successfully!");
    }

    setShowForm(false);
    setEditingId(null);
    loadResults();

  } catch (error) {
    console.error(error);
    toast.error("Save karte time error aaya!");
  } finally {
    setLoading(false);
  }
};

const handlePrintAll = async () => {
  if (resultList.length === 0) {
    toast.error("Koi result nahi mila!");
    return;
  }

  // 🔥 AGAR EXAM ANNUAL NAHI HAI → ALL REPORT PAGE
  if (filterExam !== "Annual") {
     for (let r of resultList) {
    if (r.className) {
      window.open(
        `/all-report/${r.className.replace(/\s+/g, "")}`
      );

      // 🔹 thoda delay taaki browser crash na ho
      await new Promise(res => setTimeout(res, 800));
    }
  }
  }

  // 🔥 SIRF ANNUAL KE LIYE PURANA LOGIC
  toast.success("Print All Annual Started...");

  for (let r of resultList) {
    if (r.className) {
      window.open(
        `/marksheet/${r.className.replace(/\s+/g, "")}`
      );

      // 🔹 thoda delay taaki browser crash na ho
      await new Promise(res => setTimeout(res, 800));
    }
  }
};


  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-black italic">
      <Toaster />
      {showModal && <ReportCardModal data={selectedResult} onClose={() => setShowModal(false)} />}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-[32px] border shadow-sm">
          <h1 className="text-2xl font-black text-slate-800 uppercase italic">Result Dashboard</h1>
          <button onClick={() => { setEditingId(null); setRows([{subject:"", total:"100", marks:""}]); setStudentSearch(""); setShowForm(true); }} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all italic">+ Add New Result</button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 uppercase tracking-widest text-[10px]">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-slate-400 mb-1 ml-1 uppercase">Select Class</span>
            <select className="bg-transparent font-black text-sm outline-none uppercase italic" value={filterClass} onChange={e => setFilterClass(e.target.value)}>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-slate-400 mb-1 ml-1 uppercase">Exam Category</span>
            <select className="bg-transparent font-black text-sm outline-none uppercase italic" value={filterExam} onChange={e => setFilterExam(e.target.value)}>{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
          <table className="w-full text-left uppercase text-xs italic">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] text-slate-400 tracking-widest uppercase">
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4 text-center">Exam Type</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resultList.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    {/* Tiny Avatar in List */}
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border">
                        {r.photoURL ? <img src={r.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100" />}
                    </div>
                    <div>
                        <p className="font-black text-slate-800 text-sm">{r.name}</p>
                        <p className="text-[10px] text-slate-400 tracking-widest uppercase italic">Roll: {r.roll}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-indigo-600">{r.exam}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { 
                      setEditingId(r.id); setSelectedStudentId(r.studentId); setStudentSearch(r.name);
                      setCls(r.className); setExam(r.exam); setRows(r.rows); setShowForm(true);
                    }} className="text-blue-600 border border-blue-100 px-4 py-1 rounded-lg text-[10px] font-black hover:bg-blue-50 transition-all">Edit</button>
                    <button onClick={() => {setSelectedResult(r); setShowModal(true);}} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black shadow-md active:scale-95 transition-all">View</button>
                    <button onClick={() => {if(window.confirm('Delete kardu?')) deleteDoc(doc(db, "examResults", r.id)).then(loadResults)}} className="text-red-200 hover:text-red-500 font-black px-2 transition-colors">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resultList.length === 0 && <div className="p-20 text-center text-slate-200 tracking-widest text-xl uppercase italic">Records Khali Hain</div>}
        </div>
<div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-[32px] border shadow-sm">
  <h1 className="text-2xl font-black text-slate-800 uppercase italic">
   Print All
  </h1>

  <div className="flex gap-3">
    {/* 🔹 NEW PRINT ALL BUTTON */}
    <button
      onClick={handlePrintAll}
      className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all italic"
    >
      🖨 PRINT ALL
    </button>

    {/* EXISTING BUTTON */}
    
  </div>
</div>


      </div>
  
      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-2 md:p-4">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[40px] shadow-2xl overflow-y-auto p-6 md:p-10 italic">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl md:text-3xl font-black text-indigo-600 uppercase tracking-tighter italic">{editingId ? "Update Result Data" : "New Marksheet Entry"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-slate-100 p-2 px-5 rounded-full text-slate-400 hover:bg-slate-200 transition-all uppercase italic font-black">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 uppercase tracking-widest text-[10px]">
              <div className="space-y-6 font-black italic">
                <div>
                  <label className="text-slate-400 ml-2 mb-1 block">Class Select Karo</label>
                  <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-200 italic" value={cls} onChange={e => setCls(e.target.value)} disabled={editingId}>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div>
                  <label className="text-slate-400 ml-2 mb-1 block">Exam Type</label>
                  <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-200 italic" value={exam} onChange={e => setExam(e.target.value)}>{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select>
                </div>
              </div>

              <div className="relative font-black italic">
                <label className="text-slate-400 ml-2 mb-1 block">Bachcha Dhundo</label>
                <input type="text" placeholder="Student Name..." className="w-full bg-indigo-50/50 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-400 transition-all uppercase text-sm" value={studentSearch} onChange={e => {setStudentSearch(e.target.value); if(!editingId) setSelectedStudentId("");}} disabled={editingId} />
                {studentSearch && !selectedStudentId && !editingId && (
                  <div className="absolute top-20 left-0 w-full bg-white border-2 rounded-2xl z-20 max-h-48 overflow-y-auto shadow-2xl p-2 mt-1">
                    {allStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                      <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setName(s.name); setStudentSearch(s.name); setSelectedStudentPhoto(s.photoURL); }} className="p-4 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-xl font-bold text-[11px] flex justify-between border-b last:border-0 uppercase tracking-tighter">
                        <span>{s.name}</span> <span className="opacity-40 italic font-black uppercase">ROLL: {s.rollNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedStudentId && <div className="mt-4 p-5 bg-slate-900 text-emerald-400 rounded-2xl text-[10px] flex items-center justify-between shadow-lg tracking-[0.2em] italic font-black"><span>✓ STUDENT MIL GAYA:</span> <span className="text-sm tracking-normal font-black italic">{name}</span></div>}
              </div>
            </div>

            {/* Dynamic Subjects Table */}
            <div className="rounded-[32px] border-4 border-slate-50 overflow-hidden bg-slate-50/20 mb-10">
              <table className="w-full text-xs italic font-black uppercase">
                <thead className="bg-slate-100 text-[10px] text-slate-400">
                  <tr>
                    <th className="p-5 text-left uppercase">Subject Name</th>
                    <th className="p-5 text-center w-32 uppercase">Total Marks</th>
                    <th className="p-5 text-center w-32 text-indigo-600 uppercase">Obtained</th>
                    <th className="p-5 text-center w-12 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-white transition-colors">
                      <td className="p-1">
                        <input className="w-full p-4 bg-transparent outline-none font-black text-slate-700 uppercase" placeholder="English/Hindi/Math" value={r.subject} onChange={e => handleRowChange(i, 'subject', e.target.value)} />
                      </td>
                      <td className="p-1 text-center">
                        <input type="number" className="w-full p-4 bg-transparent outline-none text-center font-bold text-slate-300 font-sans" value={r.total} onChange={e => handleRowChange(i, 'total', e.target.value)} />
                      </td>
                      <td className="p-1 text-center">
                        <input type="number" className="w-full p-4 bg-transparent outline-none text-center font-black text-indigo-600 text-xl font-sans" placeholder="00" value={r.marks} onChange={e => handleRowChange(i, 'marks', e.target.value)} />
                      </td>
                      <td className="p-1 text-center">
                        <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-red-200 hover:text-red-500 font-black px-2">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 italic text-[10px] tracking-widest font-black uppercase">
              <button onClick={() => setRows([...rows, { subject: "", total: "100", marks: "" }])} className="text-indigo-600 border-2 border-indigo-50 px-10 py-5 rounded-2xl hover:bg-indigo-50 transition-all font-black">+ Subject Add Karo</button>
              <div className="flex-1 flex gap-3 italic">
                <button className="flex-1 bg-slate-100 py-5 rounded-2xl hover:bg-slate-200 font-black" onClick={() => { setShowForm(false); setEditingId(null); }}>Bahar Niklo</button>
                <button disabled={loading} className={`flex-[2] ${loading ? 'bg-slate-300 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100'} text-white py-5 rounded-2xl transition-all active:scale-95 font-black tracking-widest`} onClick={saveResult}>
                  {loading ? 'Ruko...' : editingId ? 'Update Karein' : 'Publish Karein'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}