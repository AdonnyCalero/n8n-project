// JavaScript para Bootstrap Frontend
// Variables globales
let currentUser = null;
let authToken = null;
let selectedTable = null;
let currentUserRole = null;

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Utilidades
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    // Cargar datos específicos de cada sección
    switch(sectionId) {
        case 'menu':
            loadMenu();
            break;
        case 'mis-reservas':
            if (authToken) loadMyReservations();
            break;
        case 'admin':
            if (authToken && currentUser?.rol === 'administrador') {
                loadDashboard();
            }
            break;
        case 'reservas':
            loadZonas();
            break;
    }
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toastEl.className = `toast bg-${type} text-white`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Selección de rol
function selectRole(role) {
    currentUserRole = role;
    if (role === 'cliente') {
        showSection('clientLogin');
    } else if (role === 'administrador') {
        showSection('adminLogin');
    }
}

// Autenticación de administrador con mejor UX
async function adminLogin(email, password) {
    // Mostrar spinner y ocultar mensaje de error
    showAdminLoginLoading(true);
    hideAdminMessage();
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.user.rol === 'administrador') {
                authToken = data.token;
                currentUser = data.user;
                currentUserRole = 'administrador';
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                localStorage.setItem('userRole', currentUserRole);
                updateUIForAuthenticatedUser();
                
                // Ocultar spinner y mostrar éxito
                showAdminLoginLoading(false);
                showAdminMessage('Bienvenido Administrador', 'success');
                
                setTimeout(() => {
                    showSection('admin');
                }, 1000);
            } else {
                showAdminLoginLoading(false);
                showAdminMessage('Este usuario no tiene rol de administrador', 'danger');
            }
        } else {
            showAdminLoginLoading(false);
            showAdminMessage(data.error || 'Error de autenticación', 'danger');
        }
    } catch (error) {
        showAdminLoginLoading(false);
        showAdminMessage('Error de conexión. Intente nuevamente.', 'danger');
    }
}

// Mostrar/ocultar spinner de login admin
function showAdminLoginLoading(show) {
    const spinner = document.getElementById('adminLoginSpinner');
    const loginText = document.getElementById('adminLoginText');
    const btn = document.getElementById('adminLoginBtn');
    
    if (show) {
        spinner.style.display = 'inline-block';
        loginText.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Iniciando sesión...';
        btn.disabled = true;
        btn.innerHTML = '';
    } else {
        spinner.style.display = 'none';
        loginText.innerHTML = '<i class="bi bi-shield-check me-2"></i> Iniciar Sesión Administrador';
        btn.disabled = false;
        btn.innerHTML = '';
    }
}

// Mostrar mensajes de error/éxito en login admin
function showAdminMessage(message, type = 'error') {
    const messageDiv = document.getElementById('adminMessage');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // Ocultar automáticamente después de 3 segundos para errores y 5 para éxitos
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, type === 'error' ? 3000 : 5000);
}

// Ocultar mensaje de error/éxito
function hideAdminMessage() {
    const messageDiv = document.getElementById('adminMessage');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}
            } else {
                showToast(registerData.error || 'Error al registrar', 'danger');
            }
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

// Autenticación de administrador con mejor UX
async function adminLogin(email, password) {
    // Mostrar spinner y ocultar mensaje de error
    showAdminLoginLoading(true);
    hideAdminMessage();
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.user.rol === 'administrador') {
                authToken = data.token;
                currentUser = data.user;
                currentUserRole = 'administrador';
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                localStorage.setItem('userRole', currentUserRole);
                updateUIForAuthenticatedUser();
                
                // Ocultar spinner y mostrar éxito
                showAdminLoginLoading(false);
                showAdminMessage('Bienvenido Administrador', 'success');
                
                setTimeout(() => {
                    showSection('admin');
                }, 1000);
            } else {
                showAdminLoginLoading(false);
                showAdminMessage('Este usuario no tiene rol de administrador', 'danger');
            }
        } else {
            showAdminLoginLoading(false);
            showAdminMessage(data.error || 'Error de autenticación', 'danger');
        }
    } catch (error) {
        showAdminLoginLoading(false);
        showAdminMessage('Error de conexión. Intente nuevamente.', 'danger');
    }
}

// Autenticación legacy (mantener para compatibilidad)
async function login(email, password) {
    return await clientLogin(email, password, '');
}

