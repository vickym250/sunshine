import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function AllReport() {
  const { className, session } = useParams(); 
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [school, setSchool] = useState({
    name: "Sun Shine School",
    address: "Mahanua",
    affiliation: "UP BOARD",
    contact: "234565467",
    logoUrl: ""
  });

  useEffect(() => {
    let isMounted = true;
    const fetchResults = async () => {
      if (!className || !session) return;
      try {
        setLoading(true);
        
        // 1. School Settings Fetch
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists() && isMounted) setSchool(schoolSnap.data());

        // 2. Class Name Space Fix (Database matching ke liye)
        let dbClassName = className;
        if (className.startsWith("Class") && !className.includes(" ")) {
          dbClassName = className.replace("Class", "Class ");
        } else if (!className.startsWith("Class")) {
          dbClassName = `Class ${className}`;
        }

        // 3. Dynamic Query with WHERE (Class + Session)
        // NOTE: Iske liye Firestore Console mein Composite Index banana pad sakta hai
        const q = query(
          collection(db, "examResults"), 
          where("className", "==", dbClassName),
          where("session", "==", session)
        );
        
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
          // Duplicate Check: Agar ID pehle se hai toh add mat karo
          if (!results.find(r => r.id === doc.id)) {
            results.push({ id: doc.id, ...doc.data() });
          }
        });

        // 4. Roll Number Sorting
        results.sort((a, b) => Number(a.roll) - Number(b.roll));
        
        if (isMounted) setData(results);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResults();
    return () => { isMounted = false; };
  }, [className, session]);

  const handlePrint = () => window.print();
  const onClose = () => navigate(-1);

  if (loading) return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white italic">
       <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="tracking-widest font-bold uppercase">Generating All Reports...</p>
    </div>
  );

  if (data.length === 0) return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white text-center p-4">
      <p className="mb-4 text-lg font-bold uppercase tracking-tight">
        Koi record nahi mila! <br/> 
        <span className="text-zinc-500 text-sm">Class: {className} | Session: {session}</span>
      </p>
      <button onClick={onClose} className="px-10 py-3 bg-red-600 hover:bg-red-700 transition-all rounded-full font-black shadow-lg">Wapis Jayein</button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-zinc-800 z-[999] flex justify-center items-start overflow-y-auto p-4 md:p-10 no-scrollbar">
      
      {/* PRINT OPTIMIZED CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-area, #printable-area * { visibility: visible !important; }
          #printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .page-break { 
            page-break-after: always !important; 
            break-after: page !important;
            display: block !important;
            margin: 0 !important;
            border: 12px double #1e3a8a !important; 
          }
          @page { size: A4 portrait; margin: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 no-print z-[1000]">
        <button 
          onClick={handlePrint} 
          className="px-8 py-3 bg-emerald-600 text-white font-black rounded-full shadow-2xl border-2 border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>🖨️</span> PRINT ALL ({data.length})
        </button>
        <button 
          onClick={onClose} 
          className="px-8 py-3 bg-white text-red-600 font-black rounded-full shadow-2xl border-2 border-red-100 hover:scale-105 active:scale-95 transition-all"
        >
          CLOSE
        </button>
      </div>

      {/* REPORTS LIST AREA */}
      <div id="printable-area" className="w-full flex flex-col items-center gap-10">
        {data.map((student, idx) => {
          const rows = student.rows || [];
          const grandTotalObt = rows.reduce((s, r) => s + (Number(r.marks) || 0), 0);
          const grandTotalMax = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
          const percent = grandTotalMax ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : "0.00";
          const gradeStatus = Number(percent) >= 33 ? "PASS" : "FAIL";

          return (
            <div 
              key={student.id || idx} 
              className="page-break bg-white w-[210mm] min-h-[297mm] border-[12px] border-double border-blue-900 p-10 font-serif relative shadow-2xl flex flex-col mb-10 text-slate-900"
            >
              
              {/* MARKSHEET HEADER */}
              <div className="flex items-center justify-between border-b-4 border-blue-900 pb-4 mb-6">
                <div className="w-24 h-24 flex-shrink-0">
                  <img 
                    src={school.logoUrl} 
                    alt="School Logo" 
                    className="w-full h-full object-contain" 
                    onError={(e) => e.target.style.display='none'} 
                  />
                </div>
                <div className="flex-1 text-center px-2">
                  <p className="text-blue-800 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                    Affiliated to: {school.affiliation}
                  </p>
                  <h1 className="text-3xl font-black uppercase text-blue-900 leading-tight">
                    {school.name}
                  </h1>
                  <p className="text-[12px] font-bold text-gray-700 uppercase mt-1">
                    {school.address}
                  </p>
                  <p className="text-[10px] font-bold text-blue-700 mt-1">
                    📞 Contact: {school.contact}
                  </p>
                </div>
                <div className="w-24 text-right">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Academic</span>
                  <span className="text-lg font-black text-blue-900 italic tracking-tighter">
                    {student.session}
                  </span>
                </div>
              </div>

              {/* EXAM TITLE */}
              <div className="text-center mb-6">
                <h2 className="inline-block border-2 border-blue-900 text-blue-900 px-8 py-1 rounded-md font-black text-sm uppercase bg-blue-50">
                  {student.exam} Progress Report (Provisional)
                </h2>
              </div>

              {/* STUDENT BASIC INFO */}
              <div className="flex justify-between items-start gap-4 mb-6">
                <div className="flex-1 grid grid-cols-1 gap-y-2 text-[15px]">
                  <div className="flex border-b border-gray-100 py-1">
                    <span className="w-36 font-bold text-blue-900">STUDENT NAME:</span>
                    <span className="uppercase font-black text-gray-800">{student.name}</span>
                  </div>
                  <div className="flex border-b border-gray-100 py-1">
                    <span className="w-36 font-bold text-blue-900">FATHER'S NAME:</span>
                    <span className="uppercase font-medium text-gray-700">{student.fatherName}</span>
                  </div>
                  <div className="flex border-b border-gray-100 py-1">
                    <span className="w-36 font-bold text-blue-900">ROLL NUMBER:</span>
                    <span className="font-mono font-black text-blue-900 text-xl tracking-tighter italic">
                      {student.roll}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-100 py-1">
                    <span className="w-36 font-bold text-blue-900">CLASS / SEC:</span>
                    <span className="uppercase font-medium text-gray-700">{student.className}</span>
                  </div>
                </div>
                
                {/* PHOTO BOX */}
                <div className="w-32 h-36 border-4 border-blue-900 bg-white p-0.5 shadow-sm">
                  <div className="w-full h-full border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
                    {student.photoURL ? (
                      <img src={student.photoURL} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-300 font-bold uppercase">No Photo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SUBJECTS MARKS TABLE */}
              <table className="w-full border-collapse border-[1.5px] border-black mb-6 text-[14px]">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-black p-2.5 w-12">S.N</th>
                    <th className="border border-black p-2.5 text-left">SUBJECTS NAME</th>
                    <th className="border border-black p-2.5 w-24">MAX MARKS</th>
                    <th className="border border-black p-2.5 w-24">OBTAINED</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="even:bg-gray-50">
                      <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                      <td className="border border-black p-2 uppercase font-black text-blue-900">{r.subject}</td>
                      <td className="border border-black p-2 text-center">{r.total}</td>
                      <td className="border border-black p-2 text-center font-black italic text-base">
                        {r.marks}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-100 font-black border-t-2 border-black">
                    <td colSpan="2" className="border border-black p-3 text-right uppercase text-xs">Grand Total Marks Obtained:</td>
                    <td className="border border-black p-3 text-center">{grandTotalMax}</td>
                    <td className="border border-black p-3 text-center text-2xl text-blue-900 italic">
                      {grandTotalObt}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* PERFORMANCE SUMMARY */}
              <div className="grid grid-cols-3 border-2 border-blue-900 rounded-lg overflow-hidden mb-10 text-center bg-white shadow-sm">
                <div className="p-3 border-r-2 border-blue-900">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Percentage</p>
                  <p className="text-xl font-black text-blue-900">{percent}%</p>
                </div>
                <div className="p-3 border-r-2 border-blue-900 bg-blue-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Grade</p>
                  <p className="text-xl font-black text-blue-900">
                    {Number(percent) >= 80 ? "A+" : Number(percent) >= 60 ? "A" : Number(percent) >= 45 ? "B" : "C"}
                  </p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Result Status</p>
                  <p className={`text-xl font-black ${gradeStatus === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                    {gradeStatus}
                  </p>
                </div>
              </div>

              {/* SIGNATURE SECTION */}
              <div className="mt-auto flex justify-between px-6 pb-8">
                <div className="text-center">
                  <div className="w-36 border-b-2 border-black mb-1"></div>
                  <p className="text-[10px] font-black text-gray-500 uppercase">Class Teacher Signature</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b-2 border-blue-900 mb-1"></div>
                  <p className="text-[10px] font-black text-blue-900 uppercase">Principal Signature (Seal)</p>
                </div>
              </div>

              {/* MARKSHEET FOOTER */}
              <div className="pt-2 border-t flex justify-between text-[8px] text-gray-400 font-bold italic uppercase tracking-tighter">
                <span>{school.name} Official Student Record</span>
                <span>Generated On: {new Date().toLocaleString('en-GB')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}