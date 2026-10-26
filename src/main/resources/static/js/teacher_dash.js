/* =====================================================
   SMARTATTEND — TEACHER DASHBOARD
   File: static/js/teacher_dash.js
   ===================================================== */

"use strict";

const ATTENDANCE_KEY = "smartattend_one_day_attendance_v1";

let students = [];
let databaseAttendance = {};
let attendance = readJSON(ATTENDANCE_KEY, {});
let modalStudentId = "";

function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
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

function getStudentId(s) {
    return String(s?.id ?? s?.studentId ?? s?.student_id ?? "");
}

function getStudentName(s) {
    return s?.name ?? s?.fullName ?? s?.studentName ?? "Unnamed student";
}

function getStudentClass(s) {
    return s?.studentClass ?? s?.className ?? s?.class_name ?? "";
}

function getStudentEmail(s) {
    return s?.email ?? s?.studentEmail ?? "";
}

function normalizeEmail(value) {
    return String(value ?? "").trim().toLowerCase();
}

function getDayAttendance(date = todayKey()) {
    if (!attendance[date] || typeof attendance[date] !== "object") {
        attendance[date] = {};
    }
    return attendance[date];
}

function showNotice(message, type = "success") {
    const box = document.getElementById("notice");

    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;
    box.className = `notice ${type}`;

    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => {
        box.classList.add("hidden");
    }, 4500);
}

function statusBadge(status) {
    const normalized = String(status ?? "").trim().toUpperCase();
    let cssClass = "not-marked";

    if (normalized === "PRESENT") cssClass = "present";
    if (normalized === "ABSENT") cssClass = "absent";
    if (normalized === "LATE") cssClass = "late";

    return `<span class="status ${cssClass}">${escapeHTML(status || "Not marked")}</span>`;
}

function getStudentStatus(id, date = todayKey()) {
    id = String(id);

    if (date === todayKey() && databaseAttendance[id]) {
        return databaseAttendance[id];
    }

    return getDayAttendance(date)[id] || "Not marked";
}

/* ================= NAVIGATION ================= */

function goToPage(page) {
    const target = document.getElementById(page);

    if (!target || !target.classList.contains("page")) {
        console.warn("Unknown dashboard page:", page);
        return;
    }

    document.querySelectorAll(".page").forEach(section => {
        section.classList.toggle("active", section.id === page);
    });

    document.querySelectorAll(".nav-link[data-page]").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    const titles = {
        dashboard: "Teacher Dashboard",
        students: "Manage Students",
        attendance: "Daily Attendance Register",
        credentials: "Student Login IDs",
        settings: "Settings"
    };

    const title = document.getElementById("pageTitle");
    if (title) title.textContent = titles[page] || "Teacher Dashboard";

    if (page === "attendance") {
        updateAttendanceDate();
        renderAttendance();
    }

    if (["dashboard", "students", "attendance", "credentials"].includes(page)) {
        loadStudentsFromDatabase();
    }
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        goToPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        goToPage(button.dataset.go);
    });
});

