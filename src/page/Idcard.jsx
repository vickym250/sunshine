import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  where
} from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function IDCardGenerator() {
  const { studentId } = useParams();

  // --- 🟢 Auto Session Calculation (April to March) ---
  const getCurrentSession = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = Jan, 3 = April
    const currentYear = now.getFullYear();
    
    if (currentMonth >= 3) {
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  };

  // States
  const [className, setClassName] = useState("Class 1");
  const [session, setSession] = useState(getCurrentSession()); 
  const [students, setStudents] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [school, setSchool] = useState({
    name: "Bright Future School",
    address: "Dumariya, Uttar Pradesh, 272189",
    logoUrl: ""
  });

  // Dynamic Session List for Dropdown
  const getSessionOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`,
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      `${currentYear + 1}-${(currentYear + 2).toString().slice(-2)}`,
    ];
  };

  useEffect(() => {
    const fetchSchool = async () => {
      const docRef = doc(db, "settings", "schoolDetails");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSchool(docSnap.data());
      }
    };
    fetchSchool();
  }, []);

  useEffect(() => {
    let q;
    if (studentId) {
      q = query(collection(db, "students"), where("__name__", "==", studentId));
    } else {
      // NOTE: Ensure you have a composite index in Firebase for className + session + rollNumber
      q = query(
        collection(db, "students"),
        where("className", "==", className),
        where("session", "==", session),
        orderBy("rollNumber", "asc")
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => !s.deletedAt);
      setStudents(data);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsub();
  }, [className, session, studentId]);

  const handlePrint = async () => {
    if (students.length === 0) return alert("No students found!");
    
    setIsPrinting(true);
    let printFrame = document.getElementById("printFrame");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "printFrame";
      printFrame.style.visibility = "hidden";
      printFrame.style.position = "fixed";
      document.body.appendChild(printFrame);
    }

    let cardsHTML = "";
    students.forEach((s) => {
      // Dynamic profile link for QR
      const profileUrl = `https://school-admin-pi.vercel.app/profile/${s.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(profileUrl)}&margin=10`;

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
              <div class="info-item"><span class="label">NAME</span>: ${s.name?.toUpperCase()}</div>
              <div class="info-item"><span class="label">ROLL NO</span>: ${s.rollNumber || "N/A"}</div>
              <div class="info-item"><span class="label">CLASS</span>: ${s.className}</div>
              <div class="info-item"><span class="label">FATHER</span>: ${s.fatherName?.toUpperCase()}</div>
              <div class="info-item"><span class="label">PHONE</span>: ${s.phone || "---"}</div>
            </div>
          </div>
          <div class="footer-strip">
            <span class="session">SESSION ${s.session || session}</span>
            <div class="signature">
              <div class="sig-line"></div>
              PRINCIPAL SIGN
            </div>
          </div>
        </div>
      `;
    });

    const style = `<style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 10mm; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; }
        .print-wrapper { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px 15px; 
          justify-items: center; 
        }
        .id-card { 
          width: 86mm; height: 54mm; 
          border: 1px solid #1e3a8a; 
          border-radius: 8px; 
          overflow: hidden; 
          position: relative; 
          background: #fff; 
          box-sizing: border-box; 
          page-break-inside: avoid; 
          -webkit-print-color-adjust: exact; 
        }
        .header { background: #1e3a8a !important; color: white !important; padding: 6px 10px; display: flex; align-items: center; gap: 8px; height: 50px; }
        .logo-img { height: 35px; width: 35px; background: white; border-radius: 4px; object-fit: contain; padding: 2px; }
        .school-name { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .school-address { font-size: 7px; opacity: 0.9; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-body { display: flex; padding: 10px; height: 115px; position: relative; }
        .photo-container { width: 70px; height: 85px; border: 1.5px solid #1e3a8a; border-radius: 4px; overflow: hidden; background: #f8fafc; }
        .photo-container img { width: 100%; height: 100%; object-fit: cover; }
        .initial-box { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #1e3a8a; font-weight: bold; background: #f0f7ff; }
        .info-side { flex: 1; padding-left: 10px; font-size: 10px; z-index: 1; }
        .info-item { margin-bottom: 4px; border-bottom: 0.5px solid #f1f5f9; padding-bottom: 1px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .label { color: #1e3a8a; width: 55px; display: inline-block; font-size: 8px; font-weight: 800; }
        .qr-code-top { position: absolute; bottom: 12px; right: 10px; text-align: center; }
        .qr-code-top img { width: 45px; height: 45px; border: 1px solid #eee; background: white; }
        .qr-code-top p { font-size: 6px; margin-top: 2px; font-weight: bold; color: #1e3a8a; }
        .footer-strip { position: absolute; bottom: 0; width: 100%; height: 28px; padding: 0 10px; display: flex; justify-content: space-between; align-items: center; background: #f1f5f9 !important; border-top: 1px solid #e2e8f0; font-size: 8px; box-sizing: border-box; }
        .session { font-weight: bold; color: #1e3a8a; border: 1px solid #1e3a8a; padding: 1px 4px; border-radius: 3px; }
        .signature { text-align: center; font-weight: bold; color: #334155; }
        .sig-line { width: 70px; border-top: 0.8px solid #333; margin-bottom: 2px; }
    </style>`;

    const pri = printFrame.contentWindow;
    pri.document.open();
    pri.document.write(`<html><head><title>Print ID Cards</title>${style}</head><body><div class="print-wrapper">${cardsHTML}</div></body></html>`);
    pri.document.close();

    const images = pri.document.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      return new Promise(resolve => {
        if (img.complete) resolve();
        img.onload = resolve;
        img.onerror = resolve; 
      });
    }));

    setTimeout(() => {
        setIsPrinting(false);
        pri.focus();
        pri.print();
    }, 700);
  };

  return (
    <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "550px", margin: "0 auto", background: "#fff", padding: "30px", borderRadius: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
        <h2 style={{ color: "#1e3a8a", marginBottom: "8px", fontSize: "28px" }}>ID Card Generator</h2>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "30px" }}>Generate professional ID cards in seconds</p>

        {!studentId && (
          <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginLeft: "5px" }}>Session</label>
              <select 
                value={session} 
                onChange={(e) => setSession(e.target.value)}
                style={{ padding: "14px", width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "6px", background: "#f8fafc", outline: "none", fontSize: "15px" }}
              >
                {getSessionOptions().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, textAlign: "left" }}>
              <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginLeft: "5px" }}>Class</label>
              <select 
                value={className} 
                onChange={(e) => setClassName(e.target.value)}
                style={{ padding: "14px", width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "6px", background: "#f8fafc", outline: "none", fontSize: "15px" }}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button 
          onClick={handlePrint}
          disabled={isPrinting || students.length === 0}
          style={{ 
            padding: "18px", width: "100%", borderRadius: "14px", border: "none",
            background: isPrinting ? "#94a3b8" : (students.length === 0 ? "#cbd5e1" : "#1e3a8a"), 
            color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px",
            transition: "all 0.2s ease",
            boxShadow: students.length > 0 ? "0 10px 15px -3px rgba(30, 58, 138, 0.3)" : "none"
          }}
        >
          {isPrinting ? "⏳ PREPARING PRINT..." : `GENERATE ${students.length} CARDS`}
        </button>

        <div style={{ marginTop: "25px", padding: "12px", background: "#f1f5f9", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Ready for: <b>{className}</b> • Session: <b>{session}</b>
          </p>
        </div>
      </div>

      <div style={{ marginTop: "40px", color: "#94a3b8", fontSize: "13px" }}>
        <p>Tip: Set "Layout" to <b>Portrait</b> and "Margins" to <b>None</b> in print settings.</p>
        <p>© {new Date().getFullYear()} {school.name}</p>
      </div>
    </div>
  );
}