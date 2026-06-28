import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus, Loader2, Trash2,
  BookOpen, Calendar, Layers, Users, GraduationCap
} from "lucide-react";
import toast from "react-hot-toast";

const CLASS_LEVELS = [
  "Day Care","Pre-Nursery","Nursery 1","Nursery 2",
  "Class 1","Class 2","Class 3","Class 4","Class 5","Class 6",
];

const STREAM_DEFS = [
  { name: "Pre-Nursery & Nursery", levels: ["Day Care", "Pre-Nursery", "Nursery 1", "Nursery 2"] },
  { name: "Class 1 & 2",           levels: ["Class 1", "Class 2"] },
  { name: "Class 3 & 4",           levels: ["Class 3", "Class 4"] },
  { name: "Class 5 & 6",           levels: ["Class 5", "Class 6"] },
];

function streamForLevel(level) {
  const s = STREAM_DEFS.find(d => d.levels.includes(level));
  return s ? s.name : null;
}

const DEFAULT_SUBJECTS = {
  "Day Care":    [{ name:"Numeracy", coefficient:2 },{ name:"Literacy", coefficient:2 },{ name:"Creative Arts", coefficient:1 }],
  "Pre-Nursery": [{ name:"Numeracy", coefficient:2 },{ name:"Literacy", coefficient:2 },{ name:"Creative Arts", coefficient:1 }],
  "Nursery 1":   [{ name:"Numeracy", coefficient:3 },{ name:"Literacy", coefficient:3 },{ name:"Creative Arts", coefficient:1 },{ name:"Religious Studies", coefficient:1 }],
  "Nursery 2":   [{ name:"Numeracy", coefficient:3 },{ name:"Literacy", coefficient:3 },{ name:"Creative Arts", coefficient:1 },{ name:"Religious Studies", coefficient:1 }],
  "Class 1":     [{ name:"English Language", coefficient:4 },{ name:"Mathematics", coefficient:4 },{ name:"Science", coefficient:3 },{ name:"Social Studies", coefficient:2 },{ name:"French", coefficient:2 },{ name:"Religious Studies", coefficient:1 },{ name:"Physical Education", coefficient:1 }],
  "Class 2":     [{ name:"English Language", coefficient:4 },{ name:"Mathematics", coefficient:4 },{ name:"Science", coefficient:3 },{ name:"Social Studies", coefficient:2 },{ name:"French", coefficient:2 },{ name:"Religious Studies", coefficient:1 },{ name:"Physical Education", coefficient:1 }],
  "Class 3":     [{ name:"English Language", coefficient:4 },{ name:"Mathematics", coefficient:4 },{ name:"Science", coefficient:3 },{ name:"Social Studies", coefficient:2 },{ name:"French", coefficient:2 },{ name:"Religious Studies", coefficient:1 },{ name:"Physical Education", coefficient:1 }],
  "Class 4":     [{ name:"English Language", coefficient:4 },{ name:"Mathematics", coefficient:4 },{ name:"Science", coefficient:3 },{ name:"Social Studies", coefficient:2 },{ name:"French", coefficient:2 },{ name:"Religious Studies", coefficient:1 },{ name:"Physical Education", coefficient:1 }],
  "Class 5":     [{ name:"English Language", coefficient:5 },{ name:"Mathematics", coefficient:5 },{ name:"Science", coefficient:4 },{ name:"Social Studies", coefficient:3 },{ name:"French", coefficient:3 },{ name:"Religious Studies", coefficient:1 },{ name:"Physical Education", coefficient:1 }],
  "Class 6":     [{ name:"English Language", coefficient:5 },{ name:"Mathematics", coefficient:5 },{ name:"Science", coefficient:4 },{ name:"Social Studies", coefficient:3 },{ name:"French", coefficient:3 },{ name:"Religious Studies", coefficient:1 },{ name:"Physical Education", coefficient:1 }],
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function AcademicSetup() {
  const [years,     setYears]     = useState([]);
  const [terms,     setTerms]     = useState([]);
  const [sequences, setSequences] = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [streams,      setStreams]      = useState([]);
  const [streamSaving, setStreamSaving] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState("years");

  const [yearForm,  setYearForm]  = useState({ name:"", program_type:"regular", start_date:"", end_date:"" });
  const [termForm,  setTermForm]  = useState({ academic_year_id:"", name:"Term 1", start_date:"", end_date:"" });
  const [seqForm,   setSeqForm]   = useState({ term_id:"", name:"Sequence 1", start_date:"", end_date:"" });
  const [classForm, setClassForm] = useState({ academic_year_id:"", name:"", level:"Class 1", section:"anglophone", teacher_id:"", teacher_name:"" });
  const [subForm,   setSubForm]   = useState({ class_id:"", name:"", coefficient:1 });

  const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [y, t, sq, cl, sub] = await Promise.all([
      supabase.from("academic_years").select("*").order("created_at", { ascending: false }),
      supabase.from("terms").select("*").order("created_at"),
      supabase.from("sequences").select("*").order("created_at"),
      supabase.from("classes").select("*").order("name"),
      supabase.from("subjects").select("*").order("name"),
    ]);
    setYears(y.data     || []);
    setTerms(t.data     || []);
    setSequences(sq.data|| []);
    setClasses(cl.data  || []);
    setSubjects(sub.data|| []);
    try {
      const res  = await fetch(`${API}/users`);
      const data = await res.json();
      setTeachers((data || []).filter(u => u.role === "teacher"));
    } catch { setTeachers([]); }

    try {
      const allYears = y.data || [];
      const activeYear = allYears.find(yr => yr.is_active) || allYears[0];
      if (activeYear && activeYear.program_type === "holiday") {
        const API2 = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
        const r1 = await fetch(API2 + "/streams?academic_year_id=" + activeYear.id);
        const existing = await r1.json();
        const missing = STREAM_DEFS.filter(d => !(existing || []).some(s => s.name === d.name));
        for (const def of missing) {
          await fetch(API2 + "/streams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ academic_year_id: activeYear.id, name: def.name }),
          });
        }
        const r2 = await fetch(API2 + "/streams?academic_year_id=" + activeYear.id);
        setStreams((await r2.json()) || []);
      } else {
        setStreams([]);
      }
    } catch(e) { setStreams([]); }

    setLoading(false);
  }

  async function updateStreamTeacher(streamId, teacherId) {
    setStreamSaving(streamId);
    const API2 = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    const teacher = teachers.find(t => t.id === teacherId);
    try {
      const res = await fetch(API2 + "/streams/" + streamId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: teacherId || null, teacher_name: teacher ? teacher.full_name : null }),
      });
      if (res.ok) { toast.success("Stream teacher updated!"); fetchAll(); }
      else toast.error("Could not update stream teacher");
    } catch { toast.error("Network error"); }
    setStreamSaving(null);
  }

  async function setActive(table, id) {
    await supabase.from(table).update({ is_active: false }).neq("id", id);
    await supabase.from(table).update({ is_active: true  }).eq("id", id);
    toast.success("Set as active!"); fetchAll();
  }

  async function deleteRow(table, id) {
    if (!window.confirm("Delete this item?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchAll(); }
  }

  async function saveYear(e) {
    e.preventDefault(); setSaving(true);
    const payload = {
      name: yearForm.name,
      program_type: yearForm.program_type,
      start_date: yearForm.start_date || null,
      end_date: yearForm.end_date || null,
    };
    console.log("YEAR PAYLOAD:", JSON.stringify(payload));
    const { error } = await supabase.from("academic_years").insert([payload]);
    if (error) toast.error(error.message);
    else {
      toast.success(yearForm.program_type === "holiday" ? "Holiday program created!" : "Academic year created!");
      setModal(null);
      setYearForm({ name:"", program_type:"regular", start_date:"", end_date:"" });
      fetchAll();
    }
    setSaving(false);
  }

  async function saveTerm(e) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("terms").insert([termForm]);
    if (error) toast.error(error.message);
    else { toast.success("Term created!"); setModal(null); fetchAll(); }
    setSaving(false);
  }

  async function saveSeq(e) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("sequences").insert([seqForm]);
    if (error) toast.error(error.message);
    else { toast.success("Sequence created!"); setModal(null); fetchAll(); }
    setSaving(false);
  }

  async function saveClass(e) {
    e.preventDefault(); setSaving(true);
    const selectedTeacher = teachers.find(t => t.id === classForm.teacher_id);
    const payload = { ...classForm, teacher_name: selectedTeacher?.full_name || classForm.teacher_name };
    const { data, error } = await supabase.from("classes").insert([payload]).select().single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    const isHoliday = years.find(y => y.id === classForm.academic_year_id)?.program_type === "holiday";
    const defaults = isHoliday ? [] : (DEFAULT_SUBJECTS[classForm.level] || []);
    if (defaults.length) {
      await supabase.from("subjects").insert(
        defaults.map(s => ({ class_id: data.id, name: s.name, coefficient: s.coefficient }))
      );
    }
    toast.success(isHoliday ? "Group created!" : "Class created with default subjects!");
    setModal(null); fetchAll(); setSaving(false);
  }

  async function saveSubject(e) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("subjects").insert([{
      class_id: subForm.class_id, name: subForm.name, coefficient: parseInt(subForm.coefficient),
    }]);
    if (error) toast.error(error.message);
    else { toast.success("Subject added!"); setModal(null); setSubForm({ class_id:"", name:"", coefficient:1 }); fetchAll(); }
    setSaving(false);
  }

  async function updateCoefficient(subjectId, coeff) {
    await supabase.from("subjects").update({ coefficient: parseInt(coeff) }).eq("id", subjectId);
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, coefficient: parseInt(coeff) } : s));
  }

  const activeYear = years.find(y => y.is_active);
  const selectedYearObj = years.find(y => y.id === classForm.academic_year_id);
  const selectedYearIsHoliday = selectedYearObj?.program_type === "holiday";

  const TABS = [
    { key:"years",     label:"Academic Years", icon:GraduationCap, count:years.length,     color:"text-green-600"  },
    { key:"streams",   label:"Streams",        icon:Layers,        count:streams.length,   color:"text-blue-600",  holiday:true },
    { key:"terms",     label:"Terms",          icon:Calendar,      count:terms.length,     color:"text-amber-600"  },
    { key:"sequences", label:"Sequences",      icon:Layers,        count:sequences.length, color:"text-blue-600"   },
    { key:"classes",   label:"Classes",        icon:Users,         count:classes.length,   color:"text-purple-600" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading...
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Academic Setup</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure academic years, terms, sequences, classes and subjects</p>
        </div>
        {activeYear && (
          <span className="badge-green">Active: {activeYear.name}</span>
        )}
      </div>

      {/* Horizontal tab bar */}
      <div className="flex gap-2 border-b border-gray-100 overflow-x-auto pb-0">
        {TABS.map(({ key, label, icon: Icon, count, color }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all
              ${activeTab === key
                ? `border-primary text-primary bg-green-50/50`
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"}`}>
            <Icon size={16} className={activeTab === key ? "text-primary" : color}/>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
              ${activeTab === key ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card p-0 overflow-hidden">

        {/* ── YEARS TAB ── */}
        {activeTab === "years" && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-green-50">
              <h2 className="font-display font-semibold text-gray-800 flex items-center gap-2">
                <GraduationCap size={18} className="text-green-600"/> Academic Years
              </h2>
              <button onClick={() => setModal("year")} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
                <Plus size={13}/> New Year
              </button>
            </div>
            <div className="p-5">
              {years.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No academic years yet. Click "New Year" to create one.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {years.map(y => (
                    <div key={y.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all
                      ${y.is_active ? "border-green-400 bg-green-50" : "border-gray-100 bg-white"}`}>
                      <div>
                        {y.is_active && <div className="text-xs font-semibold text-green-600 mb-0.5">● ACTIVE</div>}
                        <div className="font-semibold text-gray-800">{y.name}</div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!y.is_active && (
                          <button onClick={() => setActive("academic_years", y.id)}
                            className="text-xs text-primary hover:underline font-medium">Set Active</button>
                        )}
                        <button onClick={() => deleteRow("academic_years", y.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TERMS TAB ── */}
        {activeTab === "terms" && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50">
              <h2 className="font-display font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={18} className="text-amber-600"/> Terms
              </h2>
              <button onClick={() => { setTermForm(p => ({ ...p, academic_year_id: activeYear?.id || "" })); setModal("term"); }}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                <Plus size={13}/> New Term
              </button>
            </div>
            <div className="p-5">
              {terms.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No terms yet. Click "New Term" to create one.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {terms.map(t => {
                    const yr = years.find(y => y.id === t.academic_year_id);
                    return (
                      <div key={t.id} className={`p-4 rounded-xl border-2 transition-all
                        ${t.is_active ? "border-amber-400 bg-amber-50" : "border-gray-100 bg-white"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            {t.is_active && <div className="text-xs font-semibold text-amber-600 mb-0.5">● ACTIVE</div>}
                            <div className="font-semibold text-gray-800">{t.name}</div>
                            {yr && <div className="text-xs text-gray-400 mt-0.5">{yr.name}</div>}
                          </div>
                          <div className="flex gap-1 items-center">
                            {!t.is_active && (
                              <button onClick={() => setActive("terms", t.id)}
                                className="text-xs text-primary hover:underline font-medium">Set Active</button>
                            )}
                            <button onClick={() => deleteRow("terms", t.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                        {t.start_date && (
                          <div className="text-xs text-gray-400 mt-1">
                            {t.start_date} → {t.end_date}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SEQUENCES TAB ── */}
        {activeTab === "sequences" && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-50">
              <h2 className="font-display font-semibold text-gray-800 flex items-center gap-2">
                <Layers size={18} className="text-blue-600"/> Sequences
              </h2>
              <button onClick={() => setModal("seq")}
                className="bg-blue-600 text-white py-1.5 px-3 text-xs rounded-xl flex items-center gap-1 hover:bg-blue-700 transition-colors">
                <Plus size={13}/> New Sequence
              </button>
            </div>
            <div className="p-5">
              {sequences.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No sequences yet. Click "New Sequence" to create one.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sequences.map(s => {
                    const term = terms.find(t => t.id === s.term_id);
                    return (
                      <div key={s.id} className={`p-4 rounded-xl border-2 transition-all
                        ${s.is_active ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-white"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            {s.is_active && <div className="text-xs font-semibold text-blue-600 mb-0.5">● ACTIVE</div>}
                            <div className="font-semibold text-gray-800">{s.name}</div>
                            {term && <div className="text-xs text-gray-400 mt-0.5">{term.name}</div>}
                          </div>
                          <div className="flex gap-1 items-center">
                            {!s.is_active && (
                              <button onClick={() => setActive("sequences", s.id)}
                                className="text-xs text-primary hover:underline font-medium">Set Active</button>
                            )}
                            <button onClick={() => deleteRow("sequences", s.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                        {s.start_date && (
                          <div className="text-xs text-gray-400 mt-1">
                            {s.start_date} → {s.end_date}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STREAMS TAB */}
        {activeTab === "streams" && (
          <div className="p-5">
            {streams.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <div className="text-4xl mb-3">S</div>
                Streams only appear for Holiday Program years.
                Make sure a Holiday Program year is set as Active.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-4">
                  Each stream shares one teacher. Assigning a teacher here automatically applies to all classes in that stream.
                </p>
                {streams.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div>
                      <div className="font-semibold text-gray-800">{s.name}</div>
                      {s.teacher_name
                        ? <div className="text-xs text-green-600 mt-1">Teacher: {s.teacher_name}</div>
                        : <div className="text-xs text-amber-500 mt-1">No teacher assigned yet</div>
                      }
                    </div>
                    <select
                      className="input w-auto text-sm py-2 min-w-[220px]"
                      value={s.teacher_id || ""}
                      disabled={streamSaving === s.id}
                      onChange={e => updateStreamTeacher(s.id, e.target.value)}>
                      <option value="">No teacher</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CLASSES TAB ── */}
        {activeTab === "classes" && (
          <div>


<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-purple-50">
              <h2 className="font-display font-semibold text-gray-800 flex items-center gap-2">
                <Users size={18} className="text-purple-600"/> Classes & Subjects
              </h2>
              <button onClick={() => { setClassForm(p => ({ ...p, academic_year_id: activeYear?.id || "" })); setModal("class"); }}
                className="bg-purple-600 text-white py-1.5 px-3 text-xs rounded-xl flex items-center gap-1 hover:bg-purple-700 transition-colors">
                <Plus size={13}/> New Class
              </button>
            </div>
            <div className="p-5">
              {classes.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No classes yet. Click "New Class" to create one.</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {classes.map(cl => {
                    const classSubjects = subjects.filter(s => s.class_id === cl.id);
                    return (
                      <div key={cl.id} className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-100">
                          <div>
                            <span className="font-semibold text-gray-800">{cl.name}</span>
                            <span className="text-xs text-gray-400 ml-2">· {cl.level} · <span className="capitalize">{cl.section}</span></span>
                            {cl.teacher_name && (
                              <span className="text-xs text-green-700 ml-2 font-medium">👤 {cl.teacher_name}</span>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <button onClick={() => { setSubForm(p => ({ ...p, class_id: cl.id })); setModal("subject"); }}
                              className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-medium">
                              <Plus size={12}/> Subject
                            </button>
                            <button onClick={() => deleteRow("classes", cl.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                        {classSubjects.length > 0 ? (
                          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {classSubjects.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-gray-700 truncate mr-2">{sub.name}</span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-xs text-gray-400">×</span>
                                  <input type="number" min="1" max="10" value={sub.coefficient}
                                    onChange={e => updateCoefficient(sub.id, e.target.value)}
                                    className="w-10 text-center text-xs border border-gray-200 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30"/>
                                  <button onClick={() => deleteRow("subjects", sub.id)}
                                    className="text-gray-300 hover:text-red-400 ml-1"><Trash2 size={11}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-xs text-gray-400 text-center">No subjects yet</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === "year" && (
        <Modal title="New Academic Year / Program" onClose={() => setModal(null)}>
          <form onSubmit={saveYear} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program type *</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button"
                  onClick={() => setYearForm(p => ({ ...p, program_type: "regular" }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    yearForm.program_type === "regular"
                      ? "border-primary bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="font-semibold text-sm text-gray-800">Regular school year</div>
                  <div className="text-xs text-gray-500 mt-0.5">Sept – June, terms & sequences</div>
                </button>
                <button type="button"
                  onClick={() => setYearForm(p => ({ ...p, program_type: "holiday" }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    yearForm.program_type === "holiday"
                      ? "border-secondary bg-amber-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="font-semibold text-sm text-gray-800">Holiday program</div>
                  <div className="text-xs text-gray-500 mt-0.5">Short, dated session</div>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {yearForm.program_type === "holiday" ? "Program name *" : "Year name *"}
              </label>
              <input className="input" required
                placeholder={yearForm.program_type === "holiday" ? "e.g. August Holiday Camp 2026" : "e.g. 2024-2025"}
                value={yearForm.name}
                onChange={e => setYearForm(p => ({ ...p, name: e.target.value }))}/>
            </div>
            {yearForm.program_type === "holiday" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input type="date" className="input" value={yearForm.start_date}
                    onChange={e => setYearForm(p => ({ ...p, start_date: e.target.value }))}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                  <input type="date" className="input" value={yearForm.end_date}
                    onChange={e => setYearForm(p => ({ ...p, end_date: e.target.value }))}/>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin"/>} Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "term" && (
        <Modal title="New Term" onClose={() => setModal(null)}>
          <form onSubmit={saveTerm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
              <select className="input" required value={termForm.academic_year_id}
                onChange={e => setTermForm(p => ({ ...p, academic_year_id: e.target.value }))}>
                <option value="">Select year...</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
              <select className="input" value={termForm.name}
                onChange={e => setTermForm(p => ({ ...p, name: e.target.value }))}>
                <option>Term 1</option><option>Term 2</option><option>Term 3</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input type="date" className="input" value={termForm.start_date}
                  onChange={e => setTermForm(p => ({ ...p, start_date: e.target.value }))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input type="date" className="input" value={termForm.end_date}
                  onChange={e => setTermForm(p => ({ ...p, end_date: e.target.value }))}/>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin"/>} Create Term
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "seq" && (
        <Modal title="New Sequence" onClose={() => setModal(null)}>
          <form onSubmit={saveSeq} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
              <select className="input" required value={seqForm.term_id}
                onChange={e => setSeqForm(p => ({ ...p, term_id: e.target.value }))}>
                <option value="">Select term...</option>
                {terms.map(t => {
                  const yr = years.find(y => y.id === t.academic_year_id);
                  return <option key={t.id} value={t.id}>{t.name} · {yr?.name}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sequence *</label>
              <select className="input" value={seqForm.name}
                onChange={e => setSeqForm(p => ({ ...p, name: e.target.value }))}>
                <option>Sequence 1</option><option>Sequence 2</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input type="date" className="input" value={seqForm.start_date}
                  onChange={e => setSeqForm(p => ({ ...p, start_date: e.target.value }))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input type="date" className="input" value={seqForm.end_date}
                  onChange={e => setSeqForm(p => ({ ...p, end_date: e.target.value }))}/>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin"/>} Create Sequence
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "class" && (
        <Modal title="New Class" onClose={() => setModal(null)}>
          <form onSubmit={saveClass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
              <select className="input" required value={classForm.academic_year_id}
                onChange={e => setClassForm(p => ({ ...p, academic_year_id: e.target.value }))}>
                <option value="">Select year...</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedYearIsHoliday ? "Group name *" : "Class level *"}
                </label>
                {selectedYearIsHoliday ? (
                  <input className="input" required placeholder="e.g. Juniors 6-8yrs"
                    value={classForm.level}
                    onChange={e => setClassForm(p => ({ ...p, level: e.target.value, name: e.target.value }))}/>
                ) : (
                  <select className="input" value={classForm.level}
                    onChange={e => setClassForm(p => ({ ...p, level: e.target.value, name: e.target.value }))}>
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class name *</label>
                <input className="input" required placeholder="e.g. Class 1A"
                  value={classForm.name}
                  onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))}/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select className="input" value={classForm.section}
                onChange={e => setClassForm(p => ({ ...p, section: e.target.value }))}>
                <option value="anglophone">Anglophone</option>
                <option value="francophone">Francophone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Class Teacher
                {teachers.length === 0 && <span className="text-amber-500 ml-2 text-xs">(Add teachers in Staff page first)</span>}
              </label>
              <select className="input" value={classForm.teacher_id}
                onChange={e => setClassForm(p => ({ ...p, teacher_id: e.target.value }))}>
                <option value="">— No teacher assigned —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-xs text-green-700">
              ✓ Default subjects for <strong>{classForm.level}</strong> will be added automatically.
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin"/>} Create Class
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "subject" && (
        <Modal title="Add Subject" onClose={() => setModal(null)}>
          <form onSubmit={saveSubject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <select className="input" required value={subForm.class_id}
                onChange={e => setSubForm(p => ({ ...p, class_id: e.target.value }))}>
                <option value="">Select class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject name *</label>
              <input className="input" required placeholder="e.g. Mathematics"
                value={subForm.name}
                onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coefficient *</label>
              <input type="number" min="1" max="10" className="input" required
                value={subForm.coefficient}
                onChange={e => setSubForm(p => ({ ...p, coefficient: e.target.value }))}/>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin"/>} Add Subject
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
