import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  Loader2, User, BookOpen, Receipt, CheckCircle,
  AlertCircle, Clock, ChevronDown, ChevronRight,
  Pencil, Save, X, GraduationCap, TrendingUp
} from "lucide-react";
import toast from "react-hot-toast";

const ACADEMIC_YEAR = "2026-2027";

function fmt(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("fr-CM") + " FCFA";
}

function statusInfo(paid, owed) {
  if (!owed)        return { label:"Not Set",  color:"text-amber-600 bg-amber-50",  icon: Clock        };
  if (paid >= owed) return { label:"Paid",     color:"text-green-600 bg-green-50",  icon: CheckCircle  };
  if (paid > 0)     return { label:"Partial",  color:"text-amber-600 bg-amber-50",  icon: Clock        };
  return               { label:"Unpaid",   color:"text-red-600 bg-red-50",      icon: AlertCircle  };
}

function gradeInfo(score) {
  if (score === null || score === undefined) return { letter:"—", color:"#666" };
  const pct = (score / 20) * 100;
  if (pct >= 80) return { letter:"A", color:"#1a6b3c" };
  if (pct >= 65) return { letter:"B", color:"#2563eb" };
  if (pct >= 50) return { letter:"C", color:"#d97706" };
  if (pct >= 40) return { letter:"D", color:"#ea580c" };
  return              { letter:"F", color:"#dc2626" };
}

