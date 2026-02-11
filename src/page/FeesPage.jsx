import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';

const FeeLedgerConfig = () => {
  const [feeHeads, setFeeHeads] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Existing Fees Load Karna
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "fee_settings"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeeHeads(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // 2. Naya Row Add Karna
  const addNewRow = () => {
    setFeeHeads([...feeHeads, { name: '', amount: '', isNew: true }]);
  };

  // 3. Delete Functionality (Database + UI)
  const handleDelete = async (index, id) => {
    if (window.confirm("Kya aap ise delete karna chahte hain?")) {
      if (id) {
        await deleteDoc(doc(db, "fee_settings", id));
      }
      const updated = feeHeads.filter((_, i) => i !== index);
      setFeeHeads(updated);
    }
  };

  // 4. Save to Firebase
  const handleSave = async () => {
    setLoading(true);
    try {
      for (const head of feeHeads) {
        if (head.isNew && head.name !== "") {
          await addDoc(collection(db, "fee_settings"), {
            name: head.name,
            amount: head.amount,
            createdAt: new Date()
          });
        }
      }
      alert("Fees successfully save ho gayi!");
      window.location.reload(); 
    } catch (error) {
      alert("Saving mein error aaya!");
    }
    setLoading(false);
  };

  const handleChange = (index, field, value) => {
    const updated = [...feeHeads];
    updated[index][field] = value;
    setFeeHeads(updated);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-800">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-900 p-6 flex justify-between items-center text-white">
          <div>
            <h1 className="text-xl font-bold">Fee Ledger Setup</h1>
            <p className="text-blue-200 text-sm">Define karein ki student se kya fees leni hai</p>
          </div>
          <button 
            onClick={addNewRow}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg font-medium transition"
          >
            <Plus size={18} /> Item Add Karein
          </button>
        </div>

        {/* List of Fee Items */}
        <div className="p-6 space-y-4">
          {feeHeads.length === 0 && (
            <p className="text-center text-gray-400 py-10 italic">Abhi tak koi item add nahi kiya gaya hai.</p>
          )}

          {feeHeads.map((head, index) => (
            <div key={index} className="flex gap-4 items-center bg-gray-50 border border-gray-200 p-3 rounded-xl transition hover:shadow-sm">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Item ka naam (e.g. Admission Fee)"
                  className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 p-2 outline-none transition"
                  value={head.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
                />
              </div>

              <div className="w-32">
                <div className="relative">
                  <span className="absolute left-2 top-2 text-gray-400">₹</span>
                  <input
                    type="number"
                    placeholder="Amount"
                    className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 p-2 pl-6 outline-none transition"
                    value={head.amount}
                    onChange={(e) => handleChange(index, 'amount', e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={() => handleDelete(index, head.id)}
                className="text-gray-400 hover:text-red-500 p-2 transition"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Final Save Karein
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeLedgerConfig;