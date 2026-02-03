// Global variables
let authToken = null;
let currentUser = null;
const API_BASE = window.location.origin + '/api';

// Variables globales para gestión de pre-pedidos
let selectedTableForReservation = null;
let menuItemsForPreorder = [];

// Variables globales para reserva de zonas
let selectedZonesForReservation = [];
let availableZonesData = [];

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

// Load zones for home page
async function loadHomeZones() {
    const container = document.getElementById('homeZonesList');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE}/zonas`);
        if (!response.ok) throw new Error('Error al cargar zonas');
        
        const zonas = await response.json();
        
        if (!zonas || zonas.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> No hay zonas disponibles.
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        zonas.forEach(zona => {
            const card = document.createElement('div');
            card.className = 'col-md-4';
            card.innerHTML = `
                <div class="card h-100 zone-home-card">
                    <div class="card-body text-center">
                        <div class="zone-icon mb-3">
                            <i class="bi bi-building display-4"></i>
                        </div>
                        <h5 class="card-title">${zona.nombre}</h5>
                        <p class="card-text text-muted">
                            ${zona.descripcion || 'Sin descripción disponible'}
                        </p>
                        <hr>
                        <div class="d-flex justify-content-between text-center">
                            <div>
                                <strong class="d-block">${zona.total_mesas || 0}</strong>
                                <small class="text-muted">Mesas</small>
                            </div>
                            <div>
                                <strong class="d-block">${zona.total_capacidad || 0}</strong>
                                <small class="text-muted">Capacidad</small>
                            </div>
                        </div>
                        <button class="btn btn-outline-primary w-100 mt-3" onclick="if (typeof showSection === 'function') showSection('reservas')">
                            <i class="bi bi-calendar-plus"></i> Reservar Aquí
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error al cargar zonas:', error);
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-circle"></i> Error al cargar las zonas.
                </div>
            </div>
        `;
    }
}

// Load menu items for the menu section (client view)
async function loadMenuItems() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        const menuItems = await response.json();
        
        const container = document.getElementById('menuItems');
        container.innerHTML = '';
        
        if (menuItems.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> No hay platos disponibles en este momento.
                    </div>
                </div>
            `;
            return;
        }
        
        // Group items by category
        const groupedByCategory = menuItems.reduce((acc, item) => {
            const categoria = item.categoria || 'Sin categoría';
            if (!acc[categoria]) {
                acc[categoria] = [];
            }
            acc[categoria].push(item);
            return acc;
        }, {});
        
        // Display items grouped by category
        for (const [categoria, items] of Object.entries(groupedByCategory)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'col-12 mb-4';
            categoryDiv.innerHTML = `
                <h4 class="mb-3 border-bottom pb-2">
                    <i class="bi bi-collection"></i> ${categoria}
                </h4>
            `;
            container.appendChild(categoryDiv);
            
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'col-md-6 col-lg-4';
                card.innerHTML = `
                    <div class="card h-100 menu-card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0">${item.nombre}</h5>
                                <span class="badge bg-success">$${parseFloat(item.precio || 0).toFixed(2)}</span>
                            </div>
                            <p class="card-text">
                                <small class="text-muted">${item.descripcion || 'Sin descripción'}</small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge ${item.stock_disponible > 10 ? 'bg-success' : item.stock_disponible > 0 ? 'bg-warning' : 'bg-danger'}">
                                    <i class="bi bi-box"></i> Stock: ${item.stock_disponible}
                                </span>
                                ${item.disponible ? '<span class="badge bg-info">Disponible</span>' : '<span class="badge bg-secondary">No disponible</span>'}
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error al cargar menú:', error);
        const container = document.getElementById('menuItems');
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-circle"></i> Error al cargar el menú. Por favor, intenta nuevamente.
                </div>
            </div>
        `;
    }
}

// Update pre-pedido total
function updatePreorderTotal() {
    const inputs = document.querySelectorAll('.preorder-quantity');
    let total = 0;
    let totalItems = 0;
    const itemsList = [];
    
    inputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        const platoId = parseInt(input.id.replace('preorder_', ''));
        const plato = menuItemsForPreorder.find(p => p.id === platoId);
        
        if (plato && quantity > 0) {
            const subtotal = quantity * plato.precio;
            total += subtotal;
            totalItems += quantity;
            itemsList.push({
                nombre: plato.nombre,
                cantidad: quantity,
                precioUnitario: plato.precio,
                subtotal: subtotal
            });
        }
    });
    
    // Actualizar resumen detallado si existe el nuevo contenedor
    const summaryContainer = document.getElementById('preorderSummaryContainer');
    const itemsListDiv = document.getElementById('preorderItemsList');
    const totalAmountSpan = document.getElementById('preorderTotalAmount');
    
    if (summaryContainer && itemsListDiv && totalAmountSpan) {
        if (totalItems > 0) {
            // Mostrar el contenedor
            summaryContainer.style.display = 'block';
            
            // Generar lista de items
            let itemsHtml = '';
            itemsList.forEach(item => {
                itemsHtml += `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>${item.cantidad}x ${item.nombre}</span>
                        <span class="text-muted">$${item.subtotal.toFixed(2)}</span>
                    </div>
                `;
            });
            itemsListDiv.innerHTML = itemsHtml;
            
            // Actualizar total
            totalAmountSpan.textContent = `$${total.toFixed(2)}`;
        } else {
            // Ocultar si no hay items
            summaryContainer.style.display = 'none';
        }
    }
    
    // Mantener compatibilidad con el resumen antiguo si existe
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
    } else if (sectionId === 'inicio') {
        loadHomeZones();
    } else if (sectionId === 'menu') {
        loadMenuItems();
    } else if (sectionId === 'admin' && authToken) {
        // Solo configurar tabs y cargar dashboard cuando se entra al panel admin
        setupAdminTabs();
        loadDashboard();
        // No cargar otros datos aquí, se cargarán al hacer clic en cada tab
    }
}

// Validación del formulario de reservas
function validateReservationForm() {
    const fecha = document.getElementById('reservaFecha').value;
    const hora = document.getElementById('reservaHora').value;
    const comensales = document.getElementById('reservaComensales').value;
    const errors = [];
    
    // Verificar modo de reserva (Mesa o Zona)
    const modeZone = document.getElementById('modeZone');
    const isZoneMode = modeZone && modeZone.checked;
    
    // Validar campos vacíos básicos
    if (!fecha) {
        errors.push('❌ La fecha es obligatoria');
    }
    
    if (!hora) {
        errors.push('❌ La hora es obligatoria');
    }
    
    // Validar número de comensales SOLO si está en modo mesa
    if (!isZoneMode) {
        // Modo mesa: validar comensales normalmente
        if (!comensales || comensales === '' || comensales === null || comensales === undefined) {
            errors.push('❌ El número de comensales es obligatorio');
        } else {
            const numComensales = parseInt(comensales);
            if (isNaN(numComensales) || numComensales < 1) {
                errors.push('❌ Debe haber al menos 1 comensal');
            } else if (numComensales > 20) {
                errors.push('❌ Para grupos mayores a 20 personas, contacte directamente al restaurante');
            }
        }
    }
    // En modo zona: no se valida el campo de comensales (se usa la capacidad de las zonas seleccionadas)
    
    // Validar fecha no sea en el pasado
    if (fecha) {
        const selectedDate = new Date(fecha + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            errors.push('❌ La fecha no puede ser anterior a hoy');
        }
    }
    
    // Validar horario de atención (12:00 - 23:00)
    if (hora) {
        const [hours, minutes] = hora.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        const openingTime = 12 * 60; // 12:00
        const closingTime = 23 * 60; // 23:00
        
        if (timeInMinutes < openingTime || timeInMinutes > closingTime) {
            errors.push('❌ El horario de atención es de 12:00 a 23:00 hrs');
        }
    }
    
    // Validar tiempo mínimo de anticipación (1 hora)
    if (fecha && hora) {
        const now = new Date();
        const selectedDateTime = new Date(fecha + 'T' + hora);
        const diffInHours = (selectedDateTime - now) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            errors.push('❌ La reserva debe hacerse con al menos 1 hora de anticipación');
        }
    }
    
    return errors;
}

// Mostrar errores de validación en el formulario
function displayValidationErrors(errors) {
    // Remover mensajes de error previos
    const existingErrors = document.querySelectorAll('.validation-error');
    existingErrors.forEach(el => el.remove());
    
    if (errors.length === 0) return true;
    
    // Mostrar cada error con un toast
    errors.forEach((error, index) => {
        setTimeout(() => {
            showToast(error, 'error');
        }, index * 300);
    });
    
    return false;
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
        // Validar el formulario primero
        const validationErrors = validateReservationForm();
        if (validationErrors.length > 0) {
            displayValidationErrors(validationErrors);
            return;
        }
        
        const fecha = document.getElementById('reservaFecha').value;
        const hora = document.getElementById('reservaHora').value;
        
        // Verificar modo de reserva (Mesa o Zona)
        const modeZone = document.getElementById('modeZone');
        const isZoneMode = modeZone && modeZone.checked;
        
        if (isZoneMode) {
            // Modo Zona - Verificar disponibilidad de zonas
            // No necesitamos comensales en modo zona, pasamos 1 como valor por defecto
            await checkZoneAvailability(fecha, hora, 1);
            return;
        }
        
        // Modo Mesa - Obtener comensales del campo
        const comensales = parseInt(document.getElementById('reservaComensales').value);
        
        // Modo Mesa - Verificar disponibilidad de mesas individuales
        const id_zona = document.getElementById('reservaZona').value || null;
        
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
            
            // Filtrar mesas según la capacidad exacta o cercana al número de comensales
            // Mostrar solo mesas que puedan acomodar exactamente o con margen de 2 personas
            const mesasFiltradas = data.mesas_disponibles.filter(table => {
                return table.capacidad >= comensales;
            });
            
            if (mesasFiltradas.length > 0) {
                // Mostrar mensaje informativo
                const infoDiv = document.createElement('div');
                infoDiv.className = 'col-12 mb-3';
                infoDiv.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> Mostrando mesas para <strong>${comensales} comensales</strong>
                    </div>
                `;
                tablesListDiv.appendChild(infoDiv);
                
                mesasFiltradas.forEach(table => {
                    const col = document.createElement('div');
                    col.className = 'col-md-4';
                    col.innerHTML = `
                        <div class="card">
                            <div class="card-body text-center">
                                <h5>Mesa ${table.numero}</h5>
                                <p class="mb-1"><strong>Capacidad: ${table.capacidad} personas</strong></p>
                                <span class="badge bg-${table.capacidad === comensales ? 'success' : 'info'} mb-2">
                                    ${table.capacidad === comensales ? 'Capacidad exacta' : 'Capacidad adecuada'}
                                </span>
                                <button type="button" class="btn btn-primary w-100" onclick="selectTable(${table.id}, '${table.numero}', ${table.capacidad}, '${table.zona_nombre || ''}')">
                                    <i class="bi bi-check-circle"></i> Seleccionar
                                </button>
                            </div>
                        </div>
                    `;
                    tablesListDiv.appendChild(col);
                });
            } else {
                // No hay mesas con capacidad exacta o cercana
                const noMatchDiv = document.createElement('div');
                noMatchDiv.className = 'col-12';
                noMatchDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> 
                        <strong>No hay mesas disponibles para exactamente ${comensales} comensales.</strong><br>
                        Mesas disponibles con otras capacidades:
                    </div>
                `;
                tablesListDiv.appendChild(noMatchDiv);
                
                // Mostrar todas las mesas disponibles como alternativa
                data.mesas_disponibles.forEach(table => {
                    const col = document.createElement('div');
                    col.className = 'col-md-4';
                    col.innerHTML = `
                        <div class="card border-warning">
                            <div class="card-body text-center">
                                <h5>Mesa ${table.numero}</h5>
                                <p class="mb-1"><strong>Capacidad: ${table.capacidad} personas</strong></p>
                                <span class="badge bg-warning mb-2">${table.capacidad > comensales ? 'Espacio extra' : 'Capacidad justa'}</span>
                                <button type="button" class="btn btn-outline-primary w-100" onclick="selectTable(${table.id}, '${table.numero}', ${table.capacidad}, '${table.zona_nombre || ''}')">
                                    <i class="bi bi-check-circle"></i> Seleccionar
                                </button>
                            </div>
                        </div>
                    `;
                    tablesListDiv.appendChild(col);
                });
            }
            
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

// Toggle reservation mode (Mesa or Zona)
function toggleReservationMode() {
    const modeTable = document.getElementById('modeTable');
    const modeZone = document.getElementById('modeZone');
    const availableTables = document.getElementById('availableTables');
    const availableZones = document.getElementById('availableZones');
    const selectedTable = document.getElementById('selectedTable');
    const selectedZones = document.getElementById('selectedZones');
    const comensalesContainer = document.getElementById('comensalesContainer');
    const zonaPreferidaContainer = document.getElementById('zonaPreferidaContainer');
    
    if (modeZone && modeZone.checked) {
        // Modo Zona
        if (availableTables) availableTables.style.display = 'none';
        if (availableZones) availableZones.style.display = 'none';
        if (selectedTable) selectedTable.style.display = 'none';
        if (selectedZones) selectedZones.style.display = 'none';
        
        // Ocultar campo de comensales y zona preferida en modo zona
        if (comensalesContainer) comensalesContainer.style.display = 'none';
        if (zonaPreferidaContainer) zonaPreferidaContainer.style.display = 'none';
        
        // Limpiar selecciones previas
        selectedTableForReservation = null;
        selectedZonesForReservation = [];
        
        // Limpiar valor de comensales
        const comensalesInput = document.getElementById('reservaComensales');
        if (comensalesInput) {
            comensalesInput.value = '';
            comensalesInput.removeAttribute('required');
        }
        
        showToast('Modo: Reserva de Zona(s) - Puedes seleccionar una o varias zonas completas', 'info');
    } else {
        // Modo Mesa
        if (availableZones) availableZones.style.display = 'none';
        if (selectedZones) selectedZones.style.display = 'none';
        
        // Mostrar campo de comensales y zona preferida en modo mesa
        if (comensalesContainer) comensalesContainer.style.display = 'block';
        if (zonaPreferidaContainer) zonaPreferidaContainer.style.display = 'block';
        
        // Limpiar selecciones previas de zonas
        selectedZonesForReservation = [];
        
        // Restaurar el campo de comensales como requerido
        const comensalesInput = document.getElementById('reservaComensales');
        if (comensalesInput) {
            comensalesInput.setAttribute('required', 'required');
            if (!comensalesInput.value) comensalesInput.value = '2';
        }
    }
}

// Check zone availability
async function checkZoneAvailability(fecha, hora, comensales) {
    try {
        const params = new URLSearchParams({
            fecha,
            hora,
            comensales
        });
        
        // Obtener zonas y sus mesas disponibles (SECUENCIAL para evitar "Commands out of sync")
        let zonasResponse, mesasResponse;
        try {
            zonasResponse = await fetch(`${API_BASE}/zonas`);
            mesasResponse = await fetch(`${API_BASE}/disponibilidad?${params}`);
        } catch (networkError) {
            console.warn('Error de red al obtener datos de zonas:', networkError);
        }
        
        let zonas = [];
        let mesasData = { mesas_disponibles: [] };
        
        // Validar respuesta de zonas
        if (zonasResponse && zonasResponse.ok) {
            try {
                const zonasJson = await zonasResponse.json();
                if (Array.isArray(zonasJson) && zonasJson.length > 0) {
                    zonas = zonasJson;
                } else {
                    console.warn('La respuesta de /api/zonas no es un array válido:', zonasJson);
                }
            } catch (parseError) {
                console.warn('Error al parsear respuesta de zonas:', parseError);
            }
        }
        
        // Validar respuesta de mesas
        if (mesasResponse && mesasResponse.ok) {
            try {
                const mesasJson = await mesasResponse.json();
                if (mesasJson && typeof mesasJson === 'object') {
                    mesasData = mesasJson;
                    if (!Array.isArray(mesasData.mesas_disponibles)) {
                        console.warn('mesas_disponibles no es un array:', mesasData.mesas_disponibles);
                        mesasData.mesas_disponibles = [];
                    }
                } else {
                    console.warn('La respuesta de disponibilidad no es un objeto válido:', mesasJson);
                }
            } catch (parseError) {
                console.warn('Error al parsear respuesta de mesas:', parseError);
            }
        }
        
        // Verificar si hubo errores en la API
        const apiError = !zonasResponse || !zonasResponse.ok || !mesasResponse || !mesasResponse.ok;
        
        if (apiError) {
            const zonesListDiv = document.getElementById('zonesList');
            const availableZonesDiv = document.getElementById('availableZones');
            
            if (zonesListDiv && availableZonesDiv) {
                zonesListDiv.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-circle"></i> 
                            <strong>Error de conexión:</strong> No se pudieron obtener las zonas del servidor.
                            <br>Por favor, verifica tu conexión a internet o intenta nuevamente más tarde.
                        </div>
                    </div>
                `;
                availableZonesDiv.style.display = 'block';
            }
            
            showToast('Error al obtener zonas del servidor. Intenta nuevamente más tarde.', 'error');
            return;
        }
        
        const mesasDisponibles = mesasData.mesas_disponibles || [];
        
        // Calcular capacidad y disponibilidad por zona (sin filtrar por capacidad)
        const zonesWithInfo = zonas.map(zona => {
            const mesasEnZona = mesasDisponibles.filter(mesa => mesa.id_zona === zona.id || mesa.zona_nombre === zona.nombre);
            const capacidadTotal = mesasEnZona.reduce((sum, mesa) => sum + mesa.capacidad, 0);
            const mesasCount = mesasEnZona.length;
            
            return {
                ...zona,
                mesas_disponibles: mesasEnZona,
                capacidad_total: capacidadTotal,
                mesas_count: mesasCount,
                disponible: mesasCount > 0
            };
        });
        
        availableZonesData = zonesWithInfo;
        
        const zonesListDiv = document.getElementById('zonesList');
        const availableZonesDiv = document.getElementById('availableZones');
        
        if (!zonesListDiv || !availableZonesDiv) {
            console.error('No se encontraron los elementos del DOM para mostrar zonas');
            return;
        }
        
        zonesListDiv.innerHTML = '';
        
        const zonasDisponibles = zonesWithInfo.filter(z => z.disponible);  // Mostrar todas las zonas con mesas disponibles
        
        if (zonasDisponibles.length > 0) {
            zonasDisponibles.forEach(zona => {
                const col = document.createElement('div');
                col.className = 'col-md-6';
                col.innerHTML = `
                    <div class="card zone-card" id="zoneCard_${zona.id}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title mb-0">${zona.nombre}</h5>
                                <span class="badge bg-success">Disponible</span>
                            </div>
                            <p class="card-text">
                                <small class="text-muted">${zona.descripcion || 'Zona del restaurante'}</small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="badge bg-info">
                                    <i class="bi bi-grid"></i> ${zona.mesas_count} mesas
                                </span>
                                <span class="badge bg-primary">
                                    <i class="bi bi-people"></i> Capacidad: ${zona.capacidad_total} personas
                                </span>
                            </div>
                            <button type="button" class="btn btn-success w-100" id="btnSelectZone_${zona.id}" onclick="selectZone(${zona.id})">
                                <i class="bi bi-check-square"></i> Seleccionar Zona
                            </button>
                            <button type="button" class="btn btn-danger w-100 mt-2" id="btnDeselectZone_${zona.id}" onclick="deselectZone(${zona.id})" style="display: none;">
                                <i class="bi bi-x-square"></i> Quitar Selección
                            </button>
                        </div>
                    </div>
                `;
                zonesListDiv.appendChild(col);
            });
            
            availableZonesDiv.style.display = 'block';
        } else {
            zonesListDiv.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i> 
                        <strong>No hay zonas disponibles</strong> para ${comensales} comensales en la fecha y hora seleccionadas.
                    </div>
                </div>
            `;
            availableZonesDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al verificar disponibilidad de zonas:', error);
        showToast('Error al verificar disponibilidad de zonas. Intenta nuevamente más tarde.', 'error');
        
        // Mostrar mensaje amigable en el UI
        const zonesListDiv = document.getElementById('zonesList');
        const availableZonesDiv = document.getElementById('availableZones');
        if (zonesListDiv && availableZonesDiv) {
            zonesListDiv.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-circle"></i> 
                        <strong>Error al cargar zonas:</strong> ${error.message || 'Error desconocido'}. 
                        <br>Por favor, <a href="javascript:void(0)" onclick="checkZoneAvailability(document.getElementById('reservaFecha').value, document.getElementById('reservaHora').value, 1)">intenta nuevamente</a>.
                    </div>
                </div>
            `;
            availableZonesDiv.style.display = 'block';
        }
    }
}

// Select a zone for reservation
function selectZone(zoneId) {
    const zona = availableZonesData.find(z => z.id === zoneId);
    if (!zona) return;
    
    // Verificar si ya está seleccionada
    const alreadySelected = selectedZonesForReservation.find(z => z.id === zoneId);
    if (alreadySelected) {
        showToast('Esta zona ya está seleccionada', 'warning');
        return;
    }
    
    // Agregar a la selección
    selectedZonesForReservation.push(zona);
    
    // Actualizar UI de la tarjeta
    const zoneCard = document.getElementById(`zoneCard_${zoneId}`);
    const btnSelect = document.getElementById(`btnSelectZone_${zoneId}`);
    const btnDeselect = document.getElementById(`btnDeselectZone_${zoneId}`);
    
    if (zoneCard) zoneCard.classList.add('border-success', 'bg-light');
    if (btnSelect) btnSelect.style.display = 'none';
    if (btnDeselect) btnDeselect.style.display = 'block';
    
    // Actualizar UI de zonas seleccionadas
    updateSelectedZonesUI();
    
    showToast(`Zona "${zona.nombre}" seleccionada`, 'success');
}

// Deselect a zone
function deselectZone(zoneId) {
    // Remover de la selección
    selectedZonesForReservation = selectedZonesForReservation.filter(z => z.id !== zoneId);
    
    // Actualizar UI de la tarjeta
    const zoneCard = document.getElementById(`zoneCard_${zoneId}`);
    const btnSelect = document.getElementById(`btnSelectZone_${zoneId}`);
    const btnDeselect = document.getElementById(`btnDeselectZone_${zoneId}`);
    
    if (zoneCard) zoneCard.classList.remove('border-success', 'bg-light');
    if (btnSelect) btnSelect.style.display = 'block';
    if (btnDeselect) btnDeselect.style.display = 'none';
    
    // Actualizar UI de zonas seleccionadas
    updateSelectedZonesUI();
}

// Update selected zones UI
function updateSelectedZonesUI() {
    const selectedZonesDiv = document.getElementById('selectedZones');
    const selectedZonesList = document.getElementById('selectedZonesList');
    const selectedZonesCapacity = document.getElementById('selectedZonesCapacity');
    
    if (!selectedZonesDiv || !selectedZonesList || !selectedZonesCapacity) return;
    
    if (selectedZonesForReservation.length === 0) {
        selectedZonesDiv.style.display = 'none';
        return;
    }
    
    // Calcular capacidad total
    const totalCapacity = selectedZonesForReservation.reduce((sum, z) => sum + z.capacidad_total, 0);
    
    // Generar lista de zonas seleccionadas
    let html = '';
    selectedZonesForReservation.forEach(zona => {
        html += `
            <div class="mb-1">
                <span class="badge bg-success me-2">${zona.nombre}</span>
                <small class="text-muted">(${zona.capacidad_total} personas - ${zona.mesas_count} mesas)</small>
            </div>
        `;
    });
    
    selectedZonesList.innerHTML = html;
    selectedZonesCapacity.textContent = `${totalCapacity} personas`;
    selectedZonesDiv.style.display = 'block';
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

// Edit reservation
async function editReservation(reservationId) {
    try {
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Obtener todas las reservas para encontrar la específica
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar reservas');
        }
        
        const reservations = await response.json();
        const reservation = reservations.find(r => r.id === reservationId);
        
        if (!reservation) {
            showToast('Reserva no encontrada', 'error');
            return;
        }
        
        // Llenar el formulario con los datos de la reserva
        document.getElementById('editReservationId').value = reservation.id;
        
        // Formatear fecha para input type="date" (YYYY-MM-DD)
        let fechaFormateada = '';
        if (reservation.fecha) {
            // Si la fecha ya tiene formato YYYY-MM-DD, usarla directamente
            if (reservation.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                fechaFormateada = reservation.fecha;
            } else {
                // Convertir de otros formatos a YYYY-MM-DD
                const fecha = new Date(reservation.fecha);
                if (!isNaN(fecha)) {
                    fechaFormateada = fecha.toISOString().split('T')[0];
                }
            }
        }
        document.getElementById('editFecha').value = fechaFormateada;
        
        // Formatear hora para input type="time" (HH:MM)
        let horaFormateada = '';
        if (reservation.hora) {
            // Si la hora ya tiene formato HH:MM o HH:MM:SS, usar solo HH:MM
            if (reservation.hora.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
                horaFormateada = reservation.hora.substring(0, 5);
            }
        }
        document.getElementById('editHora').value = horaFormateada;
        
        document.getElementById('editComensales').value = reservation.numero_comensales;
        document.getElementById('editEstado').value = reservation.estado;
        document.getElementById('editObservaciones').value = reservation.observaciones || '';
        
        // Limpiar mensajes de error
        const errorDiv = document.getElementById('editReservationError');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('editReservationModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error al cargar reserva:', error);
        showToast('Error al cargar reserva', 'error');
    }
}

// Save reservation (actualizar)
async function saveReservation() {
    try {
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const reservationId = document.getElementById('editReservationId').value;
        
        if (!reservationId) {
            showToast('ID de reserva no encontrado', 'error');
            return;
        }
        
        // Obtener valores del formulario
        const fecha = document.getElementById('editFecha').value;
        const hora = document.getElementById('editHora').value;
        const numeroComensales = parseInt(document.getElementById('editComensales').value);
        const estado = document.getElementById('editEstado').value;
        const observaciones = document.getElementById('editObservaciones').value;
        
        // Validar campos requeridos
        if (!fecha) {
            const errorDiv = document.getElementById('editReservationError');
            errorDiv.textContent = 'La fecha es requerida';
            errorDiv.style.display = 'block';
            return;
        }
        
        if (!hora) {
            const errorDiv = document.getElementById('editReservationError');
            errorDiv.textContent = 'La hora es requerida';
            errorDiv.style.display = 'block';
            return;
        }
        
        const data = {
            fecha: fecha,
            hora: hora,
            numero_comensales: numeroComensales,
            estado: estado,
            observaciones: observaciones
        };
        
        const response = await fetch(`${API_BASE}/reservas/${reservationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Mostrar error en el modal
            const errorDiv = document.getElementById('editReservationError');
            errorDiv.textContent = result.error || 'Error al actualizar reserva';
            errorDiv.style.display = 'block';
            return;
        }
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editReservationModal'));
        modal.hide();
        
        showToast('Reserva actualizada correctamente', 'success');
        
        // Recargar lista de reservas
        loadAdminReservations();
        
    } catch (error) {
        console.error('Error al guardar reserva:', error);
        const errorDiv = document.getElementById('editReservationError');
        errorDiv.textContent = 'Error de conexión al guardar';
        errorDiv.style.display = 'block';
    }
}

// Delete reservation
async function deleteReservation(reservationId) {
    try {
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Confirmar eliminación con SweetAlert2
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        
        if (!result.isConfirmed) {
            return;
        }
        
        const response = await fetch(`${API_BASE}/reservas/${reservationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar reserva');
        }
        
        showToast('Reserva eliminada correctamente', 'success');
        
        // Recargar lista de reservas
        loadAdminReservations();
        
    } catch (error) {
        console.error('Error al eliminar reserva:', error);
        showToast(error.message || 'Error al eliminar reserva', 'error');
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
    document.getElementById('navMenu').style.display = 'block';
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
    
    // Load zones for home page
    loadHomeZones();
    
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
    
    // Set minimum date for edit reservation date as well
    const editFecha = document.getElementById('editFecha');
    if (editFecha) {
        editFecha.setAttribute('min', today);
    }
    
    // Validación en tiempo real para número de comensales
    const reservaComensales = document.getElementById('reservaComensales');
    const comensalesError = document.getElementById('comensalesError');
    if (reservaComensales) {
        reservaComensales.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value < 1 || value > 20 || isNaN(value)) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
                if (comensalesError) comensalesError.style.display = 'block';
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
                if (comensalesError) comensalesError.style.display = 'none';
            }
        });
        
        // Prevenir valores negativos con las flechas del input
        reservaComensales.addEventListener('keydown', function(e) {
            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                e.preventDefault();
            }
        });
    }
    
    // Reservation form handler
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validar autenticación
            if (!authToken) {
                showToast('Debes iniciar sesión para hacer una reserva', 'error');
                showSection('login');
                return;
            }
            
            // Validar campos del formulario
            const validationErrors = validateReservationForm();
            if (validationErrors.length > 0) {
                displayValidationErrors(validationErrors);
                return;
            }
            
            // Verificar modo de reserva
            const modeZone = document.getElementById('modeZone');
            const isZoneMode = modeZone && modeZone.checked;
            const enablePreorders = document.getElementById('enablePreorders');
            const hasPreorders = enablePreorders && enablePreorders.checked;
            const preorders = hasPreorders ? getSelectedPreorders() : [];
            
            const fecha = document.getElementById('reservaFecha').value;
            const hora = document.getElementById('reservaHora').value;
            const observaciones = document.getElementById('reservaObservaciones').value;
            
            try {
                let successCount = 0;
                let failedTables = [];
                
                if (isZoneMode) {
                    // Modo Zona - Validar que se haya seleccionado al menos una zona
                    if (!selectedZonesForReservation || selectedZonesForReservation.length === 0) {
                        showToast('Por favor selecciona al menos una zona antes de confirmar la reserva', 'error');
                        const availableZonesDiv = document.getElementById('availableZones');
                        if (availableZonesDiv) {
                            availableZonesDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        return;
                    }
                    
                    // Obtener todas las mesas disponibles de las zonas seleccionadas
                    let tablesToReserve = [];
                    const selectedZoneIds = selectedZonesForReservation.map(z => z.id);
                    
                    // Buscar en availableZonesData las zonas seleccionadas y extraer sus mesas
                    if (availableZonesData && availableZonesData.length > 0) {
                        availableZonesData.forEach(zoneData => {
                            if (selectedZoneIds.includes(zoneData.id) && zoneData.mesas_disponibles) {
                                tablesToReserve = tablesToReserve.concat(zoneData.mesas_disponibles);
                            }
                        });
                    }
                    
                    if (tablesToReserve.length === 0) {
                        showToast('No hay mesas disponibles en las zonas seleccionadas', 'error');
                        return;
                    }
                    
                    // Crear una reserva por cada mesa
                    for (let i = 0; i < tablesToReserve.length; i++) {
                        const table = tablesToReserve[i];
                        const data = {
                            id_mesa: table.id,
                            fecha: fecha,
                            hora: hora,
                            numero_comensales: table.capacidad || 1,
                            observaciones: observaciones
                        };
                        
                        // Solo la primera mesa incluye pre-pedidos
                        if (i === 0 && hasPreorders && preorders.length > 0) {
                            data.preorders = preorders;
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
                                successCount++;
                            } else {
                                const error = await response.json();
                                failedTables.push({
                                    table: `Mesa ${table.numero || table.id}`,
                                    error: error.error || 'Error desconocido'
                                });
                            }
                        } catch (error) {
                            failedTables.push({
                                table: `Mesa ${table.numero || table.id}`,
                                error: 'Error de conexión'
                            });
                        }
                    }
                    
                    // Mostrar mensaje de resultado
                    if (successCount === tablesToReserve.length) {
                        showToast(`Éxito: Se crearon ${successCount} reservas`, 'success');
                    } else if (successCount > 0) {
                        showToast(`Parcial: ${successCount} de ${tablesToReserve.length} reservas creadas`, 'warning');
                        if (failedTables.length > 0) {
                            console.error('Mesas que fallaron:', failedTables);
                            showToast(`${failedTables.length} mesa(s) no pudieron reservarse. Ver consola.`, 'error');
                        }
                    } else {
                        showToast('Error: No se pudo crear ninguna reserva', 'error');
                        return; // No limpiar formulario si todo falló
                    }
                    
                } else {
                    // Modo Mesa - Validar que se haya seleccionado una mesa
                    if (!selectedTableForReservation) {
                        showToast('Por favor selecciona una mesa antes de confirmar la reserva', 'error');
                        const availableTablesDiv = document.getElementById('availableTables');
                        if (availableTablesDiv) {
                            availableTablesDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        return;
                    }
                    
                    // Preparar datos para reserva de mesa individual
                    const data = {
                        id_mesa: selectedTableForReservation.id,
                        fecha: fecha,
                        hora: hora,
                        numero_comensales: parseInt(document.getElementById('reservaComensales').value),
                        observaciones: observaciones
                    };
                    
                    if (hasPreorders && preorders.length > 0) {
                        data.preorders = preorders;
                    }
                    
                    const response = await fetch(`${API_BASE}/reservas`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify(data)
                    });
                    
                    if (response.ok) {
                        successCount = 1;
                        showToast('Reserva creada exitosamente', 'success');
                    } else {
                        const error = await response.json();
                        showToast(error.error || 'Error al crear reserva', 'error');
                        return;
                    }
                }
                
                // Solo llegamos aquí si al menos una reserva tuvo éxito
                if (successCount > 0) {
                    // Limpiar formulario
                    reservationForm.reset();
                    
                    // Limpiar selecciones según el modo
                    if (isZoneMode) {
                        selectedZonesForReservation = [];
                        document.getElementById('selectedZones').style.display = 'none';
                        document.getElementById('availableZones').style.display = 'none';
                        
                        const zoneCards = document.querySelectorAll('.zone-card');
                        zoneCards.forEach(card => {
                            card.classList.remove('border-success', 'bg-light');
                        });
                        const selectButtons = document.querySelectorAll('[id^="btnSelectZone_"]');
                        selectButtons.forEach(btn => btn.style.display = 'block');
                        const deselectButtons = document.querySelectorAll('[id^="btnDeselectZone_"]');
                        deselectButtons.forEach(btn => btn.style.display = 'none');
                    } else {
                        selectedTableForReservation = null;
                        document.getElementById('selectedTable').style.display = 'none';
                        document.getElementById('availableTables').style.display = 'none';
                    }
                    
                    // Limpiar pre-pedidos
                    if (enablePreorders) {
                        enablePreorders.checked = false;
                        document.getElementById('preordersSection').style.display = 'none';
                        document.getElementById('preorderSummaryContainer').style.display = 'none';
                    }
                    
                    // Ir a mis reservas
                    showSection('mis-reservas');
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
window.editReservation = editReservation;
window.saveReservation = saveReservation;
window.deleteReservation = deleteReservation;
window.validateReservationForm = validateReservationForm;
window.displayValidationErrors = displayValidationErrors;
window.toggleReservationMode = toggleReservationMode;
window.selectZone = selectZone;
window.deselectZone = deselectZone;