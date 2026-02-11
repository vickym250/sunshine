import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore"; 

const ExamTimetable = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedClass, setSelectedClass] = useState("Class 1"); 
  
  // States for Dynamic Subjects
  const [masterMapping, setMasterMapping] = useState({}); 
  const [dynamicSubjects, setDynamicSubjects] = useState([]); 

  const availableClasses = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

  const [formData, setFormData] = useState({ 
    date: '', 
    day: '', 
    startTime: '09:00', 
    endTime: '12:00', 
    subject: '',
    isHoliday: false 
  });

  // Helper: Date format change karne ke liye (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // 1. FETCH MASTER SUBJECT MAPPING (Real-time)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "school_config", "master_data"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMasterMapping(data.mapping || {});
      }
    });
    return () => unsub();
  }, []);

  // 2. FETCH CLASS-SPECIFIC EXAMS & UPDATE DROPDOWN
  useEffect(() => {
    const fetchClassExams = async () => {
      setFetching(true);
      try {
        const docRef = doc(db, "Timetables", selectedClass);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const sortedExams = docSnap.data().exams.sort((a, b) => new Date(a.date) - new Date(b.date));
          setExams(sortedExams);
        } else {
          setExams([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => setFetching(false), 500);
      }
    };

    fetchClassExams();

    const subjectsForThisClass = masterMapping[selectedClass] || [];
    setDynamicSubjects(subjectsForThisClass);
    
    setFormData(prev => ({ 
      ...prev, 
      subject: subjectsForThisClass.length > 0 ? subjectsForThisClass[0] : '',
      isHoliday: false 
    }));

  }, [selectedClass, masterMapping]);

  // Auto-Day Detection
  useEffect(() => {
    if (formData.date) {
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(formData.date));
      setFormData(prev => ({ ...prev, day: dayName }));
    }
  }, [formData.date]);

  const addToList = (e) => {
    e.preventDefault();
    if(!formData.date) return alert("Bhai, Date select karo!");
    if(!formData.isHoliday && !formData.subject) return alert("Subject select karo ya Holiday mark karo!");
    
    const finalTime = formData.isHoliday ? "---" : `${formData.startTime} - ${formData.endTime}`;
    const newEntry = { 
        ...formData, 
        subject: formData.isHoliday ? "OFF (AWAKAS/HOLIDAY)" : formData.subject, 
        time: finalTime, 
        id: Date.now() 
    };
    
    const updatedExams = [...exams, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
    setExams(updatedExams);

    // 🔥 Auto-Next Date Logic
    const currentDate = new Date(formData.date);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = currentDate.toISOString().split('T')[0];

    setFormData({ 
      ...formData, 
      date: nextDateStr,
      isHoliday: false // Reset for next entry
    });
  };

  const saveToDatabase = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "Timetables", selectedClass);
      await setDoc(docRef, { exams: exams }, { merge: true });
      alert(`✅ ${selectedClass} Timetable Synced!`);
    } catch (e) {
      alert("Error saving!");
    } finally {
      setLoading(false);
    }
  };

  const removeEntry = (id) => {
    setExams(exams.filter(exam => exam.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans text-slate-800">
      
      {fetching && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-bold text-indigo-900 animate-pulse uppercase tracking-widest text-xs">Loading {selectedClass}...</p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          table { width: 100% !important; border: 1.5px solid #000 !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; padding: 12px !important; color: #000 !important; }
          .holiday-row { background-color: #fee2e2 !important; -webkit-print-color-adjust: exact; }
        }
      `}} />

      <div className="max-w-6xl mx-auto">
        
        <div className="no-print flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent uppercase tracking-tight">Exam Planner</h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Dynamic Timetable & Holiday Manager</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="pl-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class</span>
            <select 
              className="p-3 pr-10 border-none bg-white rounded-xl font-bold text-indigo-600 shadow-sm outline-none cursor-pointer"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Section */}
          <div className="no-print lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-indigo-50">
              <h3 className="text-lg font-bold mb-6 text-indigo-900 uppercase flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span> Add Entry
              </h3>
              
              <form onSubmit={addToList} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Exam Date</label>
                  <input type="date" className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-indigo-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                {/* Holiday Checkbox */}
                <div className="flex items-center gap-3 bg-red-50 p-4 rounded-2xl border border-red-100 transition-all">
                  <input 
                    type="checkbox" 
                    id="isHoliday"
                    className="w-5 h-5 accent-red-600 cursor-pointer"
                    checked={formData.isHoliday}
                    onChange={(e) => setFormData({...formData, isHoliday: e.target.checked})}
                  />
                  <label htmlFor="isHoliday" className="text-sm font-bold text-red-700 cursor-pointer uppercase tracking-tight">Mark as Awakas (Holiday)</label>
                </div>
                
                {!formData.isHoliday && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Start</label>
                        <input type="time" className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">End</label>
                        <input type="time" className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Subject</label>
                      <select className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-indigo-500 appearance-none" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                          {dynamicSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                          {dynamicSubjects.length === 0 && <option disabled>No subjects mapped!</option>}
                      </select>
                    </div>
                  </>
                )}

                <button type="submit" className={`w-full p-5 rounded-2xl font-bold shadow-lg transition-all active:scale-95 text-white uppercase tracking-widest text-sm ${formData.isHoliday ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {formData.isHoliday ? "Add Holiday" : "Add Exam"}
                </button>
              </form>
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-8">
            <div id="print-area" className="bg-white p-4 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 min-h-[500px]">
                <div className="hidden print:block text-center mb-8">
                    <h1 className="text-4xl font-black text-slate-900 uppercase">Examination Date Sheet</h1>
                    <p className="text-xl font-bold text-slate-600 underline decoration-indigo-500 decoration-4">{selectedClass} | Session 2025-26</p>
                </div>

                {exams.length > 0 ? (
                  <div className="overflow-x-auto rounded-3xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Date & Day</th>
                          <th className="p-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Subject Name</th>
                          <th className="p-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">Timing</th>
                          <th className="no-print p-5 font-bold text-[10px] text-slate-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {exams.map((item) => (
                          <tr key={item.id} className={`group transition-colors ${item.isHoliday ? 'bg-red-50/50 holiday-row' : 'hover:bg-slate-50/50'}`}>
                            <td className="p-5">
                              <div className={`font-bold ${item.isHoliday ? 'text-red-600' : 'text-indigo-600'}`}>{formatDateDisplay(item.date)}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.day}</div>
                            </td>
                            <td className="p-5">
                              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm ${item.isHoliday ? 'bg-red-200 text-red-800 border border-red-300' : 'bg-white text-slate-700 border border-slate-200'}`}>
                                {item.subject}
                              </span>
                            </td>
                            <td className={`p-5 font-bold italic text-sm ${item.isHoliday ? 'text-red-300' : 'text-slate-500'}`}>
                              {item.time}
                            </td>
                            <td className="no-print p-5 text-right">
                              <button onClick={() => removeEntry(item.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-widest transition-all">
                                DELETE
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                    <div className="text-6xl mb-4 opacity-20">🗓️</div>
                    <p className="font-black uppercase tracking-widest text-xs">No Exams or Holidays Scheduled</p>
                  </div>
                )}
            </div>

            <div className="no-print mt-8 flex flex-col sm:flex-row gap-4">
              <button onClick={saveToDatabase} disabled={loading} className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200 uppercase tracking-widest">
                {loading ? "SAVING..." : "💾 SYNC TO DATABASE"}
              </button>
              <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95 uppercase tracking-widest">
                🖨️ GENERATE PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamTimetable;