document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Simple check for demo purposes
    if (username === 'admin' && password === 'password') {
        // Set the authentication status in sessionStorage
        sessionStorage.setItem('isAuthenticated', 'true');
        window.location.href = 'index.html';
    } else {
        alert('Invalid username or password');
    }
});
