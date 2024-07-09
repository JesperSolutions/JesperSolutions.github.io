// Function to check if the user is authenticated
function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');

    // If the user is not authenticated, redirect to the login page
    if (!isAuthenticated) {
        window.location.href = 'login.html';
    }
}

// Call the checkAuthentication function on page load
window.addEventListener('load', checkAuthentication);