export default function ParentPortal() {
  const { profile, user } = useAuth();
  const [children,    setChildren]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeChild, setActiveChild] = useState(null);
  const [activeTab,   setActiveTab]   = useState("overview");

  // Per-child data
  const [childData, setChildData] = useState({}); // keyed by student id

  // Edit modal
  const [showEdit,  setShowEdit]  = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { fetchChildren(); }, []);

  async function fetchChildren() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("parent_user_id", user.id)
      .order("full_name");
    if (error) { toast.error(error.message); setLoading(false); return; }
    setChildren(data || []);
    if (data && data.length > 0) {
      setActiveChild(data[0]);
      await fetchChildData(data[0], data);
    }
    setLoading(false);
  }

  async function fetchChildData(child, allChildren) {
    const list = allChildren || children;

    // Fetch for ALL children at once
    const ids = list.map(c => c.id);

    const [
      { data: classStudents },
      { data: fees },
      { data: payments },
      { data: terms },
      { data: sequences },
    ] = await Promise.all([
      supabase.from("class_students").select("student_id, class_id, classes(id, name, level)").in("student_id", ids),
      supabase.from("student_fees").select("*").in("student_id", ids).eq("academic_year", ACADEMIC_YEAR),
      supabase.from("fee_payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("terms").select("*").order("created_at"),
      supabase.from("sequences").select("*").order("created_at"),
    ]);

    // For each child, fetch grades and subjects
    const dataMap = {};
    for (const c of list) {
      const cls = (classStudents || []).find(cs => cs.student_id === c.id);
      const fee = (fees || []).find(f => f.student_id === c.id);
      const pmts = fee ? (payments || []).filter(p => p.student_fee_id === fee.id) : [];

      let grades = [], subjects = [];
      if (cls?.class_id) {
        const [{ data: subs }, { data: grd }] = await Promise.all([
          supabase.from("subjects").select("*").eq("class_id", cls.class_id).order("name"),
          supabase.from("grades").select("*, sequences(name, term_id)").eq("student_id", c.id),
        ]);
        subjects = subs || [];
        grades   = grd  || [];
      }

      dataMap[c.id] = {
        class: cls?.classes || null,
        fee,
        payments: pmts,
        subjects,
        grades,
        terms: terms || [],
        sequences: sequences || [],
      };
    }
    setChildData(dataMap);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("students").update({
      full_name:    editForm.full_name,
      date_of_birth: editForm.date_of_birth,
      parent_name:  editForm.parent_name,
      parent_phone: editForm.parent_phone,
      parent_email: editForm.parent_email,
      quarter:      editForm.quarter,
      allergies:    editForm.allergies,
    }).eq("id", activeChild.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Information updated!");
    setShowEdit(false);
    setSaving(false);
    // Refresh
    const updated = children.map(c => c.id === activeChild.id ? { ...c, ...editForm } : c);
    setChildren(updated);
    setActiveChild(prev => ({ ...prev, ...editForm }));
  }

  const data = activeChild ? childData[activeChild.id] : null;

  // Build grades by term/sequence
  function buildGradeMatrix() {
    if (!data) return { terms: [], matrix: [] };
    const { subjects, grades, terms, sequences } = data;
    const activeTerm = terms.find(t => t.is_active) || terms[0];
    if (!activeTerm) return { terms: [], matrix: [] };
    const termSeqs = sequences.filter(s => s.term_id === activeTerm.id);

    const matrix = subjects.map(sub => {
      const row = { subject: sub, scores: {}, avg: null };
      const vals = [];
      termSeqs.forEach(seq => {
        const g = grades.find(g => g.subject_id === sub.id && g.sequence_id === seq.id);
        row.scores[seq.id] = g?.score ?? null;
        if (g?.score !== null && g?.score !== undefined) vals.push(g.score);
      });
      row.avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
      return row;
    });

    return { activeTerm, termSeqs, matrix };
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading your children's information...
    </div>
  );

  if (children.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
      <User size={40} className="opacity-30"/>
      <p className="text-sm">No children linked to your account yet.</p>
      <p className="text-xs text-gray-300">Contact the school office for assistance.</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Welcome, {profile?.full_name?.split(" ")[0] || "Parent"} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">MARELI Academy Parent Portal · {ACADEMIC_YEAR}</p>
      </div>

      {/* Child selector — tabs if multiple children */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map(child => (
            <button key={child.id}
              onClick={async () => { setActiveChild(child); setActiveTab("overview"); if (!childData[child.id]) await fetchChildData(child, children); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium border-2 whitespace-nowrap transition-all
                ${activeChild?.id === child.id
                  ? "border-primary bg-green-50 text-primary"
                  : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"}`}>
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.full_name}
                  className="w-7 h-7 rounded-full object-cover border border-green-200"/>
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: child.gender==="female"?"#e63946":"#1a6b3c" }}>
                  {child.full_name.charAt(0)}
                </div>
              )}
              {child.full_name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {activeChild && (
        <>
          {/* Child card */}
          <div className="card flex items-center gap-4 flex-wrap">
            {activeChild.photo_url ? (
              <img src={activeChild.photo_url} alt={activeChild.full_name}
                className="w-16 h-16 rounded-2xl object-cover border-4 border-green-100 flex-shrink-0"/>
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                style={{ background: activeChild.gender==="female"?"#e63946":"#1a6b3c" }}>
                {activeChild.full_name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-gray-900 text-lg">{activeChild.full_name}</div>
              <div className="text-sm text-gray-500">
                {activeChild.class_level}
                {data?.class && <span className="ml-1 text-primary font-medium">· {data.class.name}</span>}
                · <span className="capitalize">{activeChild.section}</span>
              </div>
              {activeChild.date_of_birth && (
                <div className="text-xs text-gray-400 mt-0.5">DOB: {activeChild.date_of_birth}</div>
              )}
            </div>
            <button onClick={() => { setEditForm({ ...activeChild }); setShowEdit(true); }}
              className="btn-ghost flex items-center gap-2 text-sm flex-shrink-0">
              <Pencil size={14}/> Edit Info
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {[
              { key:"overview", label:"Overview",      icon: User        },
              { key:"fees",     label:"Fees",          icon: Receipt     },
              { key:"grades",   label:"Grades",        icon: BookOpen    },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all
                  ${activeTab===key
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Icon size={15}/>{label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Fee status */}
                {(() => {
                  const fee = data?.fee;
                  const paid = fee?.total_paid||0, owed = fee?.total_owed||0;
                  const bal = owed - paid;
                  const si = statusInfo(paid, owed);
                  const Icon = si.icon;
                  return (
                    <button onClick={() => setActiveTab("fees")}
                      className="card text-left hover:shadow-lg transition-shadow cursor-pointer">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${si.color}`}>
                        <Icon size={11}/>{si.label}
                      </div>
                      <div className="text-lg font-display font-bold text-gray-900">{owed ? fmt(bal) : "—"}</div>
                      <div className="text-xs text-gray-400">Fee Balance</div>
                      {owed > 0 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full"
                              style={{ width:`${Math.min((paid/owed)*100,100)}%` }}/>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{Math.round((paid/owed)*100)}% paid</div>
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* Class */}
                <div className="card">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                    <GraduationCap size={18} className="text-blue-600"/>
                  </div>
                  <div className="text-lg font-display font-bold text-gray-900">
                    {data?.class?.name || activeChild.class_level}
                  </div>
                  <div className="text-xs text-gray-400">Current Class</div>
                </div>

                {/* Subjects */}
                <div className="card">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-2">
                    <BookOpen size={18} className="text-purple-600"/>
                  </div>
                  <div className="text-lg font-display font-bold text-gray-900">
                    {data?.subjects?.length || 0}
                  </div>
                  <div className="text-xs text-gray-400">Subjects</div>
                </div>
              </div>

              {/* Child details */}
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-gray-800">Child Information</h3>
                  <button onClick={() => { setEditForm({ ...activeChild }); setShowEdit(true); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Pencil size={12}/> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  {[
                    { label:"Full Name",     value: activeChild.full_name },
                    { label:"Date of Birth", value: activeChild.date_of_birth || "—" },
                    { label:"Gender",        value: activeChild.gender, className:"capitalize" },
                    { label:"Section",       value: activeChild.section, className:"capitalize" },
                    { label:"BC Number",     value: activeChild.birth_certificate_no || "—" },
                    { label:"Blood Group",   value: activeChild.blood_group || "—" },
                    { label:"Allergies",     value: activeChild.allergies || "None" },
                    { label:"Region",        value: activeChild.region || "—" },
                  ].map(({ label, value, className }) => (
                    <div key={label}>
                      <div className="text-xs text-gray-400">{label}</div>
                      <div className={`font-medium text-gray-700 ${className||""}`}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parent details */}
              <div className="card space-y-3">
                <h3 className="font-display font-semibold text-gray-800">Parent / Guardian</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  {[
                    { label:"Name",    value: activeChild.parent_name  || "—" },
                    { label:"Phone",   value: activeChild.parent_phone || "—" },
                    { label:"Network", value: activeChild.parent_network?.toUpperCase() || "—" },
                    { label:"Email",   value: activeChild.parent_email || "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-gray-400">{label}</div>
                      <div className="font-medium text-gray-700">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FEES TAB ── */}
          {activeTab === "fees" && (
            <div className="space-y-4">
              {!data?.fee ? (
                <div className="card text-center py-12 text-gray-400 text-sm">
                  <Receipt size={32} className="mx-auto mb-2 opacity-30"/>
                  Fee account not set up yet. Please contact the school office.
                </div>
              ) : (
                <>
                  {/* Fee summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label:"Total Owed",  value: fmt(data.fee.total_owed),  bg:"bg-blue-50",  text:"text-blue-700"   },
                      { label:"Total Paid",  value: fmt(data.fee.total_paid),  bg:"bg-green-50", text:"text-green-700"  },
                      { label:"Balance",     value: fmt(data.fee.total_owed - data.fee.total_paid), bg: data.fee.total_owed > data.fee.total_paid ? "bg-red-50" : "bg-green-50", text: data.fee.total_owed > data.fee.total_paid ? "text-red-700" : "text-green-700" },
                    ].map(({ label, value, bg, text }) => (
                      <div key={label} className={`card p-4 ${bg}`}>
                        <div className={`text-lg font-display font-bold ${text}`}>{value}</div>
                        <div className="text-xs opacity-70 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Payment Progress</span>
                      <span className="text-sm font-bold text-primary">
                        {data.fee.total_owed ? Math.round((data.fee.total_paid/data.fee.total_owed)*100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-primary h-3 rounded-full transition-all"
                        style={{ width:`${data.fee.total_owed ? Math.min((data.fee.total_paid/data.fee.total_owed)*100,100) : 0}%` }}/>
                    </div>
                    {data.fee.discount_pct > 0 && (
                      <p className="text-xs text-green-600 mt-2">✓ {data.fee.discount_pct}% discount applied</p>
                    )}
                    {data.fee.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">{data.fee.notes}</p>
                    )}
                  </div>

                  {/* Payment history */}
                  <div className="card">
                    <h3 className="font-display font-semibold text-gray-800 mb-4">Payment History</h3>
                    {data.payments.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">No payments recorded yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {data.payments.map(p => (
                          <div key={p.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <div className="font-medium text-gray-800 text-sm">{p.component}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Receipt: <strong>{p.receipt_no}</strong> · {p.bank_name}
                              </div>
                              <div className="text-xs text-gray-400">{p.payment_date}</div>
                              {p.notes && <div className="text-xs text-gray-400 italic">{p.notes}</div>}
                            </div>
                            <div className="text-green-600 font-bold text-sm">{fmt(p.amount)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── GRADES TAB ── */}
          {activeTab === "grades" && (
            <div className="space-y-4">
              {(() => {
                const { activeTerm, termSeqs, matrix } = buildGradeMatrix();
                if (!activeTerm || !termSeqs || termSeqs.length === 0) return (
                  <div className="card text-center py-12 text-gray-400 text-sm">
                    <TrendingUp size={32} className="mx-auto mb-2 opacity-30"/>
                    No grades available yet for the current term.
                  </div>
                );
                if (!matrix || matrix.length === 0) return (
                  <div className="card text-center py-12 text-gray-400 text-sm">
                    No subjects found for this class.
                  </div>
                );

                // Overall average
                let totalPoints = 0, totalCoeff = 0;
                matrix.forEach(row => {
                  if (row.avg !== null) {
                    totalPoints += row.avg * row.subject.coefficient;
                    totalCoeff  += row.subject.coefficient;
                  }
                });
                const overallAvg = totalCoeff ? totalPoints / totalCoeff : null;
                const g = gradeInfo(overallAvg);

                return (
                  <>
                    {/* Term badge */}
                    <div className="flex items-center gap-3">
                      <span className="badge-green">{activeTerm.name} · {ACADEMIC_YEAR}</span>
                      <span className="text-xs text-gray-400">{termSeqs.length} sequence(s)</span>
                    </div>

                    {/* Overall average card */}
                    {overallAvg !== null && (
                      <div className="card flex items-center gap-4 bg-gradient-to-r from-green-50 to-white">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                          style={{ background: g.color }}>
                          {g.letter}
                        </div>
                        <div>
                          <div className="text-2xl font-display font-bold text-gray-900">
                            {overallAvg.toFixed(2)}<span className="text-base text-gray-400">/20</span>
                          </div>
                          <div className="text-sm text-gray-500">Term Average · {activeTerm.name}</div>
                        </div>
                      </div>
                    )}

                    {/* Grades table */}
                    <div className="card p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                            <th className="py-3 px-4 font-medium">Subject</th>
                            <th className="py-3 px-4 font-medium text-center">Coeff</th>
                            {termSeqs.map(seq => (
                              <th key={seq.id} className="py-3 px-4 font-medium text-center">{seq.name}</th>
                            ))}
                            <th className="py-3 px-4 font-medium text-center">Avg</th>
                            <th className="py-3 px-4 font-medium text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matrix.map((row, i) => {
                            const gi = gradeInfo(row.avg);
                            return (
                              <tr key={row.subject.id}
                                className={`border-b border-gray-50 last:border-0 ${i%2===0?"bg-white":"bg-gray-50/50"}`}>
                                <td className="py-3 px-4 font-medium text-gray-700">{row.subject.name}</td>
                                <td className="py-3 px-4 text-center text-gray-400">{row.subject.coefficient}</td>
                                {termSeqs.map(seq => (
                                  <td key={seq.id} className="py-3 px-4 text-center font-medium text-gray-700">
                                    {row.scores[seq.id] !== null && row.scores[seq.id] !== undefined
                                      ? row.scores[seq.id]
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                ))}
                                <td className="py-3 px-4 text-center font-bold" style={{ color: gi.color }}>
                                  {row.avg !== null ? row.avg.toFixed(2) : <span className="text-gray-300 font-normal">—</span>}
                                </td>
                                <td className="py-3 px-4 text-center font-bold" style={{ color: gi.color }}>
                                  {gi.letter}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {overallAvg !== null && (
                          <tfoot>
                            <tr className="bg-primary text-white font-bold">
                              <td colSpan={2} className="py-3 px-4">Term Average</td>
                              {termSeqs.map(seq => <td key={seq.id}/>)}
                              <td className="py-3 px-4 text-center text-lg">{overallAvg.toFixed(2)}</td>
                              <td className="py-3 px-4 text-center">{g.letter}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── EDIT MODAL ── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-display font-bold text-gray-900">Update Information</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Child's Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input className="input" value={editForm.full_name||""}
                      onChange={e => setEditForm(p=>({...p,full_name:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                    <input className="input" type="date" value={editForm.date_of_birth||""}
                      onChange={e => setEditForm(p=>({...p,date_of_birth:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Known allergies</label>
                    <input className="input" placeholder="None"
                      value={editForm.allergies||""}
                      onChange={e => setEditForm(p=>({...p,allergies:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quarter / Neighbourhood</label>
                    <input className="input" value={editForm.quarter||""}
                      onChange={e => setEditForm(p=>({...p,quarter:e.target.value}))}/>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parent / Guardian</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input className="input" value={editForm.parent_name||""}
                      onChange={e => setEditForm(p=>({...p,parent_name:e.target.value}))}/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input className="input" value={editForm.parent_phone||""}
                        onChange={e => setEditForm(p=>({...p,parent_phone:e.target.value}))}/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                      <select className="input" value={editForm.parent_network||"mtn"}
                        onChange={e => setEditForm(p=>({...p,parent_network:e.target.value}))}>
                        <option value="mtn">MTN</option>
                        <option value="orange">Orange</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input className="input" type="email" value={editForm.parent_email||""}
                      onChange={e => setEditForm(p=>({...p,parent_email:e.target.value}))}/>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin"/>}
                  <Save size={14}/> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
