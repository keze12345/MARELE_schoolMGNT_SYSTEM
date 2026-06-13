import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Loader2, Printer, Info, ChevronLeft, FileText, Save } from "lucide-react";
import toast from "react-hot-toast";

const SCHOOL_NAME = "SS. Mary and Elizabeth Nursery and Primary Academy";
const SCHOOL_MOTTO = "Excellence in Education";
const SCHOOL_LOCATION = "Buea, South West Region, Cameroon";
const CURRENT_YEAR = "2024-2025";

const DOMAIN_ORDER = [
  "Languages and Literature",
  "Maths and Science",
  "Social Studies",
  "Religious Studies",
  "Vocational Studies and Sports",
  "General",
];

function gradeInfo(score) {
  if (score === null || score === undefined) return { letter: "—", remark: "—", color: "#666" };
  const pct = (score / 20) * 100;
  if (pct >= 80) return { letter: "A", remark: "Excellent",          color: "#1a6b3c" };
  if (pct >= 65) return { letter: "B", remark: "Very Good",          color: "#2563eb" };
  if (pct >= 50) return { letter: "C", remark: "Good",               color: "#d97706" };
  if (pct >= 40) return { letter: "D", remark: "Fair",               color: "#ea580c" };
  return              { letter: "F", remark: "Needs Improvement",   color: "#dc2626" };
}

