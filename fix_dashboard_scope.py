path = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path).read()

old = '''    ] = await Promise.all([
      supabase.from("students").select("id, full_name, class_level, gender, section, created_at, photo_url").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, role, full_name, gender"),
      supabase.from("classes").select("id, name, level"),
      supabase.from("terms").select("*").order("created_at", { ascending: false }),
      supabase.from("sequences").select("*").order("created_at", { ascending: false }),
      supabase.from("class_students").select("class_id, student_id"),
      supabase.from("grades").select("student_id, subject_id, sequence_id, score"),
    ]);
    const activeTerm = (terms || []).find(t => t.is_active) || (terms || [])[0];
    const activeSeq  = (sequences || []).find(s => s.is_active) || (sequences || [])[0];'''

new = '''    ] = await Promise.all([
      supabase.from("students").select("id, full_name, class_level, gender, section, created_at, photo_url").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, role, full_name, gender"),
      supabase.from("classes").select("id, name, level, teacher_id"),
      supabase.from("terms").select("*").order("created_at", { ascending: false }),
      supabase.from("sequences").select("*").order("created_at", { ascending: false }),
      supabase.from("class_students").select("class_id, student_id"),
      supabase.from("grades").select("student_id, subject_id, sequence_id, score"),
    ]);
    const activeTerm = (terms || []).find(t => t.is_active) || (terms || [])[0];
    const activeSeq  = (sequences || []).find(s => s.is_active) || (sequences || [])[0];

    // ── Teacher scoping: only their own class(es), nothing else ──
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
      scopedStaff = []; // teachers see no staff-wide data
    }'''

print("main block found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("STEP A: scoping block inserted after fetch")
else:
    print("STEP A: pattern not found")

open(path, "w").write(c)
