
const API = "/api/students";

// STUDENT REGISTRATION
async function registerStudent(event) {
    event.preventDefault();

    const form = event.target;

    const student = {
        name: form.elements.name.value.trim(),
        rollNumber: form.elements.rollNumber.value.trim(),
        email: form.elements.email.value.trim(),
        password: form.elements.password.value
    };

    try {
        const response = await fetch(`${API}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(student)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Registration failed.");
            return;
        }

        alert("Registration successful! Please log in.");
        window.location.href = "/login.html";

    } catch (error) {
        alert("Cannot connect to the server. Check Spring Boot.");
        console.error(error);
    }
}

// STUDENT LOGIN
async function loginStudent(event) {
    event.preventDefault();

    const form = event.target;

    const credentials = {
        email: form.elements.email.value.trim(),
        password: form.elements.password.value
    };

    try {
        const response = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Login failed.");
            return;
        }

        // Demo only: this does not establish a secure session.
        alert(`Welcome, ${data.name}!`);
        window.location.href = "/student.html";

    } catch (error) {
        alert("Cannot connect to the server. Check Spring Boot.");
        console.error(error);
    }
}
