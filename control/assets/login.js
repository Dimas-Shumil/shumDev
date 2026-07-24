(() => {
    const form = document.querySelector("#login-form");
    const error = document.querySelector("#login-error");
    const toggle = document.querySelector("#toggle-password");
    const password = document.querySelector("#password");

    toggle.addEventListener("click", () => {
        const visible = password.type === "text";
        password.type = visible ? "password" : "text";
        toggle.innerHTML = `<i class="ti ti-${visible ? "eye" : "eye-off"}"></i>`;
        toggle.setAttribute("aria-label", visible ? "Показать пароль" : "Скрыть пароль");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        error.hidden = true;
        const button = form.querySelector("button[type=submit]");
        button.disabled = true;
        button.classList.add("is-loading");
        try {
            const payload = Object.fromEntries(new FormData(form));
            const response = await fetch("/api/control/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Не удалось войти");
            window.location.replace("/control/app.html");
        } catch (requestError) {
            error.textContent = requestError.message;
            error.hidden = false;
        } finally {
            button.disabled = false;
            button.classList.remove("is-loading");
        }
    });
})();
