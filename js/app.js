// Variables globales
let currentUser = null;
let authToken = null;
let selectedTable = null;

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

function switchTab(tab) {
    const forms = document.querySelectorAll('.auth-form');
    const tabs = document.querySelectorAll('.auth-tabs .tab-btn');
    
    forms.forEach(form => form.style.display = 'none');
    tabs.forEach(t => t.classList.remove('active'));
    
    document.getElementById(tab + 'Form').style.display = 'block';
    event.target.classList.add('active');
}

function showAdminTab(tab) {
    const contents = document.querySelectorAll('.admin-content');
    const tabs = document.querySelectorAll('.admin-tabs .tab-btn');
    
    contents.forEach(content => content.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar datos específicos del tab
    switch(tab) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'reservas':
            loadAllReservations();
            break;
        case 'mesas':
            loadTablesManagement();
            break;
        case 'menu':
            loadMenuManagement();
            break;
    }
}

// Autenticación
async function login(email, password) {
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
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUIForAuthenticatedUser();
            showSection('inicio');
            showAlert('Bienvenido ' + currentUser.nombre, 'success');
        } else {
            showAlert(data.error || 'Error de autenticación', 'error');
        }
    } catch (error) {
        showAlert('Error de conexión', 'error');
    }
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
            showAlert('Usuario registrado exitosamente', 'success');
            switchTab('login');
        } else {
            showAlert(data.error || 'Error al registrar', 'error');
        }
    } catch (error) {
        showAlert('Error de conexión', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForUnauthenticatedUser();
    showSection('inicio');
    showAlert('Sesión cerrada', 'info');
}

function updateUIForAuthenticatedUser() {
    document.getElementById('loginLink').style.display = 'none';
    
    if (currentUser.rol === 'administrador') {
        document.getElementById('adminLink').style.display = 'block';
    }
    
    // Actualizar navegación
    const navLinks = document.querySelector('.nav-links');
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.innerHTML = `<i class="fas fa-sign-out-alt"></i> Cerrar Sesión`;
    logoutLink.onclick = logout;
    navLinks.appendChild(logoutLink);
}

function updateUIForUnauthenticatedUser() {
    document.getElementById('loginLink').style.display = 'block';
    document.getElementById('adminLink').style.display = 'none';
    
    // Remover enlace de logout si existe
    const logoutLink = document.querySelector('.nav-links a[href="#"]');
    if (logoutLink) logoutLink.remove();
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
        showAlert('Error al cargar zonas', 'error');
    }
}

async function checkAvailability() {
    const fecha = document.getElementById('reservaFecha').value;
    const hora = document.getElementById('reservaHora').value;
    const comensales = document.getElementById('reservaComensales').value;
    const idZona = document.getElementById('reservaZona').value;
    
    if (!fecha || !hora) {
        showAlert('Por favor seleccione fecha y hora', 'error');
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
            showAlert(data.error || 'Error al verificar disponibilidad', 'error');
        }
    } catch (error) {
        showAlert('Error de conexión', 'error');
    }
}

function displayAvailableTables(tables) {
    const container = document.getElementById('availableTables');
    const tablesList = document.getElementById('tablesList');
    
    tablesList.innerHTML = '';
    
    if (tables.length === 0) {
        tablesList.innerHTML = '<p>No hay mesas disponibles para la fecha y hora seleccionadas</p>';
        container.style.display = 'block';
        return;
    }
    
    tables.forEach(table => {
        const card = document.createElement('div');
        card.className = 'table-card';
        card.innerHTML = `
            <h4>Mesa ${table.numero}</h4>
            <p>Capacidad: ${table.capacidad} personas</p>
            <p>Zona: ${table.zona_nombre || 'Sin zona'}</p>
        `;
        
        card.onclick = () => selectTable(table);
        tablesList.appendChild(card);
    });
    
    container.style.display = 'block';
}

