const STORAGE_KEY = "smartattend_teacher_students_v1";
const ATTENDANCE_KEY = "smartattend_teacher_attendance_v1";
let students = readJSON(STORAGE_KEY, []);
let attendance = readJSON(ATTENDANCE_KEY, {});
let modalStudentId = "";

function readJSON(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function makeStudentId() {
  let id;
  do { id = "SA" + String(Date.now()).slice(-6) + Math.floor(Math.random()*90+10); }
  while (students.some(s => s.id === id));
  return id;
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function showNotice(message, type="success") {
  const box = document.getElementById("notice");
  box.textContent = message; box.className = `notice ${type}`;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => box.classList.add("hidden"), 4200);
}
function goToPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === page));
  document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  const titles = {dashboard:"Teacher Dashboard",students:"Manage Students",attendance:"Today's Attendance",credentials:"Student Login IDs",settings:"Settings"};
  document.getElementById("pageTitle").textContent = titles[page] || "Teacher Dashboard";
  if (page === "attendance") document.getElementById("attendanceDate").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => goToPage(btn.dataset.page)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => goToPage(btn.dataset.go)));

document.getElementById("studentForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("studentName").value.trim();
  const studentClass = document.getElementById("studentClass").value;
  const email = document.getElementById("studentEmail").value.trim();
  const password = document.getElementById("studentPassword").value;
  if (!name || !studentClass || password.length < 6) {
    showNotice("Please enter the required fields and a password of at least 6 characters.", "error"); return;
  }
  if (email && students.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    showNotice("This email is already assigned to another student.", "error"); return;
  }
  const student = {id:makeStudentId(), name, studentClass, email, createdAt:new Date().toISOString()};
  // Password intentionally is not stored in localStorage. Use a server-side hashed password in production.
  students.unshift(student);
  saveData(); renderAll();
  modalStudentId = student.id;
  document.getElementById("newStudentId").textContent = student.id;
  document.getElementById("credentialModal").classList.remove("hidden");
  document.getElementById("studentForm").reset();
  document.getElementById("studentName").focus();
});
function closeModal(){ document.getElementById("credentialModal").classList.add("hidden"); }
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("doneModal").addEventListener("click", closeModal);
document.getElementById("credentialModal").addEventListener("click", e => { if(e.target.id==="credentialModal") closeModal(); });
document.getElementById("copyStudentId").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(modalStudentId); showNotice("Student ID copied."); }
  catch { showNotice("Student ID: " + modalStudentId, "success"); }
});
document.addEventListener("keydown", e => { if(e.key==="Escape") closeModal(); });

