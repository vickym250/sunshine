import React from "react";

export default function SalaryReceipt({
  teacherName,
  subject,
  phone,
  month,
  totalAmount, // Base Salary
  paidAmount,  // Net Paid
  absents = 0, // Total Absents + Leaves
  totalDays = 30, // Dynamic days from billing
  cutAmount = 0,
  paidAt,
  receiptNo,
  onClose,
}) {
  // Date formatting logic
  const date = paidAt?.seconds
    ? new Date(paidAt.seconds * 1000).toLocaleDateString("en-GB")
    : typeof paidAt === "string" 
      ? new Date(paidAt).toLocaleDateString("en-GB")
      : new Date().toLocaleDateString("en-GB");

  // Dynamic present days calculation
  const presentDays = totalDays - absents;

  return (
    <>
      <style>
        {`
        .screen-wrapper {
          max-width: 900px;
          margin: auto;
          padding-top: 40px;
          transform: scale(0.9);
          transform-origin: top center;
        }

        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { 
            margin: 0 auto; 
            padding: 20px; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            box-shadow: none;
          }
          .print-hidden { display: none !important; }
        }
        `}
      </style>

      {/* OVERLAY */}
      <div className="fixed inset-0 bg-black/60 z-50 overflow-auto backdrop-blur-sm transition-all">
        <div className="screen-wrapper">

          {/* RECEIPT PAGE */}
          <div
            id="print-area"
            className="bg-white mx-auto shadow-2xl relative rounded-xl"
            style={{
              width: "90%",
              padding: "50px",
              minHeight: "auto",
            }}
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-red-500 hover:text-white transition-all print-hidden flex items-center justify-center"
            >
              ✕
            </button>

            {/* HEADER */}
            <div className="text-center mb-10 border-b-4 border-double border-gray-200 pb-6">
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-1">
                SALARY SLIP
              </h1>
              <p className="font-bold text-2xl text-indigo-700">
                Bright Future School 
              </p>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                Siddharth Nagar, Uttar Pradesh
              </p>
            </div>

            {/* META INFO */}
            <div className="flex justify-between text-sm mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="space-y-1">
                <p className="text-gray-500 uppercase text-[10px] font-bold">Transaction Details</p>
                <p><b>Receipt No:</b> <span className="text-indigo-600">{receiptNo || "N/A"}</span></p>
                <p><b>Salary Month:</b> <span className="font-bold">{month}</span></p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-gray-500 uppercase text-[10px] font-bold">Payment Status</p>
                <p><b>Date:</b> {date}</p>
                <p><span className="bg-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full text-xs font-black">PAID</span></p>
              </div>
            </div>

            {/* DETAILS BOX */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] uppercase text-indigo-500 font-black mb-3 tracking-widest">Teacher Information</p>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between"><b>Name:</b> <span>{teacherName}</span></p>
                      <p className="flex justify-between"><b>Subject:</b> <span>{subject || "N/A"}</span></p>
                      <p className="flex justify-between"><b>Phone:</b> <span>{phone}</span></p>
                    </div>
                </div>
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-indigo-50/30">
                    <p className="text-[10px] uppercase text-indigo-500 font-black mb-3 tracking-widest">Attendance Summary</p>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between"><b>Working Days:</b> <span>{totalDays} Days</span></p>
                      <p className="flex justify-between text-emerald-600 font-bold"><b>Days Present:</b> <span>{presentDays} Days</span></p>
                      <p className="flex justify-between text-rose-500 font-bold"><b>Days Absent:</b> <span>{absents} Days</span></p>
                    </div>
                </div>
            </div>

            {/* SALARY TABLE */}
            <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm mb-10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left font-bold uppercase text-xs">Description</th>
                    <th className="p-4 text-right font-bold uppercase text-xs">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-4 font-medium text-slate-700">Gross Monthly Salary</td>
                    <td className="p-4 text-right font-bold">₹ {totalAmount?.toLocaleString()}</td>
                  </tr>
                  {cutAmount > 0 && (
                    <tr className="text-rose-600 bg-rose-50/30">
                      <td className="p-4 font-medium">Leave/Absent Deductions ({absents} days)</td>
                      <td className="p-4 text-right font-bold">- ₹ {cutAmount?.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50">
                    <td className="p-5 text-lg font-black text-slate-900">NET SALARY PAID</td>
                    <td className="p-5 text-right text-2xl font-black text-indigo-700">₹ {paidAmount?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SIGNATURE SECTION */}
            <div className="flex justify-between mt-20">
              <div className="text-center space-y-2">
                <div className="w-48 h-px bg-slate-900 mx-auto"></div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Teacher's Signature</p>
              </div>
              <div className="text-center space-y-2">
                 {/* Seal Placeholder */}
                <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-full mx-auto mb-[-40px] opacity-20"></div>
                <div className="w-48 h-px bg-slate-900 mx-auto relative z-10"></div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter relative z-10">Principal / Accountant</p>
              </div>
            </div>

            {/* FOOTER MESSAGE */}
            <div className="mt-12 text-center text-[10px] text-gray-400 font-medium italic border-t pt-4">
              This is a computer-generated salary slip and does not require a physical stamp unless specified.
            </div>

            {/* PRINT BUTTON - HIDDEN DURING PRINT */}
            <div className="text-center mt-10 print-hidden">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3 mx-auto"
              >
                🖨 Print Official Receipt
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}