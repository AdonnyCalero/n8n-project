// Global variables
let authToken = null;
let currentUser = null;
const API_BASE = 'http://localhost:5000/api';

// Show toast notification
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
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
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update main navigation only (not admin tabs)
    document.querySelectorAll('.navbar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeNavLink = document.querySelector(`.navbar [href="#${sectionId}"]`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
    
    // Load section-specific data
    if (sectionId === 'mis-reservas' && authToken) {
        loadMyReservations();
    } else if (sectionId === 'admin' && authToken) {
        // Solo configurar tabs y cargar dashboard cuando se entra al panel admin
        setupAdminTabs();
        loadDashboard();
        // No cargar otros datos aquí, se cargarán al hacer clic en cada tab
    }
}

// Load user's reservations
async function loadMyReservations() {
    try {
        const response = await fetch(`${API_BASE}/mis-reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const reservations = await response.json();
        
        const container = document.getElementById('myReservations');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (reservations.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No tienes reservas registradas</div>';
            return;
        }
        
        reservations.forEach(reservation => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Reserva #${reservation.id}</h5>
                    <span class="badge bg-${reservation.estado === 'confirmada' ? 'success' : reservation.estado === 'cancelada' ? 'danger' : 'warning'}">
                        ${reservation.estado.charAt(0).toUpperCase() + reservation.estado.slice(1)}
                    </span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Fecha:</strong> ${reservation.fecha}</p>
                            <p><strong>Hora:</strong> ${reservation.hora}</p>
                            <p><strong>Comensales:</strong> ${reservation.numero_comensales}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Mesa:</strong> ${reservation.mesa_numero || 'No asignada'}</p>
                            <p><strong>Zona:</strong> ${reservation.zona_nombre || 'Sin asignar'}</p>
                        </div>
                    </div>
                    ${reservation.observaciones ? `<p><strong>Observaciones:</strong> ${reservation.observaciones}</p>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error cargando reservas:', error);
        showToast('Error al cargar tus reservas', 'error');
    }
}

// Load admin dashboard
async function loadDashboard() {
    try {
        console.log('🔍 Dashboard Debug - Token disponible:', !!authToken);
        console.log('🔍 Dashboard Debug - Token longitud:', authToken ? authToken.length : 0);
        console.log('🔍 Dashboard Debug - API_BASE:', API_BASE);
        
        if (!authToken) {
            console.error('❌ No hay token para el dashboard');
            return;
        }
        
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        
        console.log('📊 Dashboard Debug - Respuesta:', data);
        console.log('🔑 Dashboard Debug - Token actual (primeros 50 chars):', authToken ? authToken.substring(0, 50) + '...' : 'No token');
        
        // Update dashboard stats (accediendo a la estructura correcta)
        document.getElementById('totalReservas').textContent = data.reservas?.total_reservas || 0;
        document.getElementById('reservasHoy').textContent = data.reservas?.reservas_hoy || 0;
        document.getElementById('mesasDisponibles').textContent = data.mesas?.disponibles || 0;
        document.getElementById('totalComensales').textContent = data.reservas?.total_comensales || 0;
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// Load admin reservations
async function loadAdminReservations() {
    try {
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const tbody = document.getElementById('allReservationsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const reservations = Array.isArray(data) ? data : [];
        
        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay reservas registradas</td></tr>';
            return;
        }
        
        console.log('📋 Reservas cargadas:', reservations.length);
        
        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.id}</td>
                <td>${reservation.cliente_nombre || 'N/A'}</td>
                <td>${reservation.email || 'N/A'}</td>
                <td>${reservation.fecha}</td>
                <td>${reservation.hora}</td>
                <td>${reservation.mesa_numero || 'N/A'}</td>
                <td>${reservation.numero_comensales || 'N/A'}</td>
                <td>
                    <span class="badge bg-${reservation.estado === 'confirmada' ? 'success' : reservation.estado === 'cancelada' ? 'danger' : 'warning'}">
                        ${reservation.estado}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editReservation(${reservation.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteReservation(${reservation.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error cargando reservas admin:', error);
        const tbody = document.getElementById('allReservationsTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">❌ Error de conexión con el servidor. Verifica que el backend esté corriendo.</td></tr>';
        }
    }
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    // Hide all nav items first
    document.getElementById('navInicio').style.display = 'block';
    document.getElementById('navLogin').style.display = 'none';
    document.getElementById('navUser').style.display = 'block';
    document.getElementById('navLogout').style.display = 'block';
    
    // Check user role and show appropriate menu items
    if (currentUser && (currentUser.rol === 'admin' || currentUser.role === 'admin' || currentUser.rol === 'administrador' || currentUser.role === 'administrador')) {
        // Admin navigation - solo Admin y Cerrar Sesión
        document.getElementById('navReservar').style.display = 'none';
        document.getElementById('navMenu').style.display = 'none';
        document.getElementById('navMisReservas').style.display = 'none';
        document.getElementById('navAdmin').style.display = 'block';
        document.getElementById('navInicio').style.display = 'none';
    } else if (currentUser) {
        // Customer navigation - todas las opciones de cliente
        document.getElementById('navReservar').style.display = 'block';
        document.getElementById('navMenu').style.display = 'block';
        document.getElementById('navMisReservas').style.display = 'block';
        document.getElementById('navAdmin').style.display = 'none';
        document.getElementById('navInicio').style.display = 'block';
    }
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.nombre || currentUser.name || currentUser.username || 'Usuario';
    }
}

// Setup admin tabs with proper isolation
function setupAdminTabs() {
    console.log('⚙️ Configurando tabs del panel administrador...');
    
    // Dashboard tab
    const dashboardTab = document.querySelector('[href="#dashboardTab"]');
    if (dashboardTab) {
        dashboardTab.addEventListener('shown.bs.tab', function() {
            console.log('📊 Dashboard tab activado');
            loadDashboard();
        });
    }
    
    // Reservas tab
    const reservasTab = document.querySelector('[href="#reservasTab"]');
    if (reservasTab) {
        reservasTab.addEventListener('shown.bs.tab', function() {
            console.log('📅 Reservas tab activado');
            loadAdminReservations();
        });
    }
    
    // Mesas tab
    const mesasTab = document.querySelector('[href="#mesasTab"]');
    if (mesasTab) {
        mesasTab.addEventListener('shown.bs.tab', function() {
            console.log('🪑 Mesas tab activado');
            console.log('🔍 Diagnosticando funciones disponibles:');
            console.log('  - loadInteractiveWithRealData:', typeof loadInteractiveWithRealData);
            console.log('  - window.loadInteractiveWithRealData:', typeof window.loadInteractiveWithRealData);
            console.log('  - loadTablesManagement:', typeof loadTablesManagement);
            
            // Inyectar estilos nuevos primero
            if (typeof injectNewTableStyles === 'function') {
                injectNewTableStyles();
            }
            
            // Priorizar la visualización interactiva
            if (typeof window.loadInteractiveWithRealData === 'function') {
                console.log('🔄 Usando window.loadInteractiveWithRealData() - visualización interactiva con grid');
                window.loadInteractiveWithRealData();
            } else if (typeof loadInteractiveWithRealData === 'function') {
                console.log('🔄 Usando loadInteractiveWithRealData() - visualización interactiva con grid');
                loadInteractiveWithRealData();
            } else if (typeof loadTablesManagement === 'function') {
                console.log('🔄 Usando loadTablesManagement() - tabla simple como fallback');
                loadTablesManagement();
            } else {
                console.log('❌ No se encontraron funciones para cargar mesas');
            }
        });
    }
    
    // Menú tab
    const menuTab = document.querySelector('[href="#menuTab"]');
    if (menuTab) {
        menuTab.addEventListener('shown.bs.tab', function() {
            console.log('🍽️ Menú tab activado');
            if (typeof loadMenuManagement === 'function') {
                loadMenuManagement();
            }
        });
    }
}

// Login function
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/login`, {
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
            if (currentUser.rol === 'admin' || currentUser.role === 'admin' || currentUser.rol === 'administrador' || currentUser.role === 'administrador') {
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
    
    // Reset navigation to initial state
    document.getElementById('navInicio').style.display = 'block';
    document.getElementById('navReservar').style.display = 'none';
    document.getElementById('navMenu').style.display = 'none';
    document.getElementById('navMisReservas').style.display = 'none';
    document.getElementById('navLogin').style.display = 'block';
    document.getElementById('navUser').style.display = 'none';
    document.getElementById('navAdmin').style.display = 'none';
    document.getElementById('navLogout').style.display = 'none';
    
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