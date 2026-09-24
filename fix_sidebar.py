path = "/home/atumkeze/school-manager/frontend/src/components/layout/Sidebar.jsx"
c = open(path).read()

old_icons = """import {
  LayoutDashboard, Users, UserCheck, BookOpen,
  Calendar, Receipt, Settings, LogOut, FileText, ClipboardList,
  ChevronRight, Menu, X, Layers, Sun, Moon, Baby
} from "lucide-react";"""

new_icons = """import {
  LayoutDashboard, Users, UserCheck, BookOpen,
  Calendar, Receipt, Settings, LogOut, FileText, ClipboardList,
  ChevronRight, Menu, X, Layers, Sun, Moon, Baby, IdCard
} from "lucide-react";"""

old_nav = """  { to: "/staff",        icon: UserCheck,       label: "Staff",          roles: ["admin","headmaster"] },"""
new_nav = """  { to: "/staff",        icon: UserCheck,       label: "Staff",          roles: ["admin","headmaster"] },
  { to: "/id-cards",     icon: IdCard,          label: "ID Cards",       roles: ["admin","headmaster"] },"""

print("icons found:", old_icons in c)
print("nav found:", old_nav in c)

if old_icons in c and old_nav in c:
    c = c.replace(old_icons, new_icons, 1)
    c = c.replace(old_nav, new_nav, 1)
    open(path, "w").write(c)
    print("Sidebar.jsx updated!")
else:
    print("MISMATCH — no changes made")
