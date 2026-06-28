import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Plus, Search, Loader2, X, Pencil, Camera, User, Trash2,
  Users, List, LayoutGrid, BookOpen, ChevronDown, ChevronRight, UserPlus,
  Copy, Check, KeyRound
} from "lucide-react";
import toast from "react-hot-toast";

const NURSERY = ["Day Care","Pre-Nursery","Nursery 1","Nursery 2"];

const EMPTY_FORM = {
  full_name:"", date_of_birth:"", gender:"male", birth_certificate_no:"",
  class_level:"Class 1", section:"anglophone", is_repeating:false,
  quarter:"", region:"South West", parent_name:"", parent_phone:"",
  parent_network:"mtn", parent_email:"", blood_group:"", allergies:"", photo_url:"",
};


function CredentialsModal({ credentials, onClose }) {
  const [copiedField, setCopiedField] = React.useState(null);

  function copy(text, field) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-primary px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <KeyRound size={20}/>
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Parent Account Created!</h2>
              <p className="text-green-200 text-xs mt-0.5">Share these credentials with the parent</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{credentials.name}</strong> can now log in to track their child's fees and grades.
          </p>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            {[
              { label:"Parent Name", value:credentials.name,     field:"name"     },
              { label:"Login Email", value:credentials.email,    field:"email"    },
              { label:"Password",    value:credentials.password, field:"password" },
              { label:"Portal",      value:credentials.role,     field:"role"     },
            ].map(({ label, value, field }) => (
              <div key={field} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                <div>
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="font-mono font-semibold text-gray-800 text-sm mt-0.5">{value}</div>
                </div>
                {field !== "role" && field !== "name" && (
                  <button onClick={() => copy(value, field)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                    {copiedField === field ? <Check size={15} className="text-green-500"/> : <Copy size={15}/>}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
            ⚠ Note down these credentials now — the password won't be shown again.
          </div>
          <div className="flex gap-3">
            <button onClick={() => {
              const text = `MARELI Academy Parent Portal\nName: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
              navigator.clipboard.writeText(text);
            }} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
              <Copy size={14}/> Copy All
            </button>
            <button onClick={onClose} className="btn-primary flex-1">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Students() {
  const { profile } = useAuth();
  const [students,    setStudents]    = useState([]);
  const [classes,     setClasses]     = useState([]);
  const isUnassignedTeacher = profile?.role === "teacher" && classes.length === 0;
  const [classMap,    setClassMap]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [showModal,   setShowModal]   = useState(false);
  const [viewMode,    setViewMode]    = useState("list");
  const [saving,      setSaving]      = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [photoFile,   setPhotoFile]   = useState(null);
  const [photoPreview,setPhotoPreview]= useState(null);
  const [showAssign,  setShowAssign]  = useState(null); // student object
  const [assignClass, setAssignClass] = useState("");
  const [assigning,   setAssigning]   = useState(false);
  const [collapsed,   setCollapsed]   = useState({});
  const [credentials, setCredentials] = useState(null);
  const fileRef = useRef();

  useEffect(() => { if (profile) fetchAll(); }, [profile]);

  async function fetchAll() {
    setLoading(true);
    let studentQuery = supabase.from("students").select("*").order("full_name");
    let classQuery   = supabase.from("classes").select("*").order("name");

    if (profile?.role === "teacher") {
      classQuery = classQuery.eq("teacher_id", profile.id);
    }

    const [{ data: cls }, { data: cs }] = await Promise.all([
      classQuery,
      supabase.from("class_students").select("student_id, class_id"),
    ]);

    let studs = [];
    if (profile?.role === "teacher") {
      const myClassIds = (cls || []).map(c2 => c2.id);
      const myStudentIds = (cs || [])
        .filter(link => myClassIds.includes(link.class_id))
        .map(link => link.student_id);
      if (myStudentIds.length > 0) {
        const { data } = await supabase.from("students").select("*").in("id", myStudentIds).order("full_name");
        studs = data || [];
      }
    } else {
      const { data } = await studentQuery;
      studs = data || [];
    }
    setStudents(studs || []);
    setClasses(cls   || []);
    // Build map: studentId -> [classId, ...]
    const map = {};
    (cs || []).forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = [];
      map[r.student_id].push(r.class_id);
    });
    setClassMap(map);
    setLoading(false);
  }

  // ── Assign student to class ──
  // Auto-creates a student_fees row if the class belongs to a holiday program
  // and the student doesn't already have a fee record for that program.
  async function createHolidayFeeIfNeeded(studentId, classId) {
    const { data: cls } = await supabase
      .from("classes").select("academic_year_id").eq("id", classId).single();
    if (!cls?.academic_year_id) return;

    const { data: year } = await supabase
      .from("academic_years").select("name, program_type").eq("id", cls.academic_year_id).single();
    if (!year || year.program_type !== "holiday") return;

    const { data: existing } = await supabase
      .from("student_fees").select("id")
      .eq("student_id", studentId).eq("academic_year", year.name).maybeSingle();
    if (existing) return; // already has a fee record for this program

    const { data: struct } = await supabase
      .from("fee_structures").select("amount")
      .eq("academic_year", year.name).eq("level_group", "Holiday Program")
      .maybeSingle();
    const amount = struct?.amount || 0;
    if (!amount) return; // no fee structure set up yet for this program

    await supabase.from("student_fees").insert([{
      student_id: studentId,
      academic_year: year.name,
      level_group: "Holiday Program",
      total_owed: amount,
      total_paid: 0,
    }]);
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignClass) { toast.error("Select a class"); return; }
    setAssigning(true);
    const already = (classMap[showAssign.id] || []).includes(assignClass);
    if (already) { toast.error("Student already in this class"); setAssigning(false); return; }
    const { error } = await supabase.from("class_students")
      .insert([{ student_id: showAssign.id, class_id: assignClass }]);
    if (error) toast.error(error.message);
    else {
      await createHolidayFeeIfNeeded(showAssign.id, assignClass);
      toast.success(`${showAssign.full_name} assigned to class!`);
      setShowAssign(null); setAssignClass(""); fetchAll();
    }
    setAssigning(false);
  }

  async function removeFromClass(studentId, classId, studentName) {
    if (!window.confirm(`Remove ${studentName} from this class?`)) return;
    const { error } = await supabase.from("class_students")
      .delete().eq("student_id", studentId).eq("class_id", classId);
    if (error) toast.error(error.message);
    else { toast.success("Removed from class"); fetchAll(); }
  }

  // ── Photo ──
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(studentId) {
    if (!photoFile) return form.photo_url || null;
    const ext  = photoFile.name.split(".").pop();
    const path = `${studentId}.${ext}`;
    const { error } = await supabase.storage.from("student-photos").upload(path, photoFile, { upsert:true });
    if (error) { toast.error("Photo upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  // ── Save student ──
  async function handleSave(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) {
        const photoUrl = await uploadPhoto(editing);
        const payload  = { ...form, ...(photoUrl ? { photo_url: photoUrl } : {}) };
        const { error } = await supabase.from("students").update(payload).eq("id", editing);
        if (error) throw error;
        toast.success("Student updated!");
      } else {
        const { data, error } = await supabase.from("students")
          .insert([{ ...form, photo_url:null }]).select().single();
        if (error) throw error;
        const photoUrl = await uploadPhoto(data.id);
        if (photoUrl) await supabase.from("students").update({ photo_url: photoUrl }).eq("id", data.id);
        // Auto-assign to class matching level
        const match = classes.find(c => c.level === form.class_level);
        if (match) {
          await supabase.from("class_students").insert([{ student_id: data.id, class_id: match.id }]);
          await createHolidayFeeIfNeeded(data.id, match.id);
        }
        // Create parent account automatically
        try {
          const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
          const res = await fetch(apiUrl + "/create-parent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parent_name: form.parent_name,
              parent_phone: form.parent_phone,
              student_id: data.id
            })
          });
          const result = await res.json();
          if (result.success) {
            setCredentials({
              name:     form.parent_name,
              email:    result.email,
              password: result.password,
              role:     "Parent Portal",
            });
          }
          toast.success("Student enrolled! Parent account created.");
        } catch(e) {
          toast.success("Student enrolled!");
          console.warn("Parent account creation failed", e);
        }
      }
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  }

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM);
    setPhotoFile(null); setPhotoPreview(null); setShowModal(true);
  }

  async function handleDelete(s) {
    if (!window.confirm(`Delete ${s.full_name}? This will permanently remove their records (attendance, grades, fees). This cannot be undone.`)) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    else { toast.success(`${s.full_name} deleted`); fetchAll(); }
  }

  function openEdit(s) {
    setEditing(s.id);
    setForm({
      full_name: s.full_name||"", date_of_birth: s.date_of_birth||"",
      gender: s.gender||"male", birth_certificate_no: s.birth_certificate_no||"",
      class_level: s.class_level||"Class 1", section: s.section||"anglophone",
      is_repeating: s.is_repeating||false, quarter: s.quarter||"",
      region: s.region||"South West", parent_name: s.parent_name||"",
      parent_phone: s.parent_phone||"", parent_network: s.parent_network||"mtn",
      parent_email: s.parent_email||"", blood_group: s.blood_group||"",
      allergies: s.allergies||"", photo_url: s.photo_url||"",
    });
    setPhotoFile(null); setPhotoPreview(s.photo_url||null); setShowModal(true);
  }

  // ── Filtering ──
  const filtered = students.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.class_level?.toLowerCase().includes(search.toLowerCase()) ||
      s.parent_name?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === "all" ? true :
      filterLevel === "nursery"  ? NURSERY.includes(s.class_level) :
      filterLevel === "primary"  ? !NURSERY.includes(s.class_level) :
      s.class_level === filterLevel;
    return matchSearch && matchLevel;
  });

  // ── Group by class ──
  const grouped = {};
  filtered.forEach(s => {
    const studentClassIds = classMap[s.id] || [];
    if (studentClassIds.length === 0) {
      const key = `unassigned_${s.class_level}`;
      if (!grouped[key]) grouped[key] = { label: `${s.class_level} (Unassigned)`, students: [], color:"bg-gray-100 text-gray-600" };
      grouped[key].students.push(s);
    } else {
      studentClassIds.forEach(cid => {
        const cls = classes.find(c => c.id === cid);
        if (cls) {
          const key = cls.id;
          if (!grouped[key]) grouped[key] = { label: cls.name, level: cls.level, students: [], color: NURSERY.includes(cls.level) ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700" };
          grouped[key].students.push(s);
        }
      });
    }
  });

  function toggleCollapse(key) {
    setCollapsed(p => ({ ...p, [key]: !p[key] }));
  }

  // ── Student row ──
  function StudentRow({ s }) {
    const studentClasses = (classMap[s.id] || []).map(cid => classes.find(c => c.id === cid)).filter(Boolean);
    return (
      <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {s.photo_url ? (
              <img src={s.photo_url} alt={s.full_name}
                className="w-9 h-9 rounded-full object-cover border-2 border-green-100 flex-shrink-0"/>
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: s.gender==="female"?"#e63946":"#1a6b3c" }}>
                {s.full_name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-medium text-gray-800">{s.full_name}</div>
              {s.birth_certificate_no && <div className="text-xs text-gray-400">BC: {s.birth_certificate_no}</div>}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-700">{s.class_level}</td>
        <td className="py-3 px-4">
          <span className={NURSERY.includes(s.class_level) ? "badge-blue" : "badge-green"}>
            {NURSERY.includes(s.class_level) ? "Nursery" : "Primary"}
          </span>
        </td>
        <td className="py-3 px-4 text-gray-600 capitalize">{s.gender}</td>
        <td className="py-3 px-4">
          <div className="text-gray-700 text-sm">{s.parent_name}</div>
          <div className="text-xs text-gray-400">{s.parent_phone} · {s.parent_network?.toUpperCase()}</div>
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-wrap gap-1">
            {studentClasses.length === 0 ? (
              <span className="badge-amber">Unassigned</span>
            ) : studentClasses.map(cls => (
              <div key={cls.id} className="flex items-center gap-1 badge-green">
                {cls.name}
                <button onClick={() => removeFromClass(s.id, cls.id, s.full_name)}
                  className="ml-0.5 text-green-500 hover:text-red-500 transition-colors">
                  <X size={10}/>
                </button>
              </div>
            ))}
          </div>
        </td>
        <td className="py-3 px-4">
          <span className={s.is_repeating ? "badge-amber" : "badge-green"}>
            {s.is_repeating ? "Repeating" : "Active"}
          </span>
        </td>
        <td className="py-3 px-4">
          <div className="flex gap-1">
            <button onClick={() => { setShowAssign(s); setAssignClass(""); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Assign to class">
              <UserPlus size={15}/>
            </button>
            <button onClick={() => openEdit(s)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-green-50 transition-colors"
              title="Edit student">
              <Pencil size={15}/>
            </button>
            {!isUnassignedTeacher && profile?.role !== "teacher" && (
              <button onClick={() => handleDelete(s)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete student">
                <Trash2 size={15}/>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} enrolled · MARELI Academy, Buea</p>
        </div>
        {!isUnassignedTeacher && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Enrol Student
          </button>
        )}
      </div>

      {isUnassignedTeacher && (
        <div className="card border-amber-200 bg-amber-50 text-amber-800 text-sm py-6 text-center">
          You have not been assigned to a class yet.<br/>
          Please contact your headmaster to be assigned to a class.
        </div>
      )}

      {!isUnassignedTeacher && (
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search by name, class or parent..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        {/* Level filter */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key:"all",     label:"All" },
            { key:"nursery", label:"Nursery" },
            { key:"primary", label:"Primary" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterLevel(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                ${filterLevel === key ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-all ${viewMode==="list" ? "bg-white shadow text-primary" : "text-gray-400 hover:text-gray-600"}`}
            title="List view"><List size={16}/></button>
          <button onClick={() => setViewMode("grouped")}
            className={`p-1.5 rounded-lg transition-all ${viewMode==="grouped" ? "bg-white shadow text-primary" : "text-gray-400 hover:text-gray-600"}`}
            title="Group by class"><LayoutGrid size={16}/></button>
        </div>
      </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <div className="card overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={18}/> Loading students...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              No students found. Click <strong>Enrol Student</strong> to add one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="py-3 px-4 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">Level</th>
                  <th className="py-3 px-4 font-medium">Section</th>
                  <th className="py-3 px-4 font-medium">Gender</th>
                  <th className="py-3 px-4 font-medium">Parent / Contact</th>
                  <th className="py-3 px-4 font-medium">Assigned Class</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => <StudentRow key={s.id} s={s}/>)}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── GROUPED VIEW ── */}
      {viewMode === "grouped" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={18}/> Loading...
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="card text-center py-16 text-gray-400 text-sm">No students found.</div>
          ) : (
            Object.entries(grouped).map(([key, group]) => (
              <div key={key} className="card p-0 overflow-hidden">
                {/* Group header */}
                <button onClick={() => toggleCollapse(key)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-primary"/>
                    <span className="font-display font-semibold text-gray-800">{group.label}</span>
                    {group.level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.color}`}>
                        {NURSERY.includes(group.level) ? "Nursery" : "Primary"}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{group.students.length} student{group.students.length !== 1 ? "s" : ""}</span>
                  </div>
                  {collapsed[key] ? <ChevronRight size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                </button>

                {!collapsed[key] && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="py-2 px-4 font-medium">Student</th>
                        <th className="py-2 px-4 font-medium">Gender</th>
                        <th className="py-2 px-4 font-medium">Parent / Contact</th>
                        <th className="py-2 px-4 font-medium">Status</th>
                        <th className="py-2 px-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.students.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              {s.photo_url ? (
                                <img src={s.photo_url} alt={s.full_name}
                                  className="w-8 h-8 rounded-full object-cover border-2 border-green-100 flex-shrink-0"/>
                              ) : (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ background: s.gender==="female"?"#e63946":"#1a6b3c" }}>
                                  {s.full_name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium text-gray-800">{s.full_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-gray-600 capitalize">{s.gender}</td>
                          <td className="py-2.5 px-4">
                            <div className="text-gray-700 text-sm">{s.parent_name}</div>
                            <div className="text-xs text-gray-400">{s.parent_phone}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={s.is_repeating ? "badge-amber" : "badge-green"}>
                              {s.is_repeating ? "Repeating" : "Active"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex gap-1">
                              <button onClick={() => { setShowAssign(s); setAssignClass(""); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <UserPlus size={14}/>
                              </button>
                              <button onClick={() => openEdit(s)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-green-50 transition-colors">
                                <Pencil size={14}/>
                              </button>
                              {profile?.role !== "teacher" && (
                                <button onClick={() => handleDelete(s)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 size={14}/>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ASSIGN TO CLASS MODAL ── */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAssign(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900">Assign to Class</h2>
              <button onClick={() => setShowAssign(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              {showAssign.photo_url ? (
                <img src={showAssign.photo_url} alt={showAssign.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-green-100"/>
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: showAssign.gender==="female"?"#e63946":"#1a6b3c" }}>
                  {showAssign.full_name.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-800">{showAssign.full_name}</div>
                <div className="text-xs text-gray-500">{showAssign.class_level}</div>
              </div>
            </div>

            {/* Current class assignments */}
            {(classMap[showAssign.id] || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Currently assigned to:</p>
                <div className="flex flex-wrap gap-1">
                  {(classMap[showAssign.id] || []).map(cid => {
                    const cls = classes.find(c => c.id === cid);
                    return cls ? (
                      <div key={cid} className="flex items-center gap-1 badge-green text-xs">
                        {cls.name}
                        <button onClick={() => removeFromClass(showAssign.id, cid, showAssign.full_name)}
                          className="text-green-500 hover:text-red-500 ml-0.5">
                          <X size={10}/>
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select class to assign</label>
                <select className="input" value={assignClass} onChange={e => setAssignClass(e.target.value)} required>
                  <option value="">— Choose a class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}
                      disabled={(classMap[showAssign.id]||[]).includes(c.id)}>
                      {c.name} · {c.level} {(classMap[showAssign.id]||[]).includes(c.id) ? "(already assigned)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAssign(null)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={assigning} className="btn-primary flex items-center gap-2">
                  {assigning && <Loader2 size={13} className="animate-spin"/>}
                  <Users size={14}/> Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ENROL / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-display font-bold text-lg text-gray-900">
                {editing ? "Edit Student" : "Enrol New Student"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">

              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-green-100"/>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                      <User size={32} className="text-gray-400"/>
                    </div>
                  )}
                  <button type="button" onClick={() => fileRef.current.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-light">
                    <Camera size={14}/>
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                <p className="text-xs text-gray-400">Click camera to upload photo (max 2MB)</p>
              </div>

              {/* Identity */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identity</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                    <input className="input" required value={form.full_name}
                      onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                    <input className="input" type="date" value={form.date_of_birth}
                      onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select className="input" value={form.gender}
                      onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth certificate no.</label>
                    <input className="input" value={form.birth_certificate_no}
                      onChange={e => setForm(p => ({ ...p, birth_certificate_no: e.target.value }))}/>
                  </div>
                </div>
              </div>

              {/* Academic */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Academic Placement</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class level *</label>
                    <select className="input" required value={form.class_level}
                      onChange={e => setForm(p => ({ ...p, class_level: e.target.value }))}>
                      <optgroup label="Nursery Section">
                        {["Day Care","Pre-Nursery","Nursery 1","Nursery 2"].map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Primary Section">
                        {["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6"].map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select className="input" value={form.section}
                      onChange={e => setForm(p => ({ ...p, section: e.target.value }))}>
                      <option value="anglophone">Anglophone</option>
                      <option value="francophone">Francophone</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_repeating}
                        onChange={e => setForm(p => ({ ...p, is_repeating: e.target.checked }))}
                        className="w-4 h-4 accent-green-700 rounded"/>
                      <span className="text-sm text-gray-700">This student is repeating the class</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Residence */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Residence</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                    <input className="input" value={form.quarter}
                      onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select className="input" value={form.region}
                      onChange={e => setForm(p => ({ ...p, region: e.target.value }))}>
                      {["South West","North West","Littoral","Centre","West","East","Adamawa","North","Far North","South"].map(r =>
                        <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Parent */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parent / Guardian</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input className="input" value={form.parent_name}
                      onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input className="input" value={form.parent_phone}
                      onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                    <select className="input" value={form.parent_network}
                      onChange={e => setForm(p => ({ ...p, parent_network: e.target.value }))}>
                      <option value="mtn">MTN</option>
                      <option value="orange">Orange</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                    <input className="input" type="email" value={form.parent_email}
                      onChange={e => setForm(p => ({ ...p, parent_email: e.target.value }))}/>
                  </div>
                </div>
              </div>

              {/* Health */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Health (optional)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood group</label>
                    <select className="input" value={form.blood_group}
                      onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}>
                      <option value="">Unknown</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Known allergies</label>
                    <input className="input" value={form.allergies}
                      onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))}/>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin"/>}
                  {editing ? "Save Changes" : "Enrol Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials popup */}
      {credentials && (
        <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)}/>
      )}
    </div>
  );
}
