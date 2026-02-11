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
  const { studentId } = useParams();

  const [half, setHalf] = useState(null);
  const [annual, setAnnual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rollNo, setRollNo] = useState("—");

  const [mode, setMode] = useState("single"); // single | class
  const [classResults, setClassResults] = useState([]);

  /* ===========================
     Subject Normalizer
     =========================== */
  const normalize = (str = "") =>
    str.toLowerCase().replace(/[^a-z]/g, "");

  /* ===========================
     Subjects
     =========================== */
  const subjects = [
    "Hindi I",
    "English I",
    "Maths",
    "Science",
    "Social Study",
    "Sanskrit",
    "Art",
    "Computer",
    "G.K.",
  ];

  const getRow = (exam, subject) =>
    exam?.rows.find(
      (r) =>
        normalize(r.subject).includes(normalize(subject)) ||
        normalize(subject).includes(normalize(r.subject))
    ) || { total: 0, marks: 0 };

  /* ===========================
     Fetch Student Info
     =========================== */
  const fetchStudentInfo = async (sid) => {
    const ref = doc(db, "students", sid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    return null;
  };

  /* ===========================
     Load Single Student (OLD LOGIC)
     =========================== */
  const loadSingleStudent = async () => {
    setLoading(true);

    const q = query(
      collection(db, "examResults"),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data());

    setHalf(results.find((r) => r.exam === "Half-Yearly") || null);
    setAnnual(results.find((r) => r.exam === "Annual") || null);

    const stu = await fetchStudentInfo(studentId);
    if (stu) setRollNo(stu.rollNumber);

    setLoading(false);
  };

  /* ===========================
     Load Class Students (NEW)
     =========================== */
  const loadClassResults = async (cls) => {
    setLoading(true);

    const className = cls.replace("class", "Class ");

    const qs = query(
      collection(db, "students"),
      where("className", "==", className)
    );
    const stuSnap = await getDocs(qs);

    const students = stuSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const all = [];

    for (const stu of students) {
      const qr = query(
        collection(db, "examResults"),
        where("studentId", "==", stu.id)
      );
      const rs = await getDocs(qr);
      const results = rs.docs.map((d) => d.data());

      const h = results.find((r) => r.exam === "Half-Yearly");
      const a = results.find((r) => r.exam === "Annual");

      if (h && a) {
        all.push({
          student: stu,
          half: h,
          annual: a,
        });
      }
    }

    setClassResults(all);
    setLoading(false);
  };

  /* ===========================
     Mode Detect
     =========================== */
  useEffect(() => {
    if (studentId?.toLowerCase().startsWith("class")) {
      setMode("class");
      loadClassResults(studentId.toLowerCase());
    } else {
      setMode("single");
      loadSingleStudent();
    }
  }, [studentId]);

  if (loading) {
    return <div className="p-20 text-center">Loading marksheet…</div>;
  }

  /* ===========================
     MARKSHEET LAYOUT (UNCHANGED)
     =========================== */
  const MarksheetLayout = ({ half, annual, rollNo }) => {
    const totalHalfMax = subjects.reduce(
      (s, sub) => s + Number(getRow(half, sub).total || 0),
      0
    );
    const totalHalfObt = subjects.reduce(
      (s, sub) => s + Number(getRow(half, sub).marks || 0),
      0
    );

    const totalAnnualMax = subjects.reduce(
      (s, sub) => s + Number(getRow(annual, sub).total || 0),
      0
    );
    const totalAnnualObt = subjects.reduce(
      (s, sub) => s + Number(getRow(annual, sub).marks || 0),
      0
    );

    const grandMax = totalHalfMax + totalAnnualMax;
    const grandObt = totalHalfObt + totalAnnualObt;

    const percentage = grandMax
      ? ((grandObt / grandMax) * 100).toFixed(2)
      : "0.00";

    const finalResult = percentage >= 33 ? "PASS" : "FAIL";

    const division =
      percentage >= 60 ? "1st" : percentage >= 45 ? "2nd" : percentage >= 33 ? "3rd" : "-";

   return (
  <div
    id="print-area"
    className="bg-white w-[297mm] h-[210mm] border-2 border-gray-700 p-10 text-[13px] flex flex-col justify-between mx-auto box-sizing-border"
  >
    {/* Top Section: Header + Student Info + Table */}
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="text-center font-bold text-xl border-b-2 border-black pb-3 mb-4">
        KRISHNA PUBLIC SCHOOL Mannijot Siddhaartnagar
        <span className="text-sm font-normal underline ml-6">
          Session: {annual.session}
        </span>
      </div>

      {/* STUDENT INFO */}
      <div className="grid grid-cols-4 text-sm mb-6 font-semibold uppercase bg-gray-50 p-2 border border-black">
        <div>Name : <b className="text-blue-900">{annual.name}</b></div>
        <div>Class : <b>{annual.className}</b></div>
        <div>Section : <b>A</b></div>
        <div>Roll : <b>{rollNo}</b></div>
      </div>

      {/* TABLE SECTION - 'flex-grow' taaki table niche tak faile */}
      <div className="flex-grow">
        <table className="w-full border-collapse border-2 border-black">
          <thead className="bg-gray-100 text-[11px]">
            <tr className="h-12">
              <th rowSpan="2" className="border border-black px-2">S.N.</th>
              <th rowSpan="2" className="border border-black text-sm">Subject</th>
              <th colSpan="3" className="border border-black uppercase text-[10px]">Half Yearly</th>
              <th colSpan="3" className="border border-black uppercase text-[10px]">Annual</th>
              <th colSpan="2" className="border border-black bg-gray-200">Grand Total</th>
              <th rowSpan="2" className="border border-black">Result</th>
            </tr>
            <tr className="h-8 text-[10px]">
              <th className="border border-black">Max</th>
              <th className="border border-black">Min</th>
              <th className="border border-black">Obt</th>
              <th className="border border-black">Max</th>
              <th className="border border-black">Min</th>
              <th className="border border-black">Obt</th>
              <th className="border border-black">Max</th>
              <th className="border border-black bg-yellow-50">Obt</th>
            </tr>
          </thead>

          <tbody>
            {subjects.map((sub, i) => {
              const h = getRow(half, sub);
              const a = getRow(annual, sub);
              const gMax = Number(h.total) + Number(a.total);
              const gObt = Number(h.marks) + Number(a.marks);

              return (
                <tr key={i} className="text-center h-10 border-b border-black hover:bg-gray-50">
                  <td className="border border-black">{i + 1}</td>
                  <td className="border border-black text-left px-4 font-bold text-[14px]">{sub}</td>
                  <td className="border border-black">{h.total}</td>
                  <td className="border border-black text-gray-400">{Math.ceil(h.total * 0.33)}</td>
                  <td className="border border-black font-bold">{h.marks}</td>
                  <td className="border border-black">{a.total}</td>
                  <td className="border border-black text-gray-400">{Math.ceil(a.total * 0.33)}</td>
                  <td className="border border-black font-bold">{a.marks}</td>
                  <td className="border border-black">{gMax}</td>
                  <td className="border border-black font-black bg-gray-50 text-[15px]">{gObt}</td>
                  <td className="border border-black font-bold text-[11px]">
                    {gObt >= gMax * 0.33 ? "PASS" : "FAIL"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* FOOTER SECTION - Ye ab hamesha page ke ekdum niche rahega */}
    <div className="grid grid-cols-2 gap-10 border-t-2 border-black mb-10 pt-6 mt-4">
      <div className="grid grid-cols-2 gap-y-4 font-bold text-xs uppercase">
        <div className="flex flex-col">
          <span className="mb-8">Attendance : ___________</span>
          <span>Checked by : ___________</span>
        </div>
        <div className="flex flex-col">
          <span className="mb-8">Class Teacher : ___________</span>
          <span>Principal : ___________</span>
        </div>
      </div>
      
      <div className="border-2 border-black p-4 bg-gray-50 flex flex-col justify-center space-y-1">
        <div className="flex justify-between text-sm">Result Status : <b className="text-lg">{finalResult}</b></div>
        <div className="flex justify-between text-sm">Aggregate Percentage : <b className="text-lg">{percentage}%</b></div>
        <div className="flex justify-between text-sm">Final Division : <b className="text-lg">{division}</b></div>
      </div>
    </div>
  </div>
);
  };

  return (
    <div className="bg-gray-300 min-h-screen p-10">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; marginbottom:10; }
          .page-break { page-break-after: always; }
          .print-hidden { display: none !important; }
        }
      `}</style>

      {mode === "single" && (
        <MarksheetLayout half={half} annual={annual} rollNo={rollNo} />
      )}

      {mode === "class" &&
        classResults.map((item) => (
          <div key={item.student.id} className="page-break">
            <MarksheetLayout
              half={item.half}
              annual={item.annual}
              rollNo={item.student.rollNumber}
            />
          </div>
        ))}

      <div className="fixed bottom-6 right-6 print-hidden">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Print
        </button>
      </div>
    </div>
  );
}
