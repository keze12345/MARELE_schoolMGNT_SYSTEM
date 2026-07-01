path = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path).read()
idx = c.find("sectionSplit")
while idx != -1:
    chunk = c[max(0,idx-50):idx+200]
    if "ResponsiveContainer" in chunk or "PieChart" in chunk or "BarChart" in chunk:
        print(f"pos {idx}:", repr(chunk))
        print("---")
    idx = c.find("sectionSplit", idx+1)

# Also show all ResponsiveContainer occurrences with context
print("\n=== All ResponsiveContainers ===")
idx = c.find("ResponsiveContainer")
while idx != -1:
    print(f"pos {idx}:", repr(c[max(0,idx-100):idx+50]))
    print("---")
    idx = c.find("ResponsiveContainer", idx+1)
