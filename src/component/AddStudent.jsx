import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
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

export default function AddStudent({ close, editData }) {
  // --- 🟢 Auto Session Helper (April to March) ---
  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); 
    const currentYear = now.getFullYear();
    if (currentMonth >= 3) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  };

  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [savedStudentId, setSavedStudentId] = useState(null);

  // Firestore Config States
  const [busList, setBusList] = useState([]);
  const [parents, setParents] = useState([]);
  const [subjectMapping, setSubjectMapping] = useState({});
  const [allMasterSubjects, setAllMasterSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // UI States
  const [fatherSearch, setFatherSearch] = useState("");
  const [fatherOpen, setFatherOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);

  const translations = {
    en: { title: "Admission", editTitle: "Edit Student", studentInfo: "Student Info", parentInfo: "Parent Info", name: "Full Name", motherName: "Mother's Name", gender: "Gender", category: "Category", aadhaar: "Aadhaar (Optional)", saveBtn: "SAVE & PRINT", updateBtn: "UPDATE DETAILS", admDate: "Admission Date", address: "Address", docsTitle: "Documents Received", busLabel: "Bus Service" },
    hi: { title: "प्रवेश (Admission)", editTitle: "छात्र विवरण संपादित करें", studentInfo: "छात्र की जानकारी", parentInfo: "अभिभावक की जानकारी", name: "पूरा नाम", motherName: "माता का नाम", gender: "लिंग", category: "श्रेणी", aadhaar: "आधार (वैकल्पिक)", saveBtn: "सुरक्षित करें और प्रिंट", updateBtn: "विवरण अपडेट करें", admDate: "प्रवेश तिथि", address: "पता", docsTitle: "प्राप्त दस्तावेज", busLabel: "बस सेवा" }
  };

  const t = translations[lang];
  const months = ["April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const categories = ["General", "OBC", "SC", "ST"];

  const [form, setForm] = useState({
    name: "", className: "", rollNumber: "...", regNo: "...", phone: "", address: "",
    fatherName: "", motherName: "", aadhaar: "", gender: "", category: "", dob: "", 
    session: getCurrentSession(),
    photo: null, photoURL: "",
    isTransferStudent: false, pnrNumber: "", parentId: "",
    admissionDate: new Date().toISOString().split("T")[0],
    docAadhaar: false, docMarksheet: false, docTC: false, docPhoto: false,
    busId: "", busFees: 0
  });

  const getSessionOptions = () => {
    const year = new Date().getFullYear();
    return [`${year - 1}-${year.toString().slice(-2)}`, `${year}-${(year + 1).toString().slice(-2)}`, `${year + 1}-${(year + 2).toString().slice(-2)}` ];
  };

  // 1. Initial Fetch (Bus, Parents, Config)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [busSnap, parentSnap, configSnap] = await Promise.all([
          getDocs(collection(db, "bus_fees")),
          getDocs(collection(db, "parents")),
          getDoc(doc(db, "school_config", "master_data"))
        ]);

        if (isMounted) {
          setBusList(busSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setParents(parentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          
          if (configSnap.exists()) {
            const data = configSnap.data();
            setSubjectMapping(data.mapping || {});
            setAllMasterSubjects(data.allSubjects || []);
            setAvailableClasses(Object.keys(data.mapping || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
          }
        }
      } catch (err) { console.error("Error fetching data:", err); }
    };

    fetchData();

    if (editData) {
      setForm({ ...editData, photo: null });
      setSubjects(editData.subjects || []);
      setSavedStudentId(editData.id);
    }
    return () => { isMounted = false; };
  }, [editData]);

  // 2. 🔵 Live Registration & Roll Number using 'where' Clause
  useEffect(() => {
    if (!form.session || editData) return;

    const fetchIdentifiers = async () => {
      try {
        // Query for Registration No (Filtered by Session)
        const regQ = query(
          collection(db, "students"),
          where("session", "==", form.session),
          orderBy("regNo", "desc"),
          limit(1)
        );
        const regSnap = await getDocs(regQ);
        const nextReg = regSnap.empty ? "1001" : (parseInt(regSnap.docs[0].data().regNo) + 1).toString();

        // Query for Roll No (Filtered by Session AND Class)
        let nextRoll = "...";
        if (form.className) {
          const rollQ = query(
            collection(db, "students"),
            where("className", "==", form.className),
            where("session", "==", form.session)
          );
          const rollSnap = await getDocs(rollQ);
          let max = 0;
          rollSnap.forEach(d => {
            const r = parseInt(d.data().rollNumber);
            if (!isNaN(r) && r > max) max = r;
          });
          nextRoll = (max + 1).toString();
        }

        setForm(prev => ({ ...prev, regNo: nextReg, rollNumber: nextRoll }));
      } catch (err) {
        console.error("Live fetch error:", err);
      }
    };

    fetchIdentifiers();
  }, [form.session, form.className, editData]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "file") {
      setForm(prev => ({ ...prev, photo: files[0] }));
    } else if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === "className") {
      setForm(prev => ({ ...prev, className: value, rollNumber: "Wait..." }));
      setSubjects(subjectMapping[value] || []);
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (form.phone.length !== 10) return alert("Enter valid 10-digit phone");

    setLoading(true);
    try {
      let downloadURL = form.photoURL;
      if (form.photo) {
        const refImg = ref(storage, `students/${Date.now()}_${form.photo.name}`);
        const snap = await uploadBytes(refImg, form.photo);
        downloadURL = await getDownloadURL(snap.ref);
      }

      let pId = form.parentId;
      let existingTokens = [];

      if (!pId) {
        const pDoc = await addDoc(collection(db, "parents"), {
          fatherName: form.fatherName, motherName: form.motherName,
          phone: form.phone, address: form.address, students: [],
          fcmTokens: [], createdAt: serverTimestamp()
        });
        pId = pDoc.id;
      } else {
        const parentSnap = await getDoc(doc(db, "parents", pId));
        if (parentSnap.exists()) existingTokens = parentSnap.data().fcmTokens || [];
      }

      const { photo, id, ...safeForm } = form;

      if (editData) {
        await updateDoc(doc(db, "students", editData.id), { ...safeForm, photoURL: downloadURL, parentId: pId, subjects, fcmTokens: existingTokens });
        close();
      } else {
        const sDoc = await addDoc(collection(db, "students"), {
          ...safeForm, photoURL: downloadURL, parentId: pId, subjects, fcmTokens: existingTokens,
          attendance: months.reduce((acc, m) => ({ ...acc, [m]: { present: 0, absent: 0 } }), {}),
          createdAt: serverTimestamp(), deletedAt: null
        });
        await updateDoc(doc(db, "parents", pId), { students: arrayUnion(sDoc.id) });
        await updateTotalStudents();
        setSavedStudentId(sDoc.id);
        setShowPrint(true);
      }
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black/70 z-50 p-4 backdrop-blur-sm">
      {!showPrint ? (
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in duration-300">
          <div className="p-5 border-b flex justify-between items-center bg-blue-700 text-white">
            <h2 className="text-xl font-black">{editData ? t.editTitle : t.title}</h2>
            <div className="flex gap-4">
              <div className="flex bg-white/20 rounded-lg p-1 text-[10px] font-bold">
                <button type="button" onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==='en'?'bg-white text-blue-700':''}`}>EN</button>
                <button type="button" onClick={() => setLang("hi")} className={`px-2 py-1 rounded ${lang==='hi'?'bg-white text-blue-700':''}`}>HI</button>
              </div>
              <button type="button" onClick={close} className="text-3xl">&times;</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
            <div className="flex flex-col items-center bg-blue-50/30 p-4 rounded-3xl border-2 border-dashed border-blue-100">
              <div className="relative group">
                {form.photo || form.photoURL ? (
                   <img src={form.photo ? URL.createObjectURL(form.photo) : form.photoURL} className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md" alt="student" />
                ) : (
                   <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-400 text-3xl font-black">👤</div>
                )}
                <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg">
                  <span className="text-[10px] font-bold px-1">ADD PHOTO</span>
                  <input type="file" className="hidden" onChange={handleChange} accept="image/*" />
                </label>
              </div>
            </div>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 font-black text-blue-600 border-l-4 border-blue-600 pl-2 uppercase text-[11px] bg-blue-50 py-1">{t.studentInfo}</div>
              
              <div className="md:col-span-2 grid grid-cols-3 gap-3 mb-2">
                <div className="bg-blue-50 p-3 rounded-2xl border-2 border-blue-100 flex flex-col items-center">
                  <span className="text-[9px] font-black text-blue-400 uppercase">Reg No</span>
                  <span className="text-lg font-black text-blue-800">{form.regNo}</span>
                </div>
                <div className="bg-orange-50 p-3 rounded-2xl border-2 border-orange-100 flex flex-col items-center">
                  <span className="text-[9px] font-black text-orange-400 uppercase">Session</span>
                  <select name="session" value={form.session} onChange={handleChange} className="bg-transparent font-black text-orange-800 outline-none text-sm cursor-pointer">
                    {getSessionOptions().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="bg-green-50 p-3 rounded-2xl border-2 border-green-100 flex flex-col items-center">
                  <span className="text-[9px] font-black text-green-400 uppercase">Roll No</span>
                  <span className="text-lg font-black text-green-800">{form.rollNumber}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t.admDate}</label>
                <input type="date" name="admissionDate" value={form.admissionDate} onChange={handleChange} className="border-2 p-2.5 rounded-xl outline-none" required />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t.name}</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" className="border-2 p-2.5 rounded-xl font-bold outline-none" required />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Class</label>
                <select name="className" value={form.className} onChange={handleChange} className="border-2 p-2.5 rounded-xl font-black text-blue-800 outline-none" required>
                  <option value="">-- Choose Class --</option>
                  {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange} className="border-2 p-2.5 rounded-xl outline-none" required>
                  <option value="">Gender</option><option>Male</option><option>Female</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t.docsTitle}</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[{ key: "docAadhaar", label: "Aadhaar" }, { key: "docMarksheet", label: "Marksheet" }, { key: "docTC", label: "T.C." }, { key: "docPhoto", label: "Photos" }].map((doc) => (
                    <label key={doc.key} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border cursor-pointer">
                      <input type="checkbox" name={doc.key} checked={form[doc.key]} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                      <span className="text-[10px] font-bold text-gray-600">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject List */}
              <div className="md:col-span-2 bg-blue-50/50 p-4 rounded-3xl border-2 border-dashed border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-3">Academic Subjects:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {subjects.map((sub, i) => (
                    <span key={i} className="bg-white border-2 border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                      {sub} <button type="button" onClick={() => setSubjects(s => s.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <select onChange={(e) => { if(e.target.value && !subjects.includes(e.target.value)) setSubjects([...subjects, e.target.value]) }} className="w-full text-sm p-2.5 rounded-xl outline-none ring-1 ring-blue-200">
                  <option value="">+ Add Subject from Master List</option>
                  {allMasterSubjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Bus Service */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-purple-50 p-4 rounded-3xl border border-purple-100">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">{t.busLabel}</label>
                    <select value={form.busId} onChange={(e) => {
                        const bus = busList.find(b => b.id === e.target.value);
                        setForm(p => ({ ...p, busId: e.target.value, busFees: bus ? (bus.charges || 0) : 0 }));
                    }} className="border-2 p-2.5 rounded-xl font-bold">
                        <option value="">No Bus Service</option>
                        {busList.map(b => <option key={b.id} value={b.id}>{b.location}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1 text-center">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">Monthly Fee</label>
                    <div className="bg-white text-purple-700 font-black p-2.5 rounded-xl border-2 border-purple-200 text-lg">₹ {form.busFees}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="border-2 p-2.5 rounded-xl font-bold outline-none" required>
                  <option value="">Category</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Date of Birth</label>
                <input type="date" name="dob" value={form.dob} onChange={handleChange} className="border-2 p-2.5 rounded-xl outline-none" required />
              </div>
            </section>

            {/* Parent Section */}
            <section className="space-y-4">
              <div className="font-black text-green-600 border-l-4 border-green-600 pl-2 uppercase text-[11px] bg-green-50 py-1">{t.parentInfo}</div>
              <div className="relative">
                <div onClick={() => setFatherOpen(!fatherOpen)} className="border-2 border-green-100 p-4 rounded-2xl cursor-pointer bg-green-50/20 flex justify-between items-center text-xs font-black text-green-700">
                  <span>{form.parentId ? `✅ LINKED: ${form.fatherName}` : "🔍 SEARCH PARENT DATABASE"}</span>
                  <span>▼</span>
                </div>
                {fatherOpen && (
                  <div className="absolute z-30 bg-white border-2 w-full mt-2 rounded-3xl shadow-2xl max-h-60 overflow-auto">
                    <input autoFocus onChange={(e) => setFatherSearch(e.target.value)} placeholder="Type name or mobile..." className="p-4 w-full border-b outline-none font-bold sticky top-0 bg-white" />
                    <div onClick={() => { setForm(p => ({ ...p, parentId: "", fatherName: "", motherName: "", phone: "", address: "" })); setFatherOpen(false); }} className="p-4 bg-blue-50 text-blue-700 font-black text-center cursor-pointer border-b">
                      + ADD NEW PARENT / FRESH ENTRY
                    </div>
                    {parents.filter(p => p.fatherName?.toLowerCase().includes(fatherSearch.toLowerCase()) || p.phone?.includes(fatherSearch)).map(p => (
                      <div key={p.id} onClick={() => { setForm(prev => ({ ...prev, fatherName: p.fatherName, motherName: p.motherName || "", phone: p.phone, parentId: p.id, address: p.address || prev.address })); setFatherOpen(false); }} className="p-4 hover:bg-green-50 cursor-pointer border-b text-sm flex justify-between items-center">
                        <span className="font-bold">{p.fatherName}</span>
                        <span className="text-green-600 font-black bg-green-100 px-3 py-1 rounded-lg text-xs">{p.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Father's Name" className="border-2 p-2.5 rounded-xl outline-none font-bold" required />
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile No." className="border-2 p-2.5 rounded-xl font-black text-blue-700 outline-none" required maxLength="10" />
                <input name="motherName" value={form.motherName} onChange={handleChange} placeholder="Mother's Name" className="border-2 p-2.5 rounded-xl outline-none font-bold" required />
              </div>
              <textarea name="address" value={form.address} onChange={handleChange} placeholder="Address" className="w-full border-2 p-2.5 rounded-xl h-20 outline-none resize-none font-medium" required />
            </section>

            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-700 text-white rounded-2xl font-black shadow-xl uppercase tracking-widest hover:bg-blue-800 transition-all">
              {loading ? "PROCESSING..." : (editData ? t.updateBtn : t.saveBtn)}
            </button>
          </form>
        </div>
      ) : (
        <AdmissionDetails studentId={savedStudentId} subjects={subjects} onClose={() => { setShowPrint(false); close(); }} />
      )}
    </div>
  );
}