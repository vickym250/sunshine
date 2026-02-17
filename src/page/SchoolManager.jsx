import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase"; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function SchoolManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
    // Naye fields add kiye hain: email, website, tagline
    const [schoolData, setSchoolData] = useState({
        name: "",
        slogan: "", // Tagline
        affiliation: "",
        address: "",
        contact: "",
        email: "",
        website: "",
        logoUrl: ""
    });
    const [newLogo, setNewLogo] = useState(null);

    // --- 1. Data Fetch Karna ---
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "schoolDetails");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSchoolData(docSnap.data());
                }
            } catch (err) {
                console.error("Error fetching details:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // --- 2. Data Save Karna ---
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalLogoUrl = schoolData.logoUrl;

            if (newLogo) {
                // Har baar naya logo purane wale ko replace karega storage mein
                const storageRef = ref(storage, `school_logo/main_logo`);
                await uploadBytes(storageRef, newLogo);
                finalLogoUrl = await getDownloadURL(storageRef);
            }

            const updatedData = { ...schoolData, logoUrl: finalLogoUrl };
            await setDoc(doc(db, "settings", "schoolDetails"), updatedData);
            
            setSchoolData(updatedData);
            setEditMode(false);
            setNewLogo(null);
            alert("School Details Update Ho Gayi Hain! ✅");
        } catch (err) {
            console.error(err);
            alert("Kuch error aaya hai bhai!");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold animate-pulse text-blue-900">Details Load Ho Rahi Hain...</div>;

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-white text-2xl font-black uppercase tracking-wider">School Profile</h2>
                        <p className="text-blue-200 text-xs mt-1">Manage your institution's public identity</p>
                    </div>
                    {!editMode && (
                        <button 
                            onClick={() => setEditMode(true)}
                            className="bg-white text-blue-900 px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-yellow-400 transition-all transform hover:scale-105"
                        >
                            ✏️ EDIT PROFILE
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="p-6 md:p-10">
                    <div className="flex flex-col md:flex-row gap-10">
                        
                        {/* Left: Logo Section */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-48 h-48 border-4 border-dashed border-blue-100 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner relative group">
                                {newLogo ? (
                                    <img src={URL.createObjectURL(newLogo)} className="w-full h-full object-contain p-2" alt="Preview" />
                                ) : schoolData.logoUrl ? (
                                    <img src={schoolData.logoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-2">🏫</div>
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">No Logo</span>
                                    </div>
                                )}
                            </div>
                            {editMode && (
                                <div className="w-full">
                                    <label className="block text-center text-xs font-bold text-blue-600 cursor-pointer hover:underline">
                                        Change Logo
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setNewLogo(e.target.files[0])}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Right: Details Section */}
                        <div className="flex-1 space-y-6">
                            {/* School Name & Tagline */}
                            <div className="space-y-4 border-b pb-6">
                                <div className="grid grid-cols-1 gap-4">
                                    <DetailField 
                                        label="School Name" 
                                        value={schoolData.name} 
                                        isEdit={editMode} 
                                        onChange={(val) => setSchoolData({...schoolData, name: val})}
                                        important
                                    />
                                    <DetailField 
                                        label="School Slogan / Tagline" 
                                        value={schoolData.slogan} 
                                        isEdit={editMode} 
                                        onChange={(val) => setSchoolData({...schoolData, slogan: val})}
                                        placeholder="e.g. Education for Excellence"
                                    />
                                </div>
                            </div>

                            {/* Contact Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DetailField 
                                    label="Affiliation Board" 
                                    value={schoolData.affiliation} 
                                    isEdit={editMode} 
                                    onChange={(val) => setSchoolData({...schoolData, affiliation: val})}
                                />
                                <DetailField 
                                    label="Contact Number" 
                                    value={schoolData.contact} 
                                    isEdit={editMode} 
                                    onChange={(val) => setSchoolData({...schoolData, contact: val})}
                                />
                                <DetailField 
                                    label="Email Address" 
                                    value={schoolData.email} 
                                    isEdit={editMode} 
                                    onChange={(val) => setSchoolData({...schoolData, email: val})}
                                    type="email"
                                />
                                <DetailField 
                                    label="Website URL" 
                                    value={schoolData.website} 
                                    isEdit={editMode} 
                                    onChange={(val) => setSchoolData({...schoolData, website: val})}
                                    placeholder="https://www.yourschool.com"
                                />
                            </div>

                            {/* Address */}
                            <div className="pt-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">School Address</label>
                                {editMode ? (
                                    <textarea 
                                        value={schoolData.address} 
                                        onChange={(e) => setSchoolData({...schoolData, address: e.target.value})}
                                        className="w-full mt-1 p-3 border-2 border-blue-50 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        rows="3"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700 font-medium leading-relaxed mt-1">{schoolData.address || "No address provided"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {editMode && (
                        <div className="mt-10 flex flex-col md:flex-row gap-4 border-t pt-8">
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 shadow-xl disabled:opacity-50 transition-all"
                            >
                                {saving ? "Saving..." : "💾 Save Changes"}
                            </button>
                            <button 
                                type="button"
                                onClick={() => {setEditMode(false); setNewLogo(null);}}
                                className="px-10 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                            >
                                CANCEL
                            </button>
                        </div>
                    )}
                </form>

                <div className="bg-blue-50 p-4 text-center">
                    <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest flex items-center justify-center gap-2">
                        <span>ℹ️</span> Yeh information certificates aur report cards par print hogi
                    </p>
                </div>
            </div>
        </div>
    );
}

// Reusable Input Component for cleaner code
function DetailField({ label, value, isEdit, onChange, important = false, type="text", placeholder="" }) {
    return (
        <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            {isEdit ? (
                <input 
                    type={type}
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`mt-1 w-full p-2.5 border-2 border-blue-50 rounded-xl outline-none focus:border-blue-500 transition-all ${important ? 'font-bold text-blue-900' : 'text-gray-700'}`}
                />
            ) : (
                <p className={`${important ? 'text-xl font-black text-blue-900' : 'text-sm font-bold text-gray-700'} mt-1 truncate`}>
                    {value || "---"}
                </p>
            )}
        </div>
    );
}