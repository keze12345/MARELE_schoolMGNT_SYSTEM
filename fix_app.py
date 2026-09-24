path = "/home/atumkeze/school-manager/frontend/src/App.jsx"
c = open(path).read()

old_import = 'import Settings from "./pages/Settings";'
new_import = 'import Settings from "./pages/Settings";\nimport IDCards from "./pages/IDCards";'

old_route = '            <Route path="/settings"     element={<Settings />}      />'
new_route = '            <Route path="/settings"     element={<Settings />}      />\n            <Route path="/id-cards"     element={<IDCards />}       />'

print("import found:", old_import in c)
print("route found:", old_route in c)

if old_import in c and old_route in c:
    c = c.replace(old_import, new_import, 1)
    c = c.replace(old_route, new_route, 1)
    open(path, "w").write(c)
    print("App.jsx updated!")
else:
    print("MISMATCH — no changes made")
