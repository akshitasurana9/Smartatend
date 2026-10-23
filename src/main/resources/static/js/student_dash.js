
"use strict";

const camera = document.getElementById("camera");
const canvas = document.getElementById("captureCanvas");
const placeholder = document.getElementById("cameraPlaceholder");

const startCameraBtn = document.getElementById("startCameraBtn");
const markAttendanceBtn = document.getElementById("markAttendanceBtn");
const logoutBtn = document.getElementById("logoutBtn");

const cameraMessage = document.getElementById("cameraMessage");
const attendanceStatus = document.getElementById("attendanceStatus");
const attendanceTime = document.getElementById("attendanceTime");

let cameraStream = null;

// Read student details saved after successful login
let student;

try {
    student = JSON.parse(
        sessionStorage.getItem("smartattendStudent") || "null"
    );
} catch {
    student = null;
}

// Redirect if the login details are missing
if (!student) {
    window.location.replace("student_login.html");
}

// Update this mapping if your Java API uses different property names.
if (student) {
    document.getElementById("studentName").textContent =
        student.name || student.fullName || "Student";

    document.getElementById("profileName").textContent =
        student.name || student.fullName || "Student";

    document.getElementById("profileEmail").textContent =
        student.email || "Email unavailable";

    document.getElementById("profileId").textContent =
        "Student ID: " +
        (student.studentId || student.id || "Not provided");
}

// Show today's date
document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

function showMessage(text, type = "") {
    cameraMessage.textContent = text;
    cameraMessage.className = "message " + type;
}

// Start camera
startCameraBtn.addEventListener("click", async () => {
    if (cameraStream) {
        stopCamera();
        return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        showMessage(
            "Camera unavailable. Open this page using localhost or HTTPS.",
            "error"
        );
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        camera.srcObject = cameraStream;
        camera.style.display = "block";
        placeholder.style.display = "none";

        startCameraBtn.innerHTML =
            '<i class="fa-solid fa-video-slash"></i> Stop Camera';

        markAttendanceBtn.disabled = false;
        showMessage(
            "Camera started. Click Verify & Mark to request verification."
        );
    } catch (error) {
        console.error("Camera error:", error);

        showMessage(
            "Camera access denied or unavailable. Check browser permissions.",
            "error"
        );
    }
});

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    camera.srcObject = null;
    camera.style.display = "none";
    placeholder.style.display = "block";

    startCameraBtn.innerHTML =
        '<i class="fa-solid fa-video"></i> Start Camera';

    markAttendanceBtn.disabled = true;
}

// Request real face verification from the backend
markAttendanceBtn.addEventListener("click", async () => {
    if (!student || !cameraStream || !camera.videoWidth) {
        showMessage("Please start the camera first.", "error");
        return;
    }

    // Capture a frame from the camera
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);

    markAttendanceBtn.disabled = true;
    showMessage("Verifying your identity...");

    try {
        const response = await fetch("/api/attendance/verify-face", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                image: imageBase64
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Identity verification failed."
            );
        }

        if (data.verified !== true || data.attendanceMarked !== true) {
            throw new Error(
                data.message || "Attendance was not confirmed."
            );
        }

        attendanceStatus.textContent = "Present";
        attendanceTime.textContent =
            "Marked at " +
            new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit"
            });

        showMessage(
            data.message || "Attendance successfully recorded!",
            "success"
        );

        stopCamera();
    } catch (error) {
        console.error("Attendance error:", error);

        showMessage(
            error.message || "Could not connect to the attendance server.",
            "error"
        );
    } finally {
        markAttendanceBtn.disabled = !cameraStream;
    }
});

// Logout
logoutBtn.addEventListener("click", async () => {
    stopCamera();

    sessionStorage.removeItem("smartattendStudent");

    // If your backend uses a server session, also implement a logout API
    // that invalidates that session.
    window.location.replace("student_login.html");
});

// Stop camera if the user leaves the page
window.addEventListener("pagehide", stopCamera);