function ordinal(n) {
  if (!n) return "—";
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

export default function ReportCards() {
  const { profile } = useAuth();
  const [classes,   setClasses]   = useState([]);
  const [terms,     setTerms]     = useState([]);
  const [sequences, setSequences] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm,  setSelectedTerm]  = useState("");
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [viewMode,  setViewMode]  = useState("list");
  const [activeStudent, setActiveStudent] = useState(null);
  const [cardData,  setCardData]  = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [allCardsData, setAllCardsData] = useState([]);
  const [remarkForm, setRemarkForm] = useState({ teacher_remark: "", headteacher_remark: "", conduct: "Good" });
  const [savingRemark, setSavingRemark] = useState(false);

  const isTeacher = profile?.role === "teacher";
  const isAdminOrHead = profile?.role === "admin" || profile?.role === "headmaster";

  useEffect(() => {
    async function init() {
      let classQuery = supabase.from("classes").select("*").order("name");
      if (isTeacher) classQuery = classQuery.eq("teacher_id", profile.id);

      const [{ data: cls }, { data: trms }, { data: seqs }] = await Promise.all([
        classQuery,
        supabase.from("terms").select("*").order("created_at"),
        supabase.from("sequences").select("*").order("created_at"),
      ]);
      setClasses(cls || []);
      setTerms(trms || []);
      setSequences(seqs || []);
      if ((cls || []).length)  setSelectedClass(cls[0].id);
      if ((trms || []).length) setSelectedTerm(trms[0].id);
      setInitLoading(false);
    }
    if (profile) init();
  }, [profile]);

  useEffect(() => {
    if (!selectedClass) return;
    fetchStudents();
  }, [selectedClass]);

  async function fetchStudents() {
    setLoading(true);
    const { data } = await supabase
      .from("class_students")
      .select("student_id, students(id, full_name, photo_url, gender, date_of_birth, birth_certificate_no, parent_name, parent_phone)")
      .eq("class_id", selectedClass);
    setStudents((data || []).map(r => r.students).filter(Boolean));
    setLoading(false);
  }

  const termSequences = sequences.filter(s => s.term_id === selectedTerm);
  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const selectedTermObj  = terms.find(t => t.id === selectedTerm);

  async function buildCardData(student, subs, allClassGrades) {
    const subjects = subs || [];

    // Build this student's score matrix
    const scoreMatrix = {};
    subjects.forEach(sub => {
      scoreMatrix[sub.id] = {};
      termSequences.forEach(seq => { scoreMatrix[sub.id][seq.id] = null; });
    });
    (allClassGrades || []).filter(g => g.student_id === student.id).forEach(g => {
      if (scoreMatrix[g.subject_id]) scoreMatrix[g.subject_id][g.sequence_id] = g.score;
    });

    // Per-subject term average for this student
    const subjectAverages = {};
    subjects.forEach(sub => {
      const vals = termSequences.map(seq => scoreMatrix[sub.id][seq.id]).filter(v => v !== null);
      subjectAverages[sub.id] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    });

    // Per-subject class averages and highest marks (across all students in this class/term)
    const allStudentIds = students.map(s => s.id);
    const classSubjectStats = {};
    subjects.forEach(sub => {
      const allScores = [];
      allStudentIds.forEach(sid => {
        const seqScores = termSequences
          .map(seq => (allClassGrades||[]).find(g => g.student_id===sid && g.subject_id===sub.id && g.sequence_id===seq.id)?.score)
          .filter(v => v !== null && v !== undefined);
        if (seqScores.length) allScores.push(seqScores.reduce((a,b)=>a+b,0)/seqScores.length);
      });
      classSubjectStats[sub.id] = {
        classAvg: allScores.length ? (allScores.reduce((a,b)=>a+b,0)/allScores.length) : null,
        highest:  allScores.length ? Math.max(...allScores) : null,
      };
    });

    // Overall weighted term average for this student
    let totalPoints = 0, totalCoeff = 0;
    subjects.forEach(sub => {
      const avg = subjectAverages[sub.id];
      if (avg !== null) { totalPoints += avg * sub.coefficient; totalCoeff += sub.coefficient; }
    });
    const overallAvg = totalCoeff ? totalPoints / totalCoeff : null;

    // Class ranking
    const allAverages = await Promise.all(
      students.map(async s => {
        if (s.id === student.id) return { id: s.id, avg: overallAvg };
        const seqIds = termSequences.map(seq => seq.id);
        const stuGrades = (allClassGrades||[]).filter(g => g.student_id===s.id && seqIds.includes(g.sequence_id));
        const stuSubAvgs = {};
        subjects.forEach(sub => {
          const vals = termSequences
            .map(seq => stuGrades.find(g=>g.subject_id===sub.id&&g.sequence_id===seq.id)?.score)
            .filter(v=>v!==null&&v!==undefined);
          stuSubAvgs[sub.id] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
        });
        let tp=0,tc=0;
        subjects.forEach(sub=>{
          if(stuSubAvgs[sub.id]!==null){tp+=stuSubAvgs[sub.id]*sub.coefficient;tc+=sub.coefficient;}
        });
        return { id: s.id, avg: tc ? tp/tc : null };
      })
    );
    const sorted = allAverages.filter(a=>a.avg!==null).sort((a,b)=>b.avg-a.avg);
    const rank = sorted.findIndex(a=>a.id===student.id)+1;

    // Class overall average
    const classOverallAvg = sorted.length
      ? sorted.reduce((a,b)=>a+(b.avg||0),0)/sorted.length : null;

    // Group subjects by domain in order
    const grouped = {};
    DOMAIN_ORDER.forEach(d => { grouped[d] = []; });
    subjects.forEach(sub => {
      const d = sub.domain || "General";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(sub);
    });

    return {
      student,
      subjects, scoreMatrix, subjectAverages, overallAvg,
      rank, totalStudents: students.length,
      classSubjectStats, classOverallAvg, grouped,
    };
  }

  async function openReportCard(student) {
    setActiveStudent(student);
    setViewMode("card");
    setCardLoading(true);

    const [{ data: subs }, { data: allClassGrades }, { data: remark }] = await Promise.all([
      supabase.from("subjects").select("*").eq("class_id", selectedClass).order("name"),
      supabase.from("grades").select("student_id, subject_id, sequence_id, score")
        .in("sequence_id", termSequences.map(s => s.id)),
      supabase.from("remarks").select("*")
        .eq("student_id", student.id).eq("term_id", selectedTerm).maybeSingle(),
    ]);

    const data = await buildCardData(student, subs, allClassGrades);
    setCardData(data);
    setRemarkForm({
      teacher_remark: remark?.teacher_remark || "",
      headteacher_remark: remark?.headteacher_remark || "",
      conduct: remark?.conduct || "Good",
    });
    setCardLoading(false);
  }

  async function openAllReportCards() {
    setViewMode("all");
    setCardLoading(true);

    const [{ data: subs }, { data: allClassGrades }, { data: remarks }] = await Promise.all([
      supabase.from("subjects").select("*").eq("class_id", selectedClass).order("name"),
      supabase.from("grades").select("student_id, subject_id, sequence_id, score")
        .in("sequence_id", termSequences.map(s => s.id)),
      supabase.from("remarks").select("*").eq("term_id", selectedTerm).in("student_id", students.map(s=>s.id)),
    ]);

    const allData = await Promise.all(students.map(s => buildCardData(s, subs, allClassGrades)));
    const remarksMap = {};
    (remarks || []).forEach(r => { remarksMap[r.student_id] = r; });
    setAllCardsData(allData.map(d => ({
      ...d,
      remark: remarksMap[d.student.id] || { teacher_remark:"", headteacher_remark:"", conduct:"Good" },
    })));
    setCardLoading(false);
  }

  async function saveRemark() {
    setSavingRemark(true);
    const { error } = await supabase.from("remarks").upsert({
      student_id: activeStudent.id,
      term_id: selectedTerm,
      ...remarkForm,
    }, { onConflict: "student_id,term_id" });
    if (error) toast.error(error.message);
    else toast.success("Remarks saved");
    setSavingRemark(false);
  }

  function backToList() { setViewMode("list"); setActiveStudent(null); setCardData(null); }

  if (initLoading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading...
    </div>
  );

  // ===================== CARD VIEW =====================
  if (viewMode === "card" && activeStudent) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden flex-wrap gap-2">
          <button onClick={backToList} className="btn-ghost flex items-center gap-2 text-sm">
            <ChevronLeft size={16}/> Back to class list
          </button>
          <div className="flex gap-2">
            {isTeacher && (
              <button onClick={saveRemark} disabled={savingRemark}
                className="btn-secondary flex items-center gap-2 text-sm">
                {savingRemark && <Loader2 size={14} className="animate-spin"/>}
                <Save size={14}/> Save Remarks
              </button>
            )}
            <button onClick={() => {
              const studentName = (cardData?.student?.full_name || activeStudent?.full_name || "Student").replace(/\s+/g, "_");
              const termName = (terms.find(t => t.id === selectedTerm)?.name || "Term").replace(/\s+/g, "_");
              const prevTitle = document.title;
              document.title = `Report_Card_${studentName}_${termName}`;
              window.print();
              setTimeout(() => { document.title = prevTitle; }, 1000);
            }} className="btn-primary flex items-center gap-2">
              <Printer size={16}/> Print / Save as PDF
            </button>
          </div>
        </div>

        {cardLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20}/> Generating report card...
          </div>
        ) : (
          <>
          <style>{`
            @media print {
              @page { size: A4; margin: 8mm; }
              body * { visibility: hidden; }
              #report-card, #report-card * { visibility: visible; }
              #report-card { position: absolute; top: 0; left: 0; width: 100%; transform-origin: top left; background: white !important; }
              #report-card table, #report-card tbody, #report-card tr, #report-card td, #report-card th {
                background: transparent !important; background-color: transparent !important;
              }

              #report-card td[style*="145c30"], #report-card th[style*="145c30"] { background: #145c30 !important; }
              #report-card td[style*="2d5a8e"], #report-card th[style*="2d5a8e"] { background: #2d5a8e !important; }
              #report-card td[style*="7a5200"], #report-card th[style*="7a5200"] { background: #7a5200 !important; }
              #report-card td[colspan] { background: transparent !important; }
              .no-print { display: none !important; }
              #report-card table { font-size: 9px !important; }
              #report-card td, #report-card th { padding: 2px 4px !important; }
            }
          `}</style>
          <div id="report-card" style={{ fontFamily: "Georgia, serif", background: "white", padding: "24px", border: "1px solid #ccc", borderRadius: "12px", position: "relative" }}>
            {/* Watermark */}
            <img src="/logo_bg.png" alt="" style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "70%", maxWidth: "480px", opacity: 0.04,
              pointerEvents: "none", zIndex: 0, objectFit: "contain",
            }}/>
            <div style={{ position: "relative", zIndex: 1 }}>

            {/* ── HEADER ── */}
            <div style={{ display:"flex", alignItems:"center", gap:"16px", borderBottom:"3px double #1a6b3c", paddingBottom:"12px", marginBottom:"12px" }}>
              <img src="/logo_ma.png" alt="MARELI" style={{ width:80, height:80, objectFit:"contain" }}/>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:"15px", fontWeight:"bold", color:"#1a6b3c", textTransform:"uppercase", letterSpacing:"0.5px" }}>{SCHOOL_NAME}</div>
                <div style={{ fontSize:"11px", color:"#555", marginTop:"2px" }}>"{SCHOOL_MOTTO}"</div>
                <div style={{ fontSize:"11px", color:"#555" }}>{SCHOOL_LOCATION}</div>
                <div style={{ fontSize:"13px", fontWeight:"bold", color:"#8B1A1A", marginTop:"4px", textTransform:"uppercase", letterSpacing:"1px" }}>
                  PUPIL'S REPORT CARD — {selectedTermObj?.name?.toUpperCase()} · {CURRENT_YEAR}
                </div>
              </div>
              {activeStudent.photo_url ? (
                <img src={activeStudent.photo_url} alt={activeStudent.full_name}
                  style={{ width:80, height:80, borderRadius:"8px", objectFit:"cover", border:"2px solid #1a6b3c" }}/>
              ) : (
                <div style={{ width:80, height:80, borderRadius:"8px", background: activeStudent.gender==="female"?"#e63946":"#1a6b3c",
                  display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:"28px", fontWeight:"bold" }}>
                  {activeStudent.full_name.charAt(0)}
                </div>
              )}
            </div>

            {/* ── STUDENT INFO ── */}
            <table style={{ width:"100%", fontSize:"11px", marginBottom:"12px", borderCollapse:"collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding:"3px 8px 3px 0", width:"25%", color:"#555" }}>Pupil's Name:</td>
                  <td style={{ padding:"3px 8px", fontWeight:"bold", borderBottom:"1px solid #ccc", width:"35%" }}>{activeStudent.full_name}</td>
                  <td style={{ padding:"3px 8px 3px 12px", color:"#555", width:"15%" }}>Class:</td>
                  <td style={{ padding:"3px 0", fontWeight:"bold", borderBottom:"1px solid #ccc" }}>{selectedClassObj?.name} ({selectedClassObj?.level})</td>
                </tr>
                <tr>
                  <td style={{ padding:"3px 8px 3px 0", color:"#555" }}>Date of Birth:</td>
                  <td style={{ padding:"3px 8px", borderBottom:"1px solid #ccc" }}>{activeStudent.date_of_birth || "—"}</td>
                  <td style={{ padding:"3px 8px 3px 12px", color:"#555" }}>Gender:</td>
                  <td style={{ padding:"3px 0", borderBottom:"1px solid #ccc", textTransform:"capitalize" }}>{activeStudent.gender}</td>
                </tr>
                <tr>
                  <td style={{ padding:"3px 8px 3px 0", color:"#555" }}>Acte de Naissance No:</td>
                  <td style={{ padding:"3px 8px", borderBottom:"1px solid #ccc" }}>{activeStudent.birth_certificate_no || "—"}</td>
                  <td style={{ padding:"3px 8px 3px 12px", color:"#555" }}>Academic Year:</td>
                  <td style={{ padding:"3px 0", borderBottom:"1px solid #ccc" }}>{CURRENT_YEAR}</td>
                </tr>
                <tr>
                  <td style={{ padding:"3px 8px 3px 0", color:"#555" }}>Parent/Guardian:</td>
                  <td style={{ padding:"3px 8px", borderBottom:"1px solid #ccc" }}>{activeStudent.parent_name || "—"}</td>
                  <td style={{ padding:"3px 8px 3px 12px", color:"#555" }}>Contact:</td>
                  <td style={{ padding:"3px 0", borderBottom:"1px solid #ccc" }}>{activeStudent.parent_phone || "—"}</td>
                </tr>
              </tbody>
            </table>

            {/* ── GRADES TABLE ── */}
            <table style={{ width:"100%", fontSize:"10.5px", borderCollapse:"collapse", marginBottom:"12px" }}>
              <thead>
                <tr style={{ background:"#1a6b3c", color:"white" }}>
                  <th style={{ padding:"6px 8px", textAlign:"left", border:"1px solid #155a33", width:"28%" }}>SUBJECT</th>
                  <th style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"8%" }}>COEFF</th>
                  {termSequences.map(seq => (
                    <th key={seq.id} style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"10%" }}>
                      {seq.name}<br/><span style={{ fontWeight:"normal", fontSize:"9px" }}>/20</span>
                    </th>
                  ))}
                  <th style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"10%", background:"#145c30" }}>
                    TERM AVG<br/><span style={{ fontWeight:"normal", fontSize:"9px" }}>/20</span>
                  </th>
                  <th style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"10%", background:"#2d5a8e" }}>
                    CLASS AVG<br/><span style={{ fontWeight:"normal", fontSize:"9px" }}>/20</span>
                  </th>
                  <th style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"10%", background:"#7a5200" }}>
                    HIGHEST<br/><span style={{ fontWeight:"normal", fontSize:"9px" }}>/20</span>
                  </th>
                  <th style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"8%" }}>GRADE</th>
                  <th style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", width:"12%" }}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {DOMAIN_ORDER.map(domain => {
                  const domainSubs = (cardData.grouped[domain] || []);
                  if (!domainSubs.length) return null;
                  return [
                    <tr key={`domain-${domain}`}>
                      <td colSpan={7 + termSequences.length}
                        style={{ padding:"4px 8px", background:"#f0f7f0", fontWeight:"bold", fontSize:"10px",
                          color:"#1a6b3c", borderLeft:"3px solid #1a6b3c", border:"1px solid #ddd", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                        {domain}
                      </td>
                    </tr>,
                    ...domainSubs.map((sub, idx) => {
                      const avg  = cardData.subjectAverages[sub.id];
                      const g    = gradeInfo(avg);
                      const stats = cardData.classSubjectStats[sub.id];
                      const rowBg = idx % 2 === 0 ? "white" : "#fafafa";
                      return (
                        <tr key={sub.id} style={{ background: rowBg }}>
                          <td style={{ padding:"5px 8px", border:"1px solid #e0e0e0" }}>{sub.name}</td>
                          <td style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", color:"#666" }}>{sub.coefficient}</td>
                          {termSequences.map(seq => {
                            const score = cardData.scoreMatrix[sub.id][seq.id];
                            return (
                              <td key={seq.id} style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", fontWeight:"500" }}>
                                {score !== null ? score : "—"}
                              </td>
                            );
                          })}
                          <td style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", fontWeight:"bold", color: g.color, background:"#f0fff4" }}>
                            {avg !== null ? avg.toFixed(2) : "—"}
                          </td>
                          <td style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", color:"#2d5a8e", background:"#f0f4ff" }}>
                            {stats?.classAvg !== null ? stats.classAvg.toFixed(2) : "—"}
                          </td>
                          <td style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", color:"#7a5200", background:"#fffbf0" }}>
                            {stats?.highest !== null ? stats.highest.toFixed(2) : "—"}
                          </td>
                          <td style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", fontWeight:"bold", color: g.color }}>
                            {g.letter}
                          </td>
                          <td style={{ padding:"5px 4px", textAlign:"center", border:"1px solid #e0e0e0", color: g.color, fontSize:"9.5px" }}>
                            {g.remark}
                          </td>
                        </tr>
                      );
                    })
                  ];
                })}

                {/* Summary row */}
                <tr style={{ background:"#1a6b3c", color:"white", fontWeight:"bold" }}>
                  <td colSpan={2} style={{ padding:"6px 8px", border:"1px solid #155a33", textAlign:"right" }}>OVERALL TERM AVERAGE</td>
                  {termSequences.map(seq => <td key={seq.id} style={{ border:"1px solid #155a33" }}/>)}
                  <td style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", fontSize:"13px" }}>
                    {cardData.overallAvg !== null ? cardData.overallAvg.toFixed(2) : "—"}
                  </td>
                  <td style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", background:"rgba(0,0,0,0.15)" }}>
                    {cardData.classOverallAvg !== null ? cardData.classOverallAvg.toFixed(2) : "—"}
                  </td>
                  <td style={{ border:"1px solid #155a33" }}/>
                  <td style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33", fontSize:"13px" }}>
                    {gradeInfo(cardData.overallAvg).letter}
                  </td>
                  <td style={{ padding:"6px 4px", textAlign:"center", border:"1px solid #155a33" }}>
                    {ordinal(cardData.rank)} / {cardData.totalStudents}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── REMARKS ── */}
            <table style={{ width:"100%", fontSize:"11px", borderCollapse:"collapse", marginBottom:"16px" }}>
              <tbody>
                <tr>
                  <td style={{ width:"20%", padding:"6px 8px", background:"#f0f7f0", fontWeight:"bold", border:"1px solid #ccc", color:"#1a6b3c" }}>Conduct / Discipline:</td>
                  <td style={{ padding:"6px 8px", border:"1px solid #ccc", width:"30%" }}>
                    {isTeacher ? (
                      <select value={remarkForm.conduct}
                        onChange={e => setRemarkForm(p=>({...p, conduct:e.target.value}))}
                        className="print:hidden"
                        style={{ border:"none", background:"transparent", fontSize:"11px", width:"100%" }}>
                        {["Excellent","Very Good","Good","Fair","Needs Improvement","Poor"].map(c=>(
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : null}
                    <span className="print:inline hidden">{remarkForm.conduct}</span>
                    {!isTeacher && <span>{remarkForm.conduct || "—"}</span>}
                  </td>
                  <td style={{ width:"20%", padding:"6px 8px", background:"#f0f7f0", fontWeight:"bold", border:"1px solid #ccc", color:"#1a6b3c" }}>Class Position:</td>
                  <td style={{ padding:"6px 8px", border:"1px solid #ccc", fontWeight:"bold", textAlign:"center" }}>
                    {ordinal(cardData.rank)} out of {cardData.totalStudents}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding:"6px 8px", background:"#f0f7f0", fontWeight:"bold", border:"1px solid #ccc", color:"#1a6b3c", verticalAlign:"top" }}>Class Teacher's Remark:</td>
                  <td colSpan={3} style={{ padding:"6px 8px", border:"1px solid #ccc", minHeight:"36px" }}>
                    {isTeacher ? (
                      <textarea
                        className="print:hidden"
                        value={remarkForm.teacher_remark}
                        onChange={e => setRemarkForm(p=>({...p, teacher_remark:e.target.value}))}
                        placeholder="Enter your remark on this pupil's performance..."
                        style={{ width:"100%", border:"none", background:"transparent", fontSize:"11px", resize:"none", outline:"none", minHeight:"32px" }}
                        rows={2}/>
                    ) : null}
                    <span className="print:inline hidden">{remarkForm.teacher_remark}</span>
                    {!isTeacher && <span>{remarkForm.teacher_remark || "—"}</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding:"6px 8px", background:"#f0f7f0", fontWeight:"bold", border:"1px solid #ccc", color:"#1a6b3c", verticalAlign:"top" }}>Head Teacher's Remark:</td>
                  <td colSpan={3} style={{ padding:"6px 8px", border:"1px solid #ccc", minHeight:"36px" }}>
                    {isAdminOrHead ? (
                      <textarea
                        className="print:hidden"
                        value={remarkForm.headteacher_remark}
                        onChange={e => setRemarkForm(p=>({...p, headteacher_remark:e.target.value}))}
                        placeholder="Head teacher's remark..."
                        style={{ width:"100%", border:"none", background:"transparent", fontSize:"11px", resize:"none", outline:"none", minHeight:"32px" }}
                        rows={2}/>
                    ) : null}
                    <span className="print:inline hidden">{remarkForm.headteacher_remark}</span>
                    {!isTeacher && !isAdminOrHead && <span>{remarkForm.headteacher_remark || "—"}</span>}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── SIGNATURES ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"24px", fontSize:"11px", marginTop:"8px" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ borderTop:"1px solid #333", paddingTop:"4px", marginTop:"40px" }}>Class Teacher's Signature</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ borderTop:"1px solid #333", paddingTop:"4px", marginTop:"40px" }}>Parent / Guardian's Signature</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ borderTop:"1px solid #333", paddingTop:"4px", marginTop:"40px" }}>Head Teacher's Signature & Stamp</div>
              </div>
            </div>

            {/* ── GRADE KEY ── */}
            <div style={{ marginTop:"16px", padding:"8px", background:"#f9f9f9", border:"1px solid #e0e0e0", borderRadius:"6px", fontSize:"9.5px", color:"#666" }}>
              <strong>GRADE KEY:</strong>&nbsp;&nbsp;
              A (80–100%) = Excellent &nbsp;|&nbsp; B (65–79%) = Very Good &nbsp;|&nbsp; C (50–64%) = Good &nbsp;|&nbsp; D (40–49%) = Fair &nbsp;|&nbsp; F (&lt;40%) = Needs Improvement
            </div>
            </div>
            </div>
          </>
        )}

        {/* Save remarks button (bottom, screen only) */}
        {isTeacher && !cardLoading && (
          <div className="print:hidden flex justify-end">
            <button onClick={saveRemark} disabled={savingRemark}
              className="btn-primary flex items-center gap-2">
              {savingRemark && <Loader2 size={14} className="animate-spin"/>}
              <Save size={14}/> Save Remarks & Print
            </button>
          </div>
        )}
        {isAdminOrHead && !cardLoading && (
          <div className="print:hidden flex justify-end">
            <button onClick={saveRemark} disabled={savingRemark}
              className="btn-secondary flex items-center gap-2">
              {savingRemark && <Loader2 size={14} className="animate-spin"/>}
              <Save size={14}/> Save Head Teacher's Remark
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===================== LIST VIEW =====================
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Report Cards</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select a class and term, then click a student to generate their report card</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          {classes.length === 0 ? (
            <div className="text-sm text-amber-600 flex items-center gap-1"><Info size={14}/> No classes available</div>
          ) : (
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="input w-auto text-sm py-2">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.level}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Term</label>
          {terms.length === 0 ? (
            <div className="text-sm text-amber-600 flex items-center gap-1"><Info size={14}/> No terms available</div>
          ) : (
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="input w-auto text-sm py-2">
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>
        {termSequences.length > 0 && (
          <span className="badge-blue ml-auto">{termSequences.length} sequence(s) in this term</span>
        )}
      </div>

      {termSequences.length === 0 && selectedTerm && (
        <div className="card border-amber-200 bg-amber-50 flex items-start gap-3 p-4">
          <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0"/>
          <div className="text-sm text-amber-800">
            This term has no sequences yet. Create sequences in <strong>Academic Setup</strong> and enter grades before generating report cards.
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18}/> Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No students in this class.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map((s, i) => (
              <button key={s.id} onClick={() => openReportCard(s)}
                disabled={termSequences.length === 0}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-5 font-mono">{i+1}</span>
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-green-100"/>
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: s.gender==="female"?"#e63946":"#1a6b3c" }}>
                      {s.full_name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-gray-800 text-sm">{s.full_name}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <FileText size={14}/> View report card
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
