path = "/home/atumkeze/school-manager/frontend/src/pages/Students.jsx"
c = open(path).read()

old_header = '''      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} enrolled · MARELI Academy, Buea</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Enrol Student
        </button>
      </div>'''

new_header = '''      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} enrolled · MARELI Academy, Buea</p>
        </div>
        {!isUnassignedTeacher && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Enrol Student
          </button>
        )}
      </div>

      {isUnassignedTeacher && (
        <div className="card border-amber-200 bg-amber-50 text-amber-800 text-sm py-6 text-center">
          You have not been assigned to a class yet.<br/>
          Please contact your headmaster to be assigned to a class.
        </div>
      )}'''

print("old_header found:", old_header in c)
if old_header in c:
    c = c.replace(old_header, new_header, 1)
    print("STEP F: empty-state banner + conditional Enrol button added")
else:
    print("ERROR: header block not matched exactly")

# Hide the Toolbar + List/Grouped views entirely when unassigned, so the page is clean
old_toolbar_start = '      {/* Toolbar */}\n      <div className="flex flex-wrap gap-3 items-center">'
new_toolbar_start = '      {!isUnassignedTeacher && (\n      <div className="flex flex-wrap gap-3 items-center">'

if old_toolbar_start in c and "isUnassignedTeacher && (\n      <div className=\"flex flex-wrap gap-3 items-center" not in c:
    c = c.replace(old_toolbar_start, new_toolbar_start, 1)
    print("STEP G: toolbar wrapped to hide for unassigned teacher")
else:
    print("STEP G: toolbar marker not found or already wrapped")

open(path, "w").write(c)
