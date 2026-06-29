path = "/home/atumkeze/school-manager/frontend/src/pages/Fees.jsx"
c = open(path).read()

old = '''            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900">Add Fee Component</h2>
              <button onClick={() => setShowStructModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <form onSubmit={handleAddStruct} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level group *</label>
                <select className="input" required value={structForm.level_group}
                  onChange={e => setStructForm(p=>({...p,level_group:e.target.value}))}>
                  <option value="">— Select —</option>
                  {levelGroups.map(lg=><option key={lg} value={lg}>{lg}</option>)}
                  <option value="custom">Custom group...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Component name *</label>
                <input className="input" required placeholder="e.g. PTA Levy, Exam Fee, Transport"
                  value={structForm.component} onChange={e => setStructForm(p=>({...p,component:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (FCFA) *</label>
                <input className="input" type="number" required min="0"
                  value={structForm.amount} onChange={e => setStructForm(p=>({...p,amount:e.target.value}))}/>
              </div>'''

new = '''            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-gray-900">Manage Fee Components</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedYearName}</p>
              </div>
              <button onClick={() => setShowStructModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>

            {/* Existing components for this year */}
            {feeStructures.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Existing Components
                </div>
                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {feeStructures.map(fc => (
                    <div key={fc.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{fc.component}</div>
                        <div className="text-xs text-gray-400">{fc.level_group}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold text-green-600">{fmt(fc.amount)}</div>
                        <button type="button"
                          onClick={async () => {
                            if (!window.confirm("Delete this component?")) return;
                            await supabase.from("fee_structures").delete().eq("id", fc.id);
                            toast.success("Component deleted"); fetchAll();
                          }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add New Component</p>
            </div>
            <form onSubmit={handleAddStruct} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level group *</label>
                <select className="input" required value={structForm.level_group}
                  onChange={e => setStructForm(p=>({...p,level_group:e.target.value}))}>
                  <option value="">— Select —</option>
                  {levelGroups.map(lg=><option key={lg} value={lg}>{lg}</option>)}
                  <option value="custom">Custom group...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Component name *</label>
                <input className="input" required placeholder="e.g. PTA Levy, Exam Fee, Transport"
                  value={structForm.component} onChange={e => setStructForm(p=>({...p,component:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (FCFA) *</label>
                <input className="input" type="number" required min="0"
                  value={structForm.amount} onChange={e => setStructForm(p=>({...p,amount:e.target.value}))}/>
              </div>'''

print("old found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("Modal updated!")
else:
    print("ERROR: exact text not found")
    idx = c.find("Add Fee Component")
    print(repr(c[max(0,idx-50):idx+100]))

open(path, "w").write(c)