function selectTable(table) {
    selectedTable = table;
    
    // Actualizar UI
    document.querySelectorAll('.table-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.table-card').classList.add('selected');
    
    // Mostrar mesa seleccionada
    const selectedInfo = document.getElementById('selectedTableInfo');
    selectedInfo.textContent = `Mesa ${table.numero} - ${table.capacidad} personas`;
    document.getElementById('selectedTable').style.display = 'block';
    document.getElementById('submitReservation').style.display = 'block';
}

async function createReservation() {
    if (!authToken) {
        showAlert('Debe iniciar sesión para hacer una reserva', 'error');
        showSection('login');
        return;
    }
    
    if (!selectedTable) {
        showAlert('Por favor seleccione una mesa', 'error');
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
            showAlert('Reserva creada exitosamente', 'success');
            document.getElementById('reservationForm').reset();
            document.getElementById('availableTables').style.display = 'none';
            document.getElementById('selectedTable').style.display = 'none';
            document.getElementById('submitReservation').style.display = 'none';
            selectedTable = null;
            showSection('mis-reservas');
        } else {
            showAlert(data.error || 'Error al crear reserva', 'error');
        }
    } catch (error) {
        showAlert('Error de conexión', 'error');
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
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.innerHTML = `
                <div class="menu-item-image">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="menu-item-content">
                    <h3>${item.nombre}</h3>
                    <p>${item.descripcion || ''}</p>
                    <div class="menu-item-price">$${item.precio}</div>
                    <div class="menu-item-stock">Stock: ${item.stock_disponible}</div>
                </div>
            `;
            container.appendChild(menuItem);
        });
    } catch (error) {
        showAlert('Error al cargar el menú', 'error');
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
            container.innerHTML = '<p>No tienes reservas registradas</p>';
            return;
        }
        
        reservations.forEach(reservation => {
            const card = document.createElement('div');
            card.className = 'reservation-card';
            card.innerHTML = `
                <div class="reservation-header">
                    <div class="reservation-date">
                        <i class="fas fa-calendar"></i> ${reservation.fecha} ${reservation.hora}
                    </div>
                    <span class="reservation-status status-${reservation.estado}">
                        ${reservation.estado.charAt(0).toUpperCase() + reservation.estado.slice(1)}
                    </span>
                </div>
                <p><strong>Mesa:</strong> ${reservation.mesa_numero} (${reservation.zona_nombre || 'Sin zona'})</p>
                <p><strong>Comensales:</strong> ${reservation.numero_comensales}</p>
                <p><strong>Observaciones:</strong> ${reservation.observaciones || 'Ninguna'}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        showAlert('Error al cargar reservas', 'error');
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
    } catch (error) {
        showAlert('Error al cargar dashboard', 'error');
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
        
        const container = document.getElementById('allReservations');
        
        if (reservations.length === 0) {
            container.innerHTML = '<p>No hay reservas registradas</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Mesa</th>
                    <th>Comensales</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
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
                <td><span class="reservation-status status-${reservation.estado}">${reservation.estado}</span></td>
            `;
            tbody.appendChild(row);
        });
        
        container.innerHTML = '';
        container.appendChild(table);
    } catch (error) {
        showAlert('Error al cargar reservas', 'error');
    }
}

// Utilidades de UI
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Colores según tipo
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    alert.style.background = colors[type] || colors.info;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay sesión activa
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateUIForAuthenticatedUser();
    }
    
    // Formularios de autenticación
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });
    
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const telefono = document.getElementById('registerPhone').value;
        register(nombre, email, password, telefono);
    });
    
    // Formulario de reserva
    document.getElementById('reservationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createReservation();
    });
    
    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservaFecha').setAttribute('min', today);
});

// Animaciones CSS adicionales
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100px); }
    }
    
    .alert {
        max-width: 400px;
        word-wrap: break-word;
    }
`;
document.head.appendChild(style);