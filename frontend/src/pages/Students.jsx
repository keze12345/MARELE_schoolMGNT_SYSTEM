import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Search, Loader2, X, Pencil, Camera, User } from "lucide-react";
import toast from "react-hot-toast";

const CLASS_LEVELS = [
  "Day Care",
  "Pre-Nursery",
  "Nursery 1",
  "Nursery 2",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
];

const EMPTY_FORM = {
  full_name: "",
  date_of_birth: "",
  gender: "male",
  birth_certificate_no: "",
  class_level: "Class 1",
  section: "anglophone",
  is_repeating: false,
  quarter: "",
  region: "South West",
  parent_name: "",
  parent_phone: "",
  parent_network: "mtn",
  parent_email: "",
  blood_group: "",
  allergies: "",
  photo_url: "",
};

export default function Students() {
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState(null); // holds student id when editing
  const [form, setForm]           = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setStudents(data);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowModal(true);
  }

  function openEdit(student) {
    setEditing(student.id);
    setForm({
      full_name:            student.full_name            || "",
      date_of_birth:        student.date_of_birth        || "",
      gender:               student.gender               || "male",
      birth_certificate_no: student.birth_certificate_no || "",
      class_level:          student.class_level          || "Class 1",
      section:              student.section              || "anglophone",
      is_repeating:         student.is_repeating         || false,
      quarter:              student.quarter              || "",
      region:               student.region               || "South West",
      parent_name:          student.parent_name          || "",
      parent_phone:         student.parent_phone         || "",
      parent_network:       student.parent_network       || "mtn",
      parent_email:         student.parent_email         || "",
      blood_group:          student.blood_group          || "",
      allergies:            student.allergies            || "",
      photo_url:            student.photo_url            || "",
    });
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || null);
    setShowModal(true);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(studentId) {
    if (!photoFile) return form.photo_url || null;
    const ext  = photoFile.name.split(".").pop();
    const path = `${studentId}.${ext}`;
    const { error } = await supabase.storage
      .from("student-photos")
      .upload(path, photoFile, { upsert: true });
    if (error) { toast.error("Photo upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        // Update existing student
        const photoUrl = await uploadPhoto(editing);
        const payload  = { ...form, ...(photoUrl ? { photo_url: photoUrl } : {}) };
        const { error } = await supabase.from("students").update(payload).eq("id", editing);
        if (error) throw error;
        toast.success("Student updated!");
      } else {
        // Insert new student, then upload photo
        const { data, error } = await supabase
          .from("students")
          .insert([{ ...form, photo_url: null }])
          .select()
          .single();
        if (error) throw error;
        const photoUrl = await uploadPhoto(data.id);
        if (photoUrl) {
          await supabase.from("students").update({ photo_url: photoUrl }).eq("id", data.id);
        }
        toast.success("Student enrolled!");
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  }

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.class_level?.toLowerCase().includes(search.toLowerCase()) ||
    s.parent_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by section for display badge
  const nurseryLevels = ["Day Care", "Pre-Nursery", "Nursery 1", "Nursery 2"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} enrolled · MARELI Academy, Buea</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Enrol Student
        </button>
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, class or parent..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Loading students...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No students found. Click <strong>Enrol Student</strong> to add one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="py-3 px-4 font-medium">Student</th>
                <th className="py-3 px-4 font-medium">Class</th>
                <th className="py-3 px-4 font-medium">Level</th>
                <th className="py-3 px-4 font-medium">Gender</th>
                <th className="py-3 px-4 font-medium">Parent / Contact</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={s.full_name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-green-100 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User size={16} className="text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-800">{s.full_name}</div>
                        {s.birth_certificate_no && (
                          <div className="text-xs text-gray-400">BC: {s.birth_certificate_no}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700 font-medium">{s.class_level}</td>
                  <td className="py-3 px-4">
                    <span className={nurseryLevels.includes(s.class_level) ? "badge-blue" : "badge-green"}>
                      {nurseryLevels.includes(s.class_level) ? "Nursery" : "Primary"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 capitalize">{s.gender}</td>
                  <td className="py-3 px-4">
                    <div className="text-gray-700">{s.parent_name}</div>
                    <div className="text-xs text-gray-400">{s.parent_phone} · {s.parent_network?.toUpperCase()}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={s.is_repeating ? "badge-amber" : "badge-green"}>
                      {s.is_repeating ? "Repeating" : "Active"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-green-50 transition-colors">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-display font-bold text-lg text-gray-900">
                {editing ? "Edit Student" : "Enrol New Student"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">

              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-green-100" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                      <User size={32} className="text-gray-400" />
                    </div>
                  )}
                  <button type="button" onClick={() => fileRef.current.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white
                               flex items-center justify-center shadow-md hover:bg-primary-light transition-colors">
                    <Camera size={14} />
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={handlePhotoChange} />
                <p className="text-xs text-gray-400">Click the camera icon to upload a photo (max 2MB)</p>
              </div>

              {/* Identity */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identity</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                    <input className="input" required placeholder="e.g. Amara Jane Nkeng"
                      value={form.full_name}
                      onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                    <input className="input" type="date" value={form.date_of_birth}
                      onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select className="input" value={form.gender}
                      onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth certificate no.</label>
                    <input className="input" placeholder="Acte de naissance number"
                      value={form.birth_certificate_no}
                      onChange={e => setForm(p => ({ ...p, birth_certificate_no: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Academic placement */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Academic Placement</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class level *</label>
                    <select className="input" required value={form.class_level}
                      onChange={e => setForm(p => ({ ...p, class_level: e.target.value }))}>
                      <optgroup label="Nursery Section">
                        {["Day Care","Pre-Nursery","Nursery 1","Nursery 2"].map(c =>
                          <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Primary Section">
                        {["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6"].map(c =>
                          <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select className="input" value={form.section}
                      onChange={e => setForm(p => ({ ...p, section: e.target.value }))}>
                      <option value="anglophone">Anglophone</option>
                      <option value="francophone">Francophone</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_repeating}
                        onChange={e => setForm(p => ({ ...p, is_repeating: e.target.checked }))}
                        className="w-4 h-4 accent-green-700 rounded" />
                      <span className="text-sm text-gray-700">This student is repeating the class</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Residence */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Residence</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quarter / Neighbourhood</label>
                    <input className="input" placeholder="e.g. Molyko, Bonduma"
                      value={form.quarter}
                      onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select className="input" value={form.region}
                      onChange={e => setForm(p => ({ ...p, region: e.target.value }))}>
                      {["South West","North West","Littoral","Centre","West","East","Adamawa","North","Far North","South"].map(r =>
                        <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Parent / Guardian */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parent / Guardian</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input className="input" placeholder="Parent or guardian's full name"
                      value={form.parent_name}
                      onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                    <input className="input" placeholder="e.g. 677 123 456"
                      value={form.parent_phone}
                      onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                    <select className="input" value={form.parent_network}
                      onChange={e => setForm(p => ({ ...p, parent_network: e.target.value }))}>
                      <option value="mtn">MTN</option>
                      <option value="orange">Orange</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400">(optional)</span></label>
                    <input className="input" type="email" placeholder="parent@email.com"
                      value={form.parent_email}
                      onChange={e => setForm(p => ({ ...p, parent_email: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Health */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Health <span className="font-normal normal-case text-gray-400">(optional)</span></h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood group</label>
                    <select className="input" value={form.blood_group}
                      onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}>
                      <option value="">Unknown</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g =>
                        <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Known allergies</label>
                    <input className="input" placeholder="e.g. Peanuts, Penicillin"
                      value={form.allergies}
                      onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? "Save Changes" : "Enrol Student"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
