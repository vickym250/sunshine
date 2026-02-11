import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { 
  HiChevronLeft, 
  HiChevronRight, 
  HiCalendar, 
  HiUserGroup, 
  HiCheckCircle, 
  HiXCircle, 
  HiCurrencyRupee, 
  HiExclamationCircle 
} from "react-icons/hi";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedSession, setSelectedSession] = useState("2025-26");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const schoolClasses = ["PG", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
  const sessionsList = ["2024-25", "2025-26", "2026-27"];
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  const currentDay = selectedDate.getDate();
  const currentMonth = selectedDate.toLocaleString('en-US', { month: 'short' }); // "Jan", "Feb" format
  const displayDate = selectedDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Fetch Students
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => !s.deletedAt);
      setStudents(list);
    });
    return () => unsub();
  }, []);

  // 2. Optimized Filtering
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSession = s.session === selectedSession;
      const matchesClass = selectedClass === "All" ? true : s.className === selectedClass;
      return matchesSession && matchesClass;
    });
  }, [students, selectedClass, selectedSession]);

  // 3. Attendance Calculation
  const { presentCount, absentCount } = useMemo(() => {
    const dayKey = `day_${currentDay}`;
    let p = 0, a = 0;
    filteredStudents.forEach(s => {
      const status = s.attendance?.[selectedSession]?.[currentMonth]?.[dayKey]?.status;
      if (status === "P") p++;
      else if (status === "A") a++;
    });
    return { presentCount: p, absentCount: a };
  }, [filteredStudents, currentDay, currentMonth, selectedSession]);

  // 4. Fees Calculation (Current Session based)
  const { totalCollection, pendingFees } = useMemo(() => {
    let paid = 0;
    let balance = 0;

    filteredStudents.forEach(s => {
      // Current Balance directly student doc se uthayenge
      balance += Number(s.currentBalance || 0);
      
      // History ya logic se collections calculate kar sakte hain
      // Filhal aapke structure ke hisaab se totals calculate ho rahe hain
    });
    
    // Note: Accurate collection ke liye aap 'feesManage' collection ko bhi use kar sakte hain
    return { totalCollection: 0, pendingFees: balance }; 
  }, [filteredStudents]);

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-800 uppercase italic">
              School <span className="text-blue-600">Admin</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
               <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100 flex items-center gap-2">
                 <HiCalendar className="text-blue-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{displayDate}</span>
               </div>
               <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                 Session {selectedSession}
               </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white font-black text-[11px] uppercase outline-none shadow-sm"
            >
              {sessionsList.map(sess => <option key={sess} value={sess}>Session {sess}</option>)}
            </select>

            <div className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-1.5">
               <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600">
                 <HiChevronLeft size={24}/>
               </button>
               <input type="date" className="text-[11px] font-black uppercase p-2 outline-none bg-transparent cursor-pointer text-slate-700 w-32"
                 value={selectedDate.toISOString().split('T')[0]}
                 onChange={(e) => setSelectedDate(new Date(e.target.value))}
               />
               <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-blue-600">
                 <HiChevronRight size={24}/>
               </button>
            </div>

            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              className="px-6 py-4 rounded-2xl border-none bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest shadow-xl outline-none hover:bg-blue-600 transition-all"
            >
              <option value="All">All Classes</option>
              {schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
        </div>

        {/* --- STATS CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          <StatCard title="Enrolled" value={filteredStudents.length} icon={<HiUserGroup/>} color="from-blue-600 to-blue-800" />
          <StatCard title="Present" value={presentCount} icon={<HiCheckCircle/>} color="from-emerald-500 to-teal-600" />
          <StatCard title="Absent" value={absentCount} icon={<HiXCircle/>} color="from-rose-500 to-red-600" />
          <StatCard title="Pending Due" value={`₹${pendingFees}`} icon={<HiExclamationCircle/>} color="from-indigo-600 to-purple-800" />
          <StatCard title="Today's Date" value={currentDay} icon={<HiCalendar/>} color="from-slate-700 to-slate-900" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-fit">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] mb-8 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span> Quick Snapshot
            </h3>
            <div className="space-y-6">
              <SummaryRow label="Class Selection" value={selectedClass} />
              <SummaryRow label="Present Count" value={presentCount} badgeColor="bg-emerald-100 text-emerald-700" />
              <SummaryRow label="Absent Count" value={absentCount} badgeColor="bg-rose-100 text-rose-700" />
              <div className="pt-6 mt-6 border-t border-dashed border-slate-200">
                <SummaryRow label="Family Dues (Total)" value={`₹${pendingFees}`} valueColor="text-red-600" />
              </div>
            </div>
          </div>

          {/* Class-wise Grid */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] mb-8 flex items-center gap-2">
              <span className="w-2 h-6 bg-slate-900 rounded-full"></span> Class-wise Strength
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {schoolClasses.map(cls => {
                 const count = students.filter(s => s.className === cls && s.session === selectedSession).length;
                 return (
                  <div key={cls} className="bg-slate-50 p-5 rounded-[2rem] text-center border border-transparent hover:border-blue-200 hover:bg-white transition-all group">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1 group-hover:text-blue-600">{cls}</p>
                     <p className="text-2xl font-black text-slate-800 tracking-tighter">{count}</p>
                  </div>
                 );
               })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
const StatCard = ({ title, value, icon, color }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br ${color} p-6 rounded-[2.5rem] text-white shadow-xl`}>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
        <span className="text-2xl opacity-40">{icon}</span>
      </div>
      <p className="text-2xl md:text-3xl font-black mt-6 tracking-tighter">{value}</p>
    </div>
    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
  </div>
);

const SummaryRow = ({ label, value, badgeColor, valueColor = "text-slate-800" }) => (
  <div className="flex justify-between items-center">
    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    {badgeColor ? (
      <span className={`${badgeColor} px-3 py-1 rounded-lg text-[11px] font-black`}>{value}</span>
    ) : (
      <span className={`${valueColor} font-black text-sm tracking-tighter`}>{value}</span>
    )}
  </div>
);