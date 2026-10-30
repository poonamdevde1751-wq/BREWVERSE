
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const message = document.getElementById("message");

function showForm(type) {

    message.textContent = "";

    loginForm.classList.toggle("hidden", type !== "login");
    registerForm.classList.toggle("hidden", type !== "register");

    document.getElementById("login-tab")
        .classList.toggle("active", type === "login");

    document.getElementById("register-tab")
        .classList.toggle("active", type === "register");
}

// Registration
registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        message.textContent = data.message;

        if (data.success) {
            message.style.color = "green";
            registerForm.reset();
            showForm("login");
            message.textContent = "Registration successful! Please login.";
            message.style.color = "green";
        } else {
            message.style.color = "red";
        }

    } catch (error) {
        message.textContent = "Server connection failed";
        message.style.color = "red";
    }
});

// Login
loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        message.textContent = data.message;

        if (data.success) {
            message.style.color = "green";
            showWelcome(data.user);
        } else {
            message.style.color = "red";
        }

    } catch (error) {
        message.textContent = "Server connection failed";
        message.style.color = "red";
    }
});

// Show logged-in user
function showWelcome(user) {

    document.getElementById("auth-area").classList.add("hidden");

    document.getElementById("welcome").classList.remove("hidden");

    document.getElementById("welcome-name").textContent =
        "Hello, " + user.name + "! You are logged in.";
}

// Check existing session
async function checkLogin() {

    try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.user) {
            showWelcome(data.user);
        }
    } catch (error) {
        console.log(error);
    }
}

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {

    const response = await fetch("/api/auth/logout", {
        method: "POST"
    });

    const data = await response.json();

    if (data.success) {
        window.location.reload();
    }
});

checkLogin();
