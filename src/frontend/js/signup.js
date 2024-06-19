document.addEventListener("DOMContentLoaded", async function () {
  const signUpForm = document.getElementById("signupForm");
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const masterInput = document.getElementById("masterPassword");

  async function checkSession() {
    try {
      const response = await fetch("/auth/session");

      if (!response.ok) {
        throw new Error("Failed to check session status");
      }

      const data = await response.json();

      if (data.isAuthenticated) {
        window.location.href = "login.html";
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  }
  async function signup(event) {
    event.preventDefault();

    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const master = masterInput.value;

    // if (username === "" || email === "" || password === "" || confirmPassword === "" || master === "") {
    //   window.alert("Please fill in all fields");
    //   return;
    // }

    if (password !== confirmPassword) {
      confirmPasswordInput.style.borderColor = "red";
    }

    try {
      const response = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, master }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error);
      } else {
        window.location.href = "login.html";
      }

      await checkSession();
    } catch (error) {
      if (error.message.includes("username")) {
        usernameInput.style.borderColor = "red";
      }
      if (error.message.includes("email")) {
        emailInput.style.borderColor = "red";
      }
      if (error.message.includes("password")) {
        passwordInput.style.borderColor = "red";
      }
      if (error.message.includes("master")) {
        masterInput.style.borderColor = "red";
      }
    }
  }

  signUpForm.addEventListener("submit", signup);
  await checkSession();
});
