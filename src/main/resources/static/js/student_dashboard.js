
"use strict";

// ============================================
// 1. STUDENT LOGIN DETAILS
// ============================================

const savedStudent = sessionStorage.getItem("smartattendStudent");

let currentStudent = null;

try {
    currentStudent = savedStudent
        ? JSON.parse(savedStudent)
        : null;
} catch (error) {
    currentStudent = null;
}

if (
    !currentStudent ||
    !currentStudent.id ||
    !currentStudent.email
) {
    sessionStorage.removeItem("smartattendStudent");
    window.location.replace("/student_login.html");
}

// ============================================
// 2. STUDENT PROFILE
// ============================================

function setStudentText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value ?? "Not available";
    }
}

if (currentStudent) {
    setStudentText("welcomeName", currentStudent.name);
    setStudentText("topName", currentStudent.name);
    setStudentText("sidebarStudentLabel", currentStudent.email);

    setStudentText("profileName", currentStudent.name);
    setStudentText("profileId", currentStudent.id);
    setStudentText("profileCourse", currentStudent.studentClass);
}

// ============================================
// 3. SIDEBAR NAVIGATION
// ============================================

const navButtons = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

const titles = {
    dashboard: "Dashboard",
    "take-attendance": "Take Attendance",
    attendance: "My Attendance",
    classes: "My Classes",
    profile: "My Profile"
};

navButtons.forEach(button => {
    button.addEventListener("click", () => {
        const pageId = button.dataset.page;

        pages.forEach(page => {
            page.classList.toggle("active", page.id === pageId);
        });

        navButtons.forEach(nav => {
            nav.classList.toggle("active", nav === button);
        });

        const pageTitle = document.getElementById("pageTitle");

        if (pageTitle) {
            pageTitle.textContent = titles[pageId] || "Dashboard";
        }

        if (pageId === "attendance" || pageId === "dashboard") {
            loadAttendanceHistory();
        }

        if (pageId !== "take-attendance") {
            stopFaceCamera(false);
        }
    });
});

// ============================================
// 4. RENDER ATTENDANCE TABLE
// ============================================

function renderAttendance(records, tableId) {
    const table = document.getElementById(tableId);

    if (!table) return;

    table.replaceChildren();

    if (!Array.isArray(records) || records.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 3;
        cell.textContent = "No attendance records available yet.";

        row.appendChild(cell);
        table.appendChild(row);
        return;
    }

    records.forEach(record => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        const subjectCell = document.createElement("td");
        const statusCell = document.createElement("td");

        const badge = document.createElement("span");

        const markedAt = record.markedAt
            ? new Date(record.markedAt)
            : null;

        dateCell.textContent =
            markedAt && !Number.isNaN(markedAt.getTime())
                ? markedAt.toLocaleString()
                : "—";

        // Current API does not return subject names.
        subjectCell.textContent =
            record.subject ?? `Session ${record.sessionId ?? "—"}`;

        const status = String(record.status ?? "Unknown").toUpperCase();

        badge.textContent = status;

        badge.className =
            "status " +
            (status === "PRESENT"
                ? "present"
                : status === "LATE"
                    ? "late"
                    : status === "ABSENT"
                        ? "absent"
                        : "");

        statusCell.appendChild(badge);

        row.append(dateCell, subjectCell, statusCell);
        table.appendChild(row);
    });
}

// ============================================
// 5. EMPTY DASHBOARD STATE
// ============================================

function showEmptyDashboard() {
    renderAttendance([], "recentTable");
    renderAttendance([], "historyTable");

    setStudentText("totalClasses", "—");
    setStudentText("presentCount", "0");
    setStudentText("absentCount", "0");
    setStudentText("attendanceRate", "0%");
    setStudentText("summaryRate", "0%");

    const progressBar = document.getElementById("progressBar");

    if (progressBar) {
        progressBar.style.width = "0%";
    }

    setStudentText(
        "summaryMessage",
        "Loading your official attendance records..."
    );
}

// ============================================
// 6. LOAD ATTENDANCE FROM SPRING BOOT API
// ============================================

async function loadAttendanceHistory() {
    if (!currentStudent || !currentStudent.email) {
        return;
    }

    const historyTable = document.getElementById("historyTable");
    const recentTable = document.getElementById("recentTable");

    try {
        if (historyTable) {
            historyTable.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 3;
            cell.textContent = "Loading attendance history...";

            row.appendChild(cell);
            historyTable.appendChild(row);
        }

        const response = await fetch(
            `/api/attendance/student?email=${encodeURIComponent(currentStudent.email)}`,
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Could not load attendance history."
            );
        }

        const records = Array.isArray(data.attendance)
            ? data.attendance
            : [];

        // Full attendance history
        renderAttendance(records, "historyTable");

        // Recent attendance: show the latest five records
        renderAttendance(records.slice(0, 5), "recentTable");

        // Summary counts returned by the API
        const present = Number(data.present ?? 0);
        const absent = Number(data.absent ?? 0);
        const total = Number(data.totalRecords ?? records.length);

        const attendanceRate = total > 0
            ? Math.round((present / total) * 100)
            : 0;

        setStudentText("presentCount", present);
        setStudentText("absentCount", absent);
        setStudentText("totalClasses", total);
        setStudentText("attendanceRate", `${attendanceRate}%`);
        setStudentText("summaryRate", `${attendanceRate}%`);

        const progressBar = document.getElementById("progressBar");

        if (progressBar) {
            progressBar.style.width = `${attendanceRate}%`;
        }

        setStudentText(
            "summaryMessage",
            total > 0
                ? `You have ${present} present record(s) out of ${total} attendance record(s).`
                : "No attendance records available yet."
        );

        console.log("Attendance history loaded:", data);

    } catch (error) {
        console.error("Attendance history error:", error);

        const message =
            "Could not load attendance history. Please refresh and try again.";

        setStudentText("summaryMessage", message);

        ["historyTable", "recentTable"].forEach(tableId => {
            const table = document.getElementById(tableId);

            if (!table) return;

            table.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 3;
            cell.textContent = message;

            row.appendChild(cell);
            table.appendChild(row);
        });
    }
}

// Load attendance when the dashboard opens.
showEmptyDashboard();
loadAttendanceHistory();

// ============================================
// 7. WEBCAM ELEMENTS
// ============================================

const faceVideo = document.getElementById("faceVideo");
const faceCanvas = document.getElementById("faceCanvas");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const faceStatus = document.getElementById("faceStatus");

const startCameraButton = document.getElementById("startCamera");
const captureFaceButton = document.getElementById("captureFace");
const stopCameraButton = document.getElementById("stopCamera");

let cameraStream = null;

// ============================================
// 8. START CAMERA
// ============================================

if (startCameraButton) {
    startCameraButton.addEventListener("click", async () => {
        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {

            faceStatus.textContent =
                "Camera is unavailable. Open this page through localhost or HTTPS.";

            return;
        }

        startCameraButton.disabled = true;

        if (faceStatus) {
            faceStatus.textContent = "Requesting camera permission...";
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });

            faceVideo.srcObject = cameraStream;
            faceVideo.style.display = "block";

            if (cameraPlaceholder) {
                cameraPlaceholder.style.display = "none";
            }

            await faceVideo.play();

            captureFaceButton.disabled = false;
            stopCameraButton.disabled = false;

            faceStatus.textContent =
                "Camera is running. Capture your face to continue.";

        } catch (error) {
            cameraStream = null;
            startCameraButton.disabled = false;

            if (faceStatus) {
                faceStatus.textContent =
                    error.name === "NotAllowedError"
                        ? "Camera permission denied. Allow camera access in browser settings."
                        : "Could not start camera. Check the camera and browser permissions.";
            }
        }
    });
}

// ============================================
// 9. CAPTURE FACE AND VERIFY WITH BACKEND
// ============================================

if (captureFaceButton) {
    captureFaceButton.addEventListener("click", async () => {
        if (!cameraStream || !faceVideo.videoWidth) {
            faceStatus.textContent = "Start the camera first.";
            return;
        }

        if (!currentStudent || !currentStudent.id) {
            faceStatus.textContent =
                "Student login details not found. Please log in again.";
            return;
        }

        faceCanvas.width = faceVideo.videoWidth;
        faceCanvas.height = faceVideo.videoHeight;

        const context = faceCanvas.getContext("2d");

        context.drawImage(
            faceVideo,
            0,
            0,
            faceCanvas.width,
            faceCanvas.height
        );

        captureFaceButton.disabled = true;
        faceStatus.textContent = "Checking your face...";

        try {
            const livePhoto = await new Promise((resolve, reject) => {
                faceCanvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not capture the photo."));
                    }
                }, "image/jpeg", 0.9);
            });

            const formData = new FormData();

            formData.append("livePhoto", livePhoto, "live.jpg");

            const response = await fetch(
                `/api/face/verify/${encodeURIComponent(currentStudent.id)}`,
                {
                    method: "POST",
                    body: formData,
                    credentials: "same-origin"
                }
            );

            let result;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    "Server returned an invalid response. Check the backend."
                );
            }

            if (!response.ok) {
                faceStatus.textContent =
                    result.message ||
                    "Face verification or attendance saving failed.";

                return;
            }

            if (
                result.verified === true &&
                result.attendanceSaved === true
            ) {
                faceStatus.textContent =
                    "Success! Face verified and attendance saved successfully.";

                // Refresh dashboard tables and summary after successful marking.
                await loadAttendanceHistory();

            } else if (
                result.verified === true &&
                result.attendanceSaved !== true
            ) {
                faceStatus.textContent =
                    result.message ||
                    "Face verified, but attendance was not saved.";

            } else {
                faceStatus.textContent =
                    result.message ||
                    "Face did not match. Attendance was not marked.";
            }

        } catch (error) {
            faceStatus.textContent =
                error.message ||
                "Could not verify your face. Please try again.";

        } finally {
            captureFaceButton.disabled = false;
        }
    });
}

// ============================================
// 10. STOP CAMERA
// ============================================

function stopFaceCamera(showStatus = true) {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    if (faceVideo) {
        faceVideo.srcObject = null;
        faceVideo.style.display = "none";
    }

    if (cameraPlaceholder) {
        cameraPlaceholder.style.display = "block";
    }

    if (startCameraButton) startCameraButton.disabled = false;
    if (captureFaceButton) captureFaceButton.disabled = true;
    if (stopCameraButton) stopCameraButton.disabled = true;

    if (showStatus && faceStatus) {
        faceStatus.textContent = "Camera stopped.";
    }
}

if (stopCameraButton) {
    stopCameraButton.addEventListener("click", () => {
        stopFaceCamera(true);
    });
}

window.addEventListener("pagehide", () => {
    stopFaceCamera(false);
});
