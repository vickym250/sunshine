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
    <div className="fixed inset-0 bg-black/90 z-[999] flex justify-center items-start overflow-y-auto p-4 md:p-10 text-slate-900">
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
              background-color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page { size: A4 portrait; margin: 0; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      <div id="printable-area" className="relative bg-white w-full max-w-[850px] border-[12px] border-double border-blue-900 p-8 md:p-10 font-serif shadow-2xl mb-10">
        <div className="absolute -top-12 right-0 flex gap-3 no-print">
          <button onClick={handlePrint} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-lg">🖨️ PRINT</button>
          <button onClick={onClose} className="px-6 py-2 bg-white text-red-600 font-bold rounded-lg shadow-lg">CLOSE</button>
        </div>

        <div className="flex items-center justify-between border-b-[4px] border-blue-900 pb-4 mb-4">
          <div className="w-24 h-24 flex-shrink-0">
            <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 text-center px-2">
            <p className="text-blue-800 font-black text-xs uppercase tracking-[0.3em] mb-1">Affiliated to: {school.affiliation}</p>
            <h1 className="text-3xl md:text-4xl font-black uppercase text-blue-900 leading-tight">{school.name}</h1>
            <p className="text-[13px] font-bold text-gray-700 uppercase mt-1">{school.address}</p>
          </div>
          <div className="w-24 text-right flex flex-col justify-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Academic</span>
            <span className="text-lg font-black text-blue-900 italic">{data.session}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="inline-block border-2 border-blue-900 text-blue-900 px-6 py-1 rounded-md font-black text-sm uppercase bg-blue-50">Progress Report Card</h2>
        </div>

        <div className="flex flex-row justify-between items-start gap-4 mb-6">
          <div className="flex-1 grid grid-cols-1 gap-y-2 text-[14px]">
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">STUDENT NAME:</span>
              <span className="uppercase font-black text-gray-800">{data.name}</span>
            </div>
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">ROLL NUMBER:</span>
              <span className="font-mono font-black text-blue-900 text-lg">{data.roll}</span>
            </div>
            <div className="flex border-b border-gray-100 py-1">
              <span className="w-40 font-bold text-blue-900">CLASS:</span>
              <span className="uppercase font-medium text-gray-700">{data.className}</span>
            </div>
          </div>
          <div className="w-32 h-36 border-4 border-blue-900 bg-white p-0.5">
            <div className="w-full h-full overflow-hidden flex items-center justify-center bg-gray-50">
              {data.photoURL ? <img src={data.photoURL} alt="Student" className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-300">PHOTO</span>}
            </div>
          </div>
        </div>

        <table className="w-full border-collapse border-[1.5px] border-black mb-6 text-[13px]">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="border border-black p-2.5 w-12">S.N</th>
              <th className="border border-black p-2.5 text-left">SUBJECTS</th>
              <th className="border border-black p-2.5 w-24">MAX</th>
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
                <td className="border border-black p-2 text-center font-black italic">{r.marks}</td>
                <td className="border border-black p-2 text-center font-bold text-[10px]">{Number(r.marks) >= (Number(r.total) * 0.33) ? "PASS" : "FAIL"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-100 font-black">
              <td colSpan="2" className="border border-black p-3 text-right">TOTAL:</td>
              <td className="border border-black p-3 text-center">{grandTotalMax}</td>
              <td className="border border-black p-3 text-center text-xl text-blue-900 italic">{grandTotalObt}</td>
              <td className="border border-black p-3 text-center">{grade}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-3 gap-0 border-2 border-blue-900 rounded-lg overflow-hidden mb-8 text-center">
            <div className="p-3 border-r-2 border-blue-900">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Percentage</p>
                <p className="text-xl font-black text-blue-900">{percent}%</p>
            </div>
            <div className="p-3 border-r-2 border-blue-900 bg-blue-50/50">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Grade</p>
                <p className="text-xl font-black text-blue-900">{percent >= 80 ? "A+" : percent >= 60 ? "A" : percent >= 45 ? "B" : "C"}</p>
            </div>
            <div className="p-3">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Result</p>
                <p className={`text-xl font-black ${grade === "PASS" ? "text-green-600" : "text-red-600"}`}>{grade}</p>
            </div>
        </div>

        <div className="flex justify-between mt-16 px-4">
          <div className="text-center">
            <div className="w-32 border-b-2 border-black mb-1"></div>
            <p className="text-[10px] font-black uppercase text-gray-500">Class Teacher</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b-2 border-blue-900 mb-1"></div>
            <p className="text-[10px] font-black uppercase text-blue-900">Principal Signature</p>
          </div>
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

  // Fetch Master Data
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
      } catch (err) {
        console.error("Master data error:", err);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Students (Merged with session filter logic)
  useEffect(() => {
    if (!cls) return;
    const fetchStudents = async () => {
      const q = query(
        collection(db, "students"), 
        where("className", "==", cls),
        where("session", "==", session)
      );
      const snap = await getDocs(q);
      setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchStudents();

    if (!editingId && subjectMaster[cls]) {
      setRows(subjectMaster[cls].map(sub => ({ subject: sub, total: "100", marks: "" })));
    }
  }, [cls, subjectMaster, editingId, session]);

  // Load Results for Dashboard Table
  const loadResults = async () => {
    if (!filterClass) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "examResults"), 
        where("className", "==", filterClass), 
        where("exam", "==", filterExam),
        where("session", "==", session)
      );
      const snap = await getDocs(q);
      setResultList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Fetch Results Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResults(); }, [filterClass, filterExam, session]);

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
    
    // DUPLICATE CHECK
    if (!editingId) {
      const isDuplicate = resultList.some(res => 
        res.studentId === selectedStudentId && 
        res.exam === exam && 
        res.session === session
      );
      if (isDuplicate) return toast.error("Is student ka result pehle hi bana hua hai!");
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
        session, 
        studentId: selectedStudentId,
        name: student?.name || name,
        className: cls,
        roll: student?.rollNumber || "",
        fatherName: student?.fatherName || "",
        photoURL: student?.photoURL || "",
        exam,
        rows: cleanRows,
        updatedAt: serverTimestamp()
      };
      if (editingId) {
        await updateDoc(doc(db, "examResults", editingId), payload);
        toast.success("Result Updated!");
      } else {
        await addDoc(collection(db, "examResults"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Result Saved!");
      }
      setShowForm(false);
      setEditingId(null);
      loadResults();
    } catch (e) {
      toast.error("Error saving data!");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAll = () => {
    if (resultList.length === 0) return toast.error("No records!");
    const formattedClass = filterClass.replace(/\s+/g, "");
    const path = filterExam === "Annual" 
      ? `/marksheet/${formattedClass}/${session}` 
      : `/all-report/${formattedClass}/${session}`;
    navigate(path);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-black italic text-slate-900 uppercase">
      <Toaster />
      {showModal && <ReportCardModal data={selectedResult} onClose={() => setShowModal(false)} />}

      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-[32px] border shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-800 italic leading-none">Result Dashboard</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-400 tracking-widest">Global Session:</span>
              <select 
                value={session} 
                onChange={(e) => setSession(e.target.value)}
                className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black border-none outline-none cursor-pointer"
              >
                {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => { setEditingId(null); setSelectedStudentId(""); setStudentSearch(""); setShowForm(true); }} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black text-xs shadow-xl hover:scale-105 transition-all">+ Add Result</button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-[10px] tracking-widest">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-slate-400 mb-1 ml-1 uppercase font-bold">Class</span>
            <select className="bg-transparent font-black text-sm outline-none italic" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              {classesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col">
            <span className="text-slate-400 mb-1 ml-1 uppercase font-bold">Exam</span>
            <select className="bg-transparent font-black text-sm outline-none italic" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
              {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="bg-indigo-600 p-4 rounded-2xl border shadow-lg flex flex-col">
            <span className="text-indigo-200 mb-1 ml-1 uppercase font-bold">Search Table</span>
            <input 
              type="text" 
              placeholder="NAME / ROLL..." 
              className="bg-transparent text-white placeholder:text-indigo-300 font-black text-sm outline-none italic"
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden mb-6">
          <table className="w-full text-left text-xs italic">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] text-slate-400 tracking-widest uppercase">
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
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border">
                      {r.photoURL ? <img src={r.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100" />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{r.name}</p>
                      <p className="text-[10px] text-slate-400 italic">Roll: {r.roll} | {r.session}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black tracking-tighter">✓ COMPLETED</span>
                  </td>
                  <td className="px-6 py-4 text-center text-indigo-600">{r.exam}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setEditingId(r.id); setSelectedStudentId(r.studentId); setStudentSearch(r.name); setCls(r.className); setExam(r.exam); setRows(r.rows); setSession(r.session || session); setShowForm(true); }} className="text-blue-600 border px-4 py-1 rounded-lg text-[10px] font-black">Edit</button>
                    <button onClick={() => {setSelectedResult(r); setShowModal(true);}} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black">View</button>
                    <button onClick={() => {if(window.confirm('Delete?')) deleteDoc(doc(db, "examResults", r.id)).then(loadResults)}} className="text-red-300 px-2">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-[32px] border shadow-sm flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-800 italic">Bulk Actions</h1>
          <button onClick={handlePrintAll} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-xs shadow-xl">🖨 PRINT ALL ({session})</button>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2 md:p-4 text-slate-900">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[40px] shadow-2xl overflow-y-auto p-6 md:p-10 italic">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl md:text-3xl font-black text-indigo-600 tracking-tighter italic">{editingId ? "Update Result" : `Add New Entry`}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-slate-100 p-2 px-5 rounded-full text-slate-400 font-black">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 text-[10px] tracking-widest">
              <div className="space-y-4 font-black italic">
                <div>
                  <label className="text-slate-400 ml-2 mb-1 block uppercase">Academic Session</label>
                  <select 
                    className="w-full bg-indigo-50 border-none p-4 rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-200 italic uppercase" 
                    value={session} 
                    onChange={(e) => setSession(e.target.value)}
                  >
                    {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 ml-2 mb-1 block">Class Select Karo</label>
                  <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-200 italic uppercase" value={cls} onChange={e => setCls(e.target.value)} disabled={editingId}>
                    {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 ml-2 mb-1 block">Exam Type</label>
                  <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-sm outline-none focus:ring-2 ring-indigo-200 italic uppercase" value={exam} onChange={e => setExam(e.target.value)}>{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select>
                </div>
              </div>

              {/* SEARCH BOX WITH STATUS BADGE */}
              <div className="relative font-black italic">
                <label className="text-slate-400 ml-2 mb-1 block uppercase">Student Search (Name/Roll)</label>
                <input 
                  type="text" 
                  placeholder="START TYPING..." 
                  className="w-full bg-indigo-50/50 p-4 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-400 transition-all uppercase text-sm italic" 
                  value={studentSearch} 
                  onChange={e => {setStudentSearch(e.target.value); if(!editingId) setSelectedStudentId("");}} 
                  disabled={editingId} 
                />
                
                {studentSearch && !selectedStudentId && !editingId && (
                  <div className="absolute top-20 left-0 w-full bg-white border-2 rounded-2xl z-20 max-h-48 overflow-y-auto shadow-2xl p-2 mt-1">
                    {allStudents
                      .filter(s => 
                        (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                        (s.rollNumber && s.rollNumber.toString().includes(studentSearch)))
                      )
                      .map(s => {
                        // Logic to check if result is already done
                        const isDone = resultList.some(res => res.studentId === s.id && res.exam === exam);
                        
                        return (
                          <div 
                            key={s.id} 
                            onClick={() => { 
                              if(isDone) return toast.error("Result pehle se hai!");
                              setSelectedStudentId(s.id); 
                              setName(s.name); 
                              setStudentSearch(s.name); 
                            }} 
                            className={`p-4 cursor-pointer rounded-xl font-bold text-[11px] flex justify-between items-center border-b last:border-0 hover:bg-indigo-600 hover:text-white group transition-all ${isDone ? 'bg-red-50/50' : ''}`}
                          >
                            <div className="flex flex-col">
                              <span>{s.name}</span>
                              <span className="opacity-40 text-[9px]">ROLL: {s.rollNumber}</span>
                            </div>
                            
                            {isDone ? (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[8px] font-black group-hover:bg-white">✓ COMPLETED</span>
                            ) : (
                              <span className="opacity-20 text-[8px]">PENDING</span>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                )}
                
                {selectedStudentId && (
                  <div className="mt-4 p-5 bg-slate-900 text-emerald-400 rounded-2xl text-[10px] flex items-center justify-between italic font-black">
                    <span>✓ SELECTED STUDENT:</span> 
                    <span className="text-sm uppercase">{name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border-4 border-slate-50 overflow-hidden bg-slate-50/20 mb-10">
              <table className="w-full text-xs italic font-black uppercase">
                <thead className="bg-slate-100 text-[10px] text-slate-400">
                  <tr>
                    <th className="p-5 text-left font-bold">Subject</th>
                    <th className="p-5 text-center w-32 font-bold">Total</th>
                    <th className="p-5 text-center w-32 text-indigo-600 font-bold">Obtained</th>
                    <th className="p-5 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-white transition-colors">
                      <td className="p-1"><input className="w-full p-4 bg-transparent outline-none font-black text-slate-700 uppercase" placeholder="SUBJECT" value={r.subject} onChange={e => handleRowChange(i, 'subject', e.target.value)} /></td>
                      <td className="p-1 text-center"><input type="number" className="w-full p-4 bg-transparent outline-none text-center font-bold text-slate-300" value={r.total} onChange={e => handleRowChange(i, 'total', e.target.value)} /></td>
                      <td className="p-1 text-center"><input type="number" className="w-full p-4 bg-transparent outline-none text-center font-black text-indigo-600 text-xl" placeholder="00" value={r.marks} onChange={e => handleRowChange(i, 'marks', e.target.value)} /></td>
                      <td className="p-1 text-center"><button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-red-200 hover:text-red-500 font-black px-2">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 text-[10px] tracking-widest font-black uppercase italic">
              <button onClick={() => setRows([...rows, { subject: "", total: "100", marks: "" }])} className="text-indigo-600 border-2 border-indigo-50 px-10 py-5 rounded-2xl hover:bg-indigo-50 transition-all">+ Add Subject</button>
              <div className="flex-1 flex gap-3">
                <button className="flex-1 bg-slate-100 py-5 rounded-2xl hover:bg-slate-200" onClick={() => { setShowForm(false); setEditingId(null); }}>Close</button>
                <button disabled={loading} className={`flex-[2] ${loading ? 'bg-slate-300 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl'} text-white py-5 rounded-2xl transition-all font-black`} onClick={saveResult}>
                  {loading ? 'WAIT...' : editingId ? 'UPDATE' : 'PUBLISH'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}