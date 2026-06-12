import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, Save, Info, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const CURRENT_YEAR = "2024-2025";

function gradeInfo(score, max = 20) {
  if (score === null || score === undefined || score === "") return { letter: "—", color: "text-gray-400", bg: "" };
  const pct = (parseFloat(score) / max) * 100;
  if (pct >= 80) return { letter: "A", color: "text-green-600",  bg: "bg-green-50"  };
  if (pct >= 65) return { letter: "B", color: "text-blue-600",   bg: "bg-blue-50"   };
  if (pct >= 50) return { letter: "C", color: "text-amber-600",  bg: "bg-amber-50"  };
  if (pct >= 40) return { letter: "D", color: "text-orange-600", bg: "bg-orange-50" };
  return              { letter: "F", color: "text-red-600",    bg: "bg-red-50"    };
}

export default function Grades() {
  const { profile } = useAuth();
  const [classes,      setClasses]      = useState([]);
  const [sequences,    setSequences]    = useState([]);
  const [terms,        setTerms]        = useState([]);
  const [selectedClass,    setSelectedClass]    = useState("");
  const [selectedSequence, setSelectedSequence] = useState("");
  const [students,     setStudents]     = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [scores,       setScores]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [initLoading,  setInitLoading]  = useState(true);

  const isAdminView = profile?.role === "admin" || profile?.role === "headmaster";

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

      const activeSeq = (seqs || []).find(s => s.is_active);
      if (activeSeq) setSelectedSequence(activeSeq.id);

      if ((cls || []).length > 0) setSelectedClass(cls[0].id);

      setInitLoading(false);
    }
    if (profile) init();
  }, [profile]);

  useEffect(() => {
    if (!selectedClass || !selectedSequence) return;
    fetchGradeData();
  }, [selectedClass, selectedSequence]);

  async function fetchGradeData() {
    setLoading(true);

    const [{ data: studs }, { data: subs }] = await Promise.all([
      supabase
        .from("class_students")
        .select("student_id, students(id, full_name, photo_url, gender)")
        .eq("class_id", selectedClass),
      supabase
        .from("subjects")
        .select("*")
        .eq("class_id", selectedClass)
        .order("name"),
    ]);

    const studentList = (studs || []).map(r => r.students).filter(Boolean);
    setStudents(studentList);
    setSubjects(subs || []);

    if (studentList.length && (subs || []).length) {
      const { data: existing } = await supabase
        .from("grades")
        .select("student_id, subject_id, score")
        .eq("sequence_id", selectedSequence)
        .in("student_id", studentList.map(s => s.id));

      const map = {};
      (existing || []).forEach(g => {
        map[`${g.student_id}_${g.subject_id}`] = g.score;
      });
      setScores(map);
    } else {
      setScores({});
    }

    setLoading(false);
  }

  function handleScore(studentId, subjectId, value) {
    if (isAdminView) return;
    const key = `${studentId}_${subjectId}`;
    setScores(prev => ({ ...prev, [key]: value }));
  }

  async function saveGrades() {
    if (isAdminView) return;
    if (!selectedClass || !selectedSequence) {
      toast.error("Please select a class and sequence first");
      return;
    }
    setSaving(true);
    const rows = [];
    students.forEach(s => {
      subjects.forEach(sub => {
        const key   = `${s.id}_${sub.id}`;
        const score = scores[key];
        if (score !== undefined && score !== "") {
          rows.push({
            student_id:  s.id,
            subject_id:  sub.id,
            sequence_id: selectedSequence,
            score:       parseFloat(score),
            max_score:   20,
          });
        }
      });
    });

    if (!rows.length) { toast.error("No scores entered yet."); setSaving(false); return; }

    const { error } = await supabase
      .from("grades")
      .upsert(rows, { onConflict: "student_id,subject_id,sequence_id" });

    if (error) toast.error(error.message);
    else toast.success(`${rows.length} grades saved!`);
    setSaving(false);
  }

  function weightedAverage(studentId) {
    let totalPoints = 0, totalCoeff = 0;
    subjects.forEach(sub => {
      const val = scores[`${studentId}_${sub.id}`];
      if (val !== undefined && val !== "") {
        totalPoints += parseFloat(val) * sub.coefficient;
        totalCoeff  += sub.coefficient;
      }
    });
    if (!totalCoeff) return null;
    return (totalPoints / totalCoeff).toFixed(2);
  }

  function getRankedStudents() {
    return [...students]
      .map(s => ({ ...s, avg: weightedAverage(s.id) }))
      .sort((a, b) => {
        if (a.avg === null) return 1;
        if (b.avg === null) return -1;
        return parseFloat(b.avg) - parseFloat(a.avg);
      });
  }

  const selectedClassObj    = classes.find(c => c.id === selectedClass);

  const rankedStudents = getRankedStudents();
  const totalCoefficients = subjects.reduce((sum, s) => sum + s.coefficient, 0);

  if (initLoading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading grades setup...
    </div>
  );

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Grades</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Marks out of 20 · weighted by coefficient · {CURRENT_YEAR}
          </p>
        </div>
        {isAdminView ? (
          <span className="badge-blue flex items-center gap-1.5">
            <Lock size={12}/> View only — entry is done by the class teacher
          </span>
        ) : (
          <button onClick={saveGrades} disabled={saving || !selectedClass || !selectedSequence}
            className="btn-primary flex items-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin"/>Saving...</> : <><Save size={15}/>Save Grades</>}
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
          {classes.length === 0 ? (
            <div className="text-sm text-amber-600 flex items-center gap-1">
              <Info size={14}/> {profile?.role === "teacher"
                ? "No class assigned to you yet — contact the headmaster"
                : "No classes yet — create them in Academic Setup"}
            </div>
          ) : (
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="input w-auto text-sm py-2">
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} · {c.level}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sequence</label>
          {sequences.length === 0 ? (
            <div className="text-sm text-amber-600 flex items-center gap-1">
              <Info size={14}/> No sequences — create them in Academic Setup
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {sequences.map(seq => {
                const term = terms.find(t => t.id === seq.term_id);
                return (
                  <button key={seq.id}
                    onClick={() => setSelectedSequence(seq.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                      ${selectedSequence === seq.id
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-primary"}`}>
                    {seq.name}
                    {term && <span className="ml-1 opacity-60">· {term.name}</span>}
                    {seq.is_active && <span className="ml-1">●</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedClassObj && (
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <span className="badge-green">{students.length} students</span>
            <span className="badge-blue">{subjects.length} subjects</span>
            <span className="badge-amber">Total coeff: {totalCoefficients}</span>
          </div>
        )}
      </div>

      {!loading && selectedClass && students.length === 0 && (
        <div className="card border-amber-200 bg-amber-50 flex items-start gap-3 p-4">
          <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0"/>
          <div>
            <div className="font-medium text-amber-800 text-sm">No students in this class</div>
            <div className="text-xs text-amber-600 mt-0.5">
              Go to <strong>Students</strong> page, enrol students, then assign them to this class.
              Or go to <strong>Academic Setup</strong> to manage class assignments.
            </div>
          </div>
        </div>
      )}

      {students.length > 0 && subjects.length > 0 && (
        <div className="card p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={18}/> Loading grades...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-3 text-left font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[40px]">#</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 sticky left-8 bg-gray-50 min-w-[160px]">Student</th>
                  {subjects.map(s => (
                    <th key={s.id} className="py-3 px-2 text-center font-medium text-gray-500 min-w-[80px]">
                      <div className="text-xs leading-tight">{s.name}</div>
                      <div className="text-xs text-gray-300 font-normal">/20 × {s.coefficient}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center font-medium text-gray-500 min-w-[70px] bg-green-50">
                    <div className="text-xs">Avg</div>
                    <div className="text-xs text-gray-300 font-normal">/20</div>
                  </th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500 min-w-[50px] bg-green-50">Grade</th>
                  <th className="py-3 px-3 text-center font-medium text-gray-500 min-w-[50px] bg-green-50">Rank</th>
                </tr>
              </thead>
              <tbody>
                {rankedStudents.map((s, rank) => {
                  const avg  = s.avg;
                  const info = gradeInfo(avg);
                  return (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 px-3 text-xs text-gray-300 font-mono sticky left-0 bg-white">{rank + 1}</td>
                      <td className="py-2 px-4 sticky left-8 bg-white">
                        <div className="flex items-center gap-2">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.full_name}
                              className="w-7 h-7 rounded-full object-cover border border-green-100 flex-shrink-0"/>
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: s.gender === "female" ? "#e63946" : "#1a6b3c" }}>
                              {s.full_name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-gray-800 text-xs whitespace-nowrap">{s.full_name}</span>
                        </div>
                      </td>
                      {subjects.map(sub => {
                        const key = `${s.id}_${sub.id}`;
                        const val = scores[key] ?? "";
                        const scoreInfo = gradeInfo(val);
                        return (
                          <td key={sub.id} className="py-1.5 px-2 text-center">
                            <input
                              type="number" min="0" max="20" step="0.25"
                              value={val}
                              disabled={isAdminView}
                              onChange={e => handleScore(s.id, sub.id, e.target.value)}
                              className={`w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-xs
                                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                                         transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                                         ${val !== "" ? scoreInfo.bg : ""}`}
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                      <td className={`py-2 px-3 text-center font-semibold text-sm ${info.color} ${info.bg}`}>
                        {avg ?? "—"}
                      </td>
                      <td className={`py-2 px-3 text-center font-bold text-base ${info.color}`}>
                        {info.letter}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {avg !== null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${rank === 0 ? "bg-yellow-100 text-yellow-700" :
                              rank === 1 ? "bg-gray-100 text-gray-600" :
                              rank === 2 ? "bg-orange-100 text-orange-600" : "text-gray-400"}`}>
                            {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-green-50 border-t-2 border-green-100">
                  <td colSpan={2} className="py-3 px-4 text-xs font-semibold text-gray-600 sticky left-0 bg-green-50">
                    Class statistics
                  </td>
                  {subjects.map(sub => {
                    const vals = students
                      .map(s => scores[`${s.id}_${sub.id}`])
                      .filter(v => v !== undefined && v !== "")
                      .map(parseFloat);
                    const subAvg = vals.length
                      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
                      : "—";
                    return (
                      <td key={sub.id} className="py-3 px-2 text-center text-xs font-semibold text-primary">
                        {subAvg}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center text-xs font-bold text-primary bg-green-100">
                    {(() => {
                      const avgs = students
                        .map(s => weightedAverage(s.id))
                        .filter(Boolean)
                        .map(parseFloat);
                      return avgs.length
                        ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2)
                        : "—";
                    })()}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center text-xs text-gray-400 bg-green-50">
                    class avg
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
