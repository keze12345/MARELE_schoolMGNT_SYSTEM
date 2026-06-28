import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Download, Loader2, Users, BookOpen, FileText, Info } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

export default function ClassLists() {
  const { profile } = useAuth();
  const [classes,          setClasses]          = useState([]);
  const [sequences,        setSequences]        = useState([]);
  const [terms,            setTerms]            = useState([]);
  const [selectedClass,    setSelectedClass]    = useState("");
  const [selectedSequence, setSelectedSequence] = useState("");
  const [loading,          setLoading]          = useState(true);
  const [generating,       setGenerating]       = useState(null);

  useEffect(() => {
    async function init() {
      let classQuery = supabase.from("classes").select("*").order("name");
      if (profile?.role === "teacher") {
        classQuery = classQuery.eq("teacher_id", profile.id);
      }
      const [{ data: cls }, { data: seqs }, { data: trms }] = await Promise.all([
        classQuery,
        supabase.from("sequences").select("*").order("created_at"),
        supabase.from("terms").select("*").order("created_at"),
      ]);
      setClasses(cls   || []);
      setSequences(seqs || []);
      setTerms(trms    || []);
      if ((cls  || []).length) setSelectedClass(cls[0].id);
      const active = (seqs || []).find(s => s.is_active);
      if (active) setSelectedSequence(active.id);
      else if ((seqs || []).length) setSelectedSequence(seqs[0].id);
      setLoading(false);
    }
    if (profile) init();
  }, [profile]);

  function getLogoDataUrl() {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width  = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = "/logo_ma.png";
    });
  }

  function addHeader(doc, classObj, seqLabel, title) {
    doc.setFillColor(26, 107, 60);
    doc.rect(0, 0, 210, 28, "F");
    if (doc._logoDataUrl) {
      doc.addImage(doc._logoDataUrl, "PNG", 8, 3, 22, 22);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Ss. Mary & Elizabeth Nursery and Primary Academy", 35, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("MARELI Academy · Buea, Cameroon", 35, 16);
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 28, 210, 2, "F");
    doc.setTextColor(26, 107, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, 105, 40, { align: "center" });
    doc.setFillColor(240, 247, 240);
    doc.rect(10, 44, 190, 14, "F");
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Class: " + classObj.name + "  |  Level: " + classObj.level + "  |  Teacher: " + (classObj.teacher_name || "—") + "  |  " + seqLabel, 15, 53);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Printed: " + new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }), 170, 53, { align: "right" });
    return 62;
  }

  function addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(26, 107, 60);
      doc.rect(0, 287, 210, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text("MARELI Academy Management System · Buea, Cameroon", 10, 293);
      doc.text("Page " + i + " of " + pageCount, 200, 293, { align: "right" });
    }
  }

  async function downloadEmptyList() {
    if (!selectedClass) { toast.error("Select a class first"); return; }
    setGenerating("empty");

    const classObj = classes.find(c => c.id === selectedClass);
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id, students(id, full_name, gender, date_of_birth, birth_certificate_no)")
      .eq("class_id", selectedClass);

    const students = (classStudents || [])
      .map(r => r.students)
      .filter(Boolean)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    if (!students.length) { toast.error("No students in this class"); setGenerating(null); return; }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc._logoDataUrl = await getLogoDataUrl();
    const startY = addHeader(doc, classObj, "", "CLASS REGISTER");

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Date: ___________________     Teacher signature: ___________________________", 15, startY);

    autoTable(doc, {
      startY: startY + 8,
      head: [["#", "Full Name", "Gender", "Date of Birth", "BC Number", "Signature"]],
      body: students.map((s, i) => [
        i + 1,
        s.full_name,
        s.gender === "female" ? "F" : "M",
        s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-GB") : "—",
        s.birth_certificate_no || "—",
        "",
      ]),
      headStyles: { fillColor: [26, 107, 60], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      bodyStyles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 65 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 28 },
        4: { cellWidth: 35 },
        5: { cellWidth: 34 },
      },
      margin: { left: 10, right: 10 },
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFillColor(240, 247, 240);
    doc.rect(10, finalY, 190, 18, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 107, 60);
    doc.text("Total: " + students.length + "   Boys: " + students.filter(s => s.gender !== "female").length + "   Girls: " + students.filter(s => s.gender === "female").length, 15, finalY + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Head Teacher signature: ___________________________", 15, finalY + 15);

    addFooter(doc);
    doc.save("MARELI_" + classObj.name + "_Register.pdf");
    toast.success("Class register downloaded!");
    setGenerating(null);
  }

  async function downloadMarkSheet() {
    if (!selectedClass || !selectedSequence) { toast.error("Select a class and sequence"); return; }
    setGenerating("marks");

    const classObj = classes.find(c => c.id === selectedClass);
    const seqObj   = sequences.find(s => s.id === selectedSequence);
    const termObj  = terms.find(t => t.id === seqObj?.term_id);
    const seqLabel = (seqObj?.name || "") + " · " + (termObj?.name || "");

    const [{ data: classStudents }, { data: subjects }] = await Promise.all([
      supabase.from("class_students").select("student_id, students(id, full_name, gender)").eq("class_id", selectedClass),
      supabase.from("subjects").select("*").eq("class_id", selectedClass).order("name"),
    ]);

    const students = (classStudents || []).map(r => r.students).filter(Boolean)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    if (!students.length) { toast.error("No students in this class"); setGenerating(null); return; }
    if (!subjects?.length) { toast.error("No subjects for this class"); setGenerating(null); return; }

    const { data: grades } = await supabase
      .from("grades").select("student_id, subject_id, score")
      .eq("sequence_id", selectedSequence)
      .in("student_id", students.map(s => s.id));

    const gradeMap = {};
    (grades || []).forEach(g => { gradeMap[g.student_id + "_" + g.subject_id] = g.score; });

    function weightedAvg(studentId) {
      let pts = 0, coeff = 0;
      subjects.forEach(sub => {
        const score = gradeMap[studentId + "_" + sub.id];
        if (score !== undefined && score !== null) { pts += parseFloat(score) * sub.coefficient; coeff += sub.coefficient; }
      });
      return coeff ? (pts / coeff).toFixed(2) : null;
    }

    function gradeLabel(avg) {
      if (!avg) return "—";
      const n = parseFloat(avg);
      if (n >= 16) return "A"; if (n >= 13) return "B";
      if (n >= 10) return "C"; if (n >= 8)  return "D";
      return "F";
    }

    const ranked = [...students].map(s => ({ ...s, avg: weightedAvg(s.id) }))
      .sort((a, b) => { if (!a.avg) return 1; if (!b.avg) return -1; return parseFloat(b.avg) - parseFloat(a.avg); });

    const orientation = subjects.length > 6 ? "landscape" : "portrait";
    const pageW = orientation === "landscape" ? 297 : 210;
    const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
    doc._logoDataUrl = await getLogoDataUrl();

    const startY = addHeader(doc, classObj, seqLabel, "MARKS SHEET — " + (seqObj?.name || "").toUpperCase());

    autoTable(doc, {
      startY: startY + 4,
      head: [[
        { content: "#",         styles: { halign: "center", cellWidth: 8  } },
        { content: "Full Name", styles: { halign: "left",   cellWidth: 55 } },
        { content: "G",         styles: { halign: "center", cellWidth: 8  } },
        ...subjects.map(sub => ({ content: sub.name + "\n(x" + sub.coefficient + ")", styles: { halign: "center", fontSize: 7 } })),
        { content: "Avg/20",    styles: { halign: "center", cellWidth: 16, fontStyle: "bold" } },
        { content: "Grade",     styles: { halign: "center", cellWidth: 14 } },
        { content: "Rank",      styles: { halign: "center", cellWidth: 13 } },
      ]],
      body: ranked.map((s, rank) => [
        rank + 1, s.full_name, s.gender === "female" ? "F" : "M",
        ...subjects.map(sub => { const sc = gradeMap[s.id + "_" + sub.id]; return sc !== undefined && sc !== null ? sc : "—"; }),
        s.avg || "—", gradeLabel(s.avg),
        rank === 0 ? "1st" : rank === 1 ? "2nd" : rank === 2 ? "3rd" : (rank + 1) + "th",
      ]),
      headStyles: { fillColor: [26,107,60], textColor: [255,255,255], fontStyle: "bold", fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { halign: "center" }, 2: { halign: "center" } },
      margin: { left: 8, right: 8 },
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFillColor(240, 247, 240);
    doc.rect(8, finalY, pageW - 16, 20, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 107, 60);
    const passCount = ranked.filter(s => s.avg && parseFloat(s.avg) >= 10).length;
    doc.text("Total: " + students.length + "  |  Pass: " + passCount + "  |  Fail: " + (students.length - passCount), 12, finalY + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Class Teacher: ___________________________", 12, finalY + 16);
    doc.text("Head Teacher: ___________________________", 110, finalY + 16);

    addFooter(doc);
    doc.save("MARELI_" + classObj.name + "_" + (seqObj?.name || "") + "_Marks.pdf");
    toast.success("Marks sheet downloaded!");
    setGenerating(null);
  }

  const selectedClassObj    = classes.find(c => c.id === selectedClass);
  const selectedSequenceObj = sequences.find(s => s.id === selectedSequence);
  const termForSeq = selectedSequenceObj ? terms.find(t => t.id === selectedSequenceObj.term_id) : null;

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading...
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Class Lists</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download printable class registers and marks sheets</p>
      </div>

      <div className="card p-5 flex flex-wrap gap-5 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Class</label>
          {classes.length === 0 ? (
            <div className="text-sm text-amber-600 flex items-center gap-1"><Info size={14}/> No classes yet</div>
          ) : (
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="input w-auto text-sm py-2 min-w-[200px]">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.level}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sequence (for marks sheet)</label>
          <div className="flex gap-2 flex-wrap">
            {sequences.map(seq => {
              const term = terms.find(t => t.id === seq.term_id);
              return (
                <button key={seq.id} onClick={() => setSelectedSequence(seq.id)}
                  className={"px-3 py-2 rounded-xl text-xs font-medium border transition-all " +
                    (selectedSequence === seq.id ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary")}>
                  {seq.name}{term ? " · " + term.name : ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedClassObj && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge-green">{selectedClassObj.name}</span>
          {selectedClassObj.teacher_name && <span className="badge-blue">👤 {selectedClassObj.teacher_name}</span>}
          {selectedSequenceObj && <span className="badge-amber">{selectedSequenceObj.name}{termForSeq ? " · " + termForSeq.name : ""}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card border-2 border-dashed border-green-200 hover:border-green-400 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Users size={26} className="text-primary"/>
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-gray-900 text-lg">Empty Class Register</h3>
              <p className="text-sm text-gray-500 mt-1">Student names, gender, date of birth and signature column. Perfect for paper attendance.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="badge-green">Student list</span>
                <span className="badge-blue">Signature column</span>
                <span className="badge-amber">For teachers</span>
              </div>
            </div>
          </div>
          <button onClick={downloadEmptyList} disabled={generating === "empty" || !selectedClass}
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
            {generating === "empty" ? <><Loader2 size={16} className="animate-spin"/> Generating...</> : <><Download size={16}/> Download Empty Register</>}
          </button>
        </div>

        <div className="card border-2 border-dashed border-amber-200 hover:border-amber-400 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <BookOpen size={26} className="text-secondary"/>
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-gray-900 text-lg">Marks Sheet</h3>
              <p className="text-sm text-gray-500 mt-1">Complete marks for the selected sequence with weighted averages, grades and class ranking.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="badge-green">All subjects</span>
                <span className="badge-blue">Weighted avg</span>
                <span className="badge-amber">Class ranking</span>
              </div>
            </div>
          </div>
          <button onClick={downloadMarkSheet} disabled={generating === "marks" || !selectedClass || !selectedSequence}
            className="btn-secondary w-full mt-5 flex items-center justify-center gap-2">
            {generating === "marks" ? <><Loader2 size={16} className="animate-spin"/> Generating...</> : <><FileText size={16}/> Download Marks Sheet</>}
          </button>
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-100 flex items-start gap-3 p-4">
        <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0"/>
        <div className="text-sm text-blue-700">
          <strong>Tips:</strong> Empty register prints on A4 portrait. Marks sheet switches to landscape automatically when there are more than 6 subjects. Both include MARELI Academy branding.
        </div>
      </div>
    </div>
  );
}
