document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const disclaimer = document.getElementById('disclaimer').checked;

    if (!disclaimer) {
        alert('You must acknowledge the disclaimer to proceed.');
        return;
    }

    // Simple check for demo purposes
    if (username === 'admin' && password === 'password') {
        // Set the authentication status in sessionStorage
        sessionStorage.setItem('isAuthenticated', 'true');
        window.location.href = 'index.html';
    } else {
        alert('Invalid username or password');
    }
});
