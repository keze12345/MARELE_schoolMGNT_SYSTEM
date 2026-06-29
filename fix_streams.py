path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

old = '''createHolidayFeeIfNeeded(studentId, classId) {
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
  }'''

new = '''createHolidayFeeIfNeeded(studentId, classId) {
    // Works for both regular and holiday program years
    const { data: cls } = await supabase
      .from("classes").select("academic_year_id, level").eq("id", classId).single();
    if (!cls?.academic_year_id) return;

    const { data: year } = await supabase
      .from("academic_years").select("name, program_type, is_active")
      .eq("id", cls.academic_year_id).single();
    if (!year) return;

    // Check if fee record already exists for this student and year
    const { data: existing } = await supabase
      .from("student_fees").select("id")
      .eq("student_id", studentId).eq("academic_year", year.name).maybeSingle();
    if (existing) return;

    // Find matching fee structure - try exact level group first, then partial match
    const { data: allStructs } = await supabase
      .from("fee_structures").select("*")
      .eq("academic_year", year.name);

    if (!allStructs || allStructs.length === 0) return;

    // Match by level group - find best match for student level
    const studentLevel = cls.level || "";
    let matched = allStructs.find(s =>
      studentLevel.toLowerCase().includes(s.level_group.toLowerCase()) ||
      s.level_group.toLowerCase().includes(studentLevel.toLowerCase())
    );

    // If no match, use first structure for this year
    if (!matched) matched = allStructs[0];
    if (!matched) return;

    // Calculate total owed = sum of all components for this level group
    const levelStructs = allStructs.filter(s => s.level_group === matched.level_group);
    const totalOwed = levelStructs.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    await supabase.from("student_fees").insert([{
      student_id: studentId,
      academic_year: year.name,
      level_group: matched.level_group,
      total_owed: totalOwed,
      total_paid: 0,
    }]);
  }'''

print("old found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("Function updated successfully!")
else:
    print("ERROR: exact text not found")
