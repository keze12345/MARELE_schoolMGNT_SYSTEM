path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

old_import = 'import React, { useEffect, useState, useRef } from "react";'
new_import = old_import + '\nimport { useAuth } from "../context/AuthContext";'

if "useAuth" not in c:
    c = c.replace(old_import, new_import, 1)
    print("STEP A: useAuth import added")
else:
    print("STEP A: useAuth import already present")

old_decl = "export default function Students() {"
new_decl = "export default function Students() {\n  const { profile } = useAuth();"

if "const { profile } = useAuth();" not in c:
    c = c.replace(old_decl, new_decl, 1)
    print("STEP B: profile destructured from useAuth")
else:
    print("STEP B: profile already destructured")

old_effect = "  useEffect(() => { fetchAll(); }, []);"
new_effect = "  useEffect(() => { if (profile) fetchAll(); }, [profile]);"

if old_effect in c:
    c = c.replace(old_effect, new_effect, 1)
    print("STEP C: useEffect now waits for profile")
else:
    print("STEP C: pattern not found, skipped")

old_fetch = '''    const [{ data: studs }, { data: cls }, { data: cs }] = await Promise.all([
      supabase.from("students").select("*").order("full_name"),
      supabase.from("classes").select("*").order("name"),
      supabase.from("class_students").select("student_id, class_id"),
    ]);'''

new_fetch = '''    let studentQuery = supabase.from("students").select("*").order("full_name");
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
    }'''

if old_fetch in c:
    c = c.replace(old_fetch, new_fetch, 1)
    print("STEP D: student fetch scoped to teacher's classes")
else:
    print("STEP D: exact fetch block not found - no changes made here")

open(path, "w").write(c)
print("File saved.")