function updateAttendanceDate() {
    const element = document.getElementById("attendanceDate");

    if (element) {
        element.textContent = new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
}

/* ================= LOAD STUDENTS ================= */

async function loadStudentsFromDatabase() {
    try {
        const response = await fetch("/api/students", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Students API error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Students API must return a JSON array.");
        }

        students = data;
        databaseAttendance = {};
        renderAll();

        // Attendance API is separate so student pages still work
        // if the attendance endpoint is unavailable.
        try {
            const attendanceResponse = await fetch("/api/attendance/today", {
                cache: "no-store"
            });

            if (!attendanceResponse.ok) {
                throw new Error(`Attendance API error: ${attendanceResponse.status}`);
            }

            const records = await attendanceResponse.json();

            if (!Array.isArray(records)) {
                throw new Error("Attendance API must return a JSON array.");
            }

            records.forEach(record => {
                const email = normalizeEmail(
                    record.email ??
                    record.studentEmail ??
                    record.student?.email
                );

                let student = email
                    ? students.find(s => normalizeEmail(getStudentEmail(s)) === email)
                    : null;

                if (!student) {
                    const recordId = record.studentId ?? record.student_id ?? record.id;

                    if (recordId !== undefined && recordId !== null) {
                        student = students.find(s => getStudentId(s) === String(recordId));
                    }
                }

                if (!student) {
                    console.warn("Could not match attendance record:", record);
                    return;
                }

                const status = String(record.status ?? "").trim().toUpperCase();

                if (["PRESENT", "ABSENT", "LATE"].includes(status)) {
                    databaseAttendance[getStudentId(student)] =
                        status.charAt(0) + status.slice(1).toLowerCase();
                }
            });

            renderAll();
        } catch (error) {
            console.warn("Attendance API could not be loaded:", error);
        }

        console.log("Students loaded:", students);

    } catch (error) {
        console.error("Could not load students:", error);

        showNotice(
            "Students load nahi hue. Spring Boot aur /api/students check karein.",
            "error"
        );
    }
}

/* ================= ADD STUDENT ================= */

document.getElementById("studentForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const studentClass = document.getElementById("studentClass").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const password = document.getElementById("studentPassword").value;
    const photoInput = document.getElementById("studentPhoto");

    if (!name || !studentClass || password.length < 6) {
        showNotice("Name, class aur kam se kam 6-character password enter karein.", "error");
        return;
    }

    if (!photoInput.files || !photoInput.files.length) {
        showNotice("Student ki passport-size photo upload karein.", "error");
        return;
    }

    const photo = photoInput.files[0];

    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
        showNotice("Sirf JPG, PNG ya WEBP photo upload karein.", "error");
        return;
    }

    if (photo.size > 2 * 1024 * 1024) {
        showNotice("Photo 2 MB se chhoti honi chahiye.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("studentClass", studentClass);

    if (email) {
        formData.append("email", email);
    }

    formData.append("password", password);
    formData.append("photo", photo);

    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch("/api/students", {
            method: "POST",
            body: formData
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            showNotice(
                result.message || result.detail || result.error ||
                `Student save nahi hua. HTTP ${response.status}`,
                "error"
            );
            return;
        }

        modalStudentId = String(
            result.id ?? result.studentId ?? result.student_id ?? ""
        );

        const idElement = document.getElementById("newStudentId");
        if (idElement) {
            idElement.textContent = modalStudentId || "Student created";
        }

        document.getElementById("credentialModal")?.classList.remove("hidden");

        event.target.reset();

        const preview = document.getElementById("photoPreview");
        if (preview) {
            preview.removeAttribute("src");
            preview.classList.add("hidden");
        }

        await loadStudentsFromDatabase();
        showNotice("Student successfully save ho gaya.");

    } catch (error) {
        console.error("Add student error:", error);
        showNotice("Server se connection nahi ho raha. Spring Boot check karein.", "error");
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

/* ================= CREDENTIAL MODAL ================= */

function closeModal() {
    document.getElementById("credentialModal")?.classList.add("hidden");
}

document.getElementById("closeModal")?.addEventListener("click", closeModal);
document.getElementById("doneModal")?.addEventListener("click", closeModal);

document.getElementById("credentialModal")?.addEventListener("click", event => {
    if (event.target.id === "credentialModal") closeModal();
});

document.getElementById("copyStudentId")?.addEventListener("click", async () => {
    if (!modalStudentId) {
        showNotice("Copy karne ke liye Student ID available nahi hai.", "error");
        return;
    }

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

/* ================= DELETE STUDENT ================= */

async function deleteStudent(id) {
    const student = students.find(s => getStudentId(s) === String(id));

    if (!student) {
        showNotice("Student nahi mila. Page refresh karke try karein.", "error");
        return;
    }

    if (!confirm(`Delete ${getStudentName(student)} (ID: ${getStudentId(student)})?`)) {
        return;
    }

    try {
        const response = await fetch(
            `/api/students/${encodeURIComponent(getStudentId(student))}`,
            { method: "DELETE" }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            showNotice(
                result.message || result.detail ||
                `Student delete nahi hua. HTTP ${response.status}`,
                "error"
            );
            return;
        }

        Object.keys(attendance).forEach(date => {
            if (attendance[date] && typeof attendance[date] === "object") {
                delete attendance[date][getStudentId(student)];
            }
        });

        delete databaseAttendance[getStudentId(student)];
        saveData();

        await loadStudentsFromDatabase();
        showNotice("Student delete ho gaya.");

    } catch (error) {
        console.error("Delete student error:", error);
        showNotice("Server se connection nahi ho raha.", "error");
    }
}

/* ================= DEMO ATTENDANCE ================= */
/* This demo changes browser localStorage only, not MySQL. */


async function markPresent(id) {
    const studentId = String(id);

    if (!students.some(s => getStudentId(s) === studentId)) {
        showNotice("Student nahi mila.", "error");
        return;
    }

    if (databaseAttendance[studentId] === "Present") {
        showNotice("Attendance server par pehle se marked hai.", "error");
        return;
    }

    try {
        const response = await fetch("/api/attendance/mark", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                studentId: Number(studentId)
            })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.error ||
                result.detail ||
                "Attendance save nahi hui."
            );
        }

        // Server se success milne ke baad hi UI update karein
        databaseAttendance[studentId] = "Present";

        const day = getDayAttendance();
        day[studentId] = "Present";
        saveData();

        renderAll();

        showNotice(
            result.message || "Attendance database mein save ho gayi!",
            "success"
        );

    } catch (error) {
        console.error("Attendance API error:", error);
        showNotice(
            error.message || "Server se connection nahi ho paya.",
            "error"
        );
    }
}


/* ================= RENDER STUDENTS ================= */

function renderStudents() {
    const query = (document.getElementById("studentSearch")?.value || "").toLowerCase();

    const filtered = students.filter(student =>
        `${getStudentId(student)} ${getStudentName(student)} ${getStudentClass(student)} ${getStudentEmail(student)}`
            .toLowerCase()
            .includes(query)
    );

    const countLabel = document.getElementById("studentCountLabel");
    if (countLabel) {
        countLabel.textContent = `${students.length} student${students.length === 1 ? "" : "s"}`;
    }

    const table = document.getElementById("studentTable");

    if (table) {
        table.innerHTML = filtered.length
            ? filtered.map(student => `
                <tr>
                    <td><span class="id-chip">${escapeHTML(getStudentId(student))}</span></td>
                    <td>
                        <span class="student-name">${escapeHTML(getStudentName(student))}</span><br>
                        <small>${escapeHTML(getStudentEmail(student) || "No email provided")}</small>
                    </td>
                    <td>${escapeHTML(getStudentClass(student))}</td>
                    <td>
                        <button type="button" class="delete-btn"
                            data-delete="${escapeHTML(getStudentId(student))}">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" class="empty">${students.length ? "No matching students found." : "No students added yet."}</td></tr>`;

        table.querySelectorAll("[data-delete]").forEach(button => {
            button.addEventListener("click", () => deleteStudent(button.dataset.delete));
        });
    }

    const dashboardTable = document.getElementById("dashboardStudents");

    if (dashboardTable) {
        dashboardTable.innerHTML = students.length
            ? students.slice(0, 5).map(student => `
                <tr>
                    <td><span class="id-chip">${escapeHTML(getStudentId(student))}</span></td>
                    <td><span class="student-name">${escapeHTML(getStudentName(student))}</span></td>
                    <td>${escapeHTML(getStudentClass(student))}</td>
                    <td>${statusBadge(getStudentStatus(getStudentId(student)))}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4" class="empty">No students yet. Click “Add Student” to begin.</td></tr>`;
    }
}

/* ================= RENDER CREDENTIALS ================= */

function renderCredentials() {
    const query = (document.getElementById("credentialSearch")?.value || "").toLowerCase();

    const filtered = students.filter(student =>
        `${getStudentId(student)} ${getStudentName(student)} ${getStudentClass(student)} ${getStudentEmail(student)}`
            .toLowerCase()
            .includes(query)
    );

    const table = document.getElementById("credentialTable");
    if (!table) return;

    table.innerHTML = filtered.length
        ? filtered.map(student => `
            <tr>
                <td><span class="id-chip">${escapeHTML(getStudentId(student))}</span></td>
                <td><span class="student-name">${escapeHTML(getStudentName(student))}</span></td>
                <td>${escapeHTML(getStudentClass(student))}</td>
                <td>${escapeHTML(getStudentEmail(student) || "—")}</td>
                <td><span class="status present">ID assigned</span></td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" class="empty">No matching student IDs.</td></tr>`;
}

/* ================= RENDER ATTENDANCE ================= */

function renderAttendance() {
    const table = document.getElementById("attendanceTable");
    if (!table) return;

    const query = (document.getElementById("attendanceSearch")?.value || "").toLowerCase();

    const filtered = students.filter(student =>
        `${getStudentId(student)} ${getStudentName(student)} ${getStudentClass(student)}`
            .toLowerCase()
            .includes(query)
    );

    table.innerHTML = filtered.length
        ? filtered.map(student => {
            const id = getStudentId(student);
            const status = getStudentStatus(id);
            const isPresent = status === "Present";

            return `
                <tr>
                    <td><span class="id-chip">${escapeHTML(id)}</span></td>
                    <td><span class="student-name">${escapeHTML(getStudentName(student))}</span></td>
                    <td>${escapeHTML(getStudentClass(student))}</td>
                    <td>${statusBadge(status)}</td>
                    <td>
                        <button type="button"
                            class="${isPresent ? "secondary-btn" : "primary-btn"}"
                            data-present="${escapeHTML(id)}"
                            ${isPresent ? "disabled" : ""}>
                            ${isPresent ? "Marked ✓" : "Mark Present"}
                        </button>
                    </td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="5" class="empty">${students.length ? "No matching students found." : "No students available. Add students first."}</td></tr>`;

    table.querySelectorAll("[data-present]").forEach(button => {
        button.addEventListener("click", () => markPresent(button.dataset.present));
    });

    renderDailyStats();
}

/* ================= STATS ================= */

function renderDailyStats() {
    const total = students.length;
    const present = students.filter(s => getStudentStatus(getStudentId(s)) === "Present").length;
    const unmarked = Math.max(0, total - present);
    const rate = total ? Math.round((present / total) * 100) : 0;

    const elTotal = document.getElementById("sessionTotal");
    const elPresent = document.getElementById("sessionPresent");
    const elUnmarked = document.getElementById("sessionUnmarked");
    const elRate = document.getElementById("sessionRate");

    if (elTotal) elTotal.textContent = total;
    if (elPresent) elPresent.textContent = present;
    if (elUnmarked) elUnmarked.textContent = unmarked;
    if (elRate) elRate.textContent = rate + "%";
}

function renderStats() {
    const total = students.length;
    const present = students.filter(s => getStudentStatus(getStudentId(s)) === "Present").length;
    const unmarked = Math.max(0, total - present);
    const rate = total ? Math.round((present / total) * 100) : 0;

    const elTotal = document.getElementById("totalStudents");
    const elPresent = document.getElementById("presentCount");
    const elUnmarked = document.getElementById("absentCount");
    const elRate = document.getElementById("attendanceRate");

    if (elTotal) elTotal.textContent = total;
    if (elPresent) elPresent.textContent = present;
    if (elUnmarked) elUnmarked.textContent = unmarked;
    if (elRate) elRate.textContent = rate + "%";
}

function renderAll() {
    renderStudents();
    renderCredentials();
    renderAttendance();
    renderStats();
}

/* ================= SEARCH ================= */

document.getElementById("studentSearch")?.addEventListener("input", renderStudents);
document.getElementById("credentialSearch")?.addEventListener("input", renderCredentials);
document.getElementById("attendanceSearch")?.addEventListener("input", renderAttendance);

/* ================= CLEAR DEMO RECORDS ================= */

document.getElementById("clearDemoBtn")?.addEventListener("click", () => {
    if (!confirm("Clear browser demo attendance? MySQL student and attendance records will not be deleted.")) {
        return;
    }

    attendance = {};
    saveData();
    renderAll();
    showNotice("Browser demo attendance cleared.");
});
