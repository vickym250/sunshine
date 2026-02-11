import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { IndianRupee, Loader2, Printer, Plus, User, Info } from 'lucide-react';
import SalaryReceipt from '../component/SalaryReceipt';

const TeacherBilling = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [teacherData, setTeacherData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("Jan");
  const [amountPaid, setAmountPaid] = useState("");
  const [extraAdjustments, setExtraAdjustments] = useState([]);
  const [applyLeaveCut, setApplyLeaveCut] = useState(false);

  // --- States for Receipt ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const monthsList = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  // 1. Fetch Teacher Data
  useEffect(() => {
    const fetchTeacher = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, "teachers", id));
        if (docSnap.exists()) setTeacherData(docSnap.data());
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchTeacher();
  }, [id]);

  // 2. Check if Month is Already Paid
  const isAlreadyPaid = useMemo(() => {
    return teacherData?.salaryDetails?.[selectedMonth] ? true : false;
  }, [teacherData, selectedMonth]);

  // 3. Auto-load Data for Paid Months
  useEffect(() => {
    if (isAlreadyPaid) {
      setAmountPaid(teacherData.salaryDetails[selectedMonth].paid);
    } else {
      setAmountPaid("");
      setExtraAdjustments([]); 
    }
  }, [isAlreadyPaid, selectedMonth, teacherData]);

  // 4. Stats Calculation
  const stats = useMemo(() => {
    const currentYear = 2026;
    const monthMap = { 
        "Jan": "January", "Feb": "February", "Mar": "March", "Apr": "April", 
        "May": "May", "Jun": "June", "Jul": "July", "Aug": "August", 
        "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December" 
    };
    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonthName = monthMap[selectedMonth];
    const monthIndex = allMonths.indexOf(selectedMonth); 
    const year = ["Jan", "Feb", "Mar"].includes(selectedMonth) ? currentYear : currentYear - 1;
    
    // Attendance count logic
    const attendanceEntries = Object.keys(teacherData?.attendance || {}).filter(key => key.includes(fullMonthName));
    const p = attendanceEntries.filter(k => teacherData.attendance[k] === "P").length;
    const a = attendanceEntries.filter(k => teacherData.attendance[k] === "A").length;
    const l = attendanceEntries.filter(k => teacherData.attendance[k] === "L").length;
    
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let sundays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (new Date(year, monthIndex, i).getDay() === 0) sundays++;
    }

    return { present: p, absent: a, leave: l, sundays, total: daysInMonth, fullName: fullMonthName, year };
  }, [teacherData, selectedMonth]);

  // 5. Salary Calculations (Deduction Logic Improved)
  const salaryCalc = useMemo(() => {
    if (!teacherData) return { base: 0, net: 0, due: 0, cut: 0 };
    
    const base = Number(teacherData.salary || 0);

    if (isAlreadyPaid) {
        const record = teacherData.salaryDetails[selectedMonth];
        return { base, net: record.totalPayable, due: record.due, cut: record.cutAmount || 0 }; 
    }

    // Calculation per day salary based on total days in that month
    const perDaySalary = base / stats.total; 
    
    // Yahan Absent aur Leave dono ko count kiya hai deduction ke liye
    const totalDeductibleDays = stats.absent + stats.leave;
    
    // Cut amount calculate hoga agar button ON hai
    const cutAmount = applyLeaveCut ? Math.round(totalDeductibleDays * perDaySalary) : 0;
    
    // Other adjustments (Fines etc)
    const adjustments = extraAdjustments.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Final Calculation
    const netPayable = Math.round(base - cutAmount + adjustments);
    const currentDue = netPayable - Number(amountPaid || 0);

    return { base, net: netPayable, due: currentDue, cut: cutAmount };
  }, [teacherData, applyLeaveCut, stats, extraAdjustments, amountPaid, isAlreadyPaid, selectedMonth]);

  const triggerReceipt = (paidAmt, payable, date) => {
    setReceiptData({
      teacher: { id, name: teacherData.name, ...teacherData },
      month: `${stats.fullName} ${stats.year}`,
      salaryInfo: {
        total: payable,
        paid: paidAmt,
        paidAt: date || new Date().toISOString()
      }
    });
    setShowReceipt(true);
  };

  const handleSave = async () => {
    if (isAlreadyPaid) return alert("Bhai, ye mahina pehle hi paid hai!");
    if (!amountPaid || amountPaid < 0) return alert("Paisa likho!");
    
    setIsProcessing(true);
    try {
      const payDate = new Date().toISOString();
      
      const paymentData = {
        teacherId: id,
        teacherName: teacherData.name,
        month: selectedMonth,
        year: stats.year,
        baseSalary: Number(teacherData.salary),
        attendance: {
          present: stats.present,
          absent: stats.absent,
          leave: stats.leave,
          totalDays: stats.total
        },
        breakdown: {
          leaveDeduction: salaryCalc.cut,
          extraAdjustments: extraAdjustments,
          netPayable: salaryCalc.net
        },
        amountPaid: Number(amountPaid),
        dueRemaining: salaryCalc.due,
        paidAt: payDate,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "salary_slips"), paymentData);

      const updatedSalaryDetails = { ...(teacherData.salaryDetails || {}) };
      updatedSalaryDetails[selectedMonth] = {
        paid: Number(amountPaid),
        totalPayable: salaryCalc.net,
        due: salaryCalc.due,
        absents: stats.absent + stats.leave,
        cutAmount: salaryCalc.cut,
        paidAt: payDate,
      };

      await updateDoc(doc(db, "teachers", id), {
        salaryDetails: updatedSalaryDetails,
        pendingDue: salaryCalc.due,
        paymentHistory: arrayUnion(`${selectedMonth}-${stats.year}`) 
      });

      alert("Billing Saved Successfully!");
      triggerReceipt(Number(amountPaid), salaryCalc.net, payDate);
      
    } catch (e) { 
      console.error(e); 
      alert("Error saving record.");
    }
    setIsProcessing(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FD] p-4 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Profile Card */}
        <div className="bg-[#1A1A40] text-white p-6 rounded-3xl flex justify-between items-center shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-4 z-10">
            <div className="bg-indigo-500 p-3 rounded-2xl shadow-inner"><User size={24}/></div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight">{teacherData?.name}</h1>
              <p className="text-xs opacity-60">ID: {id} | Base Salary: ₹{teacherData?.salary}</p>
            </div>
          </div>
          <div className="text-right z-10">
             {isAlreadyPaid && (
                <span className="bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest mr-2">PAID</span>
             )}
             <p className="text-[10px] uppercase opacity-50 font-black tracking-widest inline-block">Selected Period</p>
             <p className="text-lg font-bold text-yellow-400">{stats.fullName} {stats.year}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* Month Selector */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Select Month</h3>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-8">
                {monthsList.map(m => {
                  const paidInMonth = teacherData?.salaryDetails?.[m];
                  return (
                    <button key={m} onClick={() => setSelectedMonth(m)} className={`py-3 rounded-2xl text-xs font-bold transition-all border relative ${selectedMonth === m ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-slate-500 border-slate-100 hover:border-indigo-200"}`}>
                        {m}
                        {paidInMonth && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
                    </button>
                  );
                })}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                 <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
                    <p className="text-2xl font-black text-emerald-600">{stats.present}</p>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Present</p>
                 </div>
                 <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100">
                    <p className="text-2xl font-black text-rose-600">{stats.absent}</p>
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">Absent</p>
                 </div>
                 <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100">
                    <p className="text-2xl font-black text-amber-600">{stats.leave}</p>
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">Leave</p>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                    <p className="text-2xl font-black text-blue-600">{stats.sundays}</p>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Sundays</p>
                 </div>
              </div>

              {!isAlreadyPaid && (
                  <button 
                    onClick={() => setApplyLeaveCut(!applyLeaveCut)} 
                    className={`w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase transition-all border-2 flex items-center justify-center gap-2 ${applyLeaveCut ? "bg-rose-600 text-white border-rose-600 shadow-md" : "bg-slate-50 text-slate-400 border-slate-100 hover:border-rose-200"}`}
                  >
                    {applyLeaveCut ? `Deduction Applied: -₹${salaryCalc.cut}` : "Click to Apply Absent/Leave Deduction"}
                  </button>
              )}
            </div>

            {/* Extra Fines */}
            {!isAlreadyPaid && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Extra Fines / Fees Cut</h3>
                <div className="flex gap-2">
                    <input id="adj_name" placeholder="Reason (e.g. Fine)" className="flex-1 bg-slate-50 p-4 rounded-xl text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" />
                    <input id="adj_amt" type="number" placeholder="₹ Amount" className="w-28 bg-slate-50 p-4 rounded-xl text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-indigo-500" />
                    <button onClick={() => {
                        const n = document.getElementById('adj_name').value;
                        const a = document.getElementById('adj_amt').value;
                        if(n && a) {
                        setExtraAdjustments([...extraAdjustments, {name: n, amount: -Math.abs(Number(a))}]);
                        document.getElementById('adj_name').value = ''; document.getElementById('adj_amt').value = '';
                        }
                    }} className="bg-indigo-600 text-white px-6 rounded-xl font-bold shadow-lg active:scale-90"><Plus size={20}/></button>
                </div>
                <div className="mt-4 space-y-2">
                    {extraAdjustments.map((x, i) => (
                        <div key={i} className="flex justify-between bg-rose-50 p-3 rounded-xl border border-rose-100 text-[11px] font-black text-rose-600 uppercase">
                        <span>{x.name}</span>
                        <span>- ₹{Math.abs(x.amount)}</span>
                        </div>
                    ))}
                </div>
                </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#1A1A40] text-white p-8 rounded-[2.5rem] text-center shadow-xl border-4 border-white">
               <p className="text-[10px] opacity-40 uppercase font-black mb-1">Net Payable Amount</p>
               <h2 className="text-5xl font-black text-yellow-400 tracking-tighter">₹{salaryCalc.net}</h2>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash Paid Now</p>
               <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                  <input type="number" value={amountPaid} disabled={isAlreadyPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" className={`w-full p-5 pl-12 rounded-2xl text-2xl font-black outline-none transition-all border-none ${isAlreadyPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 focus:ring-2 focus:ring-indigo-600'}`} />
               </div>
               <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center border border-emerald-100">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Remaining Due</span>
                  <span className="text-xl font-black text-emerald-700">₹{salaryCalc.due}</span>
               </div>
            </div>

            <button 
              onClick={() => isAlreadyPaid ? triggerReceipt(amountPaid, salaryCalc.net, teacherData.salaryDetails[selectedMonth].paidAt) : handleSave()} 
              disabled={isProcessing} 
              className={`w-full py-6 rounded-3xl font-black uppercase text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all ${isAlreadyPaid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
            >
                {isProcessing ? <Loader2 className="animate-spin"/> : isAlreadyPaid ? <><Printer size={18}/> View / Print Slip</> : <><Printer size={18}/> Confirm & Save Billing</>}
            </button>
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                    {applyLeaveCut 
                      ? `Absent(${stats.absent}) + Leave(${stats.leave}) ki deduction total ₹${salaryCalc.cut} ho rahi hai.` 
                      : "Deduction apply karne ke liye 'Apply Salary Deduction' button dabayein."}
                </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- SALARY RECEIPT MODAL --- */}
      {showReceipt && receiptData && (
  <SalaryReceipt 
    {...receiptData.teacher} 
    teacherName={receiptData.teacher.name} 
    month={receiptData.month} 
    totalAmount={receiptData.teacher.salary} // Base Salary
    paidAmount={receiptData.salaryInfo.paid} // Net Amount
    
    // YEH DO LINES IMPORTANT HAIN:
    absents={stats.absent + stats.leave}     // Total Chuttiyan
    cutAmount={salaryCalc.cut}               // Kitna paisa kata
    totalDays={stats.total}                  // Mahine ke total din
    
    paidAt={receiptData.salaryInfo.paidAt} 
    receiptNo={`SAL-${selectedMonth}-${id.slice(-4)}`} 
    onClose={() => {
      setShowReceipt(false);
      if (!isAlreadyPaid) navigate(-1); 
    }} 
  />
)}
    </div>
  );
};

export default TeacherBilling;