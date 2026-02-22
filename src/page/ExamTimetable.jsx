import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore"; 

const ExamTimetable = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedClass, setSelectedClass] = useState("Class 1"); 
  // 🔥 New State for Exam Type
  const [selectedExam, setSelectedExam] = useState("Half-Yearly"); 
  
  const [masterMapping, setMasterMapping] = useState({}); 
  const [dynamicSubjects, setDynamicSubjects] = useState([]); 

  const availableClasses = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  // 🔥 Exam Types
  const examTypes = ["Quarterly", "Half-Yearly", "Annual", "Pre-Board"];

  const [formData, setFormData] = useState({ 
    date: '', 
    day: '', 
    startTime: '09:00', 
    endTime: '12:00', 
    subject: '',
    isHoliday: false 
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // 1. FETCH MASTER SUBJECT MAPPING
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "school_config", "master_data"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMasterMapping(data.mapping || {});
      }
    });
    return () => unsub();
  }, []);

  // 2. FETCH CLASS & EXAM SPECIFIC DATA
  // Ab ye selectedClass ya selectedExam badalne par fetch karega
  useEffect(() => {
    const fetchClassExams = async () => {
      setFetching(true);
      try {
        // Path change: Timetables -> Class -> Exams -> ExamType
        const docRef = doc(db, "Timetables", selectedClass);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data()[selectedExam]) {
          const examData = docSnap.data()[selectedExam];
          const sortedExams = examData.sort((a, b) => new Date(a.date) - new Date(b.date));
          setExams(sortedExams);
        } else {
          setExams([]); // Agar us exam type ka data nahi hai to khali kar do
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

  }, [selectedClass, selectedExam, masterMapping]);

  useEffect(() => {
    if (formData.date) {
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(formData.date));
      setFormData(prev => ({ ...prev, day: dayName }));
    }
  }, [formData.date]);

  const addToList = (e) => {
    e.preventDefault();
    if(!formData.date) return alert("Bhai, Date select karo!");
    if(!formData.isHoliday && !formData.subject) return alert("Subject select karo!");
    
    const finalTime = formData.isHoliday ? "---" : `${formData.startTime} - ${formData.endTime}`;
    const newEntry = { 
        ...formData, 
        subject: formData.isHoliday ? "OFF (AWAKAS/HOLIDAY)" : formData.subject, 
        time: finalTime, 
        id: Date.now() 
    };
    
    const updatedExams = [...exams, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
    setExams(updatedExams);

    const currentDate = new Date(formData.date);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = currentDate.toISOString().split('T')[0];

    setFormData({ ...formData, date: nextDateStr, isHoliday: false });
  };

  const saveToDatabase = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "Timetables", selectedClass);
      // Data ko exam type ke field ke andar save kar rahe hain
      await setDoc(docRef, { [selectedExam]: exams }, { merge: true });
      alert(`✅ ${selectedClass} - ${selectedExam} Timetable Synced!`);
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
          <p className="mt-4 font-bold text-indigo-900 animate-pulse uppercase tracking-widest text-xs">Fetching {selectedExam} for {selectedClass}...</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="no-print flex flex-col lg:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent uppercase tracking-tight">Exam Planner</h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Manage Timetables for all Exam Types</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            {/* Class Dropdown */}
            <div className="flex items-center gap-2">
                <span className="pl-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class</span>
                <select 
                className="p-3 border-none bg-white rounded-xl font-bold text-indigo-600 shadow-sm outline-none cursor-pointer"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                >
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
            </div>

            {/* 🔥 Exam Type Dropdown */}
            <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exam Type</span>
                <select 
                className="p-3 border-none bg-white rounded-xl font-bold text-violet-600 shadow-sm outline-none cursor-pointer"
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                >
                {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="no-print lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-indigo-50">
              <h3 className="text-lg font-bold mb-6 text-indigo-900 uppercase flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span> {selectedExam} Entry
              </h3>
              
              <form onSubmit={addToList} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Date</label>
                  <input type="date" className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div className="flex items-center gap-3 bg-red-50 p-4 rounded-2xl border border-red-100">
                  <input type="checkbox" id="isHoliday" className="w-5 h-5 accent-red-600" checked={formData.isHoliday} onChange={(e) => setFormData({...formData, isHoliday: e.target.checked})} />
                  <label htmlFor="isHoliday" className="text-sm font-bold text-red-700 uppercase tracking-tight">Holiday / Gap</label>
                </div>
                
                {!formData.isHoliday && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Start Time</label>
                        <input type="time" className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">End Time</label>
                        <input type="time" className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Subject</label>
                      <select className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                          {dynamicSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <button type="submit" className={`w-full p-5 rounded-2xl font-bold shadow-lg text-white uppercase tracking-widest text-sm ${formData.isHoliday ? 'bg-red-600' : 'bg-indigo-600'}`}>
                  Add to {selectedExam}
                </button>
              </form>
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-8">
            <div id="print-area" className="bg-white p-4 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 min-h-[500px]">
                <div className="hidden print:block text-center mb-8">
                    <h1 className="text-4xl font-black text-slate-900 uppercase">Examination Date Sheet</h1>
                    {/* Header showing Exam Type */}
                    <p className="text-xl font-bold text-slate-600 underline decoration-indigo-500 decoration-4">
                        {selectedClass} | {selectedExam} | Session 2025-26
                    </p>
                </div>

                <div className="mb-4 no-print flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Live Preview: {selectedExam}</span>
                </div>

                {exams.length > 0 ? (
                  <div className="overflow-x-auto rounded-3xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-5 font-bold text-[10px] text-slate-400 uppercase">Date & Day</th>
                          <th className="p-5 font-bold text-[10px] text-slate-400 uppercase">Subject</th>
                          <th className="p-5 font-bold text-[10px] text-slate-400 uppercase">Timing</th>
                          <th className="no-print p-5 font-bold text-[10px] text-slate-400 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {exams.map((item) => (
                          <tr key={item.id} className={`group transition-colors ${item.isHoliday ? 'bg-red-50/50 holiday-row' : 'hover:bg-slate-50/50'}`}>
                            <td className="p-5">
                              <div className={`font-bold ${item.isHoliday ? 'text-red-600' : 'text-indigo-600'}`}>{formatDateDisplay(item.date)}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">{item.day}</div>
                            </td>
                            <td className="p-5 font-black uppercase text-slate-700">{item.subject}</td>
                            <td className={`p-5 font-bold italic text-sm ${item.isHoliday ? 'text-red-300' : 'text-slate-500'}`}>{item.time}</td>
                            <td className="no-print p-5 text-right">
                              <button onClick={() => removeEntry(item.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px]">DELETE</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                    <div className="text-6xl mb-4 opacity-20">🗓️</div>
                    <p className="font-black uppercase text-xs tracking-widest">No {selectedExam} Schedule Found</p>
                  </div>
                )}
            </div>

            <div className="no-print mt-8 flex flex-col sm:flex-row gap-4">
              <button onClick={saveToDatabase} disabled={loading} className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black shadow-lg uppercase tracking-widest">
                {loading ? "SAVING..." : `💾 SYNC ${selectedExam.toUpperCase()} DATA`}
              </button>
              <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg uppercase tracking-widest">
                🖨️ PRINT DATE SHEET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamTimetable;