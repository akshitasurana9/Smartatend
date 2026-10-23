
const ATTENDANCE_KEY = "smartattend_teacher_attendance_v1";

let students = [];
let attendance = readJSON(ATTENDANCE_KEY, {});
let modalStudentId = "";

function readJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function saveData() {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

function showNotice(message, type = "success") {
    const box = document.getElementById("notice");
    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;
    box.className = `notice ${type}`;

    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => {
        box.classList.add("hidden");
    }, 4200);
}

function goToPage(page) {
    document.querySelectorAll(".page").forEach(el => {
        el.classList.toggle("active", el.id === page);
    });

    document.querySelectorAll(".nav-link").forEach(el => {
        el.classList.toggle("active", el.dataset.page === page);
    });

    const titles = {
        dashboard: "Teacher Dashboard",
        students: "Manage Students",
        attendance: "Today's Attendance",
        credentials: "Student Login IDs",
        settings: "Settings"
    };

    const title = document.getElementById("pageTitle");
    if (title) title.textContent = titles[page] || "Teacher Dashboard";

    if (page === "attendance") {
        const date = document.getElementById("attendanceDate");
        if (date) {
            date.textContent = new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        }
    }
}

document.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => goToPage(btn.dataset.go));
});


// ADD STUDENT TO MYSQL
document.getElementById("studentForm").addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const studentClass = document.getElementById("studentClass").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const password = document.getElementById("studentPassword").value;
    const photoInput = document.getElementById("studentPhoto");

    if (!name || !studentClass || !email || password.length < 8) {
        showNotice("Enter all required fields. Password must be at least 8 characters.", "error");
        return;
    }

    if (photoInput.files.length > 0) {
        const photo = photoInput.files[0];
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(photo.type)) {
            showNotice("Upload a JPG, PNG or WEBP photo.", "error");
            return;
        }

        if (photo.size > 2 * 1024 * 1024) {
            showNotice("Photo must be smaller than 2 MB.", "error");
            return;
        }
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("studentClass", studentClass);
    formData.append("email", email);
    formData.append("password", password);

    if (photoInput.files.length > 0) {
        formData.append("photo", photoInput.files[0]);
    }

    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch("/api/students", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            showNotice(result.message || "Could not save student.", "error");
            return;
        }

        modalStudentId = String(result.id);

        document.getElementById("newStudentId").textContent = modalStudentId;
        document.getElementById("credentialModal").classList.remove("hidden");

        event.target.reset();

        const preview = document.getElementById("photoPreview");
        if (preview) {
            preview.removeAttribute("src");
            preview.classList.add("hidden");
        }

        await loadStudentsFromDatabase();
        showNotice("Student saved successfully in MySQL.");

    } catch (error) {
        console.error("Add student error:", error);
        showNotice("Cannot connect to Spring Boot. Check that the server is running.", "error");
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});


// LOAD STUDENTS FROM MYSQL
async function loadStudentsFromDatabase() {
    try {
        const response = await fetch("/api/students");

        if (!response.ok) {
            throw new Error("Could not load students.");
        }

        students = await response.json();
        renderAll();

    } catch (error) {
        console.error("Load students error:", error);
        showNotice("Could not load student records from the database.", "error");
    }
}


// STUDENT ID MODAL
function closeModal() {
    document.getElementById("credentialModal").classList.add("hidden");
}

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("doneModal").addEventListener("click", closeModal);

document.getElementById("credentialModal").addEventListener("click", event => {
    if (event.target.id === "credentialModal") closeModal();
});

document.getElementById("copyStudentId").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(modalStudentId);
        showNotice("Student ID copied.");
    } catch {
        showNotice("Student ID: " + modalStudentId);
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});


// DELETE STUDENT FROM MYSQL
async function deleteStudent(id) {
    const student = students.find(s => String(s.id) === String(id));
    if (!student) return;

    if (!confirm(`Delete ${student.name} (ID: ${student.id})?`)) return;

    try {
        const response = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            showNotice(result.message || "Could not delete student.", "error");
            return;
        }

        Object.keys(attendance).forEach(day => {
            delete attendance[day][student.id];

            if (Object.keys(attendance[day]).length === 0) {
                delete attendance[day];
            }
        });

        saveData();
        await loadStudentsFromDatabase();
        showNotice("Student deleted from MySQL.");

    } catch (error) {
        console.error("Delete student error:", error);
        showNotice("Could not connect to the server.", "error");
    }
}


// MARK ATTENDANCE (currently browser storage only)
function markPresent(id) {
    const day = todayKey();
    attendance[day] = attendance[day] || {};
    attendance[day][id] = "Present";

    saveData();
    renderAll();
    showNotice("Attendance marked present.");
}


