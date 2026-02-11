import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase"; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function SchoolManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [schoolData, setSchoolData] = useState({
        name: "",
        affiliation: "",
        address: "",
        contact: "",
        logoUrl: ""
    });
    const [newLogo, setNewLogo] = useState(null);

    // --- 1. Purani Details Load Karna ---
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

    // --- 2. Data Update Karna ---
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalLogoUrl = schoolData.logoUrl;

            // Agar naya logo select kiya hai toh upload karein
            if (newLogo) {
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
            alert("Kuch error aaya hai bhai!");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold">Details Load Ho Rahi Hain...</div>;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                
                {/* Header */}
                <div className="bg-blue-900 p-6 flex justify-between items-center">
                    <h2 className="text-white text-xl font-black uppercase tracking-widest">School Profile & Settings</h2>
                    {!editMode && (
                        <button 
                            onClick={() => setEditMode(true)}
                            className="bg-yellow-400 text-blue-900 px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-yellow-500 transition-all"
                        >
                            ✏️ EDIT DETAILS
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* Logo Section */}
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-40 h-40 border-4 border-blue-50 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner relative">
                                {newLogo ? (
                                    <img src={URL.createObjectURL(newLogo)} className="w-full h-full object-contain" alt="Preview" />
                                ) : schoolData.logoUrl ? (
                                    <img src={schoolData.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                                ) : (
                                    <span className="text-gray-300 font-bold uppercase text-[10px] text-center p-2">No Logo Uploaded</span>
                                )}
                            </div>
                            {editMode && (
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => setNewLogo(e.target.files[0])}
                                    className="text-xs text-gray-500 w-full"
                                />
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">School Name</label>
                                {editMode ? (
                                    <input 
                                        type="text" 
                                        value={schoolData.name} 
                                        onChange={(e) => setSchoolData({...schoolData, name: e.target.value})}
                                        className="w-full p-2 border-2 border-blue-100 rounded-lg font-bold focus:border-blue-500 outline-none"
                                    />
                                ) : (
                                    <p className="text-2xl font-black text-blue-900 uppercase leading-tight">{schoolData.name || "N/A"}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">Affiliation / Board</label>
                                {editMode ? (
                                    <input 
                                        type="text" 
                                        value={schoolData.affiliation} 
                                        onChange={(e) => setSchoolData({...schoolData, affiliation: e.target.value})}
                                        className="w-full p-2 border-2 border-blue-100 rounded-lg outline-none"
                                    />
                                ) : (
                                    <p className="font-bold text-gray-700">{schoolData.affiliation || "N/A"}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Contact No.</label>
                                    {editMode ? (
                                        <input 
                                            type="text" 
                                            value={schoolData.contact} 
                                            onChange={(e) => setSchoolData({...schoolData, contact: e.target.value})}
                                            className="w-full p-2 border-2 border-blue-100 rounded-lg outline-none"
                                        />
                                    ) : (
                                        <p className="font-bold text-gray-600 italic">{schoolData.contact || "N/A"}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase">School Address</label>
                                {editMode ? (
                                    <textarea 
                                        value={schoolData.address} 
                                        onChange={(e) => setSchoolData({...schoolData, address: e.target.value})}
                                        className="w-full p-2 border-2 border-blue-100 rounded-lg outline-none"
                                        rows="3"
                                    />
                                ) : (
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{schoolData.address || "N/A"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {editMode && (
                        <div className="mt-8 flex gap-4 border-t pt-6">
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black uppercase hover:bg-green-700 shadow-lg transition-all"
                            >
                                {saving ? "Saving Changes..." : "✅ SAVE SETTINGS"}
                            </button>
                            <button 
                                type="button"
                                onClick={() => {setEditMode(false); setNewLogo(null);}}
                                className="px-6 bg-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-300"
                            >
                                CANCEL
                            </button>
                        </div>
                    )}
                </form>

                {/* Info Footer */}
                <div className="bg-gray-50 p-4 text-center">
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                        Yeh details aapki Admission Slips aur Reports par auto-print hongi.
                    </p>
                </div>
            </div>
        </div>
    );
}