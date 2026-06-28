path = "/home/atumkeze/school-manager/frontend/src/pages/AcademicSetup.jsx"
c = open(path).read()

marker = '<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-purple-50">'

streams_ui = """      {streams.length > 0 && (
        <div className="card border-blue-100 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">S</div>
            <h3 className="font-display font-semibold text-gray-900">Streams</h3>
            <span className="badge-amber text-xs ml-2">Holiday Program only</span>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-10">
            Each stream shares one teacher. Assigning a teacher here applies to all classes in that stream automatically.
          </p>
          <div className="space-y-2">
            {streams.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{s.name}</div>
                  {s.teacher_name
                    ? <div className="text-xs text-green-600 mt-0.5">Teacher: {s.teacher_name}</div>
                    : <div className="text-xs text-gray-400 mt-0.5">No teacher assigned yet</div>
                  }
                </div>
                <select
                  className="input w-auto text-sm py-1.5 min-w-[200px]"
                  value={s.teacher_id || ""}
                  disabled={streamSaving === s.id}
                  onChange={e => updateStreamTeacher(s.id, e.target.value)}>
                  <option value="">No teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

"""

print("marker found:", marker in c)
print("streams UI already present:", "streams.length > 0" in c)

if "streams.length > 0" not in c and marker in c:
    c = c.replace(marker, streams_ui + marker, 1)
    open(path, "w").write(c)
    print("Streams UI inserted successfully!")
    print("Verify - streams.length in file:", "streams.length > 0" in c)
else:
    print("Skipped - check conditions above")