async function register(nombre, email, password, telefono) {
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, password, telefono })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Usuario registrado exitosamente', 'success');
            // Cambiar a la pestaña de login
            const loginTab = new bootstrap.Tab(document.getElementById('loginTab'));
            loginTab.show();
        } else {
            showToast(data.error || 'Error al registrar', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForUnauthenticatedUser();
    showToast('Sesión cerrada', 'info');
    showSection('inicio');
}

function updateUIForAuthenticatedUser() {
    document.getElementById('loginNav').style.display = 'none';
    
    if (currentUser.rol === 'administrador') {
        document.getElementById('adminNav').style.display = 'block';
    }
    
    // Agregar enlace de logout
    const navbarNav = document.getElementById('navbarNav');
    const logoutLi = document.createElement('li');
    logoutLi.className = 'nav-item';
    logoutLi.innerHTML = '<a class="nav-link" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Cerrar Sesión</a>';
    navbarNav.querySelector('.navbar-nav').appendChild(logoutLi);
    
    // Mostrar secciones según rol
    if (currentUserRole === 'cliente') {
        showSection('inicio');
    } else if (currentUserRole === 'administrador') {
        showSection('admin');
    }
}

function updateUIForUnauthenticatedUser() {
    document.getElementById('loginNav').style.display = 'block';
    document.getElementById('adminNav').style.display = 'none';
    
    // Remover enlace de logout si existe
    const logoutLink = document.querySelector('a[onclick="logout()"]');
    if (logoutLink) logoutLink.closest('.nav-item').remove();
}

// Reservas
async function loadZonas() {
    try {
        const response = await fetch(`${API_BASE}/zonas`);
        const zonas = await response.json();
        
        const select = document.getElementById('reservaZona');
        select.innerHTML = '<option value="">Cualquier zona</option>';
        
        zonas.forEach(zona => {
            const option = document.createElement('option');
            option.value = zona.id;
            option.textContent = zona.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        showToast('Error al cargar zonas', 'danger');
    }
}

async function checkAvailability() {
    const fecha = document.getElementById('reservaFecha').value;
    const hora = document.getElementById('reservaHora').value;
    const comensales = document.getElementById('reservaComensales').value;
    const idZona = document.getElementById('reservaZona').value;
    
    if (!fecha || !hora) {
        showToast('Por favor seleccione fecha y hora', 'warning');
        return;
    }
    
    try {
        const params = new URLSearchParams({
            fecha,
            hora,
            comensales,
            ...(idZona && { id_zona: idZona })
        });
        
        const response = await fetch(`${API_BASE}/disponibilidad?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            displayAvailableTables(data.mesas_disponibles);
        } else {
            showToast(data.error || 'Error al verificar disponibilidad', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

function displayAvailableTables(tables) {
    const container = document.getElementById('availableTables');
    const tablesList = document.getElementById('tablesList');
    
    tablesList.innerHTML = '';
    
    if (tables.length === 0) {
        tablesList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    No hay mesas disponibles para la fecha y hora seleccionadas
                </div>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    tables.forEach(table => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';
        
        const card = document.createElement('div');
        card.className = 'card table-card';
        card.innerHTML = `
            <div class="card-body text-center">
                <h5 class="card-title">Mesa ${table.numero}</h5>
                <p class="card-text">
                    <i class="bi bi-people"></i> ${table.capacidad} personas<br>
                    <small class="text-muted">${table.zona_nombre || 'Sin zona'}</small>
                </p>
            </div>
        `;
        
        card.onclick = () => selectTable(table);
        col.appendChild(card);
        tablesList.appendChild(col);
    });
    
    container.style.display = 'block';
}

function selectTable(table) {
    selectedTable = table;
    
    // Actualizar UI
    document.querySelectorAll('.table-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Mostrar mesa seleccionada
    const selectedInfo = document.getElementById('selectedTableInfo');
    selectedInfo.textContent = `Mesa ${table.numero} - ${table.capacidad} personas`;
    document.getElementById('selectedTable').style.display = 'block';
    document.getElementById('submitReservation').style.display = 'block';
}

async function createReservation() {
    if (!authToken) {
        showToast('Debe iniciar sesión para hacer una reserva', 'warning');
        showSection('login');
        return;
    }
    
    if (!selectedTable) {
        showToast('Por favor seleccione una mesa', 'warning');
        return;
    }
    
    const reservationData = {
        id_mesa: selectedTable.id,
        fecha: document.getElementById('reservaFecha').value,
        hora: document.getElementById('reservaHora').value,
        numero_comensales: document.getElementById('reservaComensales').value,
        observaciones: document.getElementById('reservaObservaciones').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/reservas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(reservationData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Reserva creada exitosamente', 'success');
            // Limpiar formulario
            document.getElementById('reservationForm').reset();
            document.getElementById('availableTables').style.display = 'none';
            document.getElementById('selectedTable').style.display = 'none';
            document.getElementById('submitReservation').style.display = 'none';
            selectedTable = null;
            
            // Redirigir a mis reservas
            showSection('mis-reservas');
        } else {
            showToast(data.error || 'Error al crear reserva', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

// Menú
async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        const menuItems = await response.json();
        
        const container = document.getElementById('menuItems');
        container.innerHTML = '';
        
        menuItems.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            
            const card = document.createElement('div');
            card.className = 'card menu-card';
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${item.nombre}</h5>
                    <p class="card-text">${item.descripcion || 'Sin descripción'}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-primary price-badge">$${item.precio}</span>
                        <span class="badge bg-success stock-badge">Stock: ${item.stock_disponible}</span>
                    </div>
                </div>
            `;
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (error) {
        showToast('Error al cargar el menú', 'danger');
    }
}

// Reservas del usuario
async function loadMyReservations() {
    try {
        const response = await fetch(`${API_BASE}/mis-reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const reservations = await response.json();
        
        const container = document.getElementById('myReservations');
        container.innerHTML = '';
        
        if (reservations.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No tienes reservas registradas</div>';
            return;
        }
        
        reservations.forEach(reservation => {
            const card = document.createElement('div');
            card.className = 'card reservation-card mb-3';
            card.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h5 class="card-title mb-1">
                                <i class="bi bi-calendar-check"></i> ${reservation.fecha} ${reservation.hora}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Mesa:</strong> ${reservation.mesa_numero} (${reservation.zona_nombre || 'Sin zona'})
                            </p>
                            <p class="card-text mb-0">
                                <strong>Comensales:</strong> ${reservation.numero_comensales} | 
                                <strong>Observaciones:</strong> ${reservation.observaciones || 'Ninguna'}
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge status-${reservation.estado}">
                                ${reservation.estado.charAt(0).toUpperCase() + reservation.estado.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        showToast('Error al cargar reservas', 'danger');
    }
}

// Dashboard administrador
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalReservas').textContent = data.reservas.total_reservas;
            document.getElementById('reservasHoy').textContent = data.reservas.reservas_hoy;
            document.getElementById('mesasDisponibles').textContent = data.mesas.disponibles;
            document.getElementById('totalComensales').textContent = data.reservas.total_comensales;
        }
        
        // Cargar todas las reservas
        await loadAllReservations();
    } catch (error) {
        showToast('Error al cargar dashboard', 'danger');
    }
}

async function loadAllReservations() {
    try {
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const reservations = await response.json();
        
        const tbody = document.getElementById('allReservationsTable');
        tbody.innerHTML = '';
        
        reservations.forEach(reservation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.id}</td>
                <td>${reservation.cliente_nombre}</td>
                <td>${reservation.email}</td>
                <td>${reservation.fecha}</td>
                <td>${reservation.hora}</td>
                <td>${reservation.mesa_numero}</td>
                <td>${reservation.numero_comensales}</td>
                <td><span class="badge status-${reservation.estado}">${reservation.estado}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showToast('Error al cargar reservas', 'danger');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay sesión activa
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('userRole');
    
    if (savedToken && savedUser && savedRole) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        currentUserRole = savedRole;
        updateUIForAuthenticatedUser();
        
        // Mostrar sección correspondiente según rol
        if (currentUserRole === 'cliente') {
            showSection('inicio');
        } else if (currentUserRole === 'administrador') {
            showSection('admin');
        }
    } else {
        showSection('roleSelection');
    }
    
    // Formularios de login
    document.getElementById('clientLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('clientLoginEmail').value;
        const password = document.getElementById('clientLoginPassword').value;
        const name = document.getElementById('clientLoginName').value;
        clientLogin(email, password, name);
    });
    
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('adminLoginEmail').value;
        const password = document.getElementById('adminLoginPassword').value;
        adminLogin(email, password);
    });
    
    // Formulario de reserva (solo para clientes)
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createReservation();
        });
        
        // Establecer fecha mínima como hoy
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reservaFecha').setAttribute('min', today);
    }
});