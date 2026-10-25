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

    if (!table) {
        return;
    }

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

        subjectCell.textContent =
            record.subject ?? `Session ${record.sessionId ?? "—"}`;

        const status = String(
            record.status ?? "Unknown"
        ).toUpperCase();

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
            `/api/attendance/student?email=${encodeURIComponent(
                currentStudent.email
            )}`,
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const responseText = await response.text();

        let data = {};

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            throw new Error(
                `The attendance server returned an invalid response (HTTP ${response.status}).`
            );
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                `Could not load attendance history (HTTP ${response.status}).`
            );
        }

        const records = Array.isArray(data.attendance)
            ? data.attendance
            : [];

        // Display complete attendance history.
        renderAttendance(records, "historyTable");

        // Display the five most recent records.
        renderAttendance(records.slice(0, 5), "recentTable");

        // Read summary counts from the API.
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

            if (!table) {
                return;
            }

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
        if (!faceVideo || !captureFaceButton || !stopCameraButton) {
            if (faceStatus) {
                faceStatus.textContent =
                    "Camera elements are missing. Check student_dashboard.html.";
            }

            return;
        }

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            if (faceStatus) {
                faceStatus.textContent =
                    "Camera access is unavailable. Open this page through localhost or HTTPS.";
            }

            return;
        }

        // Avoid starting the camera more than once.
        if (cameraStream) {
            if (faceStatus) {
                faceStatus.textContent =
                    "The camera is already running.";
            }

            return;
        }

        startCameraButton.disabled = true;

        if (faceStatus) {
            faceStatus.textContent =
                "Requesting camera permission...";
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: {
                        ideal: 640
                    },
                    height: {
                        ideal: 480
                    }
                },
                audio: false
            });

            faceVideo.srcObject = cameraStream;
            faceVideo.style.display = "block";

            await faceVideo.play();

            if (cameraPlaceholder) {
                cameraPlaceholder.style.display = "none";
            }

            captureFaceButton.disabled = false;
            stopCameraButton.disabled = false;

            if (faceStatus) {
                faceStatus.textContent =
                    "Camera is running. Position your face clearly and select Capture Face.";
            }

        } catch (error) {
            console.error("Camera start error:", error);

            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }

            faceVideo.srcObject = null;

            startCameraButton.disabled = false;
            captureFaceButton.disabled = true;
            stopCameraButton.disabled = true;

            if (faceStatus) {
                if (error.name === "NotAllowedError") {
                    faceStatus.textContent =
                        "Camera permission was denied. Allow camera access in your browser settings.";
                } else if (error.name === "NotFoundError") {
                    faceStatus.textContent =
                        "No camera was found. Connect a camera and try again.";
                } else {
                    faceStatus.textContent =
                        error.message || "Could not start the camera.";
                }
            }
        }
    });
}

// ============================================
// 9. CAPTURE FACE AND VERIFY WITH BACKEND
// ============================================

if (captureFaceButton) {
    captureFaceButton.addEventListener("click", async () => {
        if (!faceStatus || !faceVideo || !faceCanvas) {
            alert(
                "Camera elements are missing. Check student_dashboard.html."
            );

            return;
        }

        if (!cameraStream || !faceVideo.videoWidth) {
            faceStatus.textContent =
                "Start the camera and wait for the video to appear.";

            return;
        }

        if (!currentStudent || !currentStudent.id) {
            faceStatus.textContent =
                "Student login information is missing. Please log in again.";

            return;
        }

        captureFaceButton.disabled = true;

        faceStatus.textContent =
            "Capturing your face...";

        try {
            // Capture the current camera frame.
            faceCanvas.width = faceVideo.videoWidth;
            faceCanvas.height = faceVideo.videoHeight;

            const context = faceCanvas.getContext("2d");

            if (!context) {
                throw new Error(
                    "Could not access the camera image."
                );
            }

            context.drawImage(
                faceVideo,
                0,
                0,
                faceCanvas.width,
                faceCanvas.height
            );

            // Convert the image into a JPEG Blob.
            const livePhoto = await new Promise((resolve, reject) => {
                faceCanvas.toBlob(
                    blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(
                                new Error("Could not capture the photo.")
                            );
                        }
                    },
                    "image/jpeg",
                    0.9
                );
            });

            // Prepare the multipart request.
            const formData = new FormData();

            formData.append(
                "livePhoto",
                livePhoto,
                "live.jpg"
            );

            faceStatus.textContent =
                "Verifying your face. Please wait...";

            // Send the captured photo to Spring Boot.
            const response = await fetch(
                `/api/face/verify/${encodeURIComponent(
                    currentStudent.id
                )}`,
                {
                    method: "POST",
                    body: formData,
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            // Read the response as text first so invalid JSON can be diagnosed.
            const responseText = await response.text();

            let result = {};

            try {
                result = responseText
                    ? JSON.parse(responseText)
                    : {};
            } catch (parseError) {
                console.error(
                    "Invalid server response:",
                    responseText
                );

                throw new Error(
                    `The server returned an invalid response (HTTP ${response.status}). Check the backend logs.`
                );
            }

            // Diagnostic information for browser developer tools.
            console.log(
                "Face API HTTP Status:",
                response.status
            );

            console.log(
                "Face API Response:",
                result
            );

            console.log(
                "Verified value:",
                result.verified
            );

            console.log(
                "Attendance saved:",
                result.attendanceSaved
            );

            console.log(
                "Response message:",
                result.message
            );

            // Display HTTP errors.
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${
                        result.message ||
                        result.error ||
                        responseText ||
                        "The face verification request failed."
                    }`
                );
            }

            // Accept Boolean or string values from the backend.
            const verified =
                result.verified === true ||
                String(result.verified).toLowerCase() === "true";

            const attendanceSaved =
                result.attendanceSaved === true ||
                String(result.attendanceSaved).toLowerCase() === "true";

            if (verified && attendanceSaved) {
                faceStatus.textContent =
                    "Success! Your face was verified and attendance was saved.";

                // Refresh the dashboard using the official attendance API.
                await loadAttendanceHistory();

            } else if (verified) {
                faceStatus.textContent =
                    result.message ||
                    "Your face was verified, but attendance was not confirmed as saved.";

                console.warn(
                    "Face verified, but attendance was not confirmed as saved:",
                    result
                );

            } else {
                faceStatus.textContent =
                    result.message ||
                    "Face verification failed. Attendance was not marked.";

                console.warn(
                    "Face verification was unsuccessful:",
                    result
                );
            }

        } catch (error) {
            console.error(
                "Face capture/verification error:",
                error
            );

            console.error(
                "Error name:",
                error.name
            );

            console.error(
                "Error message:",
                error.message
            );

            faceStatus.textContent =
                error.message ||
                "Face verification failed. Please try again.";

        } finally {
    captureFaceButton.disabled = !cameraStream;  
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

    if (startCameraButton) {
        startCameraButton.disabled = false;
    }

    if (captureFaceButton) {
        captureFaceButton.disabled = true;
    }

    if (stopCameraButton) {
        stopCameraButton.disabled = true;
    }

    if (showStatus && faceStatus) {
        faceStatus.textContent = "Camera stopped.";
    }
}

// Stop camera when the Stop Camera button is clicked.
if (stopCameraButton) {
    stopCameraButton.addEventListener("click", () => {
        stopFaceCamera(true);
    });
}

// Release the camera when leaving the page.
window.addEventListener("pagehide", () => {
    stopFaceCamera(false);
});