// Funciones mejoradas para el dashboard de administrador

// Variables globales (fallback si no están definidas)
if (typeof API_BASE === 'undefined') {
    window.API_BASE = 'http://localhost:5000/api';
}

if (typeof authToken === 'undefined') {
    window.authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
}

if (typeof showToast === 'undefined') {
    function showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Gestión de mesas (básica)
async function loadTablesManagement() {
    try {
        console.log('🔍 Debug - Token disponible:', !!authToken);
        console.log('🔍 Debug - Token longitud:', authToken ? authToken.length : 0);
        
        // Usar variables globales directamente
        const apiBase = window.API_BASE || 'http://localhost:5000/api';
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        console.log('🔍 API_BASE:', apiBase);
        console.log('🔍 Token disponible:', !!token);
        
        const [tablesResponse, zonesResponse] = await Promise.all([
            fetch(`${apiBase}/mesas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${apiBase}/zonas`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const tables = await tablesResponse.json();
        const zones = await zonesResponse.json();
        
        const container = document.getElementById('tablesManagement');
        container.innerHTML = '<h5>Lista de Mesas</h5>';
        
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
        showToast('❌ Error de conexión con el servidor. Verifica que el backend esté corriendo en el puerto 5000.', 'danger');
        
        const container = document.getElementById('tablesManagement');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">❌ No se puede conectar con el servidor. Asegúrate de que el backend esté corriendo.</div>';
        }
    }
}

// Menú management (básico)
async function loadMenuManagement() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        const menuItems = await response.json();
        
        const container = document.getElementById('menuManagement');
        container.innerHTML = '<h5>Gestión de Menú</h5>';
        
        // Crear tabla de menú
        const table = document.createElement('table');
        table.className = 'table table-striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Disponible</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        menuItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombre}</td>
                <td>$${item.precio}</td>
                <td>${item.categoria || 'Sin categoría'}</td>
                <td>${item.stock_disponible}</td>
                <td><span class="badge ${item.disponible ? 'bg-success' : 'bg-danger'}">${item.disponible ? 'Disponible' : 'No disponible'}</span></td>
            `;
            tbody.appendChild(row);
        });
        
        container.appendChild(table);
    } catch (error) {
        showToast('Error al cargar menú', 'danger');
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}