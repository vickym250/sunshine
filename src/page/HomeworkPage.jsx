import React, { useEffect, useState } from "react";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

export default function HomeworkPage() {
  const [className, setClassName] = useState("Class 1");
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "Maths",
    visibleDays: "1", // 🔥 Default 1 din set kiya
    file: null
  });

  const getSession = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  };
  const currentSession = getSession();

  useEffect(() => {
    const q = query(collection(db, "homework"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHomeworkList(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredHomework = homeworkList.filter(h => 
    h.className === className && 
    h.session === currentSession &&
    !h.deletedAt
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.loading("Uploading...", { id: "load" });

    let fileURL = "";
    try {
      if (form.file) {
        const fileRef = ref(storage, `homework/${Date.now()}_${form.file.name}`);
        await uploadBytes(fileRef, form.file);
        fileURL = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "homework"), {
        className,
        session: currentSession,
        title: form.title,
        subject: form.subject,
        description: form.description,
        visibleDays: Number(form.visibleDays), // 🔥 Kitne din dikhana hai
        fileURL,
        deletedAt: null,
        createdAt: serverTimestamp()
      });

      toast.success("Homework Added!", { id: "load" });
      setOpen(false);
      setForm({ title: "", description: "", subject: "Maths", visibleDays: "1", file: null });
    } catch (err) {
      toast.error("Error adding homework", { id: "load" });
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="text-center">
        <p className="font-bold">Archive this work?</p>
        <div className="flex gap-2 mt-2 justify-center">
          <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={async () => {
            await updateDoc(doc(db, "homework", id), { deletedAt: new Date() });
            toast.dismiss(t.id);
          }}>Yes</button>
          <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => toast.dismiss(t.id)}>No</button>
        </div>
      </div>
    ));
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800">HOMEWORK ADMIN</h2>
          <button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
            + CREATE NEW
          </button>
        </div>

        {/* Class Filter */}
        <div className="mb-6 flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <select value={className} onChange={(e) => setClassName(e.target.value)} className="border-none bg-slate-100 px-4 py-2 rounded-lg font-bold outline-none">
              {[...Array(12)].map((_, i) => <option key={i}>Class {i + 1}</option>)}
           </select>
        </div>

        {/* Homework Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHomework.map((h) => (
            <div key={h.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black uppercase">{h.subject}</span>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black">EXPIRES IN: {h.visibleDays} DAYS</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg uppercase">{h.title}</h3>
              <p className="text-slate-500 text-sm mt-2 line-clamp-3">{h.description}</p>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <button onClick={() => handleDelete(h.id)} className="text-red-500 text-xs font-bold">DELETE</button>
                {h.fileURL && <a href={h.fileURL} className="text-blue-600 text-xs font-bold">ATTACHMENT</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-black mb-6 text-slate-800">POST HOMEWORK</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Title" className="w-full bg-slate-100 p-3 rounded-xl outline-none font-medium" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              
              <div className="flex gap-4">
                <select className="flex-1 bg-slate-100 p-3 rounded-xl outline-none font-bold" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}>
                  <option>Maths</option><option>Science</option><option>English</option><option>Hindi</option>
                </select>
                
                {/* 🔥 Visibility Dropdown */}
                <select className="flex-1 bg-orange-50 p-3 rounded-xl outline-none font-bold text-orange-700" value={form.visibleDays} onChange={(e) => setForm({...form, visibleDays: e.target.value})}>
                  <option value="1">Show for 1 Day</option>
                  <option value="2">Show for 2 Days</option>
                  <option value="3">Show for 3 Days</option>
                  <option value="7">Show for 1 Week</option>
                </select>
              </div>

              <textarea placeholder="Write description..." className="w-full bg-slate-100 p-3 rounded-xl outline-none min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              <input type="file" className="text-xs text-slate-400" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} />
              
              <div className="flex gap-4 pt-4">
                <button className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg">POST NOW</button>
                <button type="button" onClick={() => setOpen(false)} className="px-4 text-slate-400 font-bold">CLOSE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}