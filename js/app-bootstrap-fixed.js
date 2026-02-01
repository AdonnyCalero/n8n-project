// JavaScript para Bootstrap Frontend - Versión Corregida
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

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toastEl.className = `toast bg-${type} text-white`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Autenticación
async function login(email, password) {
    try {
        console.log('Iniciando login con:', { email, rol: 'admin' });
        
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Respuesta login status:', response.status);
        
        const data = await response.json();
        console.log('Datos login:', data);
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Validar que los datos del usuario sean correctos
            if (!currentUser || !currentUser.rol) {
                throw new Error('Datos de usuario inválidos recibidos del servidor');
            }
            
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            console.log('Login exitoso, usuario:', currentUser);
            
            showToast('Bienvenido ' + currentUser.nombre, 'success');
            
            // Actualizar UI según rol
            updateUIForAuthenticatedUser();
            
            // Redirigir según rol
            if (currentUser.rol === 'administrador') {
                console.log('Redirigiendo al panel de administrador...');
                showSection('admin');
            } else {
                console.log('Redirigiendo a inicio...');
                showSection('inicio');
            }
        } else {
            console.error('Error de login:', data);
            showToast(data.error || 'Error de autenticación', 'danger');
        }
    } catch (error) {
        console.error('Error en login:', error);
        
        // Mensajes más específicos según el tipo de error
        let errorMessage = 'Error de conexión';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'No se puede conectar al servidor';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Error al procesar respuesta del servidor';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Error de red. Verifique su conexión';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        showToast(errorMessage, 'danger');
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
            showToast('Usuario registrado exitosamente', 'success');
            // Cambiar a la pestaña de login
            const loginTab = new bootstrap.Tab(document.getElementById('loginTab'));
            loginTab.show();
        } else {
            showToast(data.error || 'Error al registrar', 'danger');
        }
    } catch (error) {
        console.error('Error en login:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        showToast('Error de conexión', 'danger');
    }
}

function logout() {
    console.log('Cerrando sesión...');
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Actualizar UI para no autenticado
    updateUIForUnauthenticatedUser();
    
    showToast('Sesión cerrada', 'info');
    
    // Mostrar sección de inicio
    showSection('inicio');
}

function updateUIForAuthenticatedUser() {
    console.log('Actualizando UI para usuario autenticado:', currentUser);
    
    if (currentUser.rol === 'administrador') {
        // Para administradores: solo mostrar "Cerrar Sesión"
        document.getElementById('navInicio').style.display = 'none';
        document.getElementById('navReservar').style.display = 'none';
        document.getElementById('navMenu').style.display = 'none';
        document.getElementById('navMisReservas').style.display = 'none';
        document.getElementById('navLogin').style.display = 'none';
        document.getElementById('navAdmin').style.display = 'none';
        document.getElementById('navLogout').style.display = 'block';
        
        // No mostrar sección automáticamente aquí, lo hace el login
    } else {
        // Para clientes: mostrar opciones de cliente
        document.getElementById('navInicio').style.display = 'block';
        document.getElementById('navReservar').style.display = 'block';
        document.getElementById('navMenu').style.display = 'block';
        document.getElementById('navMisReservas').style.display = 'block';
        document.getElementById('navLogin').style.display = 'none';
        document.getElementById('navAdmin').style.display = 'none';
        document.getElementById('navLogout').style.display = 'block';
    }
}

function updateUIForUnauthenticatedUser() {
    console.log('Actualizando UI para usuario no autenticado');
    
    // Para no logueados: solo mostrar "Inicio" y "Iniciar Sesión"
    document.getElementById('navInicio').style.display = 'block';
    document.getElementById('navReservar').style.display = 'none';
    document.getElementById('navMenu').style.display = 'none';
    document.getElementById('navMisReservas').style.display = 'none';
    document.getElementById('navLogin').style.display = 'block';
    document.getElementById('navAdmin').style.display = 'none';
    document.getElementById('navLogout').style.display = 'none';
}