// RENDER STUDENT TABLES
function renderStudents() {
    const query = (document.getElementById("studentSearch")?.value || "").toLowerCase();

    const filtered = students.filter(s =>
        `${s.id} ${s.name} ${s.studentClass} ${s.email}`.toLowerCase().includes(query)
    );

    document.getElementById("studentCountLabel").textContent =
        `${students.length} student${students.length === 1 ? "" : "s"}`;

    document.getElementById("studentTable").innerHTML = filtered.length
        ? filtered.map(s => `
            <tr>
                <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                <td>
                    <span class="student-name">${escapeHTML(s.name)}</span><br>
                    <small>${escapeHTML(s.email || "No email provided")}</small>
                </td>
                <td>${escapeHTML(s.studentClass)}</td>
                <td><button class="delete-btn" data-delete="${escapeHTML(s.id)}">Delete</button></td>
            </tr>
        `).join("")
        : `<tr><td colspan="4" class="empty">${students.length ? "No matching students found." : "No students added yet. Use the form to add your first student."}</td></tr>`;

    document.getElementById("dashboardStudents").innerHTML = students.length
        ? students.slice(0, 5).map(s => `
            <tr>
                <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                <td><span class="student-name">${escapeHTML(s.name)}</span></td>
                <td>${escapeHTML(s.studentClass)}</td>
                <td>${attendance[todayKey()]?.[s.id]
                    ? '<span class="status present">Present</span>'
                    : '<span class="status not-marked">Not marked</span>'}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4" class="empty">No students yet. Click “Add Student” to begin.</td></tr>`;

    document.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", () => deleteStudent(btn.dataset.delete));
    });
}

function renderCredentials() {
    const query = (document.getElementById("credentialSearch")?.value || "").toLowerCase();

    const filtered = students.filter(s =>
        `${s.id} ${s.name} ${s.studentClass} ${s.email}`.toLowerCase().includes(query)
    );

    document.getElementById("credentialTable").innerHTML = filtered.length
        ? filtered.map(s => `
            <tr>
                <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                <td><span class="student-name">${escapeHTML(s.name)}</span></td>
                <td>${escapeHTML(s.studentClass)}</td>
                <td>${escapeHTML(s.email || "—")}</td>
                <td><span class="status present">ID assigned</span></td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" class="empty">No matching student IDs.</td></tr>`;
}

function renderAttendance() {
    const query = (document.getElementById("attendanceSearch")?.value || "").toLowerCase();
    const today = attendance[todayKey()] || {};

    const filtered = students.filter(s =>
        `${s.id} ${s.name} ${s.studentClass}`.toLowerCase().includes(query)
    );

    document.getElementById("attendanceTable").innerHTML = filtered.length
        ? filtered.map(s => {
            const present = today[s.id] === "Present";

            return `
                <tr>
                    <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                    <td><span class="student-name">${escapeHTML(s.name)}</span></td>
                    <td>${escapeHTML(s.studentClass)}</td>
                    <td><span class="status ${present ? "present" : "not-marked"}">${present ? "Present" : "Not marked"}</span></td>
                    <td>
                        <button class="${present ? "secondary-btn" : "primary-btn"}"
                            data-present="${escapeHTML(s.id)}" ${present ? "disabled" : ""}>
                            ${present ? "Marked ✓" : "Mark Present"}
                        </button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="5" class="empty">No students available. Add students first.</td></tr>`;

    document.querySelectorAll("[data-present]").forEach(btn => {
        btn.addEventListener("click", () => markPresent(btn.dataset.present));
    });
}

function renderStats() {
    const total = students.length;
    const present = Object.values(attendance[todayKey()] || {})
        .filter(value => value === "Present").length;

    const absent = Math.max(0, total - present);
    const rate = total ? Math.round(present / total * 100) : 0;

    document.getElementById("totalStudents").textContent = total;
    document.getElementById("presentCount").textContent = present;
    document.getElementById("absentCount").textContent = absent;
    document.getElementById("attendanceRate").textContent = rate + "%";
}

function renderAll() {
    renderStudents();
    renderCredentials();
    renderAttendance();
    renderStats();
}


// SEARCH
["studentSearch", "credentialSearch", "attendanceSearch"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
        if (id === "studentSearch") renderStudents();
        if (id === "credentialSearch") renderCredentials();
        if (id === "attendanceSearch") renderAttendance();
    });
});


// CLEAR DEMO ATTENDANCE
document.getElementById("clearDemoBtn").addEventListener("click", () => {
    if (!confirm("Clear attendance demo records in this browser? Student records in MySQL will not be deleted.")) {
        return;
    }

    attendance = {};
    saveData();
    renderAll();
    showNotice("Attendance demo records cleared.");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    showNotice("Connect this button to your real teacher logout process.", "error");
});


// PHOTO PREVIEW
const studentPhotoInput = document.getElementById("studentPhoto");
const photoPreview = document.getElementById("photoPreview");

studentPhotoInput.addEventListener("change", function () {
    const file = this.files[0];

    photoPreview.removeAttribute("src");
    photoPreview.classList.add("hidden");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        showNotice("Please upload a JPG, PNG or WEBP photo.", "error");
        this.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showNotice("Photo must be smaller than 2 MB.", "error");
        this.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = event => {
        photoPreview.src = event.target.result;
        photoPreview.classList.remove("hidden");
    };

    reader.readAsDataURL(file);
});


// INITIAL LOAD FROM DATABASE
loadStudentsFromDatabase();
