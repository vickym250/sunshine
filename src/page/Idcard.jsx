import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc
} from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function IDCardGenerator() {
  const { studentId } = useParams();
  const [className, setClassName] = useState("Class 1");
  const [students, setStudents] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false); // Loading state ke liye
  const [school, setSchool] = useState({
    name: "Bright Future School",
    address: "Dumariya, Uttar Pradesh, 272189",
    logoUrl: ""
  });

  useEffect(() => {
    // 1. School Details Fetch
    const fetchSchool = async () => {
      const docRef = doc(db, "settings", "schoolDetails");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSchool(docSnap.data());
      }
    };
    fetchSchool();

    // 2. Students Fetch
    const q = query(collection(db, "students"), orderBy("rollNumber", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !s.deletedAt);
      setStudents(data);
    });
    return () => unsub();
  }, []);

  const filteredStudents = studentId
    ? students.filter((s) => s.id === studentId)
    : students.filter(
        (s) => s.className?.toLowerCase() === className.toLowerCase()
      );

  const handlePrint = async () => {
    if (filteredStudents.length === 0) return alert("No students found!");
    
    setIsPrinting(true); // Loading chalu

    let printFrame = document.getElementById("printFrame");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "printFrame";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "none";
      document.body.appendChild(printFrame);
    }

    let cardsHTML = "";
    filteredStudents.forEach((s) => {
      const profileUrl = `https://school-admin-pi.vercel.app/profile/${s.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(profileUrl)}`;

      cardsHTML += `
        <div class="id-card">
          <div class="header">
            ${school.logoUrl ? `<img src="${school.logoUrl}" class="logo-img" />` : ""}
            <div class="header-text">
              <div class="school-name">${school.name}</div>
              <div class="school-address">${school.address}</div>
            </div>
          </div>
          
          <div class="card-body">
            <div class="qr-code-top">
              <img src="${qrCodeUrl}" />
              <p>SCAN ID</p>
            </div>

            <div class="photo-side">
              <div class="photo-container">
                ${s.photoURL ? `<img src="${s.photoURL}" />` : `<div class="initial-box">${s.name?.charAt(0)}</div>`}
              </div>
            </div>

            <div class="info-side">
              <div class="info-item"><span class="label">NAME</span>: ${s.name}</div>
              <div class="info-item"><span class="label">ROLL NO</span>: ${s.rollNumber}</div>
              <div class="info-item"><span class="label">CLASS</span>: ${s.className}</div>
              <div class="info-item"><span class="label">FATHER</span>: ${s.fatherName}</div>
              <div class="info-item"><span class="label">PHONE</span>: ${s.phone || "---"}</div>
            </div>
          </div>

          <div class="footer">
            <span class="session">Session 2024-25</span>
            <div class="signature">
              <div class="sig-line"></div>
              Principal Sign
            </div>
          </div>
        </div>
      `;
    });

    const style = `
      <style>
        body { margin: 0; padding: 10px; font-family: 'Helvetica', sans-serif; background: #fff; }
        .print-wrapper { display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 15px; }
        .id-card {
          width: 330px; height: 210px; border: 1.5px solid #1e3a8a; border-radius: 10px;
          overflow: hidden; position: relative; background: #fff; margin-bottom: 10px;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .header { background: #1e3a8a !important; color: white !important; padding: 8px; display: flex; align-items: center; gap: 8px; height: 45px; }
        .logo-img { height: 32px; width: 32px; background: white; border-radius: 50%; padding: 2px; }
        .school-name { font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .school-address { font-size: 7px; opacity: 0.9; }
        .card-body { display: flex; padding: 12px; height: 125px; position: relative; padding-top: 15px; }
        .photo-side { width: 85px; }
        .photo-container { width: 80px; height: 100px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; background: #f9f9f9; }
        .photo-container img { width: 100%; height: 100%; object-fit: cover; }
        .initial-box { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 35px; color: #1e3a8a; font-weight: bold; background: #eef2ff; }
        .info-side { flex: 1; padding-left: 10px; font-size: 11px; margin-top: 10px; }
        .info-item { margin-bottom: 6px; border-bottom: 0.5px solid #f0f0f0; padding-bottom: 2px; font-weight: 600; }
        .label { color: #1e3a8a; width: 55px; display: inline-block; font-size: 9px; font-weight: 800; }
        .qr-code-top { position: absolute; top: 10px; right: 12px; text-align: center; }
        .qr-code-top img { width: 48px; height: 48px; border: 1px solid #eee; padding: 2px; background: #fff; }
        .qr-code-top p { font-size: 6px; margin: 2px 0 0 0; font-weight: bold; color: #1e3a8a; }
        .footer { position: absolute; bottom: 0; width: 100%; padding: 5px 12px; display: flex; justify-content: space-between; align-items: flex-end; background: #f8fafc; border-top: 1px solid #eee; box-sizing: border-box; font-size: 9px; }
        .session { font-weight: bold; color: #1e3a8a; }
        .signature { text-align: center; font-weight: bold; }
        .sig-line { width: 70px; border-top: 1px solid #333; margin-bottom: 2px; }
        @media print { body { padding: 0; } .id-card { box-shadow: none; page-break-inside: avoid; border: 1.5px solid #1e3a8a !important; } .print-wrapper { gap: 10px; } }
      </style>
    `;

    const pri = printFrame.contentWindow;
    pri.document.open();
    pri.document.write(`<html><head>${style}</head><body><div class="print-wrapper">${cardsHTML}</div></body></html>`);
    pri.document.close();

    // 🟢 Logic: Wait for all images to load before printing
    const images = pri.document.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve; // Image error ho tab bhi print block na ho
      });
    });

    await Promise.all(promises);
    
    setIsPrinting(false); // Loading stop
    pri.focus();
    pri.print();
  };

  return (
    <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      <h1 style={{ color: "#1e3a8a", fontSize: "24px", fontWeight: "bold" }}>Smart ID Card Generator</h1>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "15px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", display: "inline-block", width: "100%", maxWidth: "420px" }}>
        {studentId ? (
            <div style={{ padding: "10px", background: "#e8f5e9", color: "#2e7d32", borderRadius: "8px", marginBottom: "15px", fontWeight: "bold" }}>Single ID Mode Active</div>
        ) : (
          <div>
            <label style={{ display: "block", textAlign: "left", marginBottom: "8px", fontWeight: "bold", color: "#555" }}>Step 1: Select Class</label>
            <select 
              value={className} 
              onChange={(e) => setClassName(e.target.value)}
              disabled={isPrinting}
              style={{ padding: "12px", width: "100%", borderRadius: "8px", border: "2px solid #e0e0e0", fontSize: "16px", marginBottom: "20px" }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: "10px" }}>
          <button 
            onClick={handlePrint}
            disabled={isPrinting || filteredStudents.length === 0}
            style={{ 
              padding: "16px", 
              background: isPrinting ? "#666" : "#1e3a8a", 
              color: "#fff",
              border: "none", 
              borderRadius: "8px", 
              cursor: isPrinting ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              width: "100%",
              boxShadow: "0 4px 10px rgba(30, 58, 138, 0.3)"
            }}
          >
            {isPrinting ? "⏳ LOADING IMAGES..." : `GENERATE & PRINT (${filteredStudents.length})`}
          </button>
        </div>
        <p style={{ marginTop: "15px", color: "#666", fontSize: "14px" }}>
          Students found: <b>{filteredStudents.length}</b>
        </p>
      </div>

      <div style={{ marginTop: "40px", color: "#888", fontSize: "13px" }}>
        <p><b>Note for Mobile:</b> Chrome/Safari mein "Print" option aane par "Save as PDF" select karein.</p>
        <p>© {new Date().getFullYear()} {school.name}</p>
      </div>
    </div>
  );
}