import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, query, where, arrayUnion } from 'firebase/firestore';
import { IndianRupee, User, X, Loader2, Printer, PlusCircle, Trash2, Users, CreditCard, Banknote, Phone, Tag, History } from 'lucide-react';
import FeesReceipt from '../component/Fess';

const StudentBilling = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]); 
  const [studentBaseData, setStudentBaseData] = useState(null); 
  const [feeRatesMap, setFeeRatesMap] = useState({}); 
  const [feeSchedules, setFeeSchedules] = useState([]); 
  const [totalPaidInPast, setTotalPaidInPast] = useState(0); 
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [selectedMonths, setSelectedMonths] = useState({}); 
  const [uncheckedItems, setUncheckedItems] = useState({}); 
  const [extraCharges, setExtraCharges] = useState([]);
  const [amountReceived, setAmountReceived] = useState("");
  const [discount, setDiscount] = useState(""); 
  const [paymentMode, setPaymentMode] = useState("Cash");

  const monthsList = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const studentDoc = await getDoc(doc(db, "students", id));
      if (!studentDoc.exists()) return alert("Student not found!");
      const sData = studentDoc.data();
      setStudentBaseData(sData); 

      const q = query(collection(db, "students"), where("parentId", "==", sData.parentId));
      const familySnap = await getDocs(q);
      const members = familySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFamilyMembers(members);

      let pastPaymentsSum = 0;
      for (const member of members) {
        const feeManageDoc = await getDoc(doc(db, "feesManage", member.id));
        if (feeManageDoc.exists()) {
          const history = feeManageDoc.data().history || [];
          history.forEach(entry => {
            pastPaymentsSum += Number(entry.received || 0);
          });
        }
      }
      setTotalPaidInPast(pastPaymentsSum);

      const uniqueClasses = [...new Set(members.map(m => m.className))];
      const ratesCollector = {};
      for (const className of uniqueClasses) {
        const planDoc = await getDoc(doc(db, "fee_plans", className));
        if (planDoc.exists()) ratesCollector[className] = planDoc.data();
      }
      setFeeRatesMap(ratesCollector);

      const masterSnap = await getDocs(collection(db, "fee_master"));
      setFeeSchedules(masterSnap.docs.map(d => d.data()));
    } catch (e) { console.error("Fetch Error:", e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    window.location.reload(); 
  };

  const handleViewOldReceipt = async (studentId, monthName) => {
    setLoading(true);
    try {
      const feeDoc = await getDoc(doc(db, "feesManage", studentId));
      if (feeDoc.exists()) {
        const data = feeDoc.data();
        const foundEntry = data.history?.find(h => h.months.includes(monthName));
        if (foundEntry) {
          setReceiptData({
            ...foundEntry,
            studentId: studentId,
            payMonth: foundEntry.months.join(", "),
            studentWiseBreakdown: [{
                studentName: data.studentName,
                className: data.className,
                items: foundEntry.allCharges
            }]
          });
          setShowReceipt(true);
        } else {
          alert("Receipt history mein nahi mili!");
        }
      }
    } catch (e) { console.error("Error:", e); }
    setLoading(false);
  };

  const addExtraCharge = (name, amount) => {
    if (!name || !amount) return alert("Details bharein!");
    setExtraCharges([...extraCharges, { id: Date.now(), name, total: Number(amount), count: 1 }]);
  };

  const toggleMonth = (studentId, month) => {
    setSelectedMonths(prev => {
      const current = prev[studentId] || [];
      return { ...prev, [studentId]: current.includes(month) ? current.filter(m => m !== month) : [...current, month] };
    });
  };

  const toggleTableItem = (studentId, feeKey) => {
    setUncheckedItems(prev => {
      const current = prev[studentId] || [];
      return { ...prev, [studentId]: current.includes(feeKey) ? current.filter(i => i !== feeKey) : [...current, feeKey] };
    });
  };

  const billDetails = useMemo(() => {
    let totalOldBalance = 0;
    let allItems = [];
    let studentWiseBreakdown = [];

    familyMembers.forEach(student => {
      totalOldBalance += Number(student.currentBalance || 0);
      const studentSelected = selectedMonths[student.id] || [];
      const studentUnchecked = uncheckedItems[student.id] || [];
      const rates = feeRatesMap[student.className] || {};
      
      let studentItems = [];

      Object.keys(rates).forEach(feeKey => {
        const rate = Number(rates[feeKey]);
        const schedule = feeSchedules.find(s => s.name.toLowerCase().trim() === feeKey.toLowerCase().trim());
        const count = studentSelected.filter(m => !schedule || !schedule.months || schedule.months.length === 0 || schedule.months.includes(m)).length;
        
        if (rate > 0 && count > 0) {
          const item = { 
            name: feeKey, 
            rate, 
            count, 
            total: rate * count, 
            feeKey,
            isChecked: !studentUnchecked.includes(feeKey)
          };
          allItems.push({ ...item, studentName: student.name });
          studentItems.push(item);
        }
      });

      if (student.busFees && studentSelected.length > 0) {
        const busItem = { 
            name: "Bus Fees", 
            rate: Number(student.busFees), 
            count: studentSelected.length, 
            total: Number(student.busFees) * studentSelected.length, 
            feeKey: "Bus Fees",
            isChecked: !studentUnchecked.includes("Bus Fees")
        };
        allItems.push({ ...busItem, studentName: student.name });
        studentItems.push(busItem);
      }

      if (studentItems.length > 0) {
        studentWiseBreakdown.push({
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          items: studentItems
        });
      }
    });

    const currentBillTotal = allItems
      .filter(item => item.isChecked)
      .reduce((acc, item) => acc + item.total, 0) + 
      extraCharges.reduce((acc, ex) => acc + ex.total, 0);

    return { allItems, totalOldBalance, currentBillTotal, studentWiseBreakdown };
  }, [familyMembers, selectedMonths, feeRatesMap, feeSchedules, uncheckedItems, extraCharges]);

  const netPayable = (billDetails.currentBillTotal + billDetails.totalOldBalance) - Number(discount || 0);
  const finalNewBalance = netPayable - Number(amountReceived || 0);

  const handleSaveAndPrint = async () => {
    if (billDetails.allItems.length === 0 && billDetails.totalOldBalance <= 0) {
      return alert("Pehle mahine select karein!");
    }

    setIsProcessing(true);
    try {
      const currentTime = new Date().toISOString();
      const currentSession = "2025-26";

      for (const studentGroup of billDetails.studentWiseBreakdown) {
        const studentObj = familyMembers.find(m => m.id === studentGroup.studentId);
        if (!studentObj) continue;

        const studentMonths = selectedMonths[studentObj.id] || [];
        const activeItems = studentGroup.items.filter(it => it.isChecked);
        
        const historyEntry = {
          months: studentMonths.sort((a, b) => monthsList.indexOf(a) - monthsList.indexOf(b)),
          allCharges: activeItems,
          paidAt: currentTime,
          paymentMode,
          received: studentObj.id === id ? Number(amountReceived) : 0,
          discount: studentObj.id === id ? Number(discount || 0) : 0, 
          currentTotal: activeItems.reduce((acc, it) => acc + it.total, 0),
          oldBalance: Number(studentObj.currentBalance || 0),
          extraCharges: studentObj.id === id ? extraCharges : [],
          balanceAfterThis: studentObj.id === id ? finalNewBalance : 0,
          session: currentSession
        };

        const feeRef = doc(db, "feesManage", studentObj.id);
        await setDoc(feeRef, {
          studentId: studentObj.id,
          studentName: studentGroup.studentName,
          className: studentGroup.className,
          history: arrayUnion(historyEntry)
        }, { merge: true });

        const updatedFees = { ...(studentObj.fees || {}) };
        if (!updatedFees[currentSession]) updatedFees[currentSession] = {};
        studentMonths.forEach(m => {
          updatedFees[currentSession][m] = { status: "Paid", paidAt: currentTime };
        });

        await updateDoc(doc(db, "students", studentObj.id), {
          fees: updatedFees,
          currentBalance: studentObj.id === id ? finalNewBalance : 0
        });
      }

      setReceiptData({
        studentId: id,
        studentWiseBreakdown: billDetails.studentWiseBreakdown.map(g => ({...g, items: g.items.filter(i => i.isChecked)})),
        extraCharges,
        discount: Number(discount || 0), // Ye value ab print mein jayegi
        received: Number(amountReceived),
        oldBalance: billDetails.totalOldBalance,
        currentTotal: billDetails.currentBillTotal,
        netPayable,
        paymentMode,
        balance: finalNewBalance,
        paidAt: currentTime,
        payMonth: [...new Set(Object.values(selectedMonths).flat())].join(", ")
      });

      setShowReceipt(true);
    } catch (e) { console.error("Save Error:", e); }
    setIsProcessing(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {showReceipt && receiptData && (
        <FeesReceipt {...receiptData} onClose={handleCloseReceipt} />
      )}

      <div className={`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 ${showReceipt ? 'hidden' : ''}`}>
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-lg border-b-4 border-indigo-500">
              <div className="flex items-center gap-4">
                 <div className="bg-indigo-500 p-3 rounded-xl"><Users size={32} /></div>
                 <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Family Billing Center</h2>
                    <div className="flex flex-col gap-1 mt-1 opacity-80">
                        <div className="flex items-center gap-2">
                           <Phone size={12} className="text-indigo-400" />
                           <p className="text-xs font-bold tracking-widest">{studentBaseData?.phone || "N/A"}</p>
                        </div>
                        <p className="text-[10px] font-black uppercase text-indigo-300">Father: {studentBaseData?.fatherName || "N/A"}</p>
                    </div>
                 </div>
              </div>
              <div className="flex gap-6">
                <div className="text-right border-r border-slate-700 pr-6">
                   <p className="text-[10px] uppercase opacity-50 font-black tracking-widest">Past Collections</p>
                   <p className="text-xl font-black text-indigo-400 flex items-center justify-end gap-1"><History size={16}/>₹{totalPaidInPast.toFixed(2)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase opacity-50 font-black tracking-widest">Total Family Dues</p>
                   <p className="text-2xl font-black text-amber-400">₹{billDetails.totalOldBalance.toFixed(2)}</p>
                </div>
              </div>
          </div>

          {familyMembers.map(student => (
            <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <span className="font-black uppercase text-slate-800 flex items-center gap-2">
                    <User size={16} className="text-indigo-600"/>{student.name} ({student.className})
                </span>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest underline">Due: ₹{student.currentBalance || 0}</span>
              </div>
              <div className="p-6 grid grid-cols-4 md:grid-cols-6 gap-2 border-b">
                {monthsList.map(m => {
                    const isPaid = student?.fees?.["2025-26"]?.[m]?.status === "Paid";
                    const isSelected = (selectedMonths[student.id] || []).includes(m);
                    return (
                        <button 
                          key={m} 
                          onClick={() => isPaid ? handleViewOldReceipt(student.id, m) : toggleMonth(student.id, m)}
                          className={`p-2 rounded-xl border-2 text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1
                            ${isPaid ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          {isPaid && <Printer size={12} />}
                          {m}
                        </button>
                    )
                })}
              </div>
              <div className="bg-white">
                <table className="w-full text-[11px]">
                  <tbody className="divide-y">
                    {billDetails.allItems.filter(it => it.studentName === student.name).map((item, i) => (
                      <tr key={i} className={`font-bold ${!item.isChecked ? 'opacity-40 bg-slate-50' : ''}`}>
                        <td className="p-3 w-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={item.isChecked} 
                            onChange={() => toggleTableItem(student.id, item.feeKey)} 
                            className="w-4 h-4 accent-indigo-600 cursor-pointer" 
                          />
                        </td>
                        <td className="p-3 text-slate-700 uppercase">{item.name}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">₹{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-300">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest">Extra Charges / Fine</h3>
            <div className="flex gap-3 mb-4">
              <input id="ex_name" type="text" placeholder="Reason" className="flex-1 bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold" />
              <input id="ex_amt" type="number" placeholder="Amount" className="w-32 bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500 font-bold" />
              <button onClick={() => { addExtraCharge(document.getElementById('ex_name').value, document.getElementById('ex_amt').value); document.getElementById('ex_name').value=''; document.getElementById('ex_amt').value=''; }} className="bg-indigo-600 text-white px-5 rounded-xl font-bold active:scale-95"><PlusCircle size={20}/></button>
            </div>
            {extraCharges.map(ex => (
              <div key={ex.id} className="flex justify-between items-center bg-amber-50 p-2 px-4 rounded-xl border border-amber-100 mb-2">
                <span className="text-[10px] font-bold uppercase text-amber-800">{ex.name}</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-amber-900">₹{ex.total}</span>
                  <button onClick={() => setExtraCharges(extraCharges.filter(c => c.id !== ex.id))} className="text-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border sticky top-4 space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl text-center border-b-4 border-indigo-500 font-black shadow-lg">
                <p className="text-[10px] opacity-50 uppercase mb-1 tracking-widest">Net Payable (Incl. Dues)</p>
                <p className="text-4xl font-black font-mono text-indigo-400">₹{netPayable.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPaymentMode("Cash")} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold border-2 transition-all ${paymentMode === "Cash" ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><Banknote size={18} /> CASH</button>
                <button onClick={() => setPaymentMode("UPI")} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold border-2 transition-all ${paymentMode === "UPI" ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><CreditCard size={18} /> UPI</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Discount (Chhoot)</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
                <input type="number" className="w-full bg-amber-50 border-2 border-amber-100 p-4 pl-12 rounded-2xl text-xl font-black focus:border-amber-500 outline-none" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cash Collected</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={24} />
                <input type="number" className="w-full bg-slate-50 border-2 p-5 pl-12 rounded-2xl text-3xl font-black focus:border-indigo-600 outline-none" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0" />
              </div>
            </div>
            
            <div className={`p-5 rounded-2xl border-2 text-center transition-all ${finalNewBalance > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                <p className="text-[10px] uppercase opacity-70 font-bold">New Balance Due</p>
                <p className="text-3xl font-black font-mono">₹{finalNewBalance.toFixed(2)}</p>
            </div>
            <button onClick={handleSaveAndPrint} disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:bg-slate-300 transition-all uppercase tracking-widest border-b-4 border-indigo-900">
              {isProcessing ? <Loader2 className="animate-spin" /> : <Printer size={24} />} SAVE & PRINT ALL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentBilling;