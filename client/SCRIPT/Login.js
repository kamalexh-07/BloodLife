const API_BASE_URL = "/api";

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            alert("Please fill in all fields");
            return;
        }

        const submitButton = e.target.querySelector('[type="submit"]');
        submitButton.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Save JWT Token
                localStorage.setItem("userToken", data.token);

                // Save User Name
                localStorage.setItem(
                    "userName",
                    data.firstName || "User"
                );

                alert("Login Successful!");

                
                // Redirect to Home (dashboard remains available via nav after login)
                window.location.href = "/HTML/index.html";
            } else {
                alert(data.message || "Login failed");
            }
        } catch (error) {
            alert("An error occurred during login. Please try again.");
        } finally {
            submitButton.innerHTML = "Sign In";
            submitButton.disabled = false;
        }
    });
}