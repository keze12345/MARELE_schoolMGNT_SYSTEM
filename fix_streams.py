path = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path).read()

# Remove the duplicate const activeYear inside fetchAll — use the one from useAuth
old = """    const activeYear = (allYears || []).find(y => y.is_active) || (allYears || [])[0];
    const activeYearId = activeYear?.id;"""

new = """    const activeYearId = activeYear?.id;"""

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("duplicate activeYear removed from Dashboard fetchAll!")
else:
    print("not found - check spacing")
