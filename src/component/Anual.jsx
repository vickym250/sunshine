import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

export default function MarksSheet() {
  const { studentId, session } = useParams();
  const [loading, setLoading] = useState(true);
  const [classResults, setClassResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // School details state from Firestore 'settings/schoolDetails'
  const [schoolInfo, setSchoolInfo] = useState({
    name: "SUNSHINE ENGLISH MEDIUM SCHOOL",
    address: "Mannijot, Bhanwapur Road, Siddharthnagar, U.P.",
    affiliation: "AFFILIATED TO U.P. BOARD",
    logoUrl: "",
    slogan: "",
    website: ""
  });

  const TABLE_ROWS_COUNT = 10;

  const normalize = (str = "") => str.toLowerCase().replace(/[^a-z]/g, "");

  const getRow = (exam, subject) =>
    exam?.rows?.find(
      (r) =>
        normalize(r.subject).includes(normalize(subject)) ||
        normalize(subject).includes(normalize(r.subject))
    ) || { total: 0, marks: 0 };

  const fetchSchoolDetails = async () => {
    try {
      const schoolRef = doc(db, "settings", "schoolDetails");
      const schoolSnap = await getDoc(schoolRef);
      if (schoolSnap.exists()) {
        setSchoolInfo(schoolSnap.data());
      }
    } catch (err) {
      console.error("Error fetching school details:", err);
    }
  };

  const fetchSubjectsForClass = async (className) => {
    try {
      const docRef = doc(db, "school_config", "master_data");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const mapping = docSnap.data().mapping || {};
        setSubjects(mapping[className] || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchSchoolDetails();

      if (studentId?.toLowerCase().startsWith("class")) {
        const className = studentId.toLowerCase().replace("class", "Class ");
        await fetchSubjectsForClass(className);

        const qs = query(
          collection(db, "students"),
          where("className", "==", className)
        );
        const stuSnap = await getDocs(qs);
        const students = stuSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const all = [];
        for (const stu of students) {
          const qr = query(
            collection(db, "examResults"),
            where("studentId", "==", stu.id),
            where("session", "==", session)
          );
          const rs = await getDocs(qr);
          const results = rs.docs.map((d) => d.data());
          const h = results.find((r) => r.exam === "Half-Yearly");
          const a = results.find((r) => r.exam === "Annual");
          if (h || a) all.push({ student: stu, half: h, annual: a });
        }
        setClassResults(all);
      } else {
        const stuRef = doc(db, "students", studentId);
        const stuSnap = await getDoc(stuRef);

        if (stuSnap.exists()) {
          const stu = stuSnap.data();
          await fetchSubjectsForClass(stu.className);

          const qr = query(
            collection(db, "examResults"),
            where("studentId", "==", studentId)
          );
          const rs = await getDocs(qr);
          const results = rs.docs.map((d) => d.data());

          const h = results.find((r) => r.exam === "Half-Yearly");
          const a = results.find((r) => r.exam === "Annual");
          setClassResults([
            { student: { id: studentId, ...stu }, half: h, annual: a },
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [studentId, session]);
const handlePrint = () => {
    const content = document.getElementById("marksheet-content").innerHTML;
    const printWindow = window.open("", "_blank", "width=1000,height=1200");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${schoolInfo.name} - Marksheet</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            
            @page { 
              size: A4 portrait; 
              margin: 0; 
            }
            body { 
              font-family: 'Inter', sans-serif; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              margin: 0; 
              padding: 0; 
              background-color: white !important;
            }
            .print-page { 
              width: 210mm; 
              height: 296.5mm; /* Minor adjustment to prevent blank page */
              padding: 8mm; 
              box-sizing: border-box; 
              page-break-after: always; 
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            /* Remove extra blank page at the end */
            .print-page:last-child {
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            .main-border { 
              border: 4px solid #1e3a8a !important; 
              height: 100%; 
              width: 100%; 
              box-sizing: border-box; 
              padding: 10mm; 
              display: flex; 
              flex-direction: column; 
              position: relative;
              background: white;
            }
            table { border-collapse: collapse; width: 100%; }
            table td, table th { 
              border: 1.5px solid #1e3a8a !important; 
            }
            /* Force images to stay within bounds */
            img { max-width: 100%; height: auto; }
            
            /* Chrome/Safari fixes for printing background colors */
            * { -webkit-print-color-adjust: exact; box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = () => {
              // Har print-page div ke wrapper ko ensure karein
              setTimeout(() => {
                window.print();
                // window.close(); 
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading)
    return (
      <div className="p-20 text-center text-[#1e3a8a] font-bold animate-pulse">
        Loading Report Cards...
      </div>
    );

  return (
    <div className="bg-slate-500 min-h-screen p-10 print:bg-white print:p-0">
      <div id="marksheet-content" className="flex flex-col items-center">
        {classResults.map((item) => {
          const { student, half, annual } = item;

          const getMarksInfo = (sub) => {
            const h = getRow(half, sub);
            const a = getRow(annual, sub);
            return {
              hMax: Number(h.total) || 0,
              hObt: Number(h.marks) || 0,
              aMax: Number(a.total) || 0,
              aObt: Number(a.marks) || 0,
            };
          };

          const totalHMax = subjects.reduce((acc, sub) => acc + getMarksInfo(sub).hMax, 0);
          const totalHObt = subjects.reduce((acc, sub) => acc + getMarksInfo(sub).hObt, 0);
          const totalAMax = subjects.reduce((acc, sub) => acc + getMarksInfo(sub).aMax, 0);
          const totalAObt = subjects.reduce((acc, sub) => acc + getMarksInfo(sub).aObt, 0);
          
          const grandTotalObt = totalHObt + totalAObt;
          const grandTotalMax = totalHMax + totalAMax;
          const percentage = grandTotalMax ? ((grandTotalObt / grandTotalMax) * 100).toFixed(2) : 0;

          return (
            <div key={student.id} className="print-page bg-white shadow-2xl mb-10">
              <div className="main-border">
                
                {/* Header Section */}
                <div className="text-center border-b-2 border-[#1e3a8a] pb-2 mb-4 relative">
                  <div className="flex items-center justify-center gap-4">
                    {schoolInfo.logoUrl && (
                      <img src={schoolInfo.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                    )}
                    <div>
                      <h2 className="text-[#1e3a8a] font-bold text-[10px] tracking-[0.2em] uppercase">
                        {schoolInfo.affiliation || "AFFILIATED TO U.P. BOARD"}
                      </h2>
                      <h1 className="text-3xl font-black text-[#1e3a8a] uppercase leading-tight">
                        {schoolInfo.name}
                      </h1>
                      <p className="text-[10px] font-bold text-gray-600">
                        {schoolInfo.address}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="bg-[#1e3a8a] text-white inline-block px-8 py-1 text-xs font-bold rounded-full uppercase">
                      PROGRESS REPORT : {session}
                    </p>
                  </div>
                </div>

                {/* Student Info Section */}
                <div className="flex justify-between items-start my-4">
                  <div className="flex-grow space-y-2 text-[#1e3a8a] font-bold text-sm">
                    <p className="border-b flex"><span className="w-32 text-gray-500">NAME:</span> <span className="text-black uppercase">{student.name}</span></p>
                    <p className="border-b flex"><span className="w-32 text-gray-500">ROLL NO:</span> <span className="text-black">{student.rollNumber || "---"}</span></p>
                    <p className="border-b flex"><span className="w-32 text-gray-500">CLASS:</span> <span className="text-black uppercase">{student.className}</span></p>
                    <p className="border-b flex"><span className="w-32 text-gray-500">FATHER:</span> <span className="text-black uppercase">{student.fatherName || "---"}</span></p>
                  </div>
                  <div className="w-28 h-32 border-4 border-[#1e3a8a] overflow-hidden bg-gray-100 shadow-sm ml-4">
                    <img 
                      src={student.photoURL || student.photo} 
                      alt="Student" 
                      className="w-full h-full object-cover" 
                      onError={(e) => (e.target.src = "https://via.placeholder.com/150?text=No+Photo")} 
                    />
                  </div>
                </div>

                {/* Main Marks Table */}
                <div className="flex-grow overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#1e3a8a] text-white">
                      <tr>
                        <th rowSpan="2" className="p-1 border border-white">S.N</th>
                        <th rowSpan="2" className="p-1 border border-white text-left">SUBJECTS</th>
                        <th colSpan="2" className="p-1 border border-white text-center">HALF YEARLY</th>
                        <th colSpan="2" className="p-1 border border-white text-center">ANNUAL</th>
                        <th rowSpan="2" className="p-1 border border-white bg-blue-900 text-center">GRAND TOTAL</th>
                      </tr>
                      <tr className="bg-blue-800 text-[9px]">
                        <th className="p-1 border border-white w-12">MAX</th>
                        <th className="p-1 border border-white w-12">OBT</th>
                        <th className="p-1 border border-white w-12">MAX</th>
                        <th className="p-1 border border-white w-12">OBT</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#1e3a8a] font-bold">
                      {subjects.map((sub, index) => {
                        const marks = getMarksInfo(sub);
                        const rowObt = marks.hObt + marks.aObt;
                        const rowMax = marks.hMax + marks.aMax;
                        return (
                          <tr key={index} className="text-center h-8">
                            <td className="border border-blue-900">{index + 1}</td>
                            <td className="border border-blue-900 text-left px-2 uppercase bg-slate-50">{sub}</td>
                            <td className="border border-blue-900 text-gray-400">{marks.hMax}</td>
                            <td className="border border-blue-900 text-black">{marks.hObt}</td>
                            <td className="border border-blue-900 text-gray-400">{marks.aMax}</td>
                            <td className="border border-blue-900 text-black">{marks.aObt}</td>
                            <td className="border border-blue-900 bg-blue-50 text-blue-900">
                              {rowObt} <span className="text-[8px] text-gray-400">/ {rowMax}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Blank rows to maintain table size */}
                      {Array.from({ length: Math.max(0, TABLE_ROWS_COUNT - subjects.length) }).map((_, i) => (
                        <tr key={`blank-${i}`} className="h-8">
                          <td className="border border-blue-900"></td>
                          <td className="border border-blue-900"></td>
                          <td className="border border-blue-900"></td>
                          <td className="border border-blue-900"></td>
                          <td className="border border-blue-900"></td>
                          <td className="border border-blue-900"></td>
                          <td className="border border-blue-900 bg-blue-50/30"></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#1e3a8a] text-white font-black text-center">
                      <tr className="h-10">
                        <td colSpan="2" className="p-1 text-right uppercase px-2">Total Marks:</td>
                        <td className="p-1">{totalHMax}</td>
                        <td className="p-1 text-base">{totalHObt}</td>
                        <td className="p-1">{totalAMax}</td>
                        <td className="p-1 text-base">{totalAObt}</td>
                        <td className="p-1 bg-yellow-400 text-blue-900 text-lg">
                          {grandTotalObt} <span className="text-[10px]">/ {grandTotalMax}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Bottom Result Info */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="border-2 border-[#1e3a8a] p-2 text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Percentage</p>
                    <p className="text-xl font-black text-[#1e3a8a]">{percentage}%</p>
                  </div>
                  <div className="border-2 border-[#1e3a8a] p-2 text-center bg-blue-50">
                    <p className="text-[10px] text-gray-500 uppercase">Result</p>
                    <p className="text-xl font-black text-green-600 uppercase">
                      {percentage >= 33 ? "PASSED" : "FAILED"}
                    </p>
                  </div>
                  <div className="border-2 border-[#1e3a8a] p-2 text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Grade</p>
                    <p className="text-xl font-black text-[#1e3a8a]">
                      {percentage >= 75 ? "A" : percentage >= 60 ? "B" : percentage >= 45 ? "C" : "D"}
                    </p>
                  </div>
                </div>

                {/* Signatures Section */}
                <div className="flex justify-between items-end mt-10 px-4">
                  <div className="text-center">
                    <div className="w-32 border-t-2 border-[#1e3a8a] mb-1"></div>
                    <p className="text-[10px] font-bold text-[#1e3a8a] uppercase">Class Teacher</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border border-dashed border-gray-300 rounded-full flex items-center justify-center text-[7px] text-gray-300 mb-1">
                      SCHOOL SEAL
                    </div>
                    <p className="text-[8px] font-bold text-[#1e3a8a] uppercase">{schoolInfo.name}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-t-2 border-[#1e3a8a] mb-1"></div>
                    <p className="text-[10px] font-bold text-[#1e3a8a] uppercase">Principal</p>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-10 right-10 print:hidden flex gap-3">
        <button 
          onClick={() => window.location.reload()} 
          className="bg-white text-black font-bold px-6 py-3 rounded-full shadow-lg border-2 border-[#1e3a8a]"
        >
          Refresh
        </button>
        <button 
          onClick={handlePrint} 
          className="bg-[#1e3a8a] text-white font-black px-10 py-3 rounded-full shadow-2xl hover:scale-105 transition-all"
        >
          PRINT ALL MARKSHEETS
        </button>
      </div>
    </div>
  );
}