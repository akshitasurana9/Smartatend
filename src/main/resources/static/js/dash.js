(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const API = {
    base: "",
    health: "/actuator/health",
    students: "/api/students",
    history: "/api/attendance",
    face: "/api/face"
  };
  const pages = {
    dashboard: "Dashboard", classes: "My Classes", students: "Students",
    attendance: "Face Attendance", history: "Attendance History",
    reports: "Reports", settings: "Settings"
  };
  let cameraStream = null;
  let students = [];
  let historyRecords = [];
  let backendOnline = false;
  let noticeTimer = null;
  const defaultSettings = {
    teacherName: "Teacher", teacherEmail: "", teacherDepartment: "Computer Applications",
    collegeName: "", academicSession: "2026–2027", primaryCourse: "BCA", timezone: "Asia/Kolkata",
    requireFace: true, requireFingerprint: true, preventDuplicate: true, teacherConfirmation: false,
    darkTheme: true, compactTables: false, showConnection: true,
    notifyAttendance: true, notifyBackend: true, dailyReminder: false, apiBaseUrl: ""
  };
  let settings = {...defaultSettings, ...readJSON("smartattend.settings", {})};
  const apiBase = () => (settings.apiBaseUrl || "").trim().replace(/\/+$/, "");
  const url = (path) => `${apiBase()}${path}`;

  function readJSON(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { showNotice("Could not save to this browser. Check storage settings.", "error"); }
  }
  function showNotice(message, type = "") {
    const el = $("notice");
    if (!el) return;
    el.textContent = message;
    el.className = `notice show ${type}`;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { el.className = "notice"; }, 4500);
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }
  async function request(path, options = {}) {
    const response = await fetch(url(path), {
      ...options,
      headers: { ...(options.body ? {"Content-Type": "application/json"} : {}), ...(options.headers || {}) }
    });
    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (response.status !== 204) {
      const raw = await response.text();
      if (raw) {
        if (contentType.includes("json")) { try { data = JSON.parse(raw); } catch { data = raw; } }
        else data = raw;
      }
    }
    if (!response.ok) {
      const detail = typeof data === "string" ? data : (data?.message || data?.error || response.statusText);
      throw new Error(`${response.status} ${detail}`);
    }
    return data;
  }
  function setApiStatus(online, message) {
    backendOnline = online;
    const text = online ? "API connected" : "API unavailable";
    ["topStatus", "sidebarConnection", "footerStatus"].forEach(id => { if ($(id)) $(id).textContent = id === "topStatus" ? text : message || text; });
    if ($("sidebarDot")) $("sidebarDot").classList.toggle("online", online);
    if ($("connectionPill")) {
      $("connectionPill").textContent = online ? "Connected" : "Offline";
      $("connectionPill").classList.toggle("online", online);
    }
    if ($("connectionText")) $("connectionText").textContent = message || text;
    if ($("settingsApiState")) {
      $("settingsApiState").textContent = online ? "Connected" : "Unavailable";
      $("settingsApiState").className = online ? "state-good" : "state-pending";
    }
    if ($("topStatus")) $("topStatus").parentElement.style.display = settings.showConnection ? "flex" : "none";
  }
  async function checkBackend() {
    setApiStatus(false, "Checking Spring Boot…");
    try {
      await request(API.health);
      setApiStatus(true, "Spring Boot health endpoint responded.");
    } catch (firstError) {
      // Some existing projects do not enable Spring Boot Actuator.
      try {
        const response = await fetch(url("/"), {method: "GET"});
        if (response.status < 500) setApiStatus(true, "Server responds; health endpoint may not be configured.");
        else throw new Error("Server returned an error.");
      } catch {
        setApiStatus(false, "Could not reach the backend. Start Spring Boot and check its port.");
      }
    }
  }
  function goToPage(page) {
    if (!pages[page]) return;
    document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === page));
    document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.page === page));
    $("pageTitle").textContent = pages[page];
    $("sidebar").classList.remove("open");
    if (page === "students") loadStudents();
    if (page === "history") loadHistory();
    if (page === "dashboard") refreshDashboard();
    if (page === "reports") refreshReports();
    window.scrollTo({top: 0, behavior: "smooth"});
  }
  document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => goToPage(btn.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => goToPage(btn.dataset.go)));
  $("topSettings").addEventListener("click", () => goToPage("settings"));
  $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  document.querySelectorAll("[data-class]").forEach(btn => btn.addEventListener("click", () => {
    $("attendanceClass").value = btn.dataset.class;
    $("classFilter").value = btn.dataset.class;
    showNotice(`${btn.dataset.class} selected.`, "success");
    goToPage("students");
  }));

  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.students)) return data.students;
    if (Array.isArray(data?.records)) return data.records;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }
  function studentId(s) { return s.id ?? s.studentId ?? s.userId ?? s.rollNumber ?? "—"; }
  function studentName(s) { return s.name ?? s.fullName ?? s.studentName ?? "Unnamed student"; }
  function studentClass(s) { return s.course ?? s.className ?? s.year ?? s.class ?? "—"; }
  function studentEmail(s) { return s.email ?? s.emailAddress ?? "—"; }
  function statusBadge(status) {
    const clean = String(status || "ACTIVE").toUpperCase();
    const klass = clean.includes("ABSENT") ? "absent" : clean.includes("PRESENT") ? "present" : "active";
    return `<span class="status-badge ${klass}">${escapeHTML(clean)}</span>`;
  }
  function ensureBadgeStyles() {
    if (document.getElementById("dynamic-badge-style")) return;
    const style = document.createElement("style");
    style.id = "dynamic-badge-style";
    style.textContent = `.status-badge{display:inline-flex;padding:4px 8px;border-radius:20px;font-size:9px;font-weight:800;letter-spacing:.3px;background:#202d42;color:#aebbd0}.status-badge.present{background:#14372f;color:#72e3bd}.status-badge.absent{background:#3a202c;color:#ff9cab}.status-badge.active{background:#1a2d4a;color:#9ac2ff}.student-name-cell{display:flex;align-items:center;gap:9px}.student-initial{height:29px;width:29px;border-radius:9px;background:#24395c;color:#a9caff;display:grid;place-items:center;font-weight:800}.row-action{border:1px solid #2b3c57;background:#14223a;color:#afc6ec;border-radius:7px;padding:5px 8px;margin-right:4px;font-size:10px}.row-action.delete{color:#ff9cab}.compact-tables td{padding-top:8px;padding-bottom:8px}`;
    document.head.appendChild(style);
  }
  async function loadStudents() {
    const body = $("studentTable");
    body.innerHTML = `<tr><td colspan="6" class="empty-cell">Loading students…</td></tr>`;
    try {
      const data = await request(API.students);
      students = normalizeList(data);
      if ($("settingsStudentState")) { $("settingsStudentState").textContent = "Responding"; $("settingsStudentState").className = "state-good"; }
      renderStudents();
      updateCounts();
    } catch (err) {
      students = [];
      body.innerHTML = `<tr><td colspan="6" class="empty-cell">Student API is unavailable (${escapeHTML(err.message)}). Add the Spring Boot /api/students controller to connect MySQL records.</td></tr>`;
      $("studentCountLabel").textContent = "Live records unavailable";
      if ($("settingsStudentState")) { $("settingsStudentState").textContent = "Unavailable"; $("settingsStudentState").className = "state-pending"; }
      updateCounts();
    }
  }
  function renderStudents() {
    ensureBadgeStyles();
    const query = ($("studentSearch").value || "").toLowerCase().trim();
    const className = $("classFilter").value;
    const filtered = students.filter(s => {
      const matchesQuery = [studentId(s), studentName(s), studentClass(s), studentEmail(s)].join(" ").toLowerCase().includes(query);
      return matchesQuery && (!className || studentClass(s) === className);
    });
    $("studentCountLabel").textContent = `${filtered.length} of ${students.length} records`;
    $("studentTable").innerHTML = filtered.length ? filtered.map(s => {
      const id = studentId(s);
      const name = studentName(s);
      return `<tr><td>#${escapeHTML(id)}</td><td><div class="student-name-cell"><span class="student-initial">${escapeHTML(name.charAt(0).toUpperCase())}</span><b>${escapeHTML(name)}</b></div></td><td>${escapeHTML(studentClass(s))}</td><td>${escapeHTML(studentEmail(s))}</td><td>${statusBadge(s.status || "ACTIVE")}</td><td><button class="row-action" data-edit="${escapeHTML(id)}">Edit</button><button class="row-action delete" data-delete="${escapeHTML(id)}">Delete</button></td></tr>`;
    }).join("") : `<tr><td colspan="6" class="empty-cell">${students.length ? "No students match these filters." : "No student records returned by the API."}</td></tr>`;
    bodyActions();
  }
  function bodyActions() {
    document.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => {
      const s = students.find(x => String(studentId(x)) === btn.dataset.edit);
      if (s) openStudentDialog(s);
    }));
    document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      if (!confirm(`Delete student ${id}? This action affects the database if your API supports DELETE.`)) return;
      try { await request(`${API.students}/${encodeURIComponent(id)}`, {method:"DELETE"}); showNotice("Student deleted.", "success"); await loadStudents(); }
      catch (err) { showNotice(`Could not delete student: ${err.message}`, "error"); }
    }));
  }
  $("studentSearch").addEventListener("input", renderStudents);
  $("classFilter").addEventListener("change", renderStudents);
  $("refreshStudents").addEventListener("click", loadStudents);
  function updateCounts() {
    const total = students.length;
    const present = historyRecords.filter(r => String(r.status || "").toUpperCase().includes("PRESENT") && isToday(r)).length;
    const rosterByClass = {};
    ["BCA 1st Year","BCA 2nd Year","BCA 3rd Year"].forEach((name, i) => {
      rosterByClass[name] = students.filter(s => studentClass(s) === name).length;
      const el = $(`classCount${i+1}`); if (el) el.textContent = rosterByClass[name];
    });
    $("totalStudents").textContent = total;
    $("presentCount").textContent = present;
    const absent = Math.max(0, total - present);
    $("absentCount").textContent = total ? absent : 0;
    const rate = total ? Math.round(present / total * 100) : 0;
    $("attendanceRate").textContent = `${rate}%`;
    $("rateProgress").style.width = `${rate}%`;
    $("reportStudents").textContent = total;
    $("reportPresent").textContent = present;
    $("reportAbsent").textContent = absent;
    $("reportRate").textContent = `${rate}%`;
  }
  function isToday(r) {
    const d = r.date || r.attendanceDate || r.createdAt || r.timestamp || "";
    if (!d) return false;
    const parsed = new Date(d);
    return !Number.isNaN(parsed.valueOf()) && parsed.toDateString() === new Date().toDateString();
  }
  function openStudentDialog(student = null) {
    $("studentForm").reset();
    $("editStudentId").value = student ? studentId(student) : "";
    $("studentDialogTitle").textContent = student ? "Edit student" : "Add student";
    $("studentName").value = student ? studentName(student) : "";
    $("studentClass").value = student ? studentClass(student) : "BCA 1st Year";
    $("studentEmail").value = student ? (student.email || "") : "";
    $("studentDialog").showModal();
  }
  $("addStudentBtn").addEventListener("click", () => openStudentDialog());
  $("closeStudentDialog").addEventListener("click", () => $("studentDialog").close());
  $("cancelStudent").addEventListener("click", () => $("studentDialog").close());
  $("studentForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("editStudentId").value;
    const payload = {name:$("studentName").value.trim(), course:$("studentClass").value, email:$("studentEmail").value.trim()};
    try {
      await request(id ? `${API.students}/${encodeURIComponent(id)}` : API.students, {method:id ? "PUT" : "POST", body:JSON.stringify(payload)});
      $("studentDialog").close();
      showNotice(id ? "Student updated." : "Student added.", "success");
      await loadStudents();
    } catch (err) {
      showNotice(`Student could not be saved: ${err.message}. Confirm that the matching Spring Boot endpoint exists.`, "error");
    }
  });

  async function loadHistory() {
    $("historyTable").innerHTML = `<tr><td colspan="5" class="empty-cell">Loading attendance history…</td></tr>`;
    try {
      const data = await request(API.history);
      historyRecords = normalizeList(data);
      if ($("settingsHistoryState")) { $("settingsHistoryState").textContent = "Responding"; $("settingsHistoryState").className = "state-good"; }
      renderHistory();
      renderDashboardHistory();
      updateCounts();
    } catch (err) {
      historyRecords = [];
      $("historyTable").innerHTML = `<tr><td colspan="5" class="empty-cell">History API unavailable (${escapeHTML(err.message)}). Existing face endpoints do not necessarily provide a history list.</td></tr>`;
      if ($("settingsHistoryState")) { $("settingsHistoryState").textContent = "Unavailable"; $("settingsHistoryState").className = "state-pending"; }
      renderDashboardHistory();
      updateCounts();
    }
  }
  function recordId(r) { return r.studentId ?? r.userId ?? r.id ?? "—"; }
  function recordName(r) { return r.studentName ?? r.name ?? r.userName ?? "Student"; }
  function recordClass(r) { return r.course ?? r.className ?? r.year ?? "—"; }
  function recordDate(r) { const d = r.attendanceDate ?? r.date ?? r.createdAt ?? r.timestamp; if (!d) return "—"; const parsed = new Date(d); return Number.isNaN(parsed.valueOf()) ? String(d) : parsed.toLocaleString(); }
  function renderHistory() {
    const q = ($("historySearch").value || "").toLowerCase();
    const date = $("historyDate").value;
    const status = $("historyStatus").value;
    const list = historyRecords.filter(r => {
      const dateValue = String(r.attendanceDate ?? r.date ?? r.createdAt ?? "").slice(0,10);
      return [recordId(r), recordName(r), recordClass(r)].join(" ").toLowerCase().includes(q) && (!date || dateValue === date) && (!status || String(r.status || "").toUpperCase() === status);
    });
    $("historyTable").innerHTML = list.length ? list.map(r => `<tr><td>#${escapeHTML(recordId(r))}</td><td>${escapeHTML(recordName(r))}</td><td>${escapeHTML(recordClass(r))}</td><td>${escapeHTML(recordDate(r))}</td><td>${statusBadge(r.status)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty-cell">No matching attendance records.</td></tr>`;
  }
  function renderDashboardHistory() {
    const list = historyRecords.slice(0,5);
    $("dashboardHistory").innerHTML = list.length ? list.map(r => `<tr><td>${escapeHTML(recordName(r))}</td><td>${escapeHTML(recordClass(r))}</td><td>${escapeHTML(recordDate(r))}</td><td>${statusBadge(r.status)}</td></tr>`).join("") : `<tr><td colspan="4" class="empty-cell">No live attendance history available. Connect a history endpoint to show real records.</td></tr>`;
  }
  ["historySearch","historyDate","historyStatus"].forEach(id => $(id).addEventListener("input", renderHistory));
  $("refreshHistory").addEventListener("click", loadHistory);
  async function refreshDashboard() {
    await Promise.allSettled([loadStudents(), loadHistory(), checkBackend()]);
  }
  async function refreshReports() {
    await Promise.allSettled([loadStudents(), loadHistory()]);
    $("reportMessage").innerHTML = `<span>▥</span><b>Report summary refreshed</b><p>Totals reflect only records returned by the currently configured student and history APIs. Date/class filtering needs a dedicated report API.</p>`;
  }
  $("refreshReports").addEventListener("click", refreshReports);
  $("applyReport").addEventListener("click", async () => {
    await refreshReports();
    showNotice("Summary refreshed. Date-range filters need a backend report endpoint.", "success");
  });

  async function apiAction(path, label) {
    const output = $("apiResult");
    output.className = "api-result";
    output.textContent = `${label}…`;
    try {
      const result = await request(path);
      output.className = "api-result success";
      output.textContent = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      if (settings.notifyAttendance) showNotice(`${label} request completed. Verify the response before relying on it.`, "success");
      await loadHistory();
    } catch (err) {
      output.className = "api-result error";
      output.textContent = `${label} failed: ${err.message}\nCheck that the existing FaceController route and response match this request.`;
      showNotice(`${label} failed. Check backend logs and endpoint mapping.`, "error");
    }
  }
  $("captureBtn").addEventListener("click", () => {
    const id = Math.max(1, Number($("userId").value || 1));
    const count = Math.min(100, Math.max(1, Number($("imageCount").value || 10)));
    apiAction(`${API.face}/capture/${id}/${count}`, "Capture training images");
  });
  $("trainBtn").addEventListener("click", () => {
    const id = Math.max(1, Number($("userId").value || 1));
    apiAction(`${API.face}/train/${id}`, "Train face model");
  });
  $("markBtn").addEventListener("click", () => {
    const id = Math.max(1, Number($("userId").value || 1));
    apiAction(`${API.face}/mark-attendance/${id}`, "Mark attendance");
  });

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { showNotice("Camera access requires localhost or HTTPS and a supported browser.", "error"); return; }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"}, audio:false});
      $("cameraVideo").srcObject = cameraStream;
      $("cameraVideo").play();
      document.querySelector(".camera-frame").classList.add("video-on");
      $("cameraState").textContent = "CAMERA ON";
      $("cameraState").classList.add("online");
      showNotice("Camera preview started. Recognition is not automatic.", "success");
    } catch (err) {
      showNotice(`Could not start camera: ${err.message}. Allow camera permission and use localhost.`, "error");
    }
  }
  function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    $("cameraVideo").srcObject = null;
    document.querySelector(".camera-frame").classList.remove("video-on");
    $("cameraState").textContent = "CAMERA OFF";
    $("cameraState").classList.remove("online");
  }
  $("startCamera").addEventListener("click", startCamera);
  $("stopCamera").addEventListener("click", stopCamera);
  window.addEventListener("beforeunload", stopCamera);

  document.querySelectorAll("[data-setting]").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll("[data-setting]").forEach(x => x.classList.toggle("active", x === btn));
    document.querySelectorAll("[data-pane]").forEach(x => x.classList.toggle("active", x.dataset.pane === btn.dataset.setting));
  }));
  function fillSettingsForm() {
    Object.keys(defaultSettings).forEach(key => {
      const el = $(key);
      if (!el) return;
      if (el.type === "checkbox") el.checked = Boolean(settings[key]);
      else if (key === "apiBaseUrl") el.value = settings[key] || "";
      else el.value = settings[key] ?? "";
    });
    updateTeacherUI();
    document.body.classList.toggle("compact-tables", Boolean(settings.compactTables));
    if ($("topStatus")) $("topStatus").parentElement.style.display = settings.showConnection ? "flex" : "none";
  }
  function collectSettings() {
    Object.keys(defaultSettings).forEach(key => {
      const el = $(key);
      if (!el) return;
      settings[key] = el.type === "checkbox" ? el.checked : el.value.trim();
    });
  }
  function updateTeacherUI() {
    const name = settings.teacherName || "Teacher";
    $("sidebarTeacher").textContent = name;
    $("welcomeTeacher").textContent = name;
    $("profileAvatar").textContent = name.trim().charAt(0).toUpperCase() || "T";
    $("heroSession").textContent = settings.academicSession || "2026–2027";
  }
  $("saveSettings").addEventListener("click", async () => {
    collectSettings();
    saveJSON("smartattend.settings", settings);
    fillSettingsForm();
    showNotice("Preferences saved in this browser. Server-side security and attendance rules still need backend implementation.", "success");
    if (settings.apiBaseUrl !== API.base) await checkBackend();
  });
  $("systemCheck").addEventListener("click", async () => {
    await checkBackend();
    await Promise.allSettled([loadStudents(), loadHistory()]);
    showNotice("Connection checks completed. Review the status details in System & API.", "success");
  });
  $("checkConnection").addEventListener("click", checkBackend);
  $("securityInfoBtn").addEventListener("click", () => showNotice("Security checklist: add Spring Security, BCrypt password hashing, authenticated API routes, role-based access, CSRF/CORS configuration and server-side session handling.", "success"));
  $("logoutBtn").addEventListener("click", () => {
    showNotice("No authenticated teacher session exists yet. Implement Spring Security before enabling real logout.", "error");
  });
  $("darkTheme").addEventListener("change", () => {
    if (!$("darkTheme").checked) {
      $("darkTheme").checked = true;
      showNotice("This starter build uses the requested premium dark-blue theme only.", "success");
    }
  });
  $("apiBaseUrl").addEventListener("change", () => {
    settings.apiBaseUrl = $("apiBaseUrl").value.trim();
  });

  ensureBadgeStyles();
  fillSettingsForm();
  renderDashboardHistory();
  checkBackend();
  // Do not silently seed fake student or attendance records.
  setTimeout(() => { if (!backendOnline && settings.notifyBackend) showNotice("Backend not reachable yet. The UI works, but live records require Spring Boot and MySQL.", "error"); }, 900);
})();

const studentPhotoInput = document.getElementById("studentPhoto");
const photoPreview = document.getElementById("photoPreview");

studentPhotoInput.addEventListener("change", function () {
    const file = this.files[0];

    photoPreview.src = "";
    photoPreview.classList.add("hidden");

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        alert("Please upload a JPG, PNG or WEBP photo.");
        this.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert("Photo size must be less than 2 MB.");
        this.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        photoPreview.src = event.target.result;
        photoPreview.classList.remove("hidden");
    };

    reader.readAsDataURL(file);
});