// Reservas
async function loadZonas() {
    try {
        const response = await fetch(`${API_BASE}/zonas`);
        
        if (!response.ok) {
            const errorData = await response.json();
            showToast(errorData.error || 'Error al cargar zonas', 'danger');
            return;
        }
        
        const zonas = await response.json();
        
        const select = document.getElementById('reservaZona');
        if (select) {
            select.innerHTML = '<option value="">Cualquier zona</option>';
            
            if (zonas && zonas.length > 0) {
                zonas.forEach(zona => {
                    const option = document.createElement('option');
                    option.value = zona.id;
                    option.textContent = zona.nombre;
                    select.appendChild(option);
    });
    
    // Cargar todas las reservas (independientemente de si el dashboard cargó)
    console.log('🔄 Cargando reservas...');
    try {
        await loadAllReservations();
        console.log('✅ Reservas cargadas');
    } catch (error) {
        console.error('Error al cargar las reservas:', error);
        showToast('Error de conexión al cargar reservas', 'danger');
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
        console.error('Error en login:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        
        let errorMessage = 'Error de conexión';
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'El servidor no está respondiendo. Verifique su conexión.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Error de red. Verifique su conexión a internet.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        console.log(`🚨 Error capturado: ${errorMessage}`);
        showToast(errorMessage, 'danger');
    }
}

function displayAvailableTables(tables) {
    const container = document.getElementById('availableTables');
    const tablesList = document.getElementById('tablesList');
    
    tablesList.innerHTML = '';
    
    if (!tables || tables.length === 0) {
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
        console.error('Error en login:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        
        let errorMessage = 'Error de conexión';
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'El servidor no está respondiendo. Verifique su conexión.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Error de red. Verifique su conexión a internet.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        showToast(errorMessage, 'danger');
    }
}

// Menú
async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        
        if (!response.ok) {
            const errorData = await response.json();
            showToast(errorData.error || 'Error al cargar el menú', 'danger');
            return;
        }
        
        const menuItems = await response.json();
        
        const container = document.getElementById('menuItems');
        container.innerHTML = '';
        
        if (!menuItems || menuItems.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay platos disponibles en el menú</div>';
            return;
        }
        
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
        console.error('Error al cargar menú:', error);
        showToast('Error de conexión al cargar el menú', 'danger');
    }
}

// Reservas del usuario
async function loadMyReservations() {
    try {
        // Verificar si hay token de autenticación
        if (!authToken) {
            showToast('Debes iniciar sesión para ver tus reservas', 'warning');
            showSection('login');
            return;
        }

        const response = await fetch(`${API_BASE}/mis-reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            showToast(errorData.error || 'Error al cargar reservas', 'danger');
            return;
        }
        
        const reservations = await response.json();
        
        const container = document.getElementById('myReservations');
        container.innerHTML = '';
        
        if (!reservations || reservations.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No tienes reservas registradas</div>';
            return;
        }
        
        reservations.forEach(reservation => {
            const card = document.createElement('div');
            card.className = 'card reservation-card mb-3';
            
            // Determinar clase de estado
            const statusClass = reservation.estado === 'confirmada' ? 'bg-success' : 
                               reservation.estado === 'cancelada' ? 'bg-danger' : 'bg-secondary';
            
            card.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h5 class="card-title mb-1">
                                <i class="bi bi-calendar-check"></i> ${reservation.fecha} ${reservation.hora}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Mesa:</strong> ${reservation.mesa_numero} ${reservation.zona_nombre ? `(${reservation.zona_nombre})` : ''}
                            </p>
                            <p class="card-text mb-0">
                                <strong>Comensales:</strong> ${reservation.numero_comensales} | 
                                <strong>Observaciones:</strong> ${reservation.observaciones || 'Ninguna'}
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge ${statusClass}">
                                ${reservation.estado.charAt(0).toUpperCase() + reservation.estado.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error al cargar reservas:', error);
        showToast('Error de conexión al cargar reservas', 'danger');
    }
}

// Dashboard administrador
async function loadDashboard() {
    try {
        console.log('Cargando dashboard...');
        console.log('Token presente:', authToken ? 'Sí' : 'No');
        console.log('Usuario actual:', currentUser);
        
        // Esperar a que los elementos del dashboard existan antes de intentar usarlos
        const waitForDashboardElements = () => {
            return new Promise((resolve) => {
                const checkElements = () => {
                    const totalReservasEl = document.getElementById('totalReservas');
                    const reservasHoyEl = document.getElementById('reservasHoy');
                    const mesasDisponiblesEl = document.getElementById('mesasDisponibles');
                    const totalComensalesEl = document.getElementById('totalComensales');
                    
                    if (totalReservasEl && reservasHoyEl && mesasDisponiblesEl && totalComensalesEl) {
                        console.log('✅ Elementos del dashboard encontrados');
                        resolve();
                    } else {
                        console.log('⏳ Esperando elementos del dashboard...');
                        setTimeout(checkElements, 100);
                    }
                };
                checkElements();
            });
        };

        // Esperar a que los elementos estén disponibles
        await waitForDashboardElements();
        
        // Cargar datos del dashboard
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Respuesta dashboard status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en respuesta dashboard:', errorData);
            showToast(errorData.error || 'Error al cargar dashboard', 'danger');
        } else {
            const data = await response.json();
            console.log('Datos dashboard recibidos:', data);
            
            if (data && data.reservas && data.mesas) {
                totalReservasEl.textContent = data.reservas.total_reservas || 0;
                reservasHoyEl.textContent = data.reservas.reservas_hoy || 0;
                mesasDisponiblesEl.textContent = data.mesas.disponibles || 0;
                totalComensalesEl.textContent = data.reservas.total_comensales || 0;
                console.log('✅ Dashboard actualizado correctamente');
            } else {
                console.warn('⚠️ Datos del dashboard incompletos:', data);
                // Intentar cargar las otras secciones de todas formas
            }
        }
        
        // Cargar todas las reservas (independientemente de si el dashboard cargó)
        console.log('🔄 Cargando reservas...');
        try {
            await loadAllReservations();
            console.log('✅ Reservas cargadas');
        } catch (error) {
            console.error('❌ Error al cargar reservas:', error);
        }
        
        // Cargar gestión de mesas y menú
        console.log('🔄 Cargando gestión de mesas...');
        try {
            await loadTablesManagement();
            console.log('✅ Gestión de mesas cargada');
        } catch (error) {
            console.error('❌ Error al cargar gestión de mesas:', error);
        }
        
    } catch (error) {
        console.error('Error general al cargar dashboard:', error);
        if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.name === 'TypeError') {
            showToast('Error de conexión: El servidor backend no está respondiendo', 'danger');
        } else {
            showToast('Error de conexión al cargar dashboard: ' + error.message, 'danger');
        }
    }
}

async function loadAllReservations() {
    console.log('🔄 Iniciando carga de reservas...');
    console.log('🔑 Token:', authToken ? 'Presente' : 'Ausente');
    
        // Verificar si hay token
        if (!authToken) {
            console.warn('⚠️ No hay token de autenticación');
            showToast('Debe iniciar sesión para ver las reservas', 'warning');
            return;
        }
        
        // Intentar login
        console.log('🚀 Intentando login como administrador...');
        console.log('📧 Email:', email);
        
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            console.log('📊 Status de respuesta:', response.status);
            
            const data = await response.json();
            
            if (response.ok) {
                authToken = data.token;
                currentUser = data.user;
                
                // Validar que los datos del usuario sean correctos
                if (!currentUser || !currentUser.rol) {
                    throw new Error('Datos de usuario inválidos');
                }
                
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                console.log('✅ Login exitoso como:', currentUser.nombre);
                console.log('🎑 Token guardado en localStorage');
                
                showToast(`Bienvenido ${currentUser.nombre}`, 'success');
                
                // Actualizar UI según rol
                updateUIForAuthenticatedUser();
                
                console.log('Usuario actual:', currentUser);
                
                // Redirigir según rol
                if (currentUser.rol === 'administrador') {
                    console.log('🔄 Redirigiendo a dashboard...');
                    showSection('admin');
                } else {
                    console.log('🔄 Redirigiendo a inicio...');
                    showSection('inicio');
                }
                
                // Redirigir según rol
                if (currentUser.rol === 'administrador') {
                    console.log('🔄 Redirigiendo a dashboard...');
                    showSection('admin');
                } else {
                    console.log('🔄 Redirigiendo a inicio...');
                    showSection('inicio');
                }
                
            } else {
                console.error('❌ Error en login:', data);
                console.error('Detalles del error:', data);
                showToast(data.error || 'Error de autenticación', 'danger');
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            console.error('Tipo de error:', error.name);
            console.error('Mensaje de error:', error.message);
            
            let errorMessage = 'Error de conexión';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'El servidor no está respondiendo. Verifique su conexión.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Error de red. Verifique su conexión a internet.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            console.log(`🚨 Error capturado: ${errorMessage}`);
            showToast(errorMessage, 'danger');
        }
    }
    }
    
    try {
        console.log('📡 Solicitando reservas al backend...');
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('📊 Status de respuesta:', response.status);
        
        if (!response.ok) {
            console.log('❌ Error en la respuesta del servidor');
            const errorData = await response.json();
            console.error('Detalle del error:', errorData);
            showToast(errorData.error || 'Error al cargar reservas', 'danger');
            return;
        }
        
        const reservations = await response.json();
        console.log('📋 Reservas recibidas:', reservations);
        console.log('📊 Total de reservas:', reservations ? reservations.length : 0);
        
        const tbody = document.getElementById('allReservationsTable');
        if (!tbody) {
            console.error('❌ Tabla de reservas no encontrada en el DOM');
            showToast('Error: No se encontró la tabla de reservas', 'danger');
            return;
        }
        
        console.log('🎨 Renderizando tabla de reservas...');
        tbody.innerHTML = '';
        
        if (!reservations || reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay reservas registradas</td></tr>';
            console.log('✅ Tabla actualizada: No hay reservas');
            return;
        }
        
        console.log('🎨 Renderizando', reservations.length, 'filas...');
        reservations.forEach((reservation, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.id}</td>
                <td>${reservation.cliente_nombre}</td>
                <td>${reservation.email}</td>
                <td>${reservation.fecha}</td>
                <td>${reservation.hora}</td>
                <td>${reservation.mesa_numero}</td>
                <td>${reservation.numero_comensales}</td>
                <td><span class="badge status-${reservation.estado}">${capitalizeFirst(reservation.estado)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editReservation(${reservation.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteReservation(${reservation.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('✅ Tabla de reservas actualizada con', reservations.length, 'filas');
        showToast('Reservas cargadas correctamente', 'success');
        
    } catch (error) {
        console.error('💥 Error al cargar todas las reservas:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        
        let errorMessage = 'Error de conexión al cargar reservas';
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'El servidor no está respondiendo. Verifique la conexión.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'No se pudo conectar al servidor. Revise su red.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Error de red. Verifique su conexión a internet.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        showToast(errorMessage, 'danger');
    }
}

async function loadAllReservations() {
    try {
        console.log('Cargando todas las reservas...');
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Respuesta status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en respuesta:', errorData);
            showToast(errorData.error || 'Error al cargar reservas', 'danger');
            return;
        }
        
        const reservations = await response.json();
        console.log('Reservas cargadas:', reservations);
        
        const tbody = document.getElementById('allReservationsTable');
        if (!tbody) {
            console.error('No se encontró el elemento allReservationsTable');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!reservations || reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay reservas registradas</td></tr>';
            console.log('No hay reservas para mostrar');
            return;
        }
        
        console.log('Renderizando', reservations.length, 'reservas');
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
                <td><span class="badge status-${reservation.estado}">${capitalizeFirst(reservation.estado)}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editReservation(${reservation.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteReservation(${reservation.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('Reservas renderizadas correctamente');
    } catch (error) {
        console.error('Error al cargar todas las reservas:', error);
        if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.name === 'TypeError') {
            showToast('Error de conexión: No se puede conectar al servidor backend', 'danger');
        } else {
            showToast('Error de conexión al cargar reservas: ' + error.message, 'danger');
        }
    }
}

// Gestión de mesas
async function loadTablesManagement() {
    try {
        const [tablesResponse, zonesResponse] = await Promise.all([
            fetch(`${API_BASE}/mesas`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE}/zonas`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);
        
        if (!tablesResponse.ok || !zonesResponse.ok) {
            showToast('Error al cargar datos de mesas', 'danger');
            return;
        }
        
        const tables = await tablesResponse.json();
        const zones = await zonesResponse.json();
        
        const container = document.getElementById('tablesManagement');
        if (!container) return;
        
        container.innerHTML = '<h5>Gestión de Mesas</h5>';
        
        // Crear tabla simple
        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Capacidad</th>
                    <th>Zona</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        tables.forEach(tableItem => {
            const row = document.createElement('tr');
            const zone = zones.find(z => z.id === tableItem.id_zona);
            row.innerHTML = `
                <td>${tableItem.numero}</td>
                <td>${tableItem.capacidad}</td>
                <td>${zone ? zone.nombre : 'Sin zona'}</td>
                <td><span class="badge status-${tableItem.estado}">${capitalizeFirst(tableItem.estado)}</span></td>
            `;
            tbody.appendChild(row);
        });
        
        container.appendChild(table);
    } catch (error) {
        console.error('Error al cargar mesas:', error);
        if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
            showToast('Error de conexión: No se puede conectar al servidor backend', 'danger');
        } else {
            showToast('Error de conexión al cargar mesas', 'danger');
        }
    }
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
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            console.log('🚀 Enviando formulario de login...');
            login(email, password);
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const telefono = document.getElementById('registerPhone').value;
            
            console.log('📝 Enviando formulario de registro...');
            register(nombre, email, password, telefono);
        });
    }
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const telefono = document.getElementById('registerPhone').value;
            console.log('📝 Formulario de registro enviado:', { nombre, email });
            register(nombre, email, password, telefono);
        });
    }
    
    // Formulario de reserva
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createReservation();
        });
    }
    });
    
    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    const reservaFecha = document.getElementById('reservaFecha');
    if (reservaFecha) {
        reservaFecha.setAttribute('min', today);
    }
});
    
    // Formulario de reserva
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createReservation();
        });
    }
    
    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservaFecha').setAttribute('min', today);
});

