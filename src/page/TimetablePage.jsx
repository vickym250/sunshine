import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  writeBatch
} from 'firebase/firestore';
import { Save, Edit2, Plus, Clock, Coffee, XCircle, Printer, RefreshCw } from 'lucide-react';

const TimetablePro = () => {
  const [teachers, setTeachers] = useState([]);
  const [config, setConfig] = useState({ periods: [] });
  const [dynamicClasses, setDynamicClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({});
  const [tempConfig, setTempConfig] = useState([]);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "settings", "timetableConfig"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(data);
        setTempConfig(data.periods || []);
      }
    });

    const unsubClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      const classData = snapshot.docs.map(d => d.data().name);
      setDynamicClasses(classData.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    });

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeachers(data);
      const initialTemp = {};
      data.forEach(t => { initialTemp[t.id] = { ...t }; });
      setTempData(initialTemp);
      setLoading(false);
    });

    return () => { unsubConfig(); unsubClasses(); unsubTeachers(); };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleTempUpdate = (tId, field, value) => {
    setTempData(prev => ({
      ...prev,
      [tId]: { ...prev[tId], [field]: value }
    }));
  };

  const handleConfigUpdate = (index, field, value) => {
    const newConfig = [...tempConfig];
    newConfig[index] = { ...newConfig[index], [field]: value };
    setTempConfig(newConfig);
  };

  const deletePeriod = (index) => {
    if(window.confirm("Delete this period?")) {
      const newConfig = tempConfig.filter((_, i) => i !== index);
      setTempConfig(newConfig);
    }
  };

  const saveAllChanges = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      Object.keys(tempData).forEach(tId => {
        const teacherRef = doc(db, "teachers", tId);
        batch.set(teacherRef, tempData[tId], { merge: true });
      });
      const configRef = doc(db, "settings", "timetableConfig");
      batch.set(configRef, { periods: tempConfig }, { merge: true });
      await batch.commit();
      setIsEditing(false);
      alert("Timetable Saved!");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPeriod = () => {
    const newBel = { id: `bel${Date.now()}`, label: `P${tempConfig.length + 1}`, time: "10:00 AM", type: 'class' };
    setTempConfig([...tempConfig, newBel]);
    if(!isEditing) setIsEditing(true);
  };

  const addLunch = () => {
    const lunch = { id: `lunch${Date.now()}`, label: `LUNCH`, time: "12:30 PM", type: 'break' };
    setTempConfig([...tempConfig, lunch]);
    if(!isEditing) setIsEditing(true);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
      <RefreshCw className="animate-spin mr-2" /> Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-2 md:p-6 printable-area">
      
      {/* ⚠️ CRITICAL PRINT CSS: Isse hi white screen theek hogi */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* 1. Hide everything except the timetable */
          body * { visibility: hidden !important; }
          .printable-area, .printable-area * { visibility: visible !important; }
          
          /* 2. Reset positions so it doesn't print a blank page */
          .printable-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: white !important;
          }

          /* 3. Page Setup */
          @page { size: landscape; margin: 10mm; }
          
          /* 4. Table Styling */
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid black !important; padding: 4px !important; font-size: 10px !important; text-align: center !important; }
          .no-print { display: none !important; }
          .active-class { font-weight: bold !important; color: black !important; }
        }
      `}} />

      <div className="max-w-[1600px] mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
        
        {/* DASHBOARD HEADER (No Print) */}
        <div className="bg-slate-900 p-5 flex justify-between items-center no-print">
          <div className="flex items-center gap-3">
            <Clock className="text-indigo-400" />
            <h1 className="text-white font-bold">Master Timetable</h1>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-white text-slate-800 px-4 py-2 rounded-lg font-bold">
                  <Printer size={18} /> Print Now
                </button>
                <button onClick={() => setIsEditing(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">
                  Edit
                </button>
                <button onClick={addPeriod} className="p-2 bg-slate-700 text-white rounded-lg"><Plus size={20}/></button>
                <button onClick={addLunch} className="p-2 bg-orange-600 text-white rounded-lg"><Coffee size={20}/></button>
              </>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="bg-slate-700 text-white px-4 py-2 rounded-lg font-bold">Cancel</button>
                <button onClick={saveAllChanges} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Save Changes</button>
              </div>
            )}
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block text-center p-4 border-b-2 border-black">
           <h1 className="text-2xl font-bold uppercase">SUNSHINE PUBLIC SCHOOL</h1>
           <p className="font-bold uppercase tracking-widest">Master Timetable (2025-26)</p>
        </div>

        {/* MAIN TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-3 border sticky left-0 bg-slate-100 z-10 w-[150px]">Staff Member</th>
                {tempConfig.map((p, idx) => (
                  <th key={p.id} className="p-3 border min-w-[100px] relative">
                    {isEditing ? (
                      <div className="no-print flex flex-col gap-1">
                        <button onClick={() => deletePeriod(idx)} className="text-red-500 absolute -top-1 -right-1"><XCircle size={14}/></button>
                        <input className="text-center border rounded p-0.5 text-xs" value={p.label} onChange={(e) => handleConfigUpdate(idx, 'label', e.target.value)} />
                        <input className="text-center border rounded p-0.5 text-[10px]" value={p.time} onChange={(e) => handleConfigUpdate(idx, 'time', e.target.value)} />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-bold text-xs uppercase">{p.label}</span>
                        <span className="text-indigo-600 text-[10px]">{p.time}</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-3 border sticky left-0 bg-white font-bold text-xs">
                    {t.name} <br/>
                    <span className="text-[9px] text-indigo-500">{t.subject}</span>
                  </td>
                  {tempConfig.map((p) => (
                    <td key={p.id} className={`p-2 border text-center ${p.type === 'break' ? 'bg-orange-50' : ''}`}>
                      {p.type === 'break' ? <span className="text-[9px] font-bold">LUNCH</span> : (
                        isEditing ? (
                          <select 
                            className="w-full text-xs border rounded p-1 no-print"
                            value={tempData[t.id]?.[p.id] || ""}
                            onChange={(e) => handleTempUpdate(t.id, p.id, e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="Free">Free</option>
                            {dynamicClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span className={`text-[11px] font-bold ${t[p.id] === 'Free' ? 'text-slate-300' : 'active-class'}`}>
                            {t[p.id] || "—"}
                          </span>
                        )
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-400 mt-2 no-print">
        Tip: Print preview khali dikhe toh layout 'Landscape' karein.
      </p>
    </div>
  );
};

export default TimetablePro;