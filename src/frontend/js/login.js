document.addEventListener("DOMContentLoaded", async function () {
  const loginForm = document.getElementById("loginForm");
  const masterPasswordForm = document.getElementById("masterPasswordForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const masterPasswordInput = document.getElementById("masterPassword");
  const masterForm = document.getElementById("masterPasswordForm");

  async function checkSession() {
    try {
      const response = await fetch("/auth/session");

      if (!response.ok) {
        throw new Error("Failed to check session status");
      }

      const data = await response.json();

      if (data.isAuthenticated) {
        loginForm.style.display = "none";
        masterPasswordForm.style.display = "block";
      } else {
        loginForm.style.display = "block";
        masterPasswordForm.style.display = "none";
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  }

  async function login(event) {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      } else {
        // window.location.href = "";
      }

      await checkSession();
    } catch (error) {
      if (error.message.includes("User")) {
        usernameInput.style.borderColor = "red";
      } else {
        usernameInput.style.borderColor = "green";
      }
      if (error.message.includes("password")) {
        passwordInput.style.borderColor = "red";
      } else {
        passwordInput.style.borderColor = "green";
      }
    }
  }
  async function loginMaster(event) {
    event.preventDefault();

    const master = masterPasswordInput.value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ master }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      } else {
        // window.location.href = "";
      }

      await checkSession();
    } catch (error) {
      if (error.message.includes("Credentials")) {
        masterPasswordInput.style.borderColor = "red";
      }
    }
  }
  loginForm.addEventListener("submit", login);
  masterForm.addEventListener("submit", loginMaster);
  await checkSession();
});
