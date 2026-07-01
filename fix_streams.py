path = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path).read()

# Find the closing tag after the PieChart
old = '              </ResponsiveContainer>\n              <div className="flex'
new = '              </ResponsiveContainer>}\n              <div className="flex'

print("closing found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("closing guard added!")
else:
    # Show context to find exact closing
    idx = c.find('height={120}>')
    print(repr(c[idx:idx+400]))

open(path, "w").write(c)
