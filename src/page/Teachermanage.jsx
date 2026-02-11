import React, { useEffect, useState } from "react";
import {
  onSnapshot,
  doc,
  collection,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom"; // Navigation ke liye
import toast from "react-hot-toast";
import { AddTeacherPopup } from "../component/TeacherAdd";
import SalaryReceipt from "../component/SalaryReceipt";
import { Wallet, Users, Clock, Trash2, Printer, ChevronDown } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TeachersManagementPage() {
  const navigate = useNavigate(); // Hook initialize kiya
  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [teachers, setTeachers] = useState([]);
  const [holidays, setHolidays] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "teachers"), (snap) => {
      setTeachers(
        snap.docs.map((d) => ({
          id: d.id,
          attendance: d.data().attendance || {},
          salaryDetails: d.data().salaryDetails || {},
          ...d.data(),
        }))
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      const holidayDocRef = doc(db, "metadata", `teacher_holidays_${month}`);
      const docSnap = await getDoc(holidayDocRef);
      setHolidays(docSnap.exists() ? docSnap.data() : {});
    };
    fetchHolidays();
  }, [month]);

  const getDaysInMonth = (m) => {
    const year = new Date().getFullYear();
    const monthIdx = months.indexOf(m);
    return new Date(year, monthIdx + 1, 0).getDate();
  };

  const isSunday = (day, m) => {
    const year = new Date().getFullYear();
    const monthIdx = months.indexOf(m);
    return new Date(year, monthIdx, day).getDay() === 0;
  };

  const getCalculatedData = (teacher, currentMonth) => {
    const totalDaysInMonth = getDaysInMonth(currentMonth);
    const now = new Date();
    const today = now.getDate();
    const currentMonthIdx = now.getMonth();
    const selectedMonthIdx = months.indexOf(currentMonth);

    let absentCount = 0;
    let presentCount = 0;
    let leaveCount = 0;
    let holidayAndSundayCount = 0;

    for (let i = 1; i <= totalDaysInMonth; i++) {
      if (selectedMonthIdx === currentMonthIdx && i > today) break;

      const dateKey = `${currentMonth}_day_${i}`;
      const holidayKey = `day_${i}`;
      const status = teacher.attendance?.[dateKey];

      if (status === "A") absentCount++;
      else if (status === "P") presentCount++;
      else if (status === "L") leaveCount++;
      else if (isSunday(i, currentMonth) || holidays[holidayKey]) holidayAndSundayCount++;
    }

    const monthlySalary = Number(teacher.salary) || 0;
    const perDayRate = monthlySalary / totalDaysInMonth;
    const totalPaidDays = presentCount + leaveCount + holidayAndSundayCount;
    const finalPayable = Math.round(totalPaidDays * perDayRate);

    return { present: presentCount, totalPaidDays, finalPayable };
  };

  const handleSoftDelete = async (id) => {
    if (window.confirm("Bhai, kya aap is teacher ko list se hatana chahte hain?")) {
      try {
        await updateDoc(doc(db, "teachers", id), { isDeleted: true });
        toast.success("Teacher removed");
      } catch (err) {
        toast.error("Error!");
      }
    }
  };

  const activeTeachers = teachers.filter(t => !t.isDeleted);

  const stats = activeTeachers.reduce((acc, t) => {
    const data = getCalculatedData(t, month);
    const isPaid = Boolean(t.salaryDetails?.[month]?.paidAt);
    acc.totalPayout += data.finalPayable;
    if (isPaid) acc.paidCount++;
    else acc.pendingCount++;
    return acc;
  }, { totalPayout: 0, paidCount: 0, pendingCount: 0 });

  return (
    <div className="container mx-auto p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="text-indigo-600" size={32} /> Payroll Dashboard
          </h1>
          <p className="text-slate-500 font-medium">Manage teachers and generate bills.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="appearance-none bg-white border border-slate-200 pl-4 pr-10 py-3 rounded-2xl font-bold text-slate-700 shadow-sm outline-none focus:ring-2 ring-indigo-500 cursor-pointer"
            >
              {months.map((m) => <option key={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
          </div>
          <button onClick={() => { setEditTeacher(null); setShowAdd(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95">
            + Add New Teacher
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl"><Users size={24} /></div>
          <div><p className="text-slate-500 text-xs font-bold uppercase">Total Staff</p><h3 className="text-2xl font-black text-slate-800">{activeTeachers.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl"><Wallet size={24} /></div>
          <div><p className="text-slate-500 text-xs font-bold uppercase">Payout ({month})</p><h3 className="text-2xl font-black text-slate-800">₹{stats.totalPayout.toLocaleString()}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl"><Clock size={24} /></div>
          <div><p className="text-slate-500 text-xs font-bold uppercase">Pending</p><h3 className="text-2xl font-black text-slate-800">{stats.pendingCount}</h3></div>
        </div>
      </div>

      {/* TABLE */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">
            <tr>
              <th className="p-5">Teacher Info</th>
              <th className="p-5">Paid Days</th>
              <th className="p-5">Net Payable</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activeTeachers.map((t) => {
              const data = getCalculatedData(t, month);
              const isPaid = Boolean(t.salaryDetails?.[month]?.paidAt);
              return (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black border-2 border-white shadow-sm overflow-hidden">
                        {t.photoURL ? <img src={t.photoURL} className="w-full h-full object-cover" alt="t" /> : t.name?.[0]}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 leading-none mb-1">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{t.subject}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 font-bold text-slate-600">{data.totalPaidDays} Days</td>
                  <td className="p-5 font-black text-slate-900 text-lg">₹{data.finalPayable}</td>
                  <td className="p-5 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {isPaid ? "✔ Processed" : "● Unpaid"}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-3">
                      {!isPaid ? (
                        <button 
                          onClick={() => navigate(`/teacherbill/${t.id}`, { state: { month } })} 
                          className="bg-slate-900 text-white text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          Pay Now
                        </button>
                      ) : (
                        <button onClick={() => { setReceiptData({ teacher: t, month, salaryInfo: t.salaryDetails[month] }); setShowReceipt(true); }} className="bg-white border-2 border-slate-200 text-slate-700 text-[10px] font-bold px-5 py-2.5 rounded-xl flex items-center gap-2">
                          <Printer size={14}/> Receipt
                        </button>
                      )}
                      <button onClick={() => handleSoftDelete(t.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden space-y-4">
        {activeTeachers.map((t) => {
          const data = getCalculatedData(t, month);
          const isPaid = Boolean(t.salaryDetails?.[month]?.paidAt);
          return (
            <div key={t.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
               <div className="flex gap-4 items-center mb-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl overflow-hidden shadow-sm">
                  {t.photoURL ? <img src={t.photoURL} className="w-full h-full object-cover" alt="t" /> : t.name?.[0]}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-lg leading-tight">{t.name}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase">{t.subject}</div>
                </div>
              </div>
              <div className="flex gap-3">
                {!isPaid ? (
                  <button 
                    onClick={() => navigate(`/teacherbill/${t.id}`, { state: { month } })} 
                    className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg text-sm transition-all active:scale-95"
                  >
                    Pay Salary
                  </button>
                ) : (
                  <button onClick={() => { setReceiptData({ teacher: t, month, salaryInfo: t.salaryDetails[month] }); setShowReceipt(true); }} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2">
                    <Printer size={18}/> View Receipt
                  </button>
                )}
                <button onClick={() => handleSoftDelete(t.id)} className="bg-rose-50 text-rose-500 px-5 rounded-2xl"><Trash2 size={20}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddTeacherPopup close={() => setShowAdd(false)} editData={editTeacher} />}
      {showReceipt && receiptData && (
        <SalaryReceipt {...receiptData.teacher} teacherName={receiptData.teacher.name} month={receiptData.month} totalAmount={receiptData.salaryInfo.total} paidAmount={receiptData.salaryInfo.paid} paidAt={receiptData.salaryInfo.paidAt} receiptNo={`SAL-${receiptData.month}-${receiptData.teacher.id}`} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}