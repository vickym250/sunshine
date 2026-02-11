import React, { useState, useEffect } from "react";
import AddStudent from "../component/AddStudent";
import Readmission from "../component/Readmission";
// 🔥 Naya component import karein (Rasta check kar lijiye ga apne folder structure ke hisab se)

import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { updateTotalStudents } from "../component/updateTotalStudents";
import AdmissionDetails from "../component/AdmisionForm";

export default function StudentList() {
  let navigator = useNavigate();

  // 🔥 Settings
  const CURRENT_ACTIVE_SESSION = "2025-26";
  const sessions = ["2024-25", "2025-26", "2026-27"];
  const [session, setSession] = useState("2025-26");
  const schoolClasses = ["LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
  const [className, setClassName] = useState("Class 10");

  const [open, setOpen] = useState(false);
  const [openRe, setOpenRe] = useState(false);
  
  // 🔥 Admission Details ke liye naye states
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

  const [editStudent, setEditStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Data Fetching
  useEffect(() => {
    const q = query(collection(db, "students"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !s.deletedAt);
      setStudents(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter Logic
  const filteredStudents = students
    .filter((s) => {
      const matchSession = s.session === session;
      const matchClass = s.className === className;
      const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber?.toString().includes(searchTerm);
      return matchSession && matchClass && matchSearch;
    })
    .sort((a, b) => parseInt(a.rollNumber || 0) - parseInt(b.rollNumber || 0));

  const handleReAdmission = (student) => {
    setEditStudent(student);
    setOpenRe(true);
  };

  // 🔥 Details open karne ka function
  const handleOpenDetails = (student) => {
    setSelectedStudentForDetails(student);
    setOpenDetails(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive student?")) return;
    await updateDoc(doc(db, "students", id), { deletedAt: serverTimestamp() });
    toast.success("Archived");
    await updateTotalStudents();
  };

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen font-sans">
      {/* Blur background when any modal is open */}
      <div className={`max-w-[1400px] mx-auto ${(open || openRe || openDetails) ? "blur-md pointer-events-none" : ""}`}>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-800">Student List ({session})</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select value={session} onChange={(e) => setSession(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-bold bg-white outline-none">
            {sessions.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={className} onChange={(e) => setClassName(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-bold bg-white outline-none">
            {schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
          <div className="flex-grow">
            <input type="text" placeholder="Search by name or roll..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-md px-4 py-1.5 text-sm outline-none" />
          </div>
          <button onClick={() => { setEditStudent(null); setOpen(true); }} className="bg-[#FFC107] text-black px-5 py-1.5 rounded-md font-bold text-sm shadow hover:bg-amber-500 uppercase">Add Student</button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm bg-white">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-[#E2E8F0] text-[#475569] text-[12px] font-bold uppercase tracking-tight">
              <tr>
                <th className="px-4 py-4 w-20">Photo</th>
                <th className="px-4 py-4 text-center w-24">Roll</th>
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Class</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((s) => {
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-50 mx-auto">
                        {s.photoURL ? <img src={s.photoURL} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-gray-400 font-bold">{s.name?.[0]}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-500 text-center">{s.rollNumber}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-800 uppercase">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.className}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.phone || "N/A"}</td>
                    <td className="px-4 py-3">
  <div className="flex items-center justify-center gap-1.5">
    {/* 🔥 Details Button (Sabke liye) */}
    <button 
      onClick={() => handleOpenDetails(s)} 
      className="bg-gray-600 text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-gray-700 uppercase"
    >
      Details
    </button>

    {/* 🔥 Fees Button (Ab sabke liye dikhega aur student ID pass hogi) */}
    <button 
      onClick={() => navigator(`/feesrec/${s.id}`)} 
      className="bg-[#2563EB] text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-blue-700 uppercase"
    >
      Fees
    </button>

    {s.session === CURRENT_ACTIVE_SESSION ? (
      <>
        {/* Current Session ke liye Edit */}
        <button onClick={() => { setEditStudent(s); setOpen(true); }} className="bg-[#FBBF24] text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-amber-500 uppercase">Edit</button>
      </>
    ) : (
      <>
        {/* Purane Session ke liye Re-Admit aur TC */}
        <button onClick={() => handleReAdmission(s)} className="bg-emerald-600 text-white px-2 py-1 rounded text-[11px] font-bold hover:bg-emerald-700 uppercase">Re-Admit</button>
        <button onClick={() => navigator(`/tc/${s.id}`)} className="bg-red-600 text-white px-2 py-1 rounded text-[11px] font-bold hover:bg-red-700 uppercase">TC</button>
      </>
    )}

    {/* Delete aur IdCard (Sabke liye) */}
    <button onClick={() => handleDelete(s.id)} className="bg-[#EF4444] text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-red-600 uppercase">Delete</button>
    <button onClick={() => navigator(`/idcard/${s.id}`)} className="bg-white text-blue-600 border border-blue-600 px-3 py-1 rounded text-[11px] font-bold hover:bg-blue-50 uppercase tracking-tighter">IdCard</button>
  </div>
</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {open && <AddStudent close={() => { setOpen(false); setEditStudent(null); }} editData={editStudent} />}
      {openRe && <Readmission close={() => { setOpenRe(false); setEditStudent(null); }} studentData={editStudent} />}
      
      {/* 🔥 Admission Details Modal Trigger */}
      {openDetails && selectedStudentForDetails && (
        <AdmissionDetails
          studentId={selectedStudentForDetails.id} 
          subjects={selectedStudentForDetails.subjects || []} // Agar subjects array data mein hai to
          onClose={() => { setOpenDetails(false); setSelectedStudentForDetails(null); }} 
        />
      )}
    </div>
  );
}