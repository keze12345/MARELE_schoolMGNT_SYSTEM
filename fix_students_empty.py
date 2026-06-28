path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

# Find the main return's table/list rendering area - look for where students.length === 0 might be checked
# We add a clear no-class-assigned banner right after setLoading(false) area inside fetchAll's caller scope is not right -
# instead we add a derived flag and render branch.

old_decl = "const { profile } = useAuth();"
new_decl = old_decl + "\n  const isUnassignedTeacher = profile?.role === \"teacher\" && classes.length === 0;"

if "isUnassignedTeacher" not in c:
    c = c.replace(old_decl, new_decl, 1)
    print("STEP E: isUnassignedTeacher flag added")
else:
    print("STEP E: already present")

open(path, "w").write(c)
