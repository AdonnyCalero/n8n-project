// Global variables
let authToken = null;
let currentUser = null;
const API_BASE = 'http://localhost:5000/api';

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Section management
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('[id$="Section"], .page-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId + 'Section') || 
                          document.getElementById(sectionId) ||
                          document.querySelector(`[data-section="${sectionId}"]`);
    
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeNavLink = document.querySelector(`[href="#${sectionId}"], [data-target="${sectionId}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    const loginLinks = document.querySelectorAll('.login-only');
    const userLinks = document.querySelectorAll('.user-only');
    
    loginLinks.forEach(el => el.style.display = 'none');
    userLinks.forEach(el => el.style.display = 'block');
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.name || currentUser.username || 'Usuario';
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            updateUIForAuthenticatedUser();
            showToast('Inicio de sesión exitoso', 'success');
            
            // Redirect based on role
            if (currentUser.role === 'admin') {
                showSection('admin');
            } else {
                showSection('inicio');
            }
            
            return true;
        } else {
            const errorData = await response.json();
            showToast(errorData.error || 'Error en el inicio de sesión', 'error');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Error de conexión', 'error');
        return false;
    }
}

// Logout function
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    const loginLinks = document.querySelectorAll('.login-only');
    const userLinks = document.querySelectorAll('.user-only');
    
    loginLinks.forEach(el => el.style.display = 'block');
    userLinks.forEach(el => el.style.display = 'none');
    
    showToast('Sesión cerrada', 'info');
    showSection('inicio');
}

// Table Management Functions - VERSIÓN LIMPIA
async function loadTablesManagement() {
    console.log('⚠️ loadTablesManagement() desactivado - usando sistema interactivo en index.html');
    // Esta función ha sido reemplazada por el sistema interactivo
    return;
}

function getNextStatus(currentStatus) {
    switch(currentStatus) {
        case 'disponible': return 'ocupada';
        case 'ocupada': return 'reservada';
        case 'reservada': return 'disponible';
        case 'mantenimiento': return 'disponible';
        default: return 'disponible';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateUIForAuthenticatedUser();
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            login(email, password);
        });
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const reservaFecha = document.getElementById('reservaFecha');
    if (reservaFecha) {
        reservaFecha.setAttribute('min', today);
    }
});

// Make functions globally available
window.showSection = showSection;
window.showToast = showToast;
window.login = login;
window.logout = logout;
window.loadTablesManagement = loadTablesManagement;