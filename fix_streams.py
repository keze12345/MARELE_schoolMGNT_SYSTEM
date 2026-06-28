path = "/home/atumkeze/school-manager/frontend/src/pages/AcademicSetup.jsx"
c = open(path).read()

old = '    const { error } = await supabase.from("academic_years").insert([yearForm]);'
new = '''    const payload = {
      name: yearForm.name,
      program_type: yearForm.program_type,
      start_date: yearForm.start_date || null,
      end_date: yearForm.end_date || null,
    };
    const { error } = await supabase.from("academic_years").insert([payload]);'''

print("old found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("Fixed!")
else:
    idx = c.find('academic_years").insert')
    print("Not found - context around insert call:")
    print(repr(c[max(0,idx-80):idx+80]))
