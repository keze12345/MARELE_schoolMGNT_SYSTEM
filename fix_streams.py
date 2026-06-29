path_dash = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path_dash).read()

old_cards = '          { label: "Active Sequence", value: stats.activeSequence?.name || "None", icon: Calendar, color: "bg-purple-50 text-purple-600", action: () => navigate("/setup") },\n        ].filter(card => card.hideFor !== profile?.role)'

new_cards = '          { label: "Active Sequence", value: stats.activeSequence?.name || "None", icon: Calendar, color: "bg-purple-50 text-purple-600", action: () => navigate("/setup") },\n          { label: "Fees Collected",  value: new Intl.NumberFormat("fr-CM",{style:"currency",currency:"XAF",minimumFractionDigits:0}).format(feeStats.totalPaid),  icon: Receipt, color: "bg-green-50 text-green-700", action: () => navigate("/fees"), hideFor: "teacher" },\n          { label: "Outstanding",     value: new Intl.NumberFormat("fr-CM",{style:"currency",currency:"XAF",minimumFractionDigits:0}).format(Math.max(0,feeStats.totalOwed-feeStats.totalPaid)), icon: Receipt, color: "bg-red-50 text-red-600", action: () => navigate("/fees"), hideFor: "teacher" },\n          { label: "Fully Paid",      value: feeStats.paidCount + " students", icon: UserCheck, color: "bg-blue-50 text-blue-600", action: () => navigate("/fees"), hideFor: "teacher" },\n        ].filter(card => card.hideFor !== profile?.role)'

print("found:", old_cards in c)
if old_cards in c:
    c = c.replace(old_cards, new_cards, 1)
    print("Fee cards added!")

# Also add Receipt to imports if missing
if '"Receipt"' not in c and "Receipt" not in c:
    c = c.replace("  GraduationCap, Users, UserCheck, TrendingUp,\n  BookOpen, Bell, ArrowUpRight, Loader2, Calendar",
                  "  GraduationCap, Users, UserCheck, TrendingUp,\n  BookOpen, Bell, ArrowUpRight, Loader2, Calendar, Receipt")
    print("Receipt import added!")
else:
    print("Receipt already imported or not needed")

open(path_dash, "w").write(c)
print("Dashboard.jsx saved!")
