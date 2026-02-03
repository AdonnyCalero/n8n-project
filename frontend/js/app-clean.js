// Global variables
let authToken = null;
let currentUser = null;
const API_BASE = window.location.origin + '/api';

// Variables globales para gestión de pre-pedidos
let selectedTableForReservation = null;
let menuItemsForPreorder = [];

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

// Toggle pre-pedidos section
function togglePreorders() {
    const checkbox = document.getElementById('enablePreorders');
    const section = document.getElementById('preordersSection');
    
    if (checkbox.checked) {
        section.style.display = 'block';
        loadMenuItemsForPreorder();
    } else {
        section.style.display = 'none';
    }
}

// Load menu items for pre-pedido
async function loadMenuItemsForPreorder() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        const menuItems = await response.json();
        menuItemsForPreorder = menuItems;
        
        const container = document.getElementById('menuItemsForPreorder');
        container.innerHTML = '';
        
        menuItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'col-md-6 col-lg-4';
            card.innerHTML = `
                <div class="card h-100">
                    <div class="card-body">
                        <span class="badge bg-info mb-2">${item.categoria || 'Sin categoría'}</span>
                        <h6 class="card-title">${item.nombre}</h6>
                        <p class="card-text">
                            <small class="text-muted">ID: ${item.id}</small><br>
                            <strong class="text-success">Precio: $${parseFloat(item.precio || 0).toFixed(2)}</strong><br>
                            <span class="badge ${item.stock_disponible > 0 ? 'bg-success' : 'bg-danger'}">
                                Stock: ${item.stock_disponible}
                            </span>
                        </p>
                        <div class="input-group">
                            <input type="number" 
                                   class="form-control preorder-quantity" 
                                   id="preorder_${item.id}" 
                                   min="0" 
                                   max="${item.stock_disponible}" 
                                   placeholder="Cantidad"
                                   onchange="updatePreorderTotal()">
                            <span class="input-group-text">unidades</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar menú para pre-pedido:', error);
        showToast('Error al cargar menú', 'error');
    }
}

// Update pre-pedido total
function updatePreorderTotal() {
    const inputs = document.querySelectorAll('.preorder-quantity');
    let total = 0;
    let totalItems = 0;
    
    inputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        const platoId = parseInt(input.id.replace('preorder_', ''));
        const plato = menuItemsForPreorder.find(p => p.id === platoId);
        
        if (plato && quantity > 0) {
            total += quantity * plato.precio;
            totalItems += quantity;
        }
    });
    
    // Actualizar resumen si existe
    const summaryDiv = document.getElementById('preorderSummary');
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <strong>Resumen del Pre-pedido:</strong><br>
            • ${totalItems} platos seleccionados<br>
            • Total estimado: $${total.toFixed(2)}
        `;
    }
}

// Get selected pre-pedidos
function getSelectedPreorders() {
    const inputs = document.querySelectorAll('.preorder-quantity');
    const preorders = [];
    
    inputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            const platoId = parseInt(input.id.replace('preorder_', ''));
            preorders.push({
                id_plato: platoId,
                cantidad: quantity
            });
        }
    });
    
    return preorders;
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

// Load zones
async function loadZones() {
    try {
        const response = await fetch(`${API_BASE}/zonas`);
        const zones = await response.json();
        
        const zonaSelect = document.getElementById('reservaZona');
        if (zonaSelect) {
            zonaSelect.innerHTML = '<option value="">Cualquier zona</option>';
            zones.forEach(zona => {
                const option = document.createElement('option');
                option.value = zona.id;
                option.textContent = zona.nombre;
                zonaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar zonas:', error);
    }
}

// Check availability
async function checkAvailability() {
    try {
        const fecha = document.getElementById('reservaFecha').value;
        const hora = document.getElementById('reservaHora').value;
        const comensales = parseInt(document.getElementById('reservaComensales').value);
        const id_zona = document.getElementById('reservaZona').value || null;
        
        if (!fecha || !hora) {
            showToast('Por selecciona fecha y hora', 'error');
            return;
        }
        
        const params = new URLSearchParams({
            fecha,
            hora,
            comensales,
            ...(id_zona && { id_zona })
        });
        
        const response = await fetch(`${API_BASE}/disponibilidad?${params}`);
        const data = await response.json();
        
        const availableTablesDiv = document.getElementById('availableTables');
        const tablesListDiv = document.getElementById('tablesList');
        
        if (data.mesas_disponibles && data.mesas_disponibles.length > 0) {
            tablesListDiv.innerHTML = '';
            
            data.mesas_disponibles.forEach(table => {
                const col = document.createElement('div');
                col.className = 'col-md-4';
                col.innerHTML = `
                    <div class="card">
                        <div class="card-body text-center">
                            <h5>Mesa ${table.numero}</h5>
                            <p>Capacidad: ${table.capacidad} personas</p>
                            <button class="btn btn-primary" onclick="selectTable(${table.id}, ${table.numero}, ${table.capacidad}, '${table.zona_nombre || ''}')">
                                Seleccionar
                            </button>
                        </div>
                    </div>
                `;
                tablesListDiv.appendChild(col);
            });
            
            availableTablesDiv.style.display = 'block';
        } else {
            availableTablesDiv.style.display = 'block';
            tablesListDiv.innerHTML = '<div class="alert alert-warning">No hay mesas disponibles para los parámetros seleccionados</div>';
        }
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        showToast('Error al verificar disponibilidad', 'error');
    }
}

// Select table
function selectTable(id, numero, capacidad, zonaNombre) {
    selectedTableForReservation = { id, numero, capacidad, zonaNombre };
    
    const selectedTableDiv = document.getElementById('selectedTable');
    const selectedTableInfo = document.getElementById('selectedTableInfo');
    
    selectedTableInfo.textContent = `Mesa ${numero} (${capacidad} personas${zonaNombre ? ' - ' + zonaNombre : ''})`;
    selectedTableDiv.style.display = 'block';
    
    showToast(`Mesa ${numero} seleccionada`, 'success');
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
    
    // Load zones
    loadZones();
    
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
    
    // Reservation form handler
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!authToken) {
                showToast('Debes iniciar sesión para hacer una reserva', 'error');
                showSection('login');
                return;
            }
            
            if (!selectedTableForReservation) {
                showToast('Por favor selecciona una mesa', 'error');
                return;
            }
            
            const data = {
                id_mesa: selectedTableForReservation.id,
                fecha: document.getElementById('reservaFecha').value,
                hora: document.getElementById('reservaHora').value,
                numero_comensales: parseInt(document.getElementById('reservaComensales').value),
                observaciones: document.getElementById('reservaObservaciones').value
            };
            
            // Agregar pre-pedidos si están habilitados
            const enablePreorders = document.getElementById('enablePreorders');
            if (enablePreorders && enablePreorders.checked) {
                data.preorders = getSelectedPreorders();
            }
            
            try {
                const response = await fetch(`${API_BASE}/reservas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    showToast('Reserva creada exitosamente', 'success');
                    
                    // Limpiar formulario
                    reservationForm.reset();
                    selectedTableForReservation = null;
                    document.getElementById('selectedTable').style.display = 'none';
                    document.getElementById('availableTables').style.display = 'none';
                    
                    // Limpiar pre-pedidos
                    if (enablePreorders) {
                        enablePreorders.checked = false;
                        document.getElementById('preordersSection').style.display = 'none';
                    }
                    
                    // Ir a mis reservas
                    showSection('mis-reservas');
                } else {
                    const error = await response.json();
                    showToast(error.error || 'Error al crear reserva', 'error');
                }
            } catch (error) {
                console.error('Error al crear reserva:', error);
                showToast('Error de conexión', 'error');
            }
        });
    }
});

// Make functions globally available
window.showSection = showSection;
window.showToast = showToast;
window.login = login;
window.logout = logout;
window.loadTablesManagement = loadTablesManagement;
window.togglePreorders = togglePreorders;
window.updatePreorderTotal = updatePreorderTotal;
window.checkAvailability = checkAvailability;
window.selectTable = selectTable;
window.loadZones = loadZones;