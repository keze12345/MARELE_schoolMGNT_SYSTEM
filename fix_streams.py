path = "/home/atumkeze/school-manager/frontend/src/pages/Dashboard.jsx"
c = open(path).read()

old = '              </ResponsiveContainer>\n            </div>\n            <div className="flex gap-2">'
new = '              </ResponsiveContainer>}\n            </div>\n            <div className="flex gap-2">'

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("closing guard added!")
else:
    print("not found")
