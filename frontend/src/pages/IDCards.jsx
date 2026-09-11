import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { IdCard, Loader2, Download, FileDown, Phone, Mail, User, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ROLE_LABELS = {
  admin:      "Administrator",
  headmaster: "Principal / Head Teacher",
  teacher:    "Teacher",
  bursar:     "Bursar",
  secretary:  "Secretary",
  parent:     "Parent",
};

const roleColors = {
  admin:      "#e63946",
  headmaster: "#f5a623",
  teacher:    "#1a6b3c",
  bursar:     "#8b5cf6",
  secretary:  "#06b6d4",
  parent:     "#1a6b3c",
};

const GOLD = "#c9992f";
const DARK_GREEN = "#0a3319";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const CARD_W_MM = 53.98;
const CARD_H_MM = 85.60;
const CARD_W_PX = 204;
const CARD_H_PX = 324;

// Table-based row layout: guarantees icon/text alignment even under html2canvas,
// which has incomplete support for flexbox `gap` and shrink-to-fit `align-items: center`.
function InfoTable({ rows }) {
  const visible = rows.filter(r => r.text);
  if (visible.length === 0) return null;
  return (
    <table style={{ width: "176px", margin: "0 auto", borderCollapse: "collapse" }}>
      <tbody>
        {visible.map((r, i) => (
          <tr key={i}>
            <td style={{ width: "16px", height: "12px", verticalAlign: "middle", textAlign: "right", paddingRight: "6px", paddingBottom: i < visible.length - 1 ? "5px" : 0 }}>
              <r.Icon size={10} color={GOLD} style={{ display: "block", margin: "0 0 0 auto" }} />
            </td>
            <td style={{ height: "12px", verticalAlign: "middle", textAlign: "left", paddingBottom: i < visible.length - 1 ? "5px" : 0, fontSize: "8px", color: "#555", lineHeight: "10px", wordBreak: "break-all" }}>
              {r.text}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Card({ person, cardRef, classNames, printMode }) {
  const initials = (person.full_name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const color = roleColors[person.role] || "#1a6b3c";
  const idNumber = "ID-" + (person.id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  const genderLabel = person.gender ? person.gender.charAt(0).toUpperCase() + person.gender.slice(1) : null;

  return (
    <div ref={cardRef}
      style={{
        width: `${CARD_W_PX}px`, height: `${CARD_H_PX}px`, borderRadius: "14px", overflow: "hidden",
        background: "#ffffff",
        border: printMode ? "1px dashed #999" : "1px solid #e6e6e6",
        boxShadow: printMode ? "none" : "0 6px 20px rgba(0,0,0,0.12)",
        fontFamily: SANS,
        display: "flex", flexDirection: "column", position: "relative",
      }}>

      {/* Double gold frame */}
      <div style={{ position: "absolute", inset: "5px", border: `1px solid ${GOLD}`, opacity: 0.55, borderRadius: "9px", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: "8px", border: `0.75px solid ${GOLD}`, opacity: 0.3, borderRadius: "7px", zIndex: 2, pointerEvents: "none" }} />

      {/* Watermark — subtle texture, not competing with the real logo */}
      <img src="/logo_ma.png" alt=""
        style={{
          position: "absolute", top: "58%", left: "50%", width: "215px", height: "215px",
          transform: "translate(-50%,-50%)", opacity: 0.06, objectFit: "contain", zIndex: 0,
        }} />

      {/* Header — logo front and center, unobstructed */}
      <div style={{ padding: "18px 14px 10px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <img src="/logo_ma.png" alt="logo" style={{ width: "54px", height: "54px", objectFit: "contain", display: "block", margin: "0 auto 9px" }} />
        <div style={{ fontFamily: SERIF, fontWeight: "700", fontSize: "12.5px", color: DARK_GREEN, letterSpacing: "1.4px" }}>
          MARELI ACADEMY
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "6.8px", color: "#888", marginTop: "3px", lineHeight: "10px" }}>
          Ss. Mary &amp; Elizabeth N&amp;P Academy · Buea
        </div>
      </div>

      {/* Role ribbon */}
      <div style={{ background: color, position: "relative", zIndex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody><tr>
          <td style={{ height: "24px", textAlign: "center", verticalAlign: "middle", color: "#fff", fontSize: "8.5px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase" }}>
            {ROLE_LABELS[person.role] || person.role}
          </td>
        </tr></tbody></table>
      </div>

      <div style={{ height: "2px", background: GOLD, opacity: 0.5, zIndex: 1 }} />

      {/* Body */}
      <div style={{ flex: 1, padding: "16px 12px 4px", textAlign: "center", position: "relative", zIndex: 1 }}>

        {person.avatar_url ? (
          <img src={person.avatar_url} alt={person.full_name}
            style={{ width: "80px", height: "80px", borderRadius: "22px", objectFit: "cover", display: "block", margin: "0 auto",
              border: `3px solid ${GOLD}`, boxShadow: "0 3px 8px rgba(0,0,0,0.18)" }} />
        ) : (
          <div style={{
            width: "80px", height: "80px", borderRadius: "22px", margin: "0 auto",
            background: color, boxSizing: "border-box",
            border: `3px solid ${GOLD}`, boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            display: "table",
          }}>
            <div style={{
              display: "table-cell", verticalAlign: "middle", textAlign: "center",
              color: "#fff", fontSize: "24px", fontWeight: "700", fontFamily: SANS,
            }}>{initials}</div>
          </div>
        )}

        <div style={{ marginTop: "11px", fontSize: "14.5px", fontWeight: "700", color: "#1a1a1a", lineHeight: "17px", fontFamily: SERIF }}>
          {person.full_name}
        </div>

        <div style={{ width: "56px", height: "1px", background: GOLD, opacity: 0.6, margin: "9px auto 11px" }} />

        <InfoTable rows={[
          { Icon: BookOpen, text: classNames },
          { Icon: User, text: genderLabel },
          { Icon: Phone, text: person.phone },
          { Icon: Mail, text: person.email },
        ]} />
      </div>

      {/* Footer */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          height: "8px", margin: "0 14px",
          background: "repeating-linear-gradient(90deg, #333 0, #333 1px, transparent 1px, transparent 3px)",
          opacity: 0.45,
        }} />
        <table style={{ width: "100%", tableLayout: "fixed" }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "left", padding: "5px 10px 8px", fontSize: "6.5px", color: "#999", letterSpacing: "0.3px" }}>{idNumber}</td>
              <td style={{ textAlign: "right", padding: "5px 10px 8px", fontSize: "6px", color: "#bbb" }}>Property of MARELI Academy</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IDCards() {
  const { profile } = useAuth();
  const [people, setPeople] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("staff");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [progress, setProgress] = useState("");
  const cardRefs = useRef({});
  const sheetRefs = useRef({});

  const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch(`${API}/users`),
        fetch(`${API}/streams`),
      ]);
      const uData = await uRes.json();
      const sData = await sRes.json();
      setPeople(Array.isArray(uData) ? uData : []);
      setStreams(Array.isArray(sData) ? sData : []);
    } catch (e) {
      toast.error("Failed to load data: " + e.message);
    }
    setLoading(false);
  }

  const teacherClassMap = {};
  streams.forEach(s => {
    if (!s.teacher_id) return;
    if (!teacherClassMap[s.teacher_id]) teacherClassMap[s.teacher_id] = [];
    teacherClassMap[s.teacher_id].push(s.name);
  });

  const staffList  = people.filter(p => p.role && p.role !== "parent");
  const parentList = people.filter(p => p.role === "parent");
  const shown = tab === "staff" ? staffList : parentList;

  function classNamesFor(person) {
    const c = teacherClassMap[person.id];
    return c && c.length ? c.join(", ") : null;
  }

  async function waitForImages(node) {
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));
  }

  async function downloadOne(person) {
    const node = cardRefs.current[person.id];
    if (!node) return;
    await waitForImages(node);
    const canvas = await html2canvas(node, { scale: 4, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = person.full_name.replace(/\s+/g, "_") + "_ID_Card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // Dynamic grid: fits as many CR80 cards per A4 sheet as possible.
  // Built as an HTML <table> (not CSS grid) — html2canvas renders table layout
  // far more reliably than grid/flex `gap`.
  const PER_ROW = 3;
  const PER_SHEET = 9;
  const CELL_PAD_MM = 3; // 3mm padding per cell = 6mm visual gap between adjacent cards
  const sheets = [];
  for (let i = 0; i < shown.length; i += PER_SHEET) sheets.push(shown.slice(i, i + PER_SHEET));

  async function downloadAll() {
    if (shown.length === 0) { toast.error("No cards to export"); return; }
    setDownloadingAll(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (let s = 0; s < sheets.length; s++) {
        setProgress(`Building sheet ${s + 1} of ${sheets.length}...`);
        const node = sheetRefs.current[s];
        if (!node) continue;
        await waitForImages(node);
        const canvas = await html2canvas(node, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/jpeg", 0.97);
        if (s > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }
      pdf.save(`${tab === "staff" ? "Staff" : "Parent"}_ID_Cards_${Date.now()}.pdf`);
      toast.success(`PDF generated — ${sheets.length} page${sheets.length !== 1 ? "s" : ""}, ${PER_SHEET} cards/page!`);
    } catch (e) {
      toast.error("Failed to generate PDF: " + e.message);
    }
    setDownloadingAll(false);
    setProgress("");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IdCard size={24} /> ID Cards
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Professional cards for staff and parents · MARELI Academy</p>
        </div>
        <button onClick={downloadAll} disabled={downloadingAll || shown.length === 0}
          className="btn-primary flex items-center gap-2">
          {downloadingAll ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          {downloadingAll ? "Generating..." : `Download All (${sheets.length || 0} page${sheets.length !== 1 ? "s" : ""})`}
        </button>
      </div>

      {downloadingAll && progress && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> {progress}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("staff")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "staff" ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"}`}>
          Staff &amp; Teachers ({staffList.length})
        </button>
        <button onClick={() => setTab("parents")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "parents" ? "bg-white shadow text-primary" : "text-gray-500 hover:text-gray-700"}`}>
          Parents ({parentList.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading...
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No {tab === "staff" ? "staff" : "parent"} records found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {shown.map(person => (
            <div key={person.id} className="flex flex-col items-center gap-3">
              <Card person={person} cardRef={el => cardRefs.current[person.id] = el} classNames={classNamesFor(person)} />
              <button onClick={() => downloadOne(person)}
                className="btn-ghost text-xs flex items-center gap-1.5">
                <Download size={13} /> Download Card
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden off-screen print sheets, captured for the Download All PDF */}
      <div style={{ position: "absolute", top: "-99999px", left: "-99999px" }}>
        {sheets.map((sheetPeople, sIdx) => {
          const rows = [];
          for (let i = 0; i < sheetPeople.length; i += PER_ROW) rows.push(sheetPeople.slice(i, i + PER_ROW));
          const tableWidthMm = PER_ROW * (CARD_W_MM + CELL_PAD_MM * 2);
          const tableHeightMm = rows.length * (CARD_H_MM + CELL_PAD_MM * 2);
          const paddingTopMm = Math.max(0, (297 - tableHeightMm) / 2);
          return (
            <div key={sIdx} ref={el => sheetRefs.current[sIdx] = el}
              style={{ width: "210mm", height: "297mm", background: "#fff", boxSizing: "border-box", paddingTop: `${paddingTopMm}mm` }}>
              <table style={{ margin: "0 auto", borderCollapse: "collapse" }}>
                <tbody>
                  {rows.map((rowPeople, rIdx) => (
                    <tr key={rIdx}>
                      {rowPeople.map(person => (
                        <td key={person.id} style={{ padding: `${CELL_PAD_MM}mm`, verticalAlign: "top" }}>
                          <div style={{ width: `${CARD_W_PX}px`, height: `${CARD_H_PX}px` }}>
                            <Card person={person} cardRef={() => {}} classNames={classNamesFor(person)} printMode />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
