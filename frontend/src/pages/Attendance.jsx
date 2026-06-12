import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Calendar, Check, X, Clock, FileText, Loader2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  present: { label: "Present", color: "bg-green-100 text-green-700 border-green-200", icon: Check   },
  absent:  { label: "Absent",  color: "bg-red-100 text-red-700 border-red-200",       icon: X       },
  late:    { label: "Late",    color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock   },
  excused: { label: "Excused", color: "bg-blue-100 text-blue-700 border-blue-200",    icon: FileText},
};

export default function Attendance() {
  const today = new Date().toISOString().split("T")[0];
  const [classes,       setClasses]       = useState([]);
  const [selectedDate,  setSelectedDate]  = useState(today);
  const [selectedClass, setSelectedClass] = useState("");
  const [students,      setStudents]      = useState([]);
  const [attendance,    setAttendance]    = useState({});
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [initLoading,   setInitLoading]   = useState(true);

  useEffect(() => {
    supabase.from("classes").select("*").order("name").then(({ data }) => {
      setClasses(data || []);
      if ((data || []).length > 0) setSelectedClass(data[0].id);
      setInitLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    fetchAttendance();
  }, [selectedDate, selectedClass]);

  async function fetchAttendance() {
    setLoading(true);
    setSaved(false);

    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id, students(id, full_name, gender, photo_url)")
      .eq("class_id", selectedClass);

    const studentList = (classStudents || []).map(r => r.students).filter(Boolean);
    setStudents(studentList);

    if (studentList.length) {
      const { data: att } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("date", selectedDate)
        .in("student_id", studentList.map(s => s.id));

      const map = {};
      studentList.forEach(s => { map[s.id] = "present"; });
      (att || []).forEach(a => { map[a.student_id] = a.status; });
      setAttendance(map);
      if ((att || []).length > 0) setSaved(true);
    }

    setLoading(false);
  }

  function toggle(studentId) {
    const order = ["present", "absent", "late", "excused"];
    setAttendance(prev => {
      const cur  = prev[studentId] || "present";
      const next = order[(order.indexOf(cur) + 1) % order.length];
      return { ...prev, [studentId]: next };
    });
    setSaved(false);
  }

  async function saveAttendance() {
    setSaving(true);
    const rows = students.map(s => ({
      student_id: s.id,
      class_id:   selectedClass,
      date:       selectedDate,
      status:     attendance[s.id] || "present",
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });

    if (error) toast.error(error.message);
    else { toast.success("Attendance saved!"); setSaved(true); }
    setSaving(false);
  }

  function shiftDate(days) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const presentCount = Object.values(attendance).filter(s => s === "present").length;
  const absentCount  = Object.values(attendance).filter(s => s === "absent").length;
  const lateCount    = Object.values(attendance).filter(s => s === "late").length;

  const selectedClassObj = classes.find(c => c.id === selectedClass);

  if (initLoading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading...
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Click a student's pill to cycle: Present → Absent → Late → Excused</p>
        </div>
        <button onClick={saveAttendance} disabled={saving || students.length === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
            ${saved ? "bg-green-100 text-green-700 border border-green-200" : "btn-primary"}`}>
          {saving ? <><Loader2 size={15} className="animate-spin"/>Saving...</> : saved ? "✓ Saved" : "Save Attendance"}
        </button>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary"/>
            <input type="date" value={selectedDate} max={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="input w-auto text-sm py-2"/>
          </div>
          <button onClick={() => shiftDate(1)} disabled={selectedDate >= today}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
            <ChevronRight size={16}/>
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="text-sm text-amber-600 flex items-center gap-1">
            <Info size={14}/> No classes yet — create them in Academic Setup
          </div>
        ) : (
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="input w-auto text-sm py-2">
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} · {c.level}</option>
            ))}
          </select>
        )}

        {students.length > 0 && (
          <div className="flex gap-3 ml-auto flex-wrap">
            <span className="badge-green">{presentCount} Present</span>
            <span className="badge-red">{absentCount} Absent</span>
            <span className="badge-amber">{lateCount} Late</span>
            <span className="text-xs text-gray-400">{students.length} total</span>
          </div>
        )}
      </div>

      {/* Student list */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18}/> Loading...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm px-6">
            <Info size={24} className="mx-auto mb-3 opacity-40"/>
            No students in <strong>{selectedClassObj?.name || "this class"}</strong> yet.<br/>
            Enrol students and assign them to this class first.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map((s, i) => {
              const status = attendance[s.id] || "present";
              const cfg    = STATUS_CONFIG[status];
              const Icon   = cfg.icon;
              return (
                <div key={s.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-300 w-5 font-mono">{i + 1}</span>
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.full_name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-green-100 flex-shrink-0"/>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: s.gender === "female" ? "#e63946" : "#1a6b3c" }}>
                        {s.full_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-gray-800 text-sm">{s.full_name}</span>
                  </div>
                  <button onClick={() => toggle(s.id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold
                                transition-all active:scale-95 cursor-pointer ${cfg.color}`}>
                    <Icon size={12}/>{cfg.label}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
