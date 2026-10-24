/* =====================================================
   SMARTATTEND — TEACHER DASHBOARD
   ONE DAY ATTENDANCE

   Student records: Spring Boot + MySQL
   Demo attendance: localStorage
   ===================================================== */

const ATTENDANCE_KEY = "smartattend_one_day_attendance_v1";

let students = [];
let attendance = readJSON(ATTENDANCE_KEY, {});
let modalStudentId = "";


/* ================= GENERAL HELPERS ================= */

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

function getStudentId(student) {
    return String(student.id);
}

function getDayAttendance(date = todayKey()) {
    if (!attendance[date] || typeof attendance[date] !== "object") {
        attendance[date] = {};
    }

    return attendance[date];
}

function getStudentStatus(studentId, date = todayKey()) {
    return getDayAttendance(date)[String(studentId)] || "Not marked";
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

function statusBadge(status) {
    const isPresent = status === "Present";

    return `
        <span class="status ${isPresent ? "present" : "not-marked"}">
            ${escapeHTML(status)}
        </span>
    `;
}


/* ================= NAVIGATION ================= */

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
        attendance: "Daily Attendance Register",
        credentials: "Student Login IDs",
        settings: "Settings"
    };

    const title = document.getElementById("pageTitle");

    if (title) {
        title.textContent = titles[page] || "Teacher Dashboard";
    }

    if (page === "attendance") {
        updateAttendanceDate();
        renderAttendance();
    }
}

function updateAttendanceDate() {
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

document.querySelectorAll("[data-page]").forEach(btn => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => goToPage(btn.dataset.go));
});


/* ================= ADD STUDENT TO MYSQL ================= */

document.getElementById("studentForm")?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const name = document.getElementById("studentName").value.trim();
        const studentClass = document.getElementById("studentClass").value.trim();
        const email = document.getElementById("studentEmail").value.trim();
        const password = document.getElementById("studentPassword").value;
        const photoInput = document.getElementById("studentPhoto");

        if (!name || !studentClass || !email || password.length < 8) {
            showNotice(
                "Enter all required fields. Password must be at least 8 characters.",
                "error"
            );
            return;
        }

        if (!photoInput.files.length) {
            showNotice("Please upload the student's passport-size photo.", "error");
            return;
        }

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

        const formData = new FormData();

        formData.append("name", name);
        formData.append("studentClass", studentClass);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("photo", photo);

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

            showNotice(
                "Cannot connect to Spring Boot. Check that the server is running.",
                "error"
            );
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }
);


/* ================= LOAD STUDENTS FROM MYSQL ================= */

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


/* ================= STUDENT CREDENTIAL MODAL ================= */

function closeModal() {
    document.getElementById("credentialModal")?.classList.add("hidden");
}

document.getElementById("closeModal")?.addEventListener("click", closeModal);
document.getElementById("doneModal")?.addEventListener("click", closeModal);

document.getElementById("credentialModal")?.addEventListener("click", event => {
    if (event.target.id === "credentialModal") {
        closeModal();
    }
});

document.getElementById("copyStudentId")?.addEventListener("click", async () => {
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


/* ================= DELETE STUDENT FROM MYSQL ================= */

async function deleteStudent(id) {
    const student = students.find(s => getStudentId(s) === String(id));

    if (!student) return;

    if (!confirm(`Delete ${student.name} (ID: ${student.id})?`)) {
        return;
    }

    try {
        const response = await fetch(
            `/api/students/${encodeURIComponent(student.id)}`,
            { method: "DELETE" }
        );

        let result = {};

        try {
            result = await response.json();
        } catch {
            // Server may return an empty response.
        }

        if (!response.ok) {
            showNotice(result.message || "Could not delete student.", "error");
            return;
        }

        // Remove this student's demo attendance from all dates.
        Object.keys(attendance).forEach(date => {
            if (attendance[date] && typeof attendance[date] === "object") {
                delete attendance[date][String(student.id)];
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


/* ================= MARK ONE DAY ATTENDANCE ================= */
/* Browser demo only — this function does not verify faces. */

function markPresent(id) {
    const day = getDayAttendance();
    const studentId = String(id);

    if (!students.some(s => getStudentId(s) === studentId)) {
        showNotice("Student not found.", "error");
        return;
    }

    if (day[studentId] === "Present") {
        showNotice("Today's attendance is already marked.", "error");
        return;
    }

    day[studentId] = "Present";

    saveData();
    renderAll();

    showNotice("Today's attendance marked in this browser demo.");
}


/* ================= RENDER STUDENT DIRECTORY ================= */

function renderStudents() {
    const query = (
        document.getElementById("studentSearch")?.value || ""
    ).toLowerCase();

    const filtered = students.filter(s =>
        `${s.id} ${s.name} ${s.studentClass} ${s.email || ""}`
            .toLowerCase()
            .includes(query)
    );

    const countLabel = document.getElementById("studentCountLabel");

    if (countLabel) {
        countLabel.textContent =
            `${students.length} student${students.length === 1 ? "" : "s"}`;
    }

    const studentTable = document.getElementById("studentTable");

    if (studentTable) {
        studentTable.innerHTML = filtered.length
            ? filtered.map(s => `
                <tr>
                    <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                    <td>
                        <span class="student-name">${escapeHTML(s.name)}</span><br>
                        <small>${escapeHTML(s.email || "No email provided")}</small>
                    </td>
                    <td>${escapeHTML(s.studentClass)}</td>
                    <td>
                        <button class="delete-btn"
                            data-delete="${escapeHTML(s.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" class="empty">
                ${students.length
                    ? "No matching students found."
                    : "No students added yet."}
               </td></tr>`;
    }

    // Dashboard shows each student's single daily status.
    const dashboardStudents = document.getElementById("dashboardStudents");

    if (dashboardStudents) {
        dashboardStudents.innerHTML = students.length
            ? students.slice(0, 5).map(s => {
                const status = getStudentStatus(s.id);

                return `
                    <tr>
                        <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                        <td><span class="student-name">${escapeHTML(s.name)}</span></td>
                        <td>${escapeHTML(s.studentClass)}</td>
                        <td>${statusBadge(status)}</td>
                    </tr>
                `;
            }).join("")
            : `<tr><td colspan="4" class="empty">
                No students yet. Click “Add Student” to begin.
               </td></tr>`;
    }

    document.querySelectorAll("[data-delete]").forEach(btn => {
        btn.onclick = () => deleteStudent(btn.dataset.delete);
    });
}


/* ================= RENDER STUDENT LOGIN IDs ================= */

function renderCredentials() {
    const query = (
        document.getElementById("credentialSearch")?.value || ""
    ).toLowerCase();

    const filtered = students.filter(s =>
        `${s.id} ${s.name} ${s.studentClass} ${s.email || ""}`
            .toLowerCase()
            .includes(query)
    );

    const table = document.getElementById("credentialTable");

    if (!table) return;

    table.innerHTML = filtered.length
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


/* ================= RENDER DAILY ATTENDANCE ================= */

function renderAttendance() {
    const table = document.getElementById("attendanceTable");

    if (!table) return;

    const query = (
        document.getElementById("attendanceSearch")?.value || ""
    ).toLowerCase();

    const filtered = students.filter(s =>
        `${s.id} ${s.name} ${s.studentClass}`
            .toLowerCase()
            .includes(query)
    );

    const day = getDayAttendance();

    table.innerHTML = filtered.length
        ? filtered.map(s => {
            const id = getStudentId(s);
            const status = day[id] || "Not marked";
            const isPresent = status === "Present";

            return `
                <tr>
                    <td><span class="id-chip">${escapeHTML(s.id)}</span></td>
                    <td><span class="student-name">${escapeHTML(s.name)}</span></td>
                    <td>${escapeHTML(s.studentClass)}</td>
                    <td>${statusBadge(status)}</td>
                    <td>
                        <button
                            class="${isPresent ? "secondary-btn" : "primary-btn"}"
                            data-present="${escapeHTML(id)}"
                            ${isPresent ? "disabled" : ""}>
                            ${isPresent ? "Marked ✓" : "Mark Present"}
                        </button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="5" class="empty">
            ${students.length
                ? "No matching students found."
                : "No students available. Add students first."}
           </td></tr>`;

    table.querySelectorAll("[data-present]").forEach(btn => {
        btn.addEventListener("click", () => {
            markPresent(btn.dataset.present);
        });
    });

    renderDailyStats();
}


/* ================= DAILY ATTENDANCE STATISTICS ================= */

function renderDailyStats() {
    const total = students.length;
    const day = getDayAttendance();

    const present = students.filter(s =>
        day[getStudentId(s)] === "Present"
    ).length;

    const unmarked = Math.max(0, total - present);
    const rate = total ? Math.round((present / total) * 100) : 0;

    const totalElement = document.getElementById("sessionTotal");
    const presentElement = document.getElementById("sessionPresent");
    const unmarkedElement = document.getElementById("sessionUnmarked");
    const rateElement = document.getElementById("sessionRate");

    if (totalElement) totalElement.textContent = total;
    if (presentElement) presentElement.textContent = present;
    if (unmarkedElement) unmarkedElement.textContent = unmarked;
    if (rateElement) rateElement.textContent = rate + "%";
}


/* ================= OVERALL DASHBOARD STATISTICS ================= */

function renderStats() {
    const total = students.length;
    const day = getDayAttendance();

    const present = students.filter(s =>
        day[getStudentId(s)] === "Present"
    ).length;

    const unmarked = Math.max(0, total - present);
    const rate = total ? Math.round((present / total) * 100) : 0;

    const totalElement = document.getElementById("totalStudents");
    const presentElement = document.getElementById("presentCount");
    const absentElement = document.getElementById("absentCount");
    const rateElement = document.getElementById("attendanceRate");

    if (totalElement) totalElement.textContent = total;
    if (presentElement) presentElement.textContent = present;
    if (absentElement) absentElement.textContent = unmarked;
    if (rateElement) rateElement.textContent = rate + "%";
}


/* ================= RENDER EVERYTHING ================= */

function renderAll() {
    renderStudents();
    renderCredentials();
    renderAttendance();
    renderStats();
}


/* ================= SEARCH ================= */

document.getElementById("studentSearch")
    ?.addEventListener("input", renderStudents);

document.getElementById("credentialSearch")
    ?.addEventListener("input", renderCredentials);

document.getElementById("attendanceSearch")
    ?.addEventListener("input", renderAttendance);


/* ================= CLEAR DEMO ATTENDANCE ================= */

document.getElementById("clearDemoBtn")?.addEventListener("click", () => {
    if (!confirm(
        "Clear all one-day attendance demo records in this browser? " +
        "Student records in MySQL will not be deleted."
    )) {
        return;
    }

    attendance = {};
    saveData();
    renderAll();

    showNotice("All browser-demo attendance records cleared.");
});


/* ================= PHOTO PREVIEW ================= */

const studentPhotoInput = document.getElementById("studentPhoto");
const photoPreview = document.getElementById("photoPreview");

studentPhotoInput?.addEventListener("change", function () {
    const file = this.files[0];

    if (photoPreview) {
        photoPreview.removeAttribute("src");
        photoPreview.classList.add("hidden");
    }

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

    if (!photoPreview) return;

    const reader = new FileReader();

    reader.onload = event => {
        photoPreview.src = event.target.result;
        photoPreview.classList.remove("hidden");
    };

    reader.readAsDataURL(file);
});


/* ================= INITIALIZE ================= */

updateAttendanceDate();
renderAll();
loadStudentsFromDatabase();