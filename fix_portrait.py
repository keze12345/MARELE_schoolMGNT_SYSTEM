path = "/home/atumkeze/school-manager/frontend/src/pages/IDCards.jsx"
c = open(path).read()

old_card = '''function Card({ person, cardRef }) {
  const initials = (person.full_name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const color = roleColors[person.role] || "#1a6b3c";

  return (
    <div ref={cardRef}
      style={{
        width: "340px", height: "210px", borderRadius: "16px", overflow: "hidden",
        background: "#ffffff", border: "1px solid #e2e2e2",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)", fontFamily: "Arial, sans-serif",
        display: "flex", flexDirection: "column",
      }}>
      {/* Header band */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, #0f4526 100%)`,
        padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px",
      }}>
        <img src="/logo_ma.png" alt="logo" style={{ width: "30px", height: "30px", objectFit: "contain" }}/>
        <div>
          <div style={{ color: "#fff", fontWeight: "bold", fontSize: "11px", lineHeight: 1.2 }}>MARELI ACADEMY</div>
          <div style={{ color: "#d7ecd9", fontSize: "8.5px" }}>Ss. Mary &amp; Elizabeth N&amp;P Academy · Buea</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px" }}>
        {person.avatar_url ? (
          <img src={person.avatar_url} alt={person.full_name}
            style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${color}` }}/>
        ) : (
          <div style={{
            width: "70px", height: "70px", borderRadius: "50%", flexShrink: 0,
            background: color, color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "24px", fontWeight: "bold",
          }}>{initials}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a1a1a", marginBottom: "2px" }}>
            {person.full_name}
          </div>
          <div style={{
            display: "inline-block", fontSize: "10px", fontWeight: "600", color: color,
            background: color + "1a", padding: "2px 8px", borderRadius: "999px", marginBottom: "8px",
          }}>
            {ROLE_LABELS[person.role] || person.role}
          </div>
          <div style={{ fontSize: "10.5px", color: "#555", marginTop: "6px" }}>
            {person.phone && <div style={{ marginBottom: "3px" }}>☎ {person.phone}</div>}
            {person.email && <div style={{ wordBreak: "break-all" }}>✉ {person.email}</div>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #eee", padding: "5px 14px", fontSize: "8px", color: "#999", textAlign: "center" }}>
        This card remains property of MARELI Academy
      </div>
    </div>
  );
}'''

new_card = '''function Card({ person, cardRef }) {
  const initials = (person.full_name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
  const color = roleColors[person.role] || "#1a6b3c";

  return (
    <div ref={cardRef}
      style={{
        width: "260px", height: "410px", borderRadius: "16px", overflow: "hidden",
        background: "#ffffff", border: "1px solid #e2e2e2",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)", fontFamily: "Arial, sans-serif",
        display: "flex", flexDirection: "column",
      }}>
      {/* Header band */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, #0f4526 100%)`,
        padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
      }}>
        <img src="/logo_ma.png" alt="logo" style={{ width: "36px", height: "36px", objectFit: "contain" }}/>
        <div style={{ color: "#fff", fontWeight: "bold", fontSize: "11px", lineHeight: 1.2, textAlign: "center" }}>MARELI ACADEMY</div>
        <div style={{ color: "#d7ecd9", fontSize: "8px", textAlign: "center" }}>Ss. Mary &amp; Elizabeth N&amp;P Academy · Buea</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 14px", textAlign: "center" }}>
        {person.avatar_url ? (
          <img src={person.avatar_url} alt={person.full_name}
            style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${color}`, marginBottom: "12px" }}/>
        ) : (
          <div style={{
            width: "96px", height: "96px", borderRadius: "50%", flexShrink: 0,
            background: color, color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "30px", fontWeight: "bold", marginBottom: "12px",
          }}>{initials}</div>
        )}

        <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a1a1a", marginBottom: "6px" }}>
          {person.full_name}
        </div>
        <div style={{
          display: "inline-block", fontSize: "10px", fontWeight: "600", color: color,
          background: color + "1a", padding: "3px 10px", borderRadius: "999px", marginBottom: "14px",
        }}>
          {ROLE_LABELS[person.role] || person.role}
        </div>

        <div style={{ fontSize: "10.5px", color: "#555", width: "100%" }}>
          {person.phone && <div style={{ marginBottom: "5px" }}>☎ {person.phone}</div>}
          {person.email && <div style={{ wordBreak: "break-all" }}>✉ {person.email}</div>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #eee", padding: "6px 14px", fontSize: "8px", color: "#999", textAlign: "center" }}>
        This card remains property of MARELI Academy
      </div>
    </div>
  );
}'''

old_pdf = '''      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      for (let i = 0; i < shown.length; i++) {
        const person = shown[i];
        setProgress(`Generating ${i + 1} of ${shown.length}: ${person.full_name}...`);
        const node = cardRefs.current[person.id];
        if (!node) continue;
        const canvas = await html2canvas(node, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const cardW = 90, cardH = (canvas.height * cardW) / canvas.width;'''

new_pdf = '''      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (let i = 0; i < shown.length; i++) {
        const person = shown[i];
        setProgress(`Generating ${i + 1} of ${shown.length}: ${person.full_name}...`);
        const node = cardRefs.current[person.id];
        if (!node) continue;
        const canvas = await html2canvas(node, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const cardW = 70, cardH = (canvas.height * cardW) / canvas.width;'''

print("card found:", old_card in c)
print("pdf found:", old_pdf in c)

if old_card in c and old_pdf in c:
    c = c.replace(old_card, new_card, 1)
    c = c.replace(old_pdf, new_pdf, 1)
    open(path, "w").write(c)
    print("IDCards.jsx updated to portrait!")
else:
    print("MISMATCH — no changes made")
