import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  GraduationCap, Users, UserCheck, TrendingUp,
  BookOpen, Bell, ArrowUpRight, Loader2, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";

const COLORS = ["#1a6b3c","#f5a623","#2563eb","#e63946","#7c3aed","#0891b2","#059669"];

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalClasses: 0,
    activeTerm: null,
    activeSequence: null,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [classDistribution, setClassDistribution] = useState([]);
  const [genderSplit, setGenderSplit] = useState([]);
  const [sectionSplit, setSectionSplit] = useState([]);
  const [topClasses, setTopClasses] = useState([]);
  const [staffByRole, setStaffByRole] = useState([]);
  const [feeStats, setFeeStats] = useState({ totalOwed:0, totalPaid:0, paidCount:0, partialCount:0, unpaidCount:0 });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [
      { data: students },
      { data: staff },
      { data: classes },
      { data: terms },
      { data: sequences },
      { data: classStudents },
      { data: grades },
      { data: feeData },
    ] = await Promise.all([
      supabase.from("students").select("id, full_name, class_level, gender, section, created_at, photo_url").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, role, full_name, gender"),
      supabase.from("classes").select("id, name, level, teacher_id"),
      supabase.from("terms").select("*").order("created_at", { ascending: false }),
      supabase.from("sequences").select("*").order("created_at", { ascending: false }),
      supabase.from("class_students").select("class_id, student_id"),
      supabase.from("grades").select("student_id, subject_id, sequence_id, score"),
      supabase.from("student_fees").select("total_owed, total_paid"),
    ]);


    // Teacher scoping: only their own class(es), nothing else
    let scopedClasses = classes || [];
    let scopedStudents = students || [];
    let scopedClassStudents = classStudents || [];
    let scopedStaff = staff || [];

    if (profile?.role === "teacher") {
      scopedClasses = (classes || []).filter(c => c.teacher_id === profile.id);
      const myClassIds = scopedClasses.map(c => c.id);
      scopedClassStudents = (classStudents || []).filter(cs => myClassIds.includes(cs.class_id));
      const myStudentIds = scopedClassStudents.map(cs => cs.student_id);
      scopedStudents = (students || []).filter(s => myStudentIds.includes(s.id));
      scopedStaff = [];
    }
    const activeTerm = (terms || []).find(t => t.is_active) || (terms || [])[0];
    const activeSeq  = (sequences || []).find(s => s.is_active) || (sequences || [])[0];

    // Stats
    // Calculate real fee stats
    const feeRows = feeData || [];
    setFeeStats({
      totalOwed:    feeRows.reduce((a,b) => a + (parseFloat(b.total_owed)||0), 0),
      totalPaid:    feeRows.reduce((a,b) => a + (parseFloat(b.total_paid)||0), 0),
      paidCount:    feeRows.filter(f => parseFloat(f.total_paid) >= parseFloat(f.total_owed) && parseFloat(f.total_owed) > 0).length,
      partialCount: feeRows.filter(f => parseFloat(f.total_paid) > 0 && parseFloat(f.total_paid) < parseFloat(f.total_owed)).length,
      unpaidCount:  feeRows.filter(f => parseFloat(f.total_paid) === 0 && parseFloat(f.total_owed) > 0).length,
    });

    setStats({
      totalStudents:  (scopedStudents || []).length,
      totalStaff:     (scopedStaff || []).filter(s => s.role !== "admin").length,
      totalClasses:   (scopedClasses || []).length,
      activeTerm,
      activeSequence: activeSeq,
    });

    // Recent 5 enrollments
    setRecentStudents((scopedStudents || []).slice(0, 5));

    // Class distribution (students per class level)
    const levelCount = {};
    (scopedStudents || []).forEach(s => {
      levelCount[s.class_level] = (levelCount[s.class_level] || 0) + 1;
    });
    setClassDistribution(
      Object.entries(levelCount)
        .map(([level, count]) => ({ level, count }))
        .sort((a,b) => a.level.localeCompare(b.level))
    );

    // Gender split
    const male   = (scopedStudents || []).filter(s => s.gender === "male").length;
    const female = (scopedStudents || []).filter(s => s.gender === "female").length;
    setGenderSplit([
      { name: "Male",   value: male,   color: "#1a6b3c" },
      { name: "Female", value: female, color: "#e63946" },
    ]);

    // Section split
    const franco = (scopedStudents || []).filter(s => s.section === "francophone").length;
    const anglo  = (scopedStudents || []).filter(s => s.section === "anglophone").length;
    setSectionSplit([
      { name: "Francophone", value: franco, color: "#2563eb" },
      { name: "Anglophone",  value: anglo,  color: "#f5a623" },
    ]);

    // Staff by role
    const roleCount = {};
    (scopedStaff || []).filter(s => s.role !== "admin").forEach(s => {
      roleCount[s.role] = (roleCount[s.role] || 0) + 1;
    });
    setStaffByRole(Object.entries(roleCount).map(([role, count]) => ({ role, count })));

    // Top classes by average grade (if grades exist and active sequence)
    if (activeSeq && (grades || []).length && (scopedClassStudents || []).length) {
      const classAvgs = (scopedClasses || []).map(cls => {
        const studentIds = (scopedClassStudents || [])
          .filter(cs => cs.class_id === cls.id)
          .map(cs => cs.student_id);
        const clsGrades = (grades || [])
          .filter(g => studentIds.includes(g.student_id) && g.sequence_id === activeSeq.id)
          .map(g => g.score);
        const avg = clsGrades.length
          ? clsGrades.reduce((a,b)=>a+b,0) / clsGrades.length
          : null;
        return { name: cls.name, avg, students: studentIds.length };
      }).filter(c => c.avg !== null)
        .sort((a,b) => b.avg - a.avg)
        .slice(0, 5);
      setTopClasses(classAvgs);
    }

    setLoading(false);
  }

  const roleLabel = {
    headmaster: "Principal/Head Teacher",
    teacher:    "Teacher",
    bursar:     "Bursar",
    secretary:  "Secretary",
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin mr-2" size={20}/> Loading dashboard...
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {greeting}, {profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            MARELI Academy · {new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {stats.activeTerm && (
            <span className="badge-green">{stats.activeTerm.name} · 2024–25</span>
          )}
          {stats.activeSequence && (
            <span className="badge-amber">{stats.activeSequence.name} active</span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Students",  value: stats.totalStudents,  icon: Users,          color: "bg-green-50 text-primary",    action: () => navigate("/students") },
          { label: "Teaching Staff",  value: stats.totalStaff,     icon: UserCheck,      color: "bg-amber-50 text-secondary",  action: () => navigate("/staff"),  hideFor: "teacher" },
          { label: "Classes",         value: stats.totalClasses,   icon: BookOpen,       color: "bg-blue-50 text-blue-600",    action: () => navigate("/setup")    },
          { label: "Active Sequence", value: stats.activeSequence?.name || "None", icon: Calendar, color: "bg-purple-50 text-purple-600", action: () => navigate("/setup") },
          { label: "Fees Collected",  value: new Intl.NumberFormat("fr-CM",{style:"currency",currency:"XAF",minimumFractionDigits:0}).format(feeStats.totalPaid),  icon: Receipt, color: "bg-green-50 text-green-700", action: () => navigate("/fees"), hideFor: "teacher" },
          { label: "Outstanding",     value: new Intl.NumberFormat("fr-CM",{style:"currency",currency:"XAF",minimumFractionDigits:0}).format(Math.max(0,feeStats.totalOwed-feeStats.totalPaid)), icon: Receipt, color: "bg-red-50 text-red-600", action: () => navigate("/fees"), hideFor: "teacher" },
          { label: "Fully Paid",      value: feeStats.paidCount + " students", icon: UserCheck, color: "bg-blue-50 text-blue-600", action: () => navigate("/fees"), hideFor: "teacher" },
        ].filter(card => card.hideFor !== profile?.role)
         .map(({ label, value, icon: Icon, color, action }) => (
          <button key={label} onClick={action}
            className="card flex items-start gap-4 text-left hover:shadow-lg transition-shadow cursor-pointer w-full">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={22}/>
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Students per class level */}
        <div className="card xl:col-span-2">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-primary"/> Students by Class Level
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Number of enrolled pupils per level</p>
          </div>
          {classDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classDistribution} barGap={4}>
                <XAxis dataKey="level" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={25} allowDecimals={false}/>
                <Tooltip contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}/>
                <Bar dataKey="count" fill="#1a6b3c" radius={[6,6,0,0]} name="Students"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gender & Section split */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-secondary"/> Demographics
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Gender and section split</p>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">By Gender</p>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={genderSplit} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={50} label={({name,value})=>`${name}: ${value}`}
                    labelLine={false} fontSize={10}>
                    {genderSplit.map((entry, i) => (
                      <Cell key={i} fill={entry.color}/>
                    ))}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2">
              {sectionSplit.map(s => (
                <div key={s.name} className="flex-1 rounded-xl p-3 text-center"
                  style={{ background: s.color + "15", border: `1px solid ${s.color}30` }}>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top performing classes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap size={18} className="text-primary"/> Class Performance
            </h3>
            <span className="text-xs text-gray-400">{stats.activeSequence?.name || "Current sequence"}</span>
          </div>
          {topClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300 text-sm gap-2">
              <BookOpen size={28}/>
              No grades entered yet for the active sequence
            </div>
          ) : (
            <div className="space-y-3">
              {topClasses.map((cls, i) => (
                <div key={cls.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-5 text-gray-400">{i+1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{cls.name}</span>
                      <span className="text-xs font-bold text-primary">{cls.avg.toFixed(1)}/20</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-2 rounded-full transition-all"
                        style={{ width:`${(cls.avg/20)*100}%`, background: i===0?"#1a6b3c":i===1?"#f5a623":"#2563eb" }}/>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{cls.students} pupils</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent enrollments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-primary"/> Recent Enrollments
            </h3>
            <button onClick={() => navigate("/students")}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View all <ArrowUpRight size={12}/>
            </button>
          </div>
          {recentStudents.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No students yet</div>
          ) : (
            <div className="space-y-2">
              {recentStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.full_name}
                        className="w-8 h-8 rounded-full object-cover border border-green-100"/>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: s.gender==="female"?"#e63946":"#1a6b3c" }}>
                        {s.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-800">{s.full_name}</div>
                      <div className="text-xs text-gray-400">{s.class_level} · <span className="capitalize">{s.section}</span></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff summary - hidden for teachers, school-wide info only */}
      {profile?.role !== "teacher" && (
      <div className="card">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-gray-900 flex items-center gap-2">
            <UserCheck size={18} className="text-secondary"/> Staff Overview
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {staffByRole.map(({ role, count }) => (
            <div key={role} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck size={15} className="text-primary"/>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-800">{count}</div>
                <div className="text-xs text-gray-500">{roleLabel[role] || role}</div>
              </div>
            </div>
          ))}
          {staffByRole.length === 0 && (
            <div className="text-sm text-gray-400">No staff added yet</div>
          )}
        </div>
      </div>
      )}

    </div>
  );
}
