path = "/home/atumkeze/school-manager/frontend/src/pages/AcademicSetup.jsx"
c = open(path).read()

start = 21648
end = 23457 + 8  # include "      )}\n\n"

# Extract the block
old_block = c[start:end]

# New streams tab content
streams_tab = """        {/* STREAMS TAB */}
        {activeTab === "streams" && (
          <div className="p-5">
            {streams.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <div className="text-4xl mb-3">S</div>
                Streams only appear for Holiday Program years.
                Make sure a Holiday Program year is set as Active.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 mb-4">
                  Each stream shares one teacher. Assigning a teacher here automatically applies to all classes in that stream.
                </p>
                {streams.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div>
                      <div className="font-semibold text-gray-800">{s.name}</div>
                      {s.teacher_name
                        ? <div className="text-xs text-green-600 mt-1">Teacher: {s.teacher_name}</div>
                        : <div className="text-xs text-amber-500 mt-1">No teacher assigned yet</div>
                      }
                    </div>
                    <select
                      className="input w-auto text-sm py-2 min-w-[220px]"
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
            )}
          </div>
        )}

"""

# Find classes tab marker
classes_tab_marker = "        {/* ── CLASSES TAB ── */}"

print("old_block length:", len(old_block))
print("classes tab marker found:", classes_tab_marker in c)

# Remove old block from classes tab, insert as own tab before classes tab
c = c[:start] + c[end:]
print("block removed, file length now:", len(c))

if classes_tab_marker in c:
    c = c.replace(classes_tab_marker, streams_tab + classes_tab_marker, 1)
    print("Streams tab inserted before classes tab!")
else:
    idx = c.find("CLASSES TAB")
    print("Classes tab marker not found, searching... found at:", idx)
    print(repr(c[max(0,idx-20):idx+60]))

open(path, "w").write(c)
print("File saved!")