function deleteStudent(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;
  if (!confirm(`Delete ${student.name} (${student.id})? This also removes their demo attendance records.`)) return;
  students = students.filter(s => s.id !== id);
  Object.keys(attendance).forEach(day => { delete attendance[day][id]; if(!Object.keys(attendance[day]).length) delete attendance[day]; });
  saveData(); renderAll(); showNotice("Student record deleted.");
}
function markPresent(id) {
  const day = todayKey();
  attendance[day] = attendance[day] || {};
  attendance[day][id] = "Present";
  saveData(); renderAll(); showNotice("Attendance marked present.");
}
function renderStudents() {
  const query = (document.getElementById("studentSearch")?.value || "").toLowerCase();
  const filtered = students.filter(s => `${s.id} ${s.name} ${s.studentClass} ${s.email}`.toLowerCase().includes(query));
  document.getElementById("studentCountLabel").textContent = `${students.length} student${students.length===1?"":"s"}`;
  document.getElementById("studentTable").innerHTML = filtered.length ? filtered.map(s => `<tr><td><span class="id-chip">${escapeHTML(s.id)}</span></td><td><span class="student-name">${escapeHTML(s.name)}</span><br><small>${escapeHTML(s.email || "No email provided")}</small></td><td>${escapeHTML(s.studentClass)}</td><td><button class="delete-btn" data-delete="${escapeHTML(s.id)}">Delete</button></td></tr>`).join("") : `<tr><td colspan="4" class="empty">${students.length ? "No matching students found." : "No students added yet. Use the form to add your first student."}</td></tr>`;
  document.getElementById("dashboardStudents").innerHTML = students.length ? students.slice(0,5).map(s => `<tr><td><span class="id-chip">${escapeHTML(s.id)}</span></td><td><span class="student-name">${escapeHTML(s.name)}</span></td><td>${escapeHTML(s.studentClass)}</td><td>${attendance[todayKey()]?.[s.id] ? '<span class="status present">Present</span>' : '<span class="status not-marked">Not marked</span>'}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">No students yet. Click “Add Student” to begin.</td></tr>`;
  document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => deleteStudent(btn.dataset.delete)));
}
function renderCredentials() {
  const query = (document.getElementById("credentialSearch")?.value || "").toLowerCase();
  const filtered = students.filter(s => `${s.id} ${s.name} ${s.studentClass} ${s.email}`.toLowerCase().includes(query));
  document.getElementById("credentialTable").innerHTML = filtered.length ? filtered.map(s => `<tr><td><span class="id-chip">${escapeHTML(s.id)}</span></td><td><span class="student-name">${escapeHTML(s.name)}</span></td><td>${escapeHTML(s.studentClass)}</td><td>${escapeHTML(s.email || "—")}</td><td><span class="status present">ID assigned</span></td></tr>`).join("") : `<tr><td colspan="5" class="empty">No matching student IDs.</td></tr>`;
}
function renderAttendance() {
  const query = (document.getElementById("attendanceSearch")?.value || "").toLowerCase();
  const today = attendance[todayKey()] || {};
  const filtered = students.filter(s => `${s.id} ${s.name} ${s.studentClass}`.toLowerCase().includes(query));
  document.getElementById("attendanceTable").innerHTML = filtered.length ? filtered.map(s => {
    const present = today[s.id] === "Present";
    return `<tr><td><span class="id-chip">${escapeHTML(s.id)}</span></td><td><span class="student-name">${escapeHTML(s.name)}</span></td><td>${escapeHTML(s.studentClass)}</td><td><span class="status ${present?"present":"not-marked"}">${present?"Present":"Not marked"}</span></td><td><button class="${present?"secondary-btn":"primary-btn"}" data-present="${escapeHTML(s.id)}" ${present?"disabled":""}>${present?"Marked ✓":"Mark Present"}</button></td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">No students available. Add students first.</td></tr>`;
  document.querySelectorAll("[data-present]").forEach(btn => btn.addEventListener("click", () => markPresent(btn.dataset.present)));
}
function renderStats() {
  const total = students.length;
  const present = Object.values(attendance[todayKey()] || {}).filter(v => v === "Present").length;
  const absent = Math.max(0,total-present);
  const rate = total ? Math.round(present/total*100) : 0;
  document.getElementById("totalStudents").textContent = total;
  document.getElementById("presentCount").textContent = present;
  document.getElementById("absentCount").textContent = absent;
  document.getElementById("attendanceRate").textContent = rate + "%";
}
function renderAll(){ renderStudents(); renderCredentials(); renderAttendance(); renderStats(); }
["studentSearch","credentialSearch","attendanceSearch"].forEach(id => document.getElementById(id).addEventListener("input", () => {
  if(id==="studentSearch") renderStudents();
  if(id==="credentialSearch") renderCredentials();
  if(id==="attendanceSearch") renderAttendance();
}));
document.getElementById("clearDemoBtn").addEventListener("click", () => {
  if(!confirm("This permanently clears all student and attendance demo records in this browser. Continue?")) return;
  students=[]; attendance={}; saveData(); renderAll(); showNotice("All demo records cleared.");
});
document.getElementById("logoutBtn").addEventListener("click", () => showNotice("Demo dashboard has no authentication session. Add a real logout endpoint before production.", "error"));
renderAll();
