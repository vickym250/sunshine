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
  
  // Dynamic School State (Firebase se aayega)
  const [school, setSchool] = useState({
    name: "Loading...",
    address: "",
    phone: "",
    website: "",
    logoUrl: ""
  });

  const TABLE_ROWS_COUNT = 10;

  const normalize = (str = "") => str.toLowerCase().replace(/[^a-z]/g, "");

  const getRow = (exam, subject) =>
    exam?.rows?.find(
      (r) =>
        normalize(r.subject).includes(normalize(subject)) ||
        normalize(subject).includes(normalize(r.subject))
    ) || { total: 0, marks: 0 };

  // --- FETCH SCHOOL INFO & SUBJECT MAPPING ---
  const fetchConfig = async (className) => {
    try {
      const docRef = doc(db, "school_config", "master_data");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // School Info dynamic set ho rahi hai
        if (data.schoolInfo) {
          setSchool(data.schoolInfo);
        }
        // Subjects mapping
        const mapping = data.mapping || {};
        setSubjects(mapping[className] || []);
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (studentId?.toLowerCase().startsWith("class")) {
        const className = studentId.toLowerCase().replace("class", "Class ");
        await fetchConfig(className); // Fetch school & subjects

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
        // Single Student Case
        const stuRef = doc(db, "students", studentId);
        const stuSnap = await getDoc(stuRef);

        if (stuSnap.exists()) {
          const stu = stuSnap.data();
          await fetchConfig(stu.className);

          const qr = query(
            collection(db, "examResults"),
            where("studentId", "==", studentId),
            where("session", "==", session)
          );
          const rs = await getDocs(qr);
          const results = rs.docs.map((d) => d.data());

          const h = results.find((r) => r.exam === "Half-Yearly");
          const a = results.find((r) => r.exam === "Annual");
          setClassResults([{ student: { id: studentId, ...stu }, half: h, annual: a }]);
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
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${school.name} - Report Card</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { font-family: 'Segoe UI', sans-serif; -webkit-print-color-adjust: exact; }
            .main-border { border: 4px double #1e3a8a; }
            table td, table th { border: 1px solid #1e3a8a !important; padding: 5px !important; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="p-2">${content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="p-20 text-center font-bold animate-pulse text-blue-900">Loading Report Cards...</div>;

  return (
    <div className="bg-slate-600 min-h-screen p-5 print:bg-white print:p-0">
      <div id="marksheet-content" className="flex flex-col items-center">
        {classResults.map((item) => {
          const { student, half, annual } = item;
          const getMarks = (sub) => {
            const h = getRow(half, sub);
            const a = getRow(annual, sub);
            return { hM: Number(h.total)||0, hO: Number(h.marks)||0, aM: Number(a.total)||0, aO: Number(a.marks)||0 };
          };

          const tHM = subjects.reduce((acc, s) => acc + getMarks(s).hM, 0);
          const tHO = subjects.reduce((acc, s) => acc + getMarks(s).hO, 0);
          const tAM = subjects.reduce((acc, s) => acc + getMarks(s).aM, 0);
          const tAO = subjects.reduce((acc, s) => acc + getMarks(s).aO, 0);
          const gTotalO = tHO + tAO;
          const gTotalM = tHM + tAM;
          const perc = gTotalM ? ((gTotalO / gTotalM) * 100).toFixed(2) : 0;

          return (
            <div key={student.id} className="page-break bg-white w-[210mm] h-[297mm] p-[10mm] mb-10 shadow-2xl box-border">
              <div className="main-border h-full w-full p-6 flex flex-col">
                
                {/* Dynamic Header */}
                <div className="flex items-center border-b-2 border-blue-900 pb-4 mb-4">
                  <img src={school.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                  <div className="flex-grow text-center">
                    <h1 className="text-2xl font-black text-blue-900 uppercase">{school.name}</h1>
                    <p className="text-[10px] text-gray-600 font-bold px-4">{school.address}</p>
                    <p className="text-[11px] text-blue-800 font-bold">Mo: {school.phone} | {school.website}</p>
                    <span className="bg-blue-900 text-white px-4 py-1 rounded-full text-[10px] mt-2 inline-block">SESSION: {session}</span>
                  </div>
                </div>

                {/* Student Details */}
                <div className="flex justify-between mb-4 text-blue-900">
                  <div className="flex-grow space-y-1 text-sm font-bold">
                    <p className="border-b border-blue-100 pb-1">NAME: <span className="text-black uppercase ml-2">{student.name}</span></p>
                    <p className="border-b border-blue-100 pb-1">ROLL NO: <span className="text-black ml-2">{student.rollNumber || "---"}</span></p>
                    <p className="border-b border-blue-100 pb-1">CLASS: <span className="text-black uppercase ml-2">{student.className}</span></p>
                    <p className="border-b border-blue-100 pb-1">FATHER'S NAME: <span className="text-black uppercase ml-2">{student.fatherName || "---"}</span></p>
                  </div>
                  <div className="w-28 h-32 border-2 border-blue-900 ml-4 overflow-hidden shadow-md">
                    <img src={student.photoURL || student.photo || "https://via.placeholder.com/150"} alt="Student" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Table */}
                <div className="flex-grow">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th rowSpan="2">S.N</th>
                        <th rowSpan="2" className="text-left">SUBJECTS</th>
                        <th colSpan="2">HALF YEARLY</th>
                        <th colSpan="2">ANNUAL</th>
                        <th rowSpan="2" className="bg-blue-950">GRAND TOTAL</th>
                      </tr>
                      <tr className="bg-blue-800 text-[10px]">
                        <th>MAX</th><th>OBT</th><th>MAX</th><th>OBT</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-blue-900">
                      {subjects.map((sub, i) => {
                        const m = getMarks(sub);
                        return (
                          <tr key={i} className="text-center h-8">
                            <td>{i+1}</td>
                            <td className="text-left uppercase px-2">{sub}</td>
                            <td className="text-gray-400">{m.hM}</td>
                            <td className="text-black">{m.hO}</td>
                            <td className="text-gray-400">{m.aM}</td>
                            <td className="text-black">{m.aO}</td>
                            <td className="bg-blue-50 text-black">
                              {m.hO + m.aO} <span className="text-[9px] text-gray-400">/ {m.hM + m.aM}</span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Blank rows to maintain A4 height */}
                      {Array.from({ length: Math.max(0, TABLE_ROWS_COUNT - subjects.length) }).map((_, i) => (
                        <tr key={i} className="h-8"><td></td><td></td><td></td><td></td><td></td><td></td><td className="bg-blue-50/30"></td></tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-900 text-white font-black">
                      <tr className="text-center">
                        <td colSpan="2" className="text-right px-4">TOTAL MARKS:</td>
                        <td>{tHM}</td><td className="text-sm">{tHO}</td>
                        <td>{tAM}</td><td className="text-sm">{tAO}</td>
                        <td className="bg-yellow-400 text-blue-900 text-lg">{gTotalO} <span className="text-xs">/ {gTotalM}</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="border-2 border-blue-900 p-2 text-center rounded">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Percentage</p>
                    <p className="text-xl font-black">{perc}%</p>
                  </div>
                  <div className="border-2 border-blue-900 p-2 text-center rounded bg-blue-50">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Result</p>
                    <p className={`text-xl font-black ${perc >= 33 ? 'text-green-600' : 'text-red-600'}`}>{perc >= 33 ? 'PASSED' : 'FAILED'}</p>
                  </div>
                  <div className="border-2 border-blue-900 p-2 text-center rounded">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Grade</p>
                    <p className="text-xl font-black">{perc >= 75 ? 'A+' : perc >= 60 ? 'A' : perc >= 45 ? 'B' : 'C'}</p>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="flex justify-between items-end mt-12 mb-4 px-4">
                  <div className="text-center"><div className="w-32 border-t-2 border-blue-900 mb-1"></div><p className="text-[10px] font-bold">CLASS TEACHER</p></div>
                  <div className="text-center"><div className="w-20 h-20 border border-dashed border-gray-300 rounded-full flex items-center justify-center text-[8px] text-gray-400">SEAL</div></div>
                  <div className="text-center"><div className="w-32 border-t-2 border-blue-900 mb-1"></div><p className="text-[10px] font-bold">PRINCIPAL</p></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-10 right-10 print:hidden flex gap-3">
        <button onClick={() => window.location.reload()} className="bg-white text-blue-900 font-bold px-6 py-3 rounded-full shadow-lg border-2 border-blue-900 hover:bg-blue-50 transition-all">Refresh</button>
        <button onClick={handlePrint} className="bg-blue-900 text-white font-black px-10 py-3 rounded-full shadow-2xl hover:scale-105 transition-all">PRINT REPORT CARDS</button>
      </div>
    </div>
  );
}