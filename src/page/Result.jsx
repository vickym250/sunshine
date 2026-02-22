import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, addDoc, getDocs, query, where, serverTimestamp,
  doc, deleteDoc, updateDoc, getDoc 
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

/* ==========================================
   1. REPORT CARD MODAL
   ========================================== */
const ReportCardModal = ({ data, onClose }) => {
  const navigate = useNavigate();
  const [school, setSchool] = useState({
    name: "Sun Shine School",
    address: "Mahanua",
    affiliation: "UP BOARD",
    contact: "234565467",
    logoUrl: ""
  });

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists()) setSchool(schoolSnap.data());
      } catch (err) { console.error("School data fetch error:", err); }
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

  return (
    <div className="fixed inset-0 bg-black/90 z-[999] flex justify-center items-start overflow-y-auto p-2 md:p-10 text-slate-900">
      <style>
        {`
          @media print {
            html, body { height: 100%; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
            body * { visibility: hidden !important; }
            .no-print { display: none !important; }
            @page { size: A4 portrait; margin: 0; }
            #printable-area, #printable-area * { visibility: visible !important; }
            #printable-area {
              position: fixed !important; left: 0 !important; top: 0 !important;
              width: 210mm !important; height: 296mm !important;
              padding: 10mm !important; border: 10px double #1e3a8a !important;
              background-color: white !important; -webkit-print-color-adjust: exact !important;
            }
          }
        `}
      </style>

      <div id="printable-area" className="relative bg-white w-full max-w-[850px] border-[6px] md:border-[12px] border-double border-blue-900 p-4 md:p-10 font-serif shadow-2xl my-4 md:my-10">
        <div className="absolute -top-10 md:-top-14 right-0 flex gap-2 no-print">
          <button onClick={() => window.print()} className="px-5 py-2 bg-indigo-600 text-white text-xs font-black rounded-full shadow-xl">🖨️ PRINT</button>
          <button onClick={onClose} className="px-5 py-2 bg-white text-red-600 text-xs font-black rounded-full shadow-xl border border-red-100">CLOSE</button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-b-[3px] border-blue-900 pb-4 mb-6">
          <img src={school.logoUrl} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
          <div className="flex-1 px-4 text-center md:text-left">
            <p className="text-blue-800 font-bold text-[9px] uppercase tracking-[0.2em]">Affiliated to: {school.affiliation}</p>
            <h1 className="text-2xl md:text-3xl font-black uppercase text-blue-900 leading-tight">{school.name}</h1>
            <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{school.address}</p>
          </div>
          <div className="mt-2 md:mt-0 md:text-right border-t md:border-t-0 md:border-l-2 border-blue-900 pl-4">
            <span className="block text-[9px] font-bold text-gray-400 uppercase">Session</span>
            <span className="text-lg font-black text-blue-900 italic leading-none">{data.session}</span>
            <div className="mt-1 bg-blue-900 text-white text-[9px] px-2 py-0.5 rounded font-black">{data.exam}</div>
          </div>
        </div>

        <div className="flex justify-between items-start gap-6 mb-6">
          <div className="flex-1 grid grid-cols-1 gap-y-1.5">
            {[
              { label: "STUDENT NAME", value: data.name, bold: true },
              { label: "ROLL NUMBER", value: data.roll },
              { label: "REG NO.", value: data.regNo || "N/A" },
              { label: "CLASS", value: data.className },
              { label: "FATHER'S NAME", value: data.fatherName || "N/A" },
              { label: "MOTHER'S NAME", value: data.motherName || "N/A" }
            ].map((item, idx) => (
              <div key={idx} className="flex border-b border-gray-100 py-1 items-center">
                <span className="w-32 font-bold text-blue-900 text-[10px] md:text-[12px] shrink-0">{item.label}:</span>
                <span className={`uppercase text-gray-800 ${item.bold ? 'font-black' : 'font-medium'}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="w-24 h-28 border-2 border-blue-900 p-0.5 shadow-sm">
            {data.photoURL ? <img src={data.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px]">PHOTO</div>}
          </div>
        </div>

        <table className="w-full border-collapse border-2 border-black text-[11px] md:text-[13px] mb-6">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="border border-black p-1.5 w-10">S.N</th>
              <th className="border border-black p-1.5 text-left">SUBJECTS</th>
              <th className="border border-black p-1.5 w-16">MAX</th>
              <th className="border border-black p-1.5 w-16">OBT.</th>
              <th className="border border-black p-1.5 w-20">RESULT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="even:bg-gray-50">
                <td className="border border-black p-1.5 text-center font-bold text-gray-400">{i + 1}</td>
                <td className="border border-black p-1.5 uppercase font-black text-blue-900">{r.subject}</td>
                <td className="border border-black p-1.5 text-center">{r.total}</td>
                <td className="border border-black p-1.5 text-center font-black text-base">{r.marks}</td>
                <td className="border border-black p-1.5 text-center font-bold text-[10px]">{Number(r.marks) >= (Number(r.total) * 0.33) ? "PASS" : "FAIL"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-black border-t-2 border-black text-blue-900">
              <td colSpan="2" className="border border-black p-2 text-right">TOTAL MARKS:</td>
              <td className="border border-black p-2 text-center">{grandTotalMax}</td>
              <td className="border border-black p-2 text-center text-xl">{grandTotalObt}</td>
              <td className="border border-black p-2 text-center">{grade}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="border border-blue-900 rounded-lg p-2 text-center">
              <p className="text-[8px] text-gray-400 font-bold">Percentage</p>
              <p className="text-lg font-black text-blue-900">{percent}%</p>
            </div>
            <div className="border border-blue-900 rounded-lg p-2 text-center bg-blue-50/50">
              <p className="text-[8px] text-gray-400 font-bold">Grade</p>
              <p className="text-lg font-black text-blue-900">{percent >= 80 ? "A+" : percent >= 60 ? "A" : percent >= 45 ? "B" : "C"}</p>
            </div>
            <div className="border border-blue-900 rounded-lg p-2 text-center">
              <p className="text-[8px] text-gray-400 font-bold">Status</p>
              <p className={`text-lg font-black ${grade === "PASS" ? "text-green-600" : "text-red-600"}`}>{grade}</p>
            </div>
        </div>

        <div className="flex justify-between items-end mt-12 px-4">
          <div className="text-center"><div className="w-32 border-b border-gray-400 mb-1"></div><p className="text-[9px] font-black uppercase text-gray-400">Class Teacher</p></div>
          <div className="text-center"><div className="w-44 border-b-2 border-blue-900 mb-1"></div><p className="text-[9px] font-black uppercase text-blue-900">Principal Signature</p></div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================
   2. MAIN DASHBOARD PAGE
   ========================================== */
export default function FinalResultPage() {
  const navigate = useNavigate();
  
  const [session, setSession] = useState("2025-26");
  const availableSessions = ["2024-25", "2025-26", "2026-27", "2027-28"];
  const [dashboardSearch, setDashboardSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  
  const [allStudents, setAllStudents] = useState([]); 
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [name, setName] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [cls, setCls] = useState(""); 
  const [exam, setExam] = useState("Annual");
  const [rows, setRows] = useState([{ subject: "", total: "100", marks: "" }]);
  
  const [resultList, setResultList] = useState([]);
  const [filterClass, setFilterClass] = useState("");
  const [filterExam, setFilterExam] = useState("Annual");

  const [subjectMaster, setSubjectMaster] = useState({});
  const [classesList, setClassesList] = useState([]);
  const examTypes = ["Quarterly", "Half-Yearly", "Annual"];
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. Fetch Master Data (Classes & Subjects)
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const docSnap = await getDoc(doc(db, "school_config", "master_data"));
        if (docSnap.exists()) {
          const mapping = docSnap.data().mapping || {};
          setSubjectMaster(mapping);
          const sortedClasses = Object.keys(mapping).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          setClassesList(sortedClasses);
          if (sortedClasses.length > 0) {
            setCls(sortedClasses[0]);
            setFilterClass(sortedClasses[0]);
          }
        }
      } catch (err) { console.error("Master data error:", err); }
    };
    fetchMasterData();
  }, []);

  // 2. Load Results for Dashboard & "Done" Check
  const loadResults = async () => {
    // Dashboard filter use karega (filterClass) aur Form internal state use karega (cls)
    // Dono ke liye common fetcher
    const classToFetch = showForm ? cls : filterClass;
    const examToFetch = showForm ? exam : filterExam;

    if (!classToFetch) return;
    try {
      const q = query(
        collection(db, "examResults"), 
        where("className", "==", classToFetch), 
        where("exam", "==", examToFetch), 
        where("session", "==", session)
      );
      const snap = await getDocs(q);
      setResultList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Fetch Results Error:", err); }
  };

  // Re-fetch jab dashboard filters change ho
  useEffect(() => { if(!showForm) loadResults(); }, [filterClass, filterExam, session, showForm]);

  // Re-fetch jab FORM ke andar Exam ya Class change ho (Important for Done Status)
  useEffect(() => { if(showForm) loadResults(); }, [exam, cls, session, showForm]);

  // 3. Fetch Students of Selected Class
  useEffect(() => {
    if (!cls) return;
    const fetchStudents = async () => {
      const q = query(collection(db, "students"), where("className", "==", cls), where("session", "==", session));
      const snap = await getDocs(q);
      setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchStudents();

    if (!editingId && subjectMaster[cls]) {
      setRows(subjectMaster[cls].map(sub => ({ subject: sub, total: "100", marks: "" })));
    }
  }, [cls, subjectMaster, editingId, session]);

  const filteredResultList = resultList.filter(r => 
    r.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
    (r.roll && r.roll.toString().includes(dashboardSearch))
  );

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const saveResult = async () => {
    if (!selectedStudentId) return toast.error("Student select karo!");
    
    // Final check before saving
    const isAlreadyDone = resultList.some(res => String(res.studentId) === String(selectedStudentId) && res.exam === exam && res.session === session);
    if (!editingId && isAlreadyDone) {
        return toast.error("Is Student ka result pehle hi bana hua hai!");
    }

    const student = allStudents.find(s => s.id === selectedStudentId);
    const cleanRows = rows.filter(r => r.subject.trim() !== "").map(r => ({
      subject: r.subject.trim(),
      total: Number(r.total) || 0,
      marks: Number(r.marks) || 0
    }));

    setLoading(true);
    try {
      const payload = {
        session, studentId: selectedStudentId, name: student?.name || name,
        className: cls, roll: student?.rollNumber || "", regNo: student?.regNo || "",
        fatherName: student?.fatherName || "", motherName: student?.motherName || "",
        photoURL: student?.photoURL || "", exam, rows: cleanRows, updatedAt: serverTimestamp()
      };
      if (editingId) {
        await updateDoc(doc(db, "examResults", editingId), payload);
        toast.success("Result Updated!");
      } else {
        await addDoc(collection(db, "examResults"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Result Saved!");
      }
      setShowForm(false); setEditingId(null); loadResults();
    } catch (e) { toast.error("Error saving data!"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="p-3 md:p-8 bg-slate-50 min-h-screen font-black italic text-slate-900 uppercase">
      <Toaster />
      {showModal && <ReportCardModal data={selectedResult} onClose={() => setShowModal(false)} />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-6 rounded-[24px] md:rounded-[32px] border shadow-sm">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 italic leading-none">Result Dashboard</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <span className="text-[10px] text-slate-400 tracking-widest">Session:</span>
              <select value={session} onChange={(e) => setSession(e.target.value)} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black border-none outline-none">
                {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => { setEditingId(null); setSelectedStudentId(""); setStudentSearch(""); setExam("Annual"); setShowForm(true); }} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow-xl">+ Add Result</button>
        </div>

        {/* Dashboard Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-[9px] text-slate-400 mb-1 uppercase font-bold">Class</span>
            <select className="bg-transparent font-black text-sm outline-none italic" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              {classesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-[9px] text-slate-400 mb-1 uppercase font-bold">Exam</span>
            <select className="bg-transparent font-black text-sm outline-none italic" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
              {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="bg-indigo-600 p-4 rounded-2xl border shadow-lg flex flex-col sm:col-span-2 md:col-span-1">
            <span className="text-[9px] text-indigo-200 mb-1 uppercase font-bold">Quick Search</span>
            <input type="text" placeholder="NAME / ROLL..." className="bg-transparent text-white placeholder:text-indigo-300 font-black text-sm outline-none italic" value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} />
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-[24px] md:rounded-[32px] border shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs italic min-w-[600px]">
              <thead className="bg-slate-50 border-b uppercase text-[9px] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Exam</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResultList.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border shrink-0">
                        {r.photoURL ? <img src={r.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm leading-none">{r.name}</p>
                        <p className="text-[9px] text-slate-400 italic mt-1">Roll: {r.roll} | Reg: {r.regNo || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[8px] font-black">✓ DONE</span>
                    </td>
                    <td className="px-6 py-4 text-center text-indigo-600 font-bold">{r.exam}</td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button onClick={() => { setEditingId(r.id); setSelectedStudentId(r.studentId); setStudentSearch(r.name); setCls(r.className); setExam(r.exam); setRows(r.rows); setSession(r.session || session); setShowForm(true); }} className="text-blue-600 border px-3 py-1 rounded-lg text-[9px] font-black hover:bg-blue-50">Edit</button>
                      <button onClick={() => {setSelectedResult(r); setShowModal(true);}} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black">View</button>
                      <button onClick={() => {if(window.confirm('Delete?')) deleteDoc(doc(db, "examResults", r.id)).then(loadResults)}} className="text-red-300 px-1 ml-1 font-normal hover:text-red-600">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-lg font-black text-slate-800 italic">Bulk Actions</h1>
          <button onClick={() => {
             if (resultList.length === 0) return toast.error("No records!");
             const path = filterExam === "Annual" ? `/marksheet/${filterClass.replace(/\s+/g, "")}/${session}` : `/all-report/${filterClass.replace(/\s+/g, "")}/${session}`;
             navigate(path);
          }} className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow-xl">🖨 PRINT ALL ({filterClass})</button>
        </div>
      </div>

      {/* ==========================================
          ADD/EDIT RESULT FORM (MODAL)
          ========================================== */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2 md:p-4 text-slate-900">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[30px] md:rounded-[40px] shadow-2xl overflow-y-auto p-5 md:p-10 italic">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg md:text-2xl font-black text-indigo-600 tracking-tighter italic">{editingId ? "Update Result" : "Add New Entry"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); setShowDropdown(false); }} className="bg-slate-100 p-2 px-4 rounded-full text-slate-400 font-black">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="space-y-3 font-black italic">
                <div>
                  <label className="text-slate-400 ml-2 mb-1 block text-[9px] uppercase">Session</label>
                  <select className="w-full bg-indigo-50 p-3 md:p-4 rounded-2xl font-black text-xs md:text-sm outline-none" value={session} onChange={(e) => setSession(e.target.value)}>
                    {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 ml-2 mb-1 block text-[9px]">CLASS</label>
                    <select className="w-full bg-slate-50 p-3 md:p-4 rounded-2xl font-black text-xs md:text-sm outline-none" value={cls} onChange={e => { setCls(e.target.value); setSelectedStudentId(""); setStudentSearch(""); }} disabled={editingId}>
                      {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 ml-2 mb-1 block text-[9px]">EXAM</label>
                    <select className="w-full bg-slate-50 p-3 md:p-4 rounded-2xl font-black text-xs md:text-sm outline-none" value={exam} onChange={e => setExam(e.target.value)}>
                      {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="relative font-black italic">
                <label className="text-slate-400 ml-2 mb-1 block text-[9px] uppercase tracking-widest">Select Student ({cls})</label>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="CLICK TO SELECT STUDENT..." 
                    className={`w-full bg-indigo-50/50 p-3 md:p-4 font-black outline-none border-2 border-indigo-100 focus:border-indigo-400 text-xs md:text-sm ${showDropdown && !selectedStudentId && !editingId ? 'rounded-t-2xl' : 'rounded-2xl'}`} 
                    value={studentSearch} 
                    onClick={() => setShowDropdown(true)} 
                    onChange={e => {setStudentSearch(e.target.value); setShowDropdown(true); if(!editingId) setSelectedStudentId("");}} 
                    disabled={editingId} 
                    autoComplete="off"
                  />
                  {!editingId && !selectedStudentId && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none">▼</span>}
                </div>
                
                {/* DYNAMIC DROPDOWN: Shows "Done" based on current Exam Selection */}
                {!editingId && !selectedStudentId && showDropdown && (
                  <div className="absolute left-0 w-full bg-white border-2 border-t-0 border-indigo-100 rounded-b-2xl z-20 max-h-56 overflow-y-auto shadow-xl mt-0 divide-y divide-slate-50">
                    <div className="p-2 bg-indigo-50 text-[8px] text-indigo-400 flex justify-between items-center">
                      <span>SHOWING RESULTS FOR {exam}</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }} className="hover:text-red-500 font-bold">CLOSE ✕</button>
                    </div>
                    {allStudents.length > 0 ? (
                      allStudents
                        .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || (s.rollNumber && s.rollNumber.toString().includes(studentSearch)))
                        .map(s => {
                          // YAHAN LOGIC HAI: Current exam aur student match check
                          const isDone = resultList.some(res => String(res.studentId) === String(s.id) && res.exam === exam && res.session === session);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => { 
                                if(isDone) return toast.error(`${exam} Result already exists!`); 
                                setSelectedStudentId(s.id); 
                                setName(s.name); 
                                setStudentSearch(s.name); 
                                setShowDropdown(false); 
                              }} 
                              className={`p-3 cursor-pointer flex justify-between items-center transition-all ${isDone ? 'bg-red-50 opacity-70' : 'hover:bg-indigo-600 hover:text-white'}`}
                            >
                              <div className="flex flex-col">
                                <span className={`text-xs uppercase ${isDone ? 'text-red-400' : ''}`}>{s.name}</span>
                                <span className={`text-[8px] font-bold ${isDone ? 'text-red-300' : 'opacity-50'}`}>ROLL: {s.rollNumber} | REG: {s.regNo || 'N/A'}</span>
                              </div>
                              {isDone && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[7px] font-black italic">✓ {exam} DONE</span>}
                            </div>
                          );
                        })
                    ) : (
                      <div className="p-4 text-center text-[10px] text-slate-400 italic font-bold">No students found!</div>
                    )}
                  </div>
                )}

                {selectedStudentId && (
                  <div className="mt-3 p-3 md:p-4 bg-indigo-900 text-white rounded-2xl text-[9px] flex items-center justify-between shadow-lg border-b-4 border-indigo-700">
                    <div>
                      <p className="text-indigo-300 tracking-widest mb-1">SELECTED STUDENT</p>
                      <p className="text-xs md:text-sm font-black uppercase italic">{name}</p>
                    </div>
                    {!editingId && <button onClick={() => {setSelectedStudentId(""); setStudentSearch(""); setShowDropdown(true);}} className="bg-white/10 px-3 py-2 rounded-xl hover:bg-white/20 transition-all font-black">CHANGE</button>}
                  </div>
                )}
              </div>
            </div>

            {/* Marks Table */}
            <div className="rounded-[20px] md:rounded-[32px] border-2 border-slate-50 overflow-hidden bg-slate-50/20 mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs italic font-black uppercase min-w-[400px]">
                  <thead className="bg-slate-100 text-[9px] text-slate-400">
                    <tr><th className="p-3 md:p-4 text-left">Subject</th><th className="p-3 md:p-4 text-center w-20 md:w-28">Total</th><th className="p-3 md:p-4 text-center w-24 md:w-32 text-indigo-600">Obt.</th><th className="p-3 md:p-4 text-center w-8"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-white">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-white transition-colors">
                        <td className="p-1"><input className="w-full p-2 md:p-3 bg-transparent outline-none font-black text-slate-700" placeholder="SUBJECT" value={r.subject} onChange={e => handleRowChange(i, 'subject', e.target.value)} /></td>
                        <td className="p-1"><input type="number" className="w-full p-2 md:p-3 bg-transparent outline-none text-center font-bold text-slate-300" value={r.total} onChange={e => handleRowChange(i, 'total', e.target.value)} /></td>
                        <td className="p-1"><input type="number" className="w-full p-2 md:p-3 bg-transparent outline-none text-center font-black text-indigo-600 text-base md:text-xl" placeholder="00" value={r.marks} onChange={e => handleRowChange(i, 'marks', e.target.value)} /></td>
                        <td className="p-1 text-center"><button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-red-200 hover:text-red-500 font-black px-1">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 text-[10px] font-black uppercase italic">
              <button onClick={() => setRows([...rows, { subject: "", total: "100", marks: "" }])} className="w-full md:w-auto text-indigo-600 border-2 border-indigo-50 px-6 py-4 rounded-2xl hover:bg-indigo-50 transition-all">+ Add Subject</button>
              <div className="flex-1 flex gap-2">
                <button className="flex-1 bg-slate-100 py-4 rounded-2xl hover:bg-slate-200 font-black" onClick={() => { setShowForm(false); setEditingId(null); setShowDropdown(false); }}>Close</button>
                <button disabled={loading} className={`flex-[2] py-4 rounded-2xl text-white font-black transition-all ${loading ? 'bg-slate-300' : 'bg-indigo-600 shadow-xl hover:bg-indigo-700'}`} onClick={saveResult}>{loading ? 'WAIT...' : editingId ? 'UPDATE' : 'PUBLISH'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}