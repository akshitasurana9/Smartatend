
document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".loginform form");
    const usernameInput = document.querySelector('input[name="username"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const loginButton = document.getElementById("login");

    // Create a message area
    const message = document.createElement("p");
    message.id = "login-message";
    message.setAttribute("role", "status");
    message.style.marginTop = "15px";
    message.style.textAlign = "center";
    form.appendChild(message);

    // Login form submission
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Basic validation
        if (!username || !password.trim()) {
            showMessage("Please enter your username and password.", "red");
            return;
        }

        if (username.length < 3) {
            showMessage("Username must contain at least 3 characters.", "red");
            return;
        }

        // Demo mode: no real authentication yet
        showMessage(
            "Frontend validation successful. Backend login is not connected yet.",
            "#2563eb"
        );

        /*
        When your Spring Boot login API is ready, replace the demo
        message above with a fetch() request to your backend.
        Do not store passwords in localStorage or sessionStorage.
        */
    });

    function showMessage(text, color) {
        message.textContent = text;
        message.style.color = color;
    }
});
