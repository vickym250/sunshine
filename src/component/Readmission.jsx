import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateTotalStudents } from "./updateTotalStudents";
import AdmissionDetails from "./AdmisionForm";

// studentData prop StudentList se aa raha hai
export default function Readmission({ close, studentData }) {
  const [lang, setLang] = useState("en");

  const translations = {
    en: {
      title: "Re-Admission",
      studentInfo: "Student Info (New Session)",
      parentInfo: "Parent Info",
      feesInfo: "Fees & Address",
      name: "Full Name",
      gender: "Gender",
      category: "Category",
      aadhaar: "Aadhaar Number",
      isTransfer: "Is this a Transfer Student?",
      pnrLabel: "UDISE+ PEN/PNR Number",
      saveBtn: "CONFIRM RE-ADMISSION",
      busLabel: "Bus Facility Required?",
      busFeeLabel: "Monthly Bus Fee"
    },
    hi: {
      title: "पुनः प्रवेश (Readmission)",
      studentInfo: "छात्र की जानकारी (नया सत्र)",
      parentInfo: "अभिभावक की जानकारी",
      feesInfo: "फीस और पता",
      name: "पूरा नाम",
      gender: "लिंग",
      category: "श्रेणी (Category)",
      aadhaar: "आधार नंबर",
      isTransfer: "क्या यह ट्रांसफर छात्र है?",
      pnrLabel: "UDISE+ PEN/PNR नंबर",
      saveBtn: "प्रवेश सुरक्षित करें",
      busLabel: "क्या बस की सुविधा चाहिए?",
      busFeeLabel: "मासिक bus शुल्क"
    }
  };

  const t = translations[lang];
  const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const classList = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
  const categories = ["General", "OBC", "SC", "ST"];

  const [form, setForm] = useState({
    name: "", className: "", rollNumber: "", regNo: "", phone: "", address: "", 
    fatherName: "", motherName: "", admissionFees: "", totalFees: "",
    aadhaar: "", gender: "", category: "", dob: "", session: "", photo: null, photoURL: "",
    isTransferStudent: false, pnrNumber: "", parentId: "",
    isBusStudent: false, busFees: "0" 
  });

  const [subjects, setSubjects] = useState([]);
  const [newSubText, setNewSubText] = useState(""); 
  const [fatherOpen, setFatherOpen] = useState(false);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fess, setFess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(""); 
  const [paidBusAmount, setPaidBusAmount] = useState(""); 
  const [fatherSearch, setFatherSearch] = useState("");
  const [savedStudentId, setSavedStudentId] = useState(null);

  useEffect(() => {
    // 1. Current Session Calculation
    const now = new Date();
    const currentSession = now.getMonth() + 1 >= 4 
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}` 
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
    
    const initData = async () => {
        // Agar StudentList se data aaya hai toh use auto-fill karo
        if (studentData) {
            setForm({
                ...studentData,
                session: currentSession, // 🔥 Hamesha current wala session
                regNo: studentData.regNo, // 🔥 Purana Reg No hi carry forward hoga
                rollNumber: "",          // Roll number reset (class selection par generate hoga)
                photo: null,             // Naya photo upload option
                admissionFees: "",       // New session fees manual entry hogi
                photoURL: studentData.photoURL || ""
            });
            setSubjects(studentData.subjects || []);
        } else {
            // Fallback agar direct open ho
            setForm(prev => ({ ...prev, session: currentSession }));
        }
    };
    initData();

    const fetchParents = async () => {
      const snap = await getDocs(collection(db, "parents"));
      setParents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchParents();
  }, [studentData]);

  const addManualSubject = () => {
    if (newSubText.trim() !== "") {
      setSubjects([...subjects, newSubText.trim()]);
      setNewSubText("");
    }
  };

  const removeSubject = (index) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSelectParent = (p) => {
    setForm(prev => ({
      ...prev, fatherName: p.fatherName, motherName: p.motherName || "",
      phone: p.phone, parentId: p.id, address: p.address || prev.address
    }));
    setFatherOpen(false);
  };

  const generateRoll = async (cls, sess) => {
    const q = query(collection(db, "students"), where("className", "==", cls), where("session", "==", sess));
    const snap = await getDocs(q);
    let max = 0;
    snap.forEach(d => { 
        const r = parseInt(d.data().rollNumber);
        if (r > max) max = r; 
    });
    return (max + 1).toString();
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    if (name === "className") {
      const roll = await generateRoll(value, form.session);
      setForm(prev => ({ ...prev, className: value, rollNumber: roll }));

      const selectedClass = value.replace("Class ", "");
      if (selectedClass === "9" || selectedClass === "10") {
        setSubjects(["Hindi", "English", "Math", "Science", "Social Science", "Drawing"]);
      } else if (selectedClass === "11" || selectedClass === "12") {
        setSubjects(["Hindi", "English", "Physics", "Chemistry", "Math/Bio"]);
      }
    } else {
      setForm(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let downloadURL = form.photoURL;
      if (form.photo) {
        const refImg = ref(storage, `students/${Date.now()}_${form.photo.name}`);
        await uploadBytes(refImg, form.photo);
        downloadURL = await getDownloadURL(refImg);
      }
      
      const { photo, id, ...safeForm } = form; 

      const schoolMonthly = Number(form.totalFees || 0);
      const busMonthly = form.isBusStudent ? Number(form.busFees || 0) : 0;
      
      let remainingSchoolPaid = Number(paidAmount || 0);
      let remainingBusPaid = Number(paidBusAmount || 0);

      const feeData = months.reduce((acc, m) => {
        let curPaidSch = Math.min(remainingSchoolPaid, schoolMonthly);
        remainingSchoolPaid -= curPaidSch;

        let curPaidBus = Math.min(remainingBusPaid, busMonthly);
        remainingBusPaid -= curPaidBus;

        acc[m] = { 
            total: schoolMonthly + busMonthly, 
            schoolPart: schoolMonthly, 
            busPart: busMonthly, 
            paidSchool: curPaidSch, 
            paidBus: curPaidBus,
            paidAt: (curPaidSch > 0 || curPaidBus > 0) ? serverTimestamp() : null
        };
        return acc;
      }, {});

      // Add as NEW entry with purana Reg No
      const studentDocRef = await addDoc(collection(db, "students"), { 
          ...safeForm, 
          photoURL: downloadURL, 
          subjects: subjects,
          attendance: months.reduce((acc, m) => ({ ...acc, [m]: { present: 0, absent: 0 } }), {}), 
          fees: feeData, 
          createdAt: serverTimestamp(), 
          deletedAt: null 
      });

      if (form.parentId) {
        await updateDoc(doc(db, "parents", form.parentId), { students: arrayUnion(studentDocRef.id) });
      }
      
      await updateTotalStudents();
      setSavedStudentId(studentDocRef.id);
      setTimeout(() => { setFess(true); setLoading(false); }, 800);
      
    } catch (err) { 
      console.error(err);
      alert("Error saving data!"); 
      setLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/50 z-50 p-4">
      {!fess ? (
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border-t-8 border-emerald-600">
          <div className="p-4 border-b flex justify-between items-center bg-emerald-50">
            <h2 className="text-lg font-black text-emerald-700 uppercase tracking-tighter">
                {`${t.title} - REG: ${form.regNo}`}
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex border rounded-lg overflow-hidden text-xs font-bold">
                <button type="button" onClick={() => setLang("en")} className={`px-3 py-1.5 ${lang === 'en' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600'}`}>ENG</button>
                <button type="button" onClick={() => setLang("hi")} className={`px-3 py-1.5 ${lang === 'hi' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600'}`}>HIN</button>
              </div>
              <button type="button" onClick={close} className="text-3xl hover:text-red-500 leading-none">&times;</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            <section className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 font-bold text-gray-500 border-l-4 border-emerald-500 pl-2 uppercase text-[10px] tracking-widest">{t.studentInfo}</div>
              
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-emerald-600 ml-1">PERMANENT REG NO</span>
                <input name="regNo" value={form.regNo} readOnly className="border-2 border-emerald-100 p-2.5 rounded-lg bg-emerald-50 font-black text-emerald-700" />
              </div>

              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-400 ml-1">{t.name}</span>
                <input name="name" value={form.name} onChange={handleChange} className="border p-2.5 rounded-lg font-bold" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 ml-1">SESSION</span>
                    <input value={form.session} readOnly className="border p-2.5 rounded-lg bg-gray-50 font-bold" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 ml-1">NEW ROLL</span>
                    <input name="rollNumber" value={form.rollNumber} readOnly className="border p-2.5 rounded-lg bg-gray-50 italic" />
                </div>
              </div>

              <select name="className" value={form.className} onChange={handleChange} className="border-2 border-emerald-500 p-2.5 rounded-lg font-bold" required>
                <option value="">Promote to Class...</option>
                {classList.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
              </select>

              <div className="md:col-span-2 bg-gray-50 p-3 rounded-lg border">
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Subject Management:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {subjects.map((sub, index) => (
                    <span key={index} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[11px] font-bold uppercase flex items-center gap-1">
                      {sub} <button type="button" onClick={() => removeSubject(index)} className="text-red-500 font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newSubText} onChange={(e) => setNewSubText(e.target.value)} placeholder="Add Subject..." className="flex-1 border p-2 rounded text-sm bg-white" />
                  <button type="button" onClick={addManualSubject} className="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-bold uppercase">Add</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select name="gender" value={form.gender} onChange={handleChange} className="border p-2.5 rounded-lg">
                  <option value="">{t.gender}</option><option>Male</option><option>Female</option>
                </select>
                <select name="category" value={form.category} onChange={handleChange} className="border p-2.5 rounded-lg">
                  <option value="">{t.category}</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <input type="date" name="dob" value={form.dob} onChange={handleChange} className="border p-2.5 rounded-lg" required />
              <input name="aadhaar" value={form.aadhaar} onChange={handleChange} placeholder={t.aadhaar} className="border p-2.5 rounded-lg" required />
            </section>

            <section className="space-y-4">
              <div className="font-bold text-gray-500 border-l-4 border-blue-500 pl-2 uppercase text-[10px] tracking-widest">{t.parentInfo}</div>
              <div className="grid md:grid-cols-2 gap-4">
                <input name="fatherName" value={form.fatherName} readOnly className="border p-2.5 rounded-lg bg-gray-50 font-bold" />
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile" className="border p-2.5 rounded-lg font-bold" maxLength="10" />
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 font-bold text-gray-500 border-l-4 border-yellow-500 pl-2 uppercase text-[10px] tracking-widest">{t.feesInfo}</div>
              <input name="admissionFees" value={form.admissionFees} onChange={handleChange} placeholder="Re-admission Fee" className="border-2 border-yellow-100 p-2.5 rounded-lg" required />
              <input name="totalFees" value={form.totalFees} onChange={handleChange} placeholder="Monthly Fee" className="border-2 border-yellow-100 p-2.5 rounded-lg font-bold" required />
              
              <div className="md:col-span-2 bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                <label className="flex items-center gap-2 text-sm font-bold text-yellow-800 cursor-pointer">
                  <input type="checkbox" name="isBusStudent" checked={form.isBusStudent} onChange={handleChange} className="w-4 h-4" />
                  {t.busLabel}
                </label>
                {form.isBusStudent && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input name="busFees" value={form.busFees} onChange={handleChange} placeholder="Monthly Bus Fee" className="border p-2.5 rounded-lg bg-white font-bold" required />
                    <input value={paidBusAmount} onChange={(e) => setPaidBusAmount(e.target.value)} placeholder="Paid Now (₹)" className="border p-2.5 rounded-lg bg-green-50" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="text-[9px] font-bold text-emerald-600 mb-1 uppercase">Monthly Fees Paid Now (₹)</p>
                <input value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="Ex: 1000" className="w-full border-2 border-emerald-100 p-2.5 rounded-lg bg-emerald-50 font-black text-emerald-700 shadow-inner" />
              </div>
              <textarea name="address" value={form.address} onChange={handleChange} placeholder="Address" className="md:col-span-2 border p-2.5 rounded-lg h-20 shadow-sm" required />
            </section>
            
            <button disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl uppercase hover:bg-emerald-700 transition-all active:scale-95 disabled:bg-gray-400">
              {loading ? "Processing Readmission..." : t.saveBtn}
            </button>
          </form>
        </div>
      ) : (
        <AdmissionDetails studentId={savedStudentId} paidAmount={paidAmount} paidBusAmount={paidBusAmount} subjects={subjects} onClose={() => { setFess(false); close(); }} />
      )}
    </div>
  );
}