// Funciones de edición y eliminación de reservas
async function editReservation(reservationId) {
    try {
        // Obtener datos de la reserva específica
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            showToast('Error al obtener datos de la reserva', 'danger');
            return;
        }
        
        const reservations = await response.json();
        const reservation = reservations.find(r => r.id === reservationId);
        
        if (!reservation) {
            showToast('Reserva no encontrada', 'danger');
            return;
        }
        
        // Llenar el formulario con los datos de la reserva (formateados)
        console.log('Datos de reserva recibidos:', reservation);
        
        document.getElementById('editReservationId').value = reservation.id;
        
        // Formatear fecha: tomar solo la parte YYYY-MM-DD
        if (reservation.fecha) {
            const fechaFormateada = reservation.fecha.split(' ')[0]; // "2026-01-31 00:00:00" → "2026-01-31"
            document.getElementById('editFecha').value = fechaFormateada;
            console.log('Fecha formateada:', fechaFormateada);
        }
        
        // Formatear hora: tomar solo HH:MM
        if (reservation.hora) {
            const horaFormateada = reservation.hora.substring(0, 5); // "20:00:00" → "20:00"
            document.getElementById('editHora').value = horaFormateada;
            console.log('Hora formateada:', horaFormateada);
        }
        
        document.getElementById('editComensales').value = reservation.numero_comensales;
        document.getElementById('editEstado').value = reservation.estado;
        document.getElementById('editObservaciones').value = reservation.observaciones || '';
        
        console.log('Formulario llenado con:', {
            id: reservation.id,
            fecha: document.getElementById('editFecha').value,
            hora: document.getElementById('editHora').value,
            comensales: document.getElementById('editComensales').value,
            estado: document.getElementById('editEstado').value,
            observaciones: document.getElementById('editObservaciones').value
        });
        
        // Limpiar mensajes de error previos
        document.getElementById('editReservationError').style.display = 'none';
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('editReservationModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error al cargar reserva para editar:', error);
        showToast('Error de conexión al cargar reserva', 'danger');
    }
}

async function saveReservation() {
    try {
        console.log('Iniciando guardado de reserva...');
        
        // Ocultar mensajes de error previos
        const errorDiv = document.getElementById('editReservationError');
        errorDiv.style.display = 'none';
        
        // Validar campos localmente antes de enviar
        const validationError = validateReservationForm();
        if (validationError) {
            errorDiv.textContent = validationError;
            errorDiv.style.display = 'block';
            return;
        }
        
        const reservationId = document.getElementById('editReservationId').value;
        
        const reservationData = {
            fecha: document.getElementById('editFecha').value,
            hora: document.getElementById('editHora').value,
            numero_comensales: parseInt(document.getElementById('editComensales').value),
            estado: document.getElementById('editEstado').value,
            observaciones: document.getElementById('editObservaciones').value
        };
        
        console.log('Datos a enviar:', reservationData);
        
        const response = await fetch(`${API_BASE}/reservas/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(reservationData)
        });
        
        console.log('Respuesta status:', response.status);
        
        const data = await response.json();
        console.log('Respuesta data:', data);
        
        if (response.ok) {
            showToast('Reserva actualizada exitosamente', 'success');
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editReservationModal'));
            modal.hide();
            
            // Limpiar formulario
            clearEditForm();
            
            // Recargar la tabla de reservas
            await loadAllReservations();
        } else {
            // Mostrar error específico del servidor en el modal
            const errorMessage = data.error || 'Error al actualizar reserva';
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            
            // También mostrar en toast
            showToast(errorMessage, 'danger');
        }
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        
        // Mostrar error de conexión en el modal
        const errorDiv = document.getElementById('editReservationError');
        errorDiv.textContent = 'Error de conexión: No se pudo contactar al servidor';
        errorDiv.style.display = 'block';
        
        showToast('Error de conexión al actualizar reserva', 'danger');
    }
}

async function deleteReservation(reservationId) {
    try {
        // Confirmar eliminación
        if (!confirm('¿Está seguro de que desea eliminar esta reserva? Esta acción no se puede deshacer.')) {
            return;
        }
        
        const response = await fetch(`${API_BASE}/reservas/${reservationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Reserva eliminada exitosamente', 'success');
            
            // Recargar la tabla de reservas
            await loadAllReservations();
        } else {
            showToast(data.error || 'Error al eliminar reserva', 'danger');
        }
    } catch (error) {
        console.error('Error al eliminar reserva:', error);
        showToast('Error de conexión al eliminar reserva', 'danger');
    }
}

// Funciones de validación y utilidad para el formulario de edición
function validateReservationForm() {
    const fecha = document.getElementById('editFecha').value.trim();
    const hora = document.getElementById('editHora').value.trim();
    const comensales = document.getElementById('editComensales').value;
    const estado = document.getElementById('editEstado').value;
    
    // Validar fecha
    if (!fecha) {
        return 'La fecha es obligatoria';
    }
    
    // Validar que la fecha no sea anterior a hoy
    const selectedDate = new Date(fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Permitir cambios para cancelaciones del mismo día, aunque sea pasado la hora actual
    if (selectedDate < today) {
        // Permitir si es cancelación del mismo día
        if (estado === 'cancelada') {
            const reservationTime = new Date(`${fecha} ${hora}`);
            const now = new Date();
            
            // Si es cancelación del mismo día, permitir incluso si la hora ya pasó
            const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            if (selectedDateOnly.getTime() === todayOnly.getTime()) {
                console.log('Permitiendo cancelación del mismo día');
                return null; // Permitir cancelación del día
            }
        }
        
        return 'La fecha no puede ser anterior a hoy';
    }
    
    // Validar hora
    if (!hora) {
        return 'La hora es obligatoria';
    }
    
    // Validar número de comensales
    if (!comensales || comensales < 1 || comensales > 8) {
        return 'El número de comensales debe estar entre 1 y 8';
    }
    
    // Validar estado
    if (!estado) {
        return 'El estado es obligatorio';
    }
    
    // Si todas las validaciones pasan
    return null;
}

function clearEditForm() {
    // Limpiar todos los campos del formulario
    document.getElementById('editReservationId').value = '';
    document.getElementById('editFecha').value = '';
    document.getElementById('editHora').value = '';
    document.getElementById('editComensales').value = '1';
    document.getElementById('editEstado').value = 'pendiente';
    document.getElementById('editObservaciones').value = '';
    
    // Ocultar mensaje de error
    document.getElementById('editReservationError').style.display = 'none';
}

function showEditReservationError(message) {
    const errorDiv = document.getElementById('editReservationError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Función utilidad para capitalizar
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}