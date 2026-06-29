import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  Search, Loader2, X, Plus, Receipt, CheckCircle,
  AlertCircle, Clock, ChevronDown, ChevronRight,
  Printer, Settings2, Users, BookOpen
} from "lucide-react";
import toast from "react-hot-toast";

const BANK = "Buea Police Cooperative Credit Union PLC";
const ACCOUNT_NO = "5238";

const LEVEL_GROUP_MAP = {
  "Day Care":    "Day Care / Pre-Nursery / Nursery / Primary 1",
  "Pre-Nursery": "Day Care / Pre-Nursery / Nursery / Primary 1",
  "Nursery 1":   "Day Care / Pre-Nursery / Nursery / Primary 1",
  "Nursery 2":   "Day Care / Pre-Nursery / Nursery / Primary 1",
  "Class 1":     "Day Care / Pre-Nursery / Nursery / Primary 1",
  "Class 2":     "Primary 2-5",
  "Class 3":     "Primary 2-5",
  "Class 4":     "Primary 2-5",
  "Class 5":     "Primary 2-5",
  "Class 6":     "Primary 6",
};

const NURSERY = ["Day Care","Pre-Nursery","Nursery 1","Nursery 2"];

// Returns the correct fee-structure level group for any class level,
// falling back to "Holiday Program" for holiday-program stream names
// instead of incorrectly defaulting to a regular-school tier.
function getLevelGroup(classLevel) {
  if (LEVEL_GROUP_MAP[classLevel]) return LEVEL_GROUP_MAP[classLevel];
  return "Holiday Program";
}

function fmt(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("fr-CM") + " F";
}

function statusInfo(paid, owed) {
  if (!owed)        return { label:"Not Set",  color:"badge-amber", icon: Clock         };
  if (paid >= owed) return { label:"Paid",     color:"badge-green", icon: CheckCircle   };
  if (paid > 0)     return { label:"Partial",  color:"badge-amber", icon: Clock         };
  return               { label:"Unpaid",   color:"badge-red",   icon: AlertCircle   };
}

export default function Fees() {
  const { profile } = useAuth();
  const [years,           setYears]           = useState([]);
  const [selectedYearName, setSelectedYearName] = useState("");
  const [students,   setStudents]   = useState([]);
  const [classes,    setClasses]    = useState([]);
  const [classMap,   setClassMap]   = useState({}); // studentId -> classId[]
  const [fees,       setFees]       = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab,  setActiveTab]  = useState("students");
  const [collapsed,  setCollapsed]  = useState({});
  const [groupBy,    setGroupBy]    = useState("class"); // "class" | "level" | "status"

  // Modals
  const [showPayment,   setShowPayment]   = useState(null);
  const [showHistory,   setShowHistory]   = useState(null);
  const [showFeeSetup,  setShowFeeSetup]  = useState(null);
  const [showStructModal, setShowStructModal] = useState(false);

  const [payForm,    setPayForm]    = useState({ component:"", amount:"", receipt_no:"", bank_name:BANK, payment_date:"", notes:"" });
  const [setupForm,  setSetupForm]  = useState({ discount_pct:"0", notes:"", is_new_pupil:false });
  const [structForm, setStructForm] = useState({ level_group:"", component:"", amount:"", academic_year:selectedYearName });
  const [saving,       setSaving]       = useState(false);
  const [savingSetup,  setSavingSetup]  = useState(false);
  const [savingStruct, setSavingStruct] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (selectedYearName) fetchAll(); }, [selectedYearName]);

  async function fetchAll() {
    setLoading(true);

    // Resolve which academic year/program we're viewing fees for
    let yearName = selectedYearName;
    if (!yearName) {
      const { data: yrs } = await supabase.from("academic_years").select("*").order("created_at", { ascending: false });
      setYears(yrs || []);
      const active = (yrs || []).find(y => y.is_active) || (yrs || [])[0];
      yearName = active?.name || "";
      setSelectedYearName(yearName);
      if (!yearName) { setLoading(false); return; }
    }
    const [
      { data: studs }, { data: cls }, { data: cs },
      { data: feeData }, { data: pmts }, { data: structs }
    ] = await Promise.all([
      supabase.from("students").select("id,full_name,class_level,gender,photo_url,parent_name,parent_phone,is_repeating").order("full_name"),
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_students").select("student_id,class_id"),
      supabase.from("student_fees").select("*").eq("academic_year", yearName),
      supabase.from("fee_payments").select("*").order("payment_date", { ascending:false }),
      supabase.from("fee_structures").select("*").eq("academic_year", yearName).order("level_group"),
    ]);
    setStudents(studs    || []);
    setClasses(cls       || []);
    setFees(feeData      || []);
    setPayments(pmts     || []);
    setStructures(structs|| []);
    const map = {};
    (cs || []).forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = [];
      map[r.student_id].push(r.class_id);
    });
    setClassMap(map);
    setLoading(false);
  }

  const getFee        = id  => fees.find(f => f.student_id === id);
  const getPayments   = fid => payments.filter(p => p.student_fee_id === fid);
  const getComponents = lg  => structures.filter(s => s.level_group === lg);

  // ── Build groups ──
  function buildGroups(studentList) {
    const groups = {};

    if (groupBy === "class") {
      // Assigned classes
      classes.forEach(cls => {
        const inClass = studentList.filter(s => (classMap[s.id]||[]).includes(cls.id));
        if (inClass.length > 0) {
          groups[cls.id] = {
            label: cls.name,
            sublabel: cls.level,
            color: NURSERY.includes(cls.level) ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100",
            badgeColor: NURSERY.includes(cls.level) ? "badge-blue" : "badge-green",
            badgeLabel: NURSERY.includes(cls.level) ? "Nursery" : "Primary",
            students: inClass,
          };
        }
      });
      // Unassigned
      const unassigned = studentList.filter(s => !(classMap[s.id]||[]).length);
      if (unassigned.length > 0) {
        groups["unassigned"] = {
          label: "Unassigned",
          sublabel: "Not linked to any class",
          color: "bg-gray-50 border-gray-100",
          badgeColor: "badge-amber",
          badgeLabel: "Unassigned",
          students: unassigned,
        };
      }
    } else if (groupBy === "level") {
      // Group by nursery vs primary
      const nursery = studentList.filter(s => NURSERY.includes(s.class_level));
      const primary = studentList.filter(s => !NURSERY.includes(s.class_level));
      if (nursery.length) groups["nursery"] = { label:"Nursery Section", sublabel:"Day Care → Nursery 2", color:"bg-blue-50 border-blue-100", badgeColor:"badge-blue", badgeLabel:"Nursery", students:nursery };
      if (primary.length) groups["primary"] = { label:"Primary Section",  sublabel:"Class 1 → Class 6",   color:"bg-green-50 border-green-100", badgeColor:"badge-green", badgeLabel:"Primary", students:primary };
    } else {
      // Group by fee status
      const paid    = studentList.filter(s => { const f=getFee(s.id); return f&&f.total_paid>=f.total_owed&&f.total_owed>0; });
      const partial = studentList.filter(s => { const f=getFee(s.id); return f&&f.total_paid>0&&f.total_paid<f.total_owed; });
      const unpaid  = studentList.filter(s => { const f=getFee(s.id); return f&&f.total_paid===0&&f.total_owed>0; });
      const notset  = studentList.filter(s => !getFee(s.id));
      if (paid.length)    groups["paid"]    = { label:"Fully Paid",    sublabel:`${paid.length} students`,    color:"bg-green-50 border-green-100", badgeColor:"badge-green", badgeLabel:"Paid",     students:paid    };
      if (partial.length) groups["partial"] = { label:"Partial",       sublabel:`${partial.length} students`, color:"bg-amber-50 border-amber-100", badgeColor:"badge-amber", badgeLabel:"Partial",  students:partial };
      if (unpaid.length)  groups["unpaid"]  = { label:"Unpaid",        sublabel:`${unpaid.length} students`,  color:"bg-red-50 border-red-100",     badgeColor:"badge-red",   badgeLabel:"Unpaid",   students:unpaid  };
      if (notset.length)  groups["notset"]  = { label:"Fee Not Set",   sublabel:`${notset.length} students`,  color:"bg-gray-50 border-gray-100",   badgeColor:"badge-amber", badgeLabel:"Not Set",  students:notset  };
    }
    return groups;
  }

  // Class fee summary
  function classSummary(studentList) {
    const owed = studentList.reduce((a,s) => a + (getFee(s.id)?.total_owed||0), 0);
    const paid = studentList.reduce((a,s) => a + (getFee(s.id)?.total_paid||0), 0);
    return { owed, paid, balance: owed - paid };
  }

  // ── Filtering ──
  const filtered = students.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.class_level?.toLowerCase().includes(search.toLowerCase()) ||
      s.parent_name?.toLowerCase().includes(search.toLowerCase());
    const fee = getFee(s.id);
    const paid = fee?.total_paid||0, owed = fee?.total_owed||0;
    const status = !owed ? "unset" : paid>=owed ? "paid" : paid>0 ? "partial" : "unpaid";
    const matchStatus = filterStatus==="all" ? true : filterStatus===status;
    return matchSearch && matchStatus;
  });

  const groups = buildGroups(filtered);

  // ── Summary stats ──
  const totalOwed        = fees.reduce((a,b)=>a+(b.total_owed||0),0);
  const totalPaid        = fees.reduce((a,b)=>a+(b.total_paid||0),0);
  const totalOutstanding = totalOwed - totalPaid;
  const paidCount    = fees.filter(f=>f.total_paid>=f.total_owed&&f.total_owed>0).length;
  const partialCount = fees.filter(f=>f.total_paid>0&&f.total_paid<f.total_owed).length;
  const unpaidCount  = fees.filter(f=>f.total_paid===0&&f.total_owed>0).length;

  const levelGroups = [...new Set(structures.map(s=>s.level_group))];

  // ── Handlers ──
  async function handleFeeSetup(e) {
    e.preventDefault(); setSavingSetup(true);
    const levelGroup = getLevelGroup(showFeeSetup.class_level);
    const comps = getComponents(levelGroup);
    const regComp = setupForm.is_new_pupil
      ? comps.find(c=>c.component.includes("New"))
      : comps.find(c=>c.component.includes("Old"));
    const tuitionTotal = comps.filter(c=>!c.component.toLowerCase().includes("registration")).reduce((a,b)=>a+Number(b.amount),0);
    let total = tuitionTotal + (regComp ? Number(regComp.amount) : 0);
    const disc = parseFloat(setupForm.discount_pct)||0;
    if (disc>0) total = total*(1-disc/100);

    const existing = getFee(showFeeSetup.id);
    const payload  = { total_owed:Math.round(total), discount_pct:disc, notes:setupForm.notes };
    if (existing) {
      const { error } = await supabase.from("student_fees").update(payload).eq("id",existing.id);
      if (error) { toast.error(error.message); setSavingSetup(false); return; }
    } else {
      const { error } = await supabase.from("student_fees").insert([{
        student_id:showFeeSetup.id, academic_year:selectedYearName,
        level_group:levelGroup, total_owed:Math.round(total), total_paid:0,
        discount_pct:disc, notes:setupForm.notes,
      }]);
      if (error) { toast.error(error.message); setSavingSetup(false); return; }
    }
    toast.success("Fee account updated!"); setShowFeeSetup(null); fetchAll(); setSavingSetup(false);
  }

  async function handlePayment(e) {
    e.preventDefault(); setSaving(true);
    let feeRecord = getFee(showPayment.id);
    if (!feeRecord) {
      const levelGroup = getLevelGroup(showPayment.class_level);
      const total = getComponents(levelGroup).filter(c=>!c.component.includes("Registration")).reduce((a,b)=>a+Number(b.amount),0);
      const { data, error } = await supabase.from("student_fees").insert([{
        student_id:showPayment.id, academic_year:selectedYearName,
        level_group:levelGroup, total_owed:total, total_paid:0,
      }]).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      feeRecord = data;
    }
    const amount = parseFloat(payForm.amount);
    const { error } = await supabase.from("fee_payments").insert([{
      student_fee_id:feeRecord.id, student_id:showPayment.id,
      amount, component:payForm.component, receipt_no:payForm.receipt_no,
      bank_name:payForm.bank_name,
      payment_date:payForm.payment_date||new Date().toISOString().split("T")[0],
      notes:payForm.notes,
      recorded_by:(await supabase.auth.getUser()).data.user?.id,
    }]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await supabase.from("student_fees").update({ total_paid:(feeRecord.total_paid||0)+amount }).eq("id",feeRecord.id);
    toast.success(`Payment of ${fmt(amount)} recorded!`);
    setShowPayment(null);
    setPayForm({ component:"", amount:"", receipt_no:"", bank_name:BANK, payment_date:"", notes:"" });
    fetchAll(); setSaving(false);
  }

  async function handleAddStruct(e) {
    e.preventDefault(); setSavingStruct(true);
    const { error } = await supabase.from("fee_structures").insert([{
      level_group:structForm.level_group, component:structForm.component,
      amount:parseFloat(structForm.amount), academic_year:selectedYearName,
    }]);
    if (error) toast.error(error.message);
    else { toast.success("Component added!"); setShowStructModal(false); setStructForm({ level_group:"", component:"", amount:"", academic_year:selectedYearName }); fetchAll(); }
    setSavingStruct(false);
  }

  function toggleCollapse(key) { setCollapsed(p=>({...p,[key]:!p[key]})); }

  // ── Student row ──
  function StudentRow({ s }) {
    const fee  = getFee(s.id);
    const owed = fee?.total_owed||0;
    const paid = fee?.total_paid||0;
    const bal  = owed - paid;
    const si   = statusInfo(paid, owed);
    const Icon = si.icon;
    return (
      <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {s.photo_url ? (
              <img src={s.photo_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover border-2 border-green-100 flex-shrink-0"/>
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background:s.gender==="female"?"#e63946":"#1a6b3c" }}>
                {s.full_name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-medium text-gray-800 text-sm">{s.full_name}</div>
              <div className="text-xs text-gray-400">{s.parent_name} · {s.parent_phone}</div>
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-600 text-sm">{s.class_level}</td>
        <td className="py-3 px-4 text-sm">{owed ? <span className="font-medium text-gray-700">{fmt(owed)}</span> : <span className="text-gray-300 text-xs">Not set</span>}</td>
        <td className="py-3 px-4 text-sm font-medium text-green-600">{paid ? fmt(paid) : "—"}</td>
        <td className={`py-3 px-4 text-sm font-bold ${bal>0?"text-red-500":"text-green-600"}`}>{owed ? fmt(bal) : "—"}</td>
        <td className="py-3 px-4">
          <span className={`${si.color} flex items-center gap-1 w-fit text-xs`}>
            <Icon size={10}/>{si.label}
          </span>
        </td>
        <td className="py-3 px-4">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => { setShowFeeSetup(s); const f=getFee(s.id); setSetupForm({ discount_pct:f?.discount_pct||"0", notes:f?.notes||"", is_new_pupil:!s.is_repeating }); }}
              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors">
              Set Fees
            </button>
            <button onClick={() => { setShowPayment(s); setPayForm({ component:"", amount:"", receipt_no:"", bank_name:BANK, payment_date:new Date().toISOString().split("T")[0], notes:"" }); }}
              className="text-xs px-2 py-1 rounded-lg bg-primary text-white hover:bg-primary-light transition-colors flex items-center gap-1">
              <Plus size={10}/> Pay
            </button>
            {fee && (
              <button onClick={() => setShowHistory({...fee, student:s})}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                History
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading fees...
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Fees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{selectedYearName} · {BANK} · A/C {ACCOUNT_NO}</p>
        </div>
        <div className="flex items-center gap-2">
          {years.length > 1 && (
            <select className="input w-auto text-sm py-2" value={selectedYearName}
              onChange={e => setSelectedYearName(e.target.value)}>
              {years.map(y => (
                <option key={y.id} value={y.name}>
                  {y.name}{y.program_type === "holiday" ? " (Holiday)" : ""}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setShowStructModal(true)} className="btn-ghost flex items-center gap-2 text-sm">
            <Settings2 size={15}/> Manage Components
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label:"Total Fees",      value:fmt(totalOwed),        bg:"bg-blue-50",   text:"text-blue-700"   },
          { label:"Total Collected", value:fmt(totalPaid),        bg:"bg-green-50",  text:"text-green-700"  },
          { label:"Amount Owed",     value:fmt(fees.reduce((a,f)=>a+Math.max(0,(f.total_owed||0)-(f.total_paid||0)),0)), bg:"bg-red-50",    text:"text-red-700"    },
          { label:"Fully Paid",      value:`${paidCount} / ${students.length}`, bg:"bg-amber-50", text:"text-amber-700" },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`card p-4 ${bg}`}>
            <div className={`text-lg font-display font-bold ${text}`}>{value}</div>
            <div className="text-xs mt-0.5 opacity-70">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-700">
        {[{ key:"students", label:"Student Fees" },{ key:"structures", label:"Fee Structure" }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${activeTab===key ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── STUDENTS TAB ── */}
      {activeTab === "students" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" placeholder="Search student or parent..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>

            {/* Group by */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Group by:</span>
              {[{ key:"class", label:"Class" },{ key:"level", label:"Level" },{ key:"status", label:"Status" }].map(({ key, label }) => (
                <button key={key} onClick={() => setGroupBy(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                    ${groupBy===key ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
              {[
                { key:"all",     label:`All (${students.length})`    },
                { key:"paid",    label:`Paid (${paidCount})`         },
                { key:"partial", label:`Partial (${partialCount})`   },
                { key:"unpaid",  label:`Unpaid (${unpaidCount})`     },
                { key:"unset",   label:`Not Set (${students.length-fees.length})` },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                    ${filterStatus===key ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped sections */}
          {Object.keys(groups).length === 0 ? (
            <div className="card text-center py-16 text-gray-400 text-sm">No students found.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groups).map(([key, group]) => {
                const summary = classSummary(group.students);
                const isOpen  = !collapsed[key];
                return (
                  <div key={key} className="card p-0 overflow-hidden">
                    {/* Group header */}
                    <button onClick={() => toggleCollapse(key)}
                      className={`w-full flex items-center justify-between px-5 py-4 border-b ${group.color} hover:opacity-90 transition-opacity`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <BookOpen size={16} className="text-primary flex-shrink-0"/>
                        <span className="font-display font-semibold text-gray-800">{group.label}</span>
                        {group.sublabel && <span className="text-xs text-gray-500">{group.sublabel}</span>}
                        <span className={`${group.badgeColor} text-xs`}>{group.badgeLabel}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users size={11}/> {group.students.length} student{group.students.length!==1?"s":""}
                        </span>
                      </div>
                      {/* Class fee summary */}
                      <div className="flex items-center gap-4 ml-auto mr-3">
                        {summary.owed > 0 && (
                          <>
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-gray-400">Owed</div>
                              <div className="text-xs font-semibold text-gray-700">{fmt(summary.owed)}</div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-gray-400">Collected</div>
                              <div className="text-xs font-semibold text-green-600">{fmt(summary.paid)}</div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-gray-400">Balance</div>
                              <div className={`text-xs font-bold ${summary.balance>0?"text-red-500":"text-green-600"}`}>{fmt(summary.balance)}</div>
                            </div>
                          </>
                        )}
                        {isOpen ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-400"/>}
                      </div>
                    </button>

                    {/* Students table */}
                    {isOpen && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50/50">
                            <th className="py-2.5 px-4 font-medium">Student</th>
                            <th className="py-2.5 px-4 font-medium">Level</th>
                            <th className="py-2.5 px-4 font-medium">Total Fees</th>
                            <th className="py-2.5 px-4 font-medium">Paid</th>
                            <th className="py-2.5 px-4 font-medium">Balance</th>
                            <th className="py-2.5 px-4 font-medium">Status</th>
                            <th className="py-2.5 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.students.map(s => <StudentRow key={s.id} s={s}/>)}
                        </tbody>
                        {/* Group totals footer */}
                        {summary.owed > 0 && (
                          <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-100 font-semibold text-xs">
                              <td colSpan={2} className="py-2 px-4 text-gray-500">Class Total</td>
                              <td className="py-2 px-4 text-gray-700">{fmt(summary.owed)}</td>
                              <td className="py-2 px-4 text-green-600">{fmt(summary.paid)}</td>
                              <td className={`py-2 px-4 font-bold ${summary.balance>0?"text-red-500":"text-green-600"}`}>{fmt(summary.balance)}</td>
                              <td colSpan={2} className="py-2 px-4">
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width:`${summary.owed ? Math.min((summary.paid/summary.owed)*100,100) : 0}%` }}/>
                                </div>
                                <span className="text-xs text-gray-400 mt-0.5 block">
                                  {summary.owed ? Math.round((summary.paid/summary.owed)*100) : 0}% collected
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── FEE STRUCTURE TAB ── */}
      {activeTab === "structures" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowStructModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={14}/> Add Component
            </button>
          </div>
          {levelGroups.map(lg => {
            const comps = getComponents(lg);
            const total = comps.filter(c=>!c.component.toLowerCase().includes("registration")).reduce((a,b)=>a+Number(b.amount),0);
            return (
              <div key={lg} className="card p-0 overflow-hidden">
                <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
                  <span className="font-display font-semibold text-gray-800 text-sm">{lg}</span>
                  <span className="text-xs text-green-700 font-medium">Tuition Total: {fmt(total)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                      <th className="py-2 px-4 font-medium">Component</th>
                      <th className="py-2 px-4 font-medium text-right">Amount</th>
                      <th className="py-2 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 px-4 text-gray-700">{c.component}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-gray-800">{fmt(c.amount)}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button onClick={async () => {
                            if (!window.confirm("Delete this component?")) return;
                            await supabase.from("fee_structures").delete().eq("id",c.id);
                            toast.success("Deleted"); fetchAll();
                          }} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          <div className="card bg-blue-50 border-blue-100 text-xs text-blue-700 p-4 space-y-1">
            <div><strong>Bank:</strong> {BANK} · A/C No: {ACCOUNT_NO}</div>
            <div><strong>Discounts:</strong> 3+ biological siblings → 5% per pupil · 1–2 kids paying in full → 5%</div>
            <div><strong>Note:</strong> No discount for Primary 6 tuition</div>
          </div>
        </div>
      )}

      {/* ── SET FEES MODAL ── */}
      {showFeeSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowFeeSetup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900">Set Fee Account</h2>
              <button onClick={() => setShowFeeSetup(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <div className="font-semibold text-gray-800">{showFeeSetup.full_name}</div>
              <div className="text-xs text-gray-500">{showFeeSetup.class_level} · {getLevelGroup(showFeeSetup.class_level)}</div>
            </div>
            <div className="text-xs space-y-1 bg-green-50 rounded-xl p-3">
              <p className="font-semibold text-gray-600 mb-1">Fee breakdown:</p>
              {getComponents(getLevelGroup(showFeeSetup.class_level)).map(c => (
                <div key={c.id} className="flex justify-between text-gray-600">
                  <span>{c.component}</span><span className="font-medium">{fmt(c.amount)}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleFeeSetup} className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="new_pupil" checked={setupForm.is_new_pupil}
                  onChange={e => setSetupForm(p=>({...p,is_new_pupil:e.target.checked}))}
                  className="w-4 h-4 accent-green-700"/>
                <label htmlFor="new_pupil" className="text-sm text-gray-700">New pupil (5,000F) — uncheck for old pupil (3,500F)</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                <select className="input" value={setupForm.discount_pct}
                  onChange={e => setSetupForm(p=>({...p,discount_pct:e.target.value}))}>
                  <option value="0">No discount</option>
                  <option value="5">5% (3+ siblings or full payment)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="input" placeholder="Optional" value={setupForm.notes}
                  onChange={e => setSetupForm(p=>({...p,notes:e.target.value}))}/>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowFeeSetup(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={savingSetup} className="btn-primary flex items-center gap-2">
                  {savingSetup && <Loader2 size={13} className="animate-spin"/>} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPayment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setShowPayment(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              {showPayment.photo_url ? (
                <img src={showPayment.photo_url} alt={showPayment.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-green-100"/>
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background:showPayment.gender==="female"?"#e63946":"#1a6b3c" }}>
                  {showPayment.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{showPayment.full_name}</div>
                <div className="text-xs text-gray-500">{showPayment.class_level}</div>
              </div>
              {(() => { const f=getFee(showPayment.id); if(!f) return null;
                const bal=(f.total_owed||0)-(f.total_paid||0);
                return <div className="text-right"><div className="text-xs text-gray-400">Balance</div><div className="font-bold text-red-500 text-sm">{fmt(bal)}</div></div>;
              })()}
            </div>
            <form onSubmit={handlePayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment component *</label>
                <select className="input" required value={payForm.component}
                  onChange={e => {
                    const comp = getComponents(getLevelGroup(showPayment.class_level)).find(c=>c.component===e.target.value);
                    setPayForm(p=>({...p, component:e.target.value, amount:comp?comp.amount:p.amount}));
                  }}>
                  <option value="">— Select —</option>
                  {getComponents(getLevelGroup(showPayment.class_level)).map(c=>(
                    <option key={c.id} value={c.component}>{c.component} — {fmt(c.amount)}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (FCFA) *</label>
                <input className="input" type="number" required min="1" value={payForm.amount}
                  onChange={e => setPayForm(p=>({...p,amount:e.target.value}))} placeholder="e.g. 100000"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank receipt number *</label>
                <input className="input" required value={payForm.receipt_no}
                  onChange={e => setPayForm(p=>({...p,receipt_no:e.target.value}))} placeholder="Teller / receipt number"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <input className="input" value={payForm.bank_name}
                  onChange={e => setPayForm(p=>({...p,bank_name:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment date *</label>
                <input className="input" type="date" required value={payForm.payment_date}
                  onChange={e => setPayForm(p=>({...p,payment_date:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input className="input" placeholder="Optional" value={payForm.notes}
                  onChange={e => setPayForm(p=>({...p,notes:e.target.value}))}/>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowPayment(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 size={13} className="animate-spin"/>}
                  <Receipt size={14}/> Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PAYMENT HISTORY MODAL ── */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowHistory(null)}>
          <style>{`
            @media print {
              @page { size: A4; margin: 8mm; }
              body * { visibility: hidden; }
              #receipt-print, #receipt-print * { visibility: visible; }
              #receipt-print { position: absolute; top: 0; left: 0; width: 100%; background: transparent !important; }
              #receipt-print .bg-gray-50,
              #receipt-print .border,
              #receipt-print [class*="bg-"] { background: transparent !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="receipt-print" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <img src="/logo_bg.png" alt="" style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "55%", maxWidth: "350px", opacity: 0.07,
              pointerEvents: "none", zIndex: 0, objectFit: "contain",
            }}/>
            <div style={{ position:"relative", zIndex:1 }}>
            <div className="flex items-center justify-between no-print">
              <h2 className="font-display font-bold text-gray-900">Payment History</h2>
              <div className="flex gap-2">
                <button onClick={() => {
                  const studentName = (showHistory.student.full_name || "Student").replace(/\s+/g, "_");
                  const prevTitle = document.title;
                  document.title = `Receipt_${studentName}_${selectedYearName}`;
                  window.print();
                  setTimeout(() => { document.title = prevTitle; }, 1000);
                }} className="text-gray-400 hover:text-primary"><Printer size={17}/></button>
                <button onClick={() => setShowHistory(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
              </div>
            </div>
            {/* Print header */}
            <div className="hidden print:flex items-center gap-3 border-b-2 pb-3 mb-3" style={{ borderColor:"#1a6b3c" }}>
              <img src="/logo_ma.png" alt="" style={{ width:50, height:50, objectFit:"contain" }}/>
              <div>
                <div className="font-bold text-sm" style={{ color:"#1a6b3c" }}>SS. Mary and Elizabeth Nursery and Primary Academy</div>
                <div className="text-xs text-gray-500">Fee Payment Receipt · {selectedYearName}</div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="font-semibold text-gray-800">{showHistory.student.full_name}</div>
              <div className="text-xs text-gray-500">{showHistory.student.class_level} · {selectedYearName}</div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                <div><div className="text-sm font-bold text-gray-800">{fmt(showHistory.total_owed)}</div><div className="text-xs text-gray-400">Total Fees</div></div>
                <div><div className="text-sm font-bold text-green-600">{fmt(showHistory.total_paid)}</div><div className="text-xs text-gray-400">Total Paid</div></div>
                <div>
                  <div className={`text-sm font-bold ${(showHistory.total_owed-showHistory.total_paid)>0?"text-red-500":"text-green-600"}`}>
                    {fmt(showHistory.total_owed-showHistory.total_paid)}
                  </div>
                  <div className="text-xs text-gray-400">Balance</div>
                </div>
              </div>
              {showHistory.total_owed > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width:`${Math.min((showHistory.total_paid/showHistory.total_owed)*100,100)}%` }}/>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{Math.round((showHistory.total_paid/showHistory.total_owed)*100)}% paid</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {getPayments(showHistory.id).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No payments recorded yet.</div>
              ) : getPayments(showHistory.id).map(p => (
                <div key={p.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{p.component}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Receipt: <strong>{p.receipt_no}</strong> · {p.bank_name}</div>
                    <div className="text-xs text-gray-400">{p.payment_date}</div>
                    {p.notes && <div className="text-xs text-gray-400 italic mt-0.5">{p.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-green-600 text-sm">{fmt(p.amount)}</div>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete this payment? This will reduce the total paid.")) return;
                        const { error } = await supabase.from("fee_payments").delete().eq("id", p.id);
                        if (error) { toast.error(error.message); return; }
                        await supabase.from("student_fees")
                          .update({ total_paid: Math.max(0, (showHistory.total_paid || 0) - p.amount) })
                          .eq("id", showHistory.id);
                        toast.success("Payment deleted");
                        fetchAll();
                        setShowHistory(null);
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete payment">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD STRUCTURE MODAL ── */}
      {showStructModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowStructModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-gray-900">Manage Fee Components</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedYearName}</p>
              </div>
              <button onClick={() => setShowStructModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>

            {/* Existing components for this year */}
            {structures.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Existing Components
                </div>
                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {structures.map(fc => (
                    <div key={fc.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{fc.component}</div>
                        <div className="text-xs text-gray-400">{fc.level_group}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold text-green-600">{fmt(fc.amount)}</div>
                        <button type="button"
                          onClick={async () => {
                            if (!window.confirm("Delete this component?")) return;
                            await supabase.from("fee_structures").delete().eq("id", fc.id);
                            toast.success("Component deleted"); fetchAll();
                          }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add New Component</p>
            </div>
            <form onSubmit={handleAddStruct} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level group *</label>
                <select className="input" required value={structForm.level_group}
                  onChange={e => setStructForm(p=>({...p,level_group:e.target.value}))}>
                  <option value="">— Select —</option>
                  {levelGroups.map(lg=><option key={lg} value={lg}>{lg}</option>)}
                  <option value="custom">Custom group...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Component name *</label>
                <input className="input" required placeholder="e.g. PTA Levy, Exam Fee, Transport"
                  value={structForm.component} onChange={e => setStructForm(p=>({...p,component:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (FCFA) *</label>
                <input className="input" type="number" required min="0"
                  value={structForm.amount} onChange={e => setStructForm(p=>({...p,amount:e.target.value}))}/>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowStructModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={savingStruct} className="btn-primary flex items-center gap-2">
                  {savingStruct && <Loader2 size={13} className="animate-spin"/>} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
