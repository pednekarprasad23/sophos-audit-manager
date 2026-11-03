document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');
    const submitButton = this.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';
    submitButton.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.assign('/dashboard');
            return;
        }

        errorDiv.textContent = data.error || 'Invalid credentials. Please try again.';
        errorDiv.style.display = 'block';
        document.getElementById('password').value = '';
    } catch (error) {
        errorDiv.textContent = 'Network error. Please check your connection.';
        errorDiv.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});

const button = document.querySelector('.btn');
button.addEventListener('mousemove', function (event) {
    const rect = this.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.style.background = `linear-gradient(90deg, hsl(${x * 0.36}, 100%, 50%), hsl(${y * 0.36}, 100%, 50%))`;
});
button.addEventListener('mouseleave', function () {
    this.style.background = 'linear-gradient(90deg, #00d4ff 0%, #00ff88 100%)';
});
