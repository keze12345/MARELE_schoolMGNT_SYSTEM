path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

old = '''            ))
          )}
        </div>
      )}
      {/* ── ASSIGN TO CLASS MODAL ── */}'''

new = '''            ))
          )}
        </div>
      )}
      )}
      {/* ── ASSIGN TO CLASS MODAL ── */}'''

print("marker found:", old in c)
print("already closed:", new in c)

if old in c and new not in c:
    c = c.replace(old, new, 1)
    print("Closing brace for toolbar/views wrapper inserted")
else:
    print("No change made (either not found or already applied)")

open(path, "w").write(c)
