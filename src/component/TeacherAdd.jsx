import React, { useEffect, useState } from "react";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

const monthsOrder = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

const classes = [
  "Class 1","Class 2","Class 3","Class 4","Class 5","Class 6",
  "Class 7","Class 8","Class 9","Class 10","Class 11","Class 12",
];

export function AddTeacherPopup({ close, editData }) {
  const [form, setForm] = useState({
    name: "",
    subject: "",
    phone: "", // 📱 Sirf phone number hi login ke liye kaafi hai
    salary: "",
    address: "",
    photo: null,
    photoURL: "",
    isClassTeacher: false,
    classTeacherOf: "",
  });

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm((s) => ({
        ...s,
        ...editData,
        salary: editData.salary || "",
        isClassTeacher: editData.isClassTeacher || false,
        classTeacherOf: editData.classTeacherOf || "",
        photo: null,
      }));
    }
    setTimeout(() => setShow(true), 10);
  }, [editData]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCheckbox = (e) =>
    setForm((prev) => ({ ...prev, isClassTeacher: e.target.checked }));

  const handlePhoto = (e) =>
    setForm((prev) => ({ ...prev, photo: e.target.files[0] }));

  const handleClose = () => {
    setShow(false);
    setTimeout(() => close(), 200);
  };

  const buildSalaryDetails = (monthlySalary) => {
    let obj = {};
    monthsOrder.forEach((m) => {
      obj[m] = { total: Number(monthlySalary), paid: 0, paidAt: null };
    });
    return obj;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Phone number must be 10 digits
    if (form.phone.length !== 10) {
      toast.error("Phone number 10 digits ka hona chahiye!");
      return;
    }

    setLoading(true);
    try {
      let photoURL = form.photoURL;

      if (form.photo) {
        const imageRef = ref(storage, `teachers/${Date.now()}_${form.photo.name}`);
        await uploadBytes(imageRef, form.photo);
        photoURL = await getDownloadURL(imageRef);
      }

      const teacherData = {
        name: form.name,
        subject: form.subject,
        phone: form.phone, // Ye login key hai
        salary: Number(form.salary),
        address: form.address,
        photoURL,
        isClassTeacher: form.isClassTeacher,
        classTeacherOf: form.isClassTeacher ? form.classTeacherOf : null,
      };

      if (editData) {
        await updateDoc(doc(db, "teachers", editData.id), teacherData);
        toast.success("Teacher data updated!");
      } else {
        await addDoc(collection(db, "teachers"), {
          ...teacherData,
          salaryDetails: buildSalaryDetails(form.salary),
          attendance: {},
          createdAt: new Date(),
        });
        toast.success("Teacher added successfully!");
      }
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Data save nahi ho paya!");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div
        className={`bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden transition-all duration-300 ${
          show ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold italic">
              {editData ? "Edit Teacher" : "Register Teacher"}
            </h2>
            <p className="text-xs opacity-80">Phone number se hi teacher login kar payenge</p>
          </div>
          <button onClick={handleClose} className="hover:rotate-90 transition-transform text-2xl">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} required
                placeholder="Ex: Rajesh Kumar"
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors" />
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</label>
              <input name="subject" value={form.subject} onChange={handleChange} required
                placeholder="Ex: Mathematics"
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors" />
            </div>

            {/* Phone - MANDATORY */}
            <div className="md:col-span-2 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
              <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Mobile Number (Login ID)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">+91</span>
                <input name="phone" value={form.phone} onChange={handleChange} required maxLength={10}
                  placeholder="98XXXXXXXX"
                  className="w-full bg-transparent outline-none py-1 text-lg font-bold text-indigo-900" />
              </div>
            </div>

            {/* Salary */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly Salary (₹)</label>
              <input name="salary" type="number" value={form.salary} onChange={handleChange} required
                placeholder="50000"
                className="w-full border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 transition-colors" />
            </div>
          </div>

          {/* Class Teacher Section */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isCT" className="w-5 h-5 accent-indigo-600" checked={form.isClassTeacher} onChange={handleCheckbox} />
              <label htmlFor="isCT" className="font-bold text-gray-700 cursor-pointer">Is this a Class Teacher?</label>
            </div>
            {form.isClassTeacher && (
              <select name="classTeacherOf" value={form.classTeacherOf} onChange={handleChange} required
                className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg outline-none focus:ring-2 ring-indigo-300">
                <option value="">Select assigned class</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Photo & Address */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} rows="2"
                className="w-full border border-gray-200 rounded-xl p-3 mt-1 focus:ring-2 ring-indigo-200 outline-none text-sm" />
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Photo</label>
                <input type="file" accept="image/*" onChange={handlePhoto} className="w-full text-xs mt-1" />
              </div>
              {(form.photoURL || form.photo) && (
                 <img 
                  src={form.photo ? URL.createObjectURL(form.photo) : form.photoURL} 
                  className="w-14 h-14 rounded-lg object-cover border-2 border-white shadow-sm" 
                  alt="preview" 
                 />
              )}
            </div>
          </div>

          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex justify-center items-center gap-2">
            {loading ? "Saving Details..." : editData ? "Update Teacher Profile" : "Confirm & Register"}
          </button>
        </form>
      </div>
    </div>
  );
}