path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()
# Check what activeYear contains in context
idx = c.find("activeYear")
print(repr(c[idx:idx+100]))
# Also check AuthContext exports name field
