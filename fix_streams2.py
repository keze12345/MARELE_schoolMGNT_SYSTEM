path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

old = """      is_repeating: s.is_repeating||false, quarter: s.quarter||"","""
new = """      is_repeating: s.is_repeating||false, is_new_pupil: s.is_new_pupil ?? false, quarter: s.quarter||"","""

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("openEdit pre-fill fixed!")
else:
    print("MISMATCH")
