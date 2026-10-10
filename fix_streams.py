path = "/home/atumkeze/school-manager/frontend/src/App.jsx"
c = open(path).read()

old = '  React.useEffect(() => {'
new = '  useEffect(() => {'

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("fixed!")

# Make sure useEffect is in the imports
if 'useEffect' not in c.split('from "react"')[0]:
    c = c.replace(
        'import { BrowserRouter',
        'import { useEffect, BrowserRouter'
    )
    print("useEffect import added!")
else:
    print("useEffect already imported")

open(path, "w").write(c)
