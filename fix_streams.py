path = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path).read()

old = "  GraduationCap, Users, UserCheck, TrendingUp,\n  BookOpen, Bell, ArrowUpRight, Loader2, Calendar"
new = "  GraduationCap, Users, UserCheck, TrendingUp,\n  BookOpen, Bell, ArrowUpRight, Loader2, Calendar, Receipt"

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("Receipt import added!")
else:
    # Find the actual import line
    idx = c.find("from \"lucide-react\"")
    print(repr(c[max(0,idx-200):idx+20]))

open(path, "w").write(c)
