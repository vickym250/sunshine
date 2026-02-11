import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function AllReport() {
  const { className } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // School info state
  const [school, setSchool] = useState({
    name: "Board of Intermediate & Secondary Education",
    address: "Provisional Result Card"
  });

 useEffect(() => {
  const fetchResults = async () => {
    try {
      setLoading(true);

      // 1. School Settings Fetch (Pehle ki tarah)
      const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
      if (schoolSnap.exists()) setSchool(schoolSnap.data());

      // 2. Space Fix Logic 🛠️
      let dbClassName = className;

      // Agar "Class1" jaisa bina space ka data hai, toh "Class 1" banayein
      if (className.startsWith("Class") && !className.includes(" ")) {
        dbClassName = className.replace("Class", "Class ");
      } 
      // Agar sirf "1" aa raha hai, toh "Class 1" banayein
      else if (!className.startsWith("Class")) {
        dbClassName = `Class ${className}`;
      }

      console.log("Searching for:", dbClassName); // Debugging ke liye

      // 3. Dynamic Query
      const q = query(
        collection(db, "examResults"), 
        where("className", "==", dbClassName)
      );
      
      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      results.sort((a, b) => Number(a.roll) - Number(b.roll));
      setData(results);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (className) fetchResults();
}, [className]);

  const handlePrint = () => window.print();
  const onClose = () => navigate(-1);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-bold italic tracking-widest uppercase">Generating All Reports...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white text-center p-4">
        <p className="mb-4 text-lg font-bold uppercase">Is class ({className}) ka koi record nahi mila.</p>
        <button onClick={onClose} className="px-10 py-3 bg-red-600 hover:bg-red-700 transition-all rounded-full font-black shadow-lg">Wapis Jayein</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-800 z-[999] flex justify-center items-start overflow-y-auto p-4 md:p-10 no-scrollbar">
      
      {/* PRINT OPTIMIZED CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
          }
          .page {
            margin: 0 !important;
            border: 15px double #1e3a8a !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            position: relative;
          }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 no-print z-[1000]">
        <button
          onClick={handlePrint}
          className="px-8 py-3 bg-emerald-600 text-white font-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border-2 border-white/20"
        >
          <span>🖨️</span> PRINT ALL ({data.length})
        </button>
       
      </div>

      {/* ALL STUDENTS REPORTS */}
      <div className="print-area w-full flex flex-col items-center gap-10">
        {data.map((student, idx) => {
          const rows = student.rows || [];
          const grandTotalObt = rows.reduce((s, r) => s + (Number(r.marks) || 0), 0);
          const grandTotalMax = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
          const percent = grandTotalMax ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : "0.00";
          const gradeStatus = Number(percent) >= 33 ? "PASS" : "FAIL";

          return (
            <div
              key={student.id || idx}
              className="page bg-white w-[210mm] h-[297mm] border-[12px] border-double border-blue-900 p-12 font-serif shadow-2xl relative flex flex-col"
            >
              {/* HEADER - Fetching from DB settings */}
              <div className="text-center border-b-4 border-blue-900 pb-4 mb-8">
                <h1 className="text-2xl md:text-3xl font-black uppercase text-blue-900 tracking-tighter leading-tight">
                  {school.name}
                </h1>
                <div className="mt-2 inline-block px-6 py-1 bg-blue-900 text-white font-bold tracking-widest uppercase text-xs">
                   {student.exam} - {student.className}
                </div>
              </div>

              {/* BASIC INFO */}
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-3 text-lg">
                  <p className="flex gap-2"><b>Candidate:</b> <span className="uppercase border-b border-dotted border-black px-2">{student.name}</span></p>
                  <p className="flex gap-2"><b>Roll No:</b> <span className="font-mono bg-gray-50 px-2 font-black text-blue-900 border border-gray-200">{student.roll}</span></p>
                  <p className="flex gap-2"><b>Father Name:</b> <span className="uppercase border-b border-dotted border-black px-2">{student.fatherName}</span></p>
                  <p className="flex gap-2"><b>Session:</b> <span>{student.session || "2024-25"}</span></p>
                </div>

                <div className="w-32 h-36 border-4 border-blue-900 rounded shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center">
                  {student.photoURL ? (
                    <img src={student.photoURL} alt="student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                        <span className="text-[10px] text-gray-300 font-sans block uppercase">No Photo</span>
                        <span className="text-4xl text-gray-200">👤</span>
                    </div>
                  )}
                </div>
              </div>

              {/* MARKS TABLE */}
              <table className="w-full border-collapse border-2 border-black mb-8">
                <thead>
                  <tr className="bg-blue-900 text-white text-sm">
                    <th className="border border-black p-2 w-12 text-center">SR.</th>
                    <th className="border border-black p-2 text-left">SUBJECT NAME</th>
                    <th className="border border-black p-2 w-28 text-center">MAX MARKS</th>
                    <th className="border border-black p-2 w-28 text-center">OBTAINED</th>
                  </tr>
                </thead>
                <tbody className="text-base">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-black p-2 text-center font-bold text-gray-500">{i + 1}</td>
                      <td className="border border-black p-2 uppercase font-black text-blue-900">{r.subject}</td>
                      <td className="border border-black p-2 text-center font-bold">{r.total}</td>
                      <td className="border border-black p-2 text-center font-black bg-gray-50">{r.marks}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-200 font-black text-lg">
                    <td colSpan="2" className="border border-black p-3 text-right text-sm">AGGREGATE TOTAL:</td>
                    <td className="border border-black p-3 text-center">{grandTotalMax}</td>
                    <td className="border border-black p-3 text-center text-blue-900">{grandTotalObt}</td>
                  </tr>
                </tfoot>
              </table>

              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="border-2 border-blue-900 rounded-xl p-3 text-center bg-slate-50">
                  <p className="text-[10px] uppercase text-gray-500 font-bold">Percentage</p>
                  <p className="text-xl font-black text-blue-900">{percent}%</p>
                </div>
                <div className={`border-2 rounded-xl p-3 text-center ${gradeStatus === "FAIL" ? "border-red-600 bg-red-50" : "border-blue-900 bg-slate-50"}`}>
                  <p className="text-[10px] uppercase text-gray-500 font-bold">Status</p>
                  <p className={`text-xl font-black ${gradeStatus === "FAIL" ? "text-red-600" : "text-green-600"}`}>
                    {gradeStatus}
                  </p>
                </div>
                <div className="border-2 border-blue-900 rounded-xl p-3 text-center bg-slate-50">
                  <p className="text-[10px] uppercase text-gray-500 font-bold">Division</p>
                  <p className="text-xl font-black text-blue-900">
                    {Number(percent) >= 60 ? "First" : Number(percent) >= 45 ? "Second" : "Third"}
                  </p>
                </div>
              </div>

              {/* SIGNATURES */}
              <div className="mt-auto flex justify-between items-end pb-12">
                <div className="text-center">
                  <div className="w-40 border-t-2 border-black mb-1"></div>
                  <p className="text-[10px] font-bold uppercase text-blue-900">Controller Exam</p>
                </div>
                <div className="text-center">
                  <div className="w-40 border-t-2 border-black mb-1"></div>
                  <p className="text-[10px] font-bold uppercase text-blue-900">Principal Sign</p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="absolute bottom-6 left-0 right-0 text-center px-12">
                <p className="text-[9px] text-gray-400 font-bold italic leading-tight border-t pt-2">
                  Generated on: {new Date().toLocaleString('en-IN')} | {school.address}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}