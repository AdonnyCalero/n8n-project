// Funciones mejoradas para el dashboard de administrador

// Variables globales (fallback si no están definidas)
if (typeof API_BASE === 'undefined') {
    window.API_BASE = window.location.origin + '/api';
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
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE}/admin/platos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const menuItems = await response.json();
        
        const container = document.getElementById('menuManagement');
        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h5 class="text-primary"><i class="bi bi-cup-hot"></i> Gestión de Menú</h5>
                    <p class="text-muted">Administra los platos del restaurante mediante archivo Excel</p>
                </div>
            </div>
            
            <!-- Sección de importar/exportar Excel -->
            <div class="card mb-4">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0"><i class="bi bi-file-earmark-excel"></i> Cargar/Descargar Plantilla de Platos</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="alert alert-info">
                                <h6><i class="bi bi-info-circle"></i> Instrucciones:</h6>
                                <ul class="mb-0">
                                    <li>Descarga la plantilla actual de platos</li>
                                    <li>Edita los nombres y el stock según necesites</li>
                                    <li>Los IDs se mantienen para conservar la relación con pre-pedidos</li>
                                    <li>Carga el archivo Excel actualizado</li>
                                </ul>
                            </div>
                            <button class="btn btn-primary w-100" onclick="downloadPlatosTemplate()">
                                <i class="bi bi-download"></i> Descargar Plantilla Excel
                            </button>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h6><i class="bi bi-upload"></i> Cargar Plantilla Editada</h6>
                                    <input type="file" id="platosExcelFile" accept=".xlsx,.xls" class="form-control mb-3">
                                    <button class="btn btn-success w-100" onclick="uploadPlatosExcel()">
                                        <i class="bi bi-cloud-upload"></i> Cargar Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tabla de platos actuales -->
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-list-ul"></i> Platos Actuales</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Precio</th>
                                    <th>Stock</th>
                                    <th>Disponible</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Llenar tabla de platos
        const tbody = container.querySelector('tbody');
        menuItems.forEach(item => {
            const isDisponible = item.disponible && item.stock_disponible > 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td>${item.nombre}</td>
                <td><span class="badge bg-info">${item.categoria || 'Sin categoría'}</span></td>
                <td><strong class="text-success">$${parseFloat(item.precio || 0).toFixed(2)}</strong></td>
                <td><span class="badge ${item.stock_disponible > 0 ? 'bg-success' : 'bg-danger'}">${item.stock_disponible}</span></td>
                <td><span class="badge ${isDisponible ? 'bg-success' : 'bg-danger'}">${isDisponible ? 'Disponible' : 'No disponible'}</span></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        showToast('Error al cargar menú', 'danger');
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function downloadPlatosTemplate() {
    try {
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/platos/exportar/plantilla`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al descargar plantilla');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_platos_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Plantilla descargada correctamente', 'success');
    } catch (error) {
        console.error('Error al descargar plantilla:', error);
        showToast('Error al descargar plantilla', 'danger');
    }
}

async function uploadPlatosExcel() {
    try {
        const fileInput = document.getElementById('platosExcelFile');
        const token = window.authToken || localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('Por favor selecciona un archivo Excel', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        
        const formData = new FormData();
        formData.append('file', file);
        
        showToast('Cargando archivo...', 'info');
        
        const response = await fetch(`${API_BASE}/platos/importar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar archivo');
        }
        
        const resultados = data.resultados;
        
        // Mostrar resultados detallados
        let message = `Importación completada:\n`;
        message += `✅ ${resultados.actualizados} platos actualizados\n`;
        message += `➕ ${resultados.creados} platos creados\n`;
        message += `📊 Total procesados: ${resultados.procesados}`;
        
        if (resultados.errores.length > 0) {
            message += `\n\n❌ ${resultados.errores.length} errores:\n`;
            resultados.errores.slice(0, 5).forEach(error => {
                message += `- ${error}\n`;
            });
            if (resultados.errores.length > 5) {
                message += `... y ${resultados.errores.length - 5} errores más`;
            }
            showToast(message, 'warning');
        } else {
            showToast(message, 'success');
        }
        
        // Recargar menú
        setTimeout(() => {
            loadMenuManagement();
        }, 1000);
        
    } catch (error) {
        console.error('Error al cargar archivo:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

// Make functions globally available
window.downloadPlatosTemplate = downloadPlatosTemplate;
window.uploadPlatosExcel = uploadPlatosExcel;