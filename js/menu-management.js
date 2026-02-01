// Funciones de gestión de menú para el administrador

// Cargar gestión de menú
async function loadMenuManagement() {
    try {
        const response = await fetch(`${API_BASE}/platos`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const menuItems = await response.json();
        
        const container = document.getElementById('menuManagement');
        container.innerHTML = '<h5>Gestión de Menú</h5>';
        
        // Crear tabla de menú
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        table.innerHTML = `
            <thead class="table-dark">
                <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Precio</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Stock Max</th>
                    <th>Disponible</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        menuItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.descripcion || 'Sin descripción'}</td>
                <td>$${item.precio}</td>
                <td>${item.categoria || 'Sin categoría'}</td>
                <td>${item.stock_disponible}</td>
                <td>${item.stock_maximo || 100}</td>
                <td><span class="badge ${item.disponible ? 'bg-success' : 'bg-danger'}">${item.disponible ? 'Disponible' : 'No disponible'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="editDish(${item.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDish(${item.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        container.appendChild(table);
    } catch (error) {
        showToast('Error al cargar menú', 'danger');
    }
}

// Mostrar modal para agregar plato
function showAddDishModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">Agregar Nuevo Plato</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addDishForm">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Nombre</label>
                                <input type="text" class="form-control" id="dishName" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Precio</label>
                                <input type="number" class="form-control" id="dishPrice" step="0.01" min="0" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Categoría</label>
                                <input type="text" class="form-control" id="dishCategory">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Stock Inicial</label>
                                <input type="number" class="form-control" id="dishStock" min="0" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea class="form-control" id="dishDescription" rows="3"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Stock Máximo</label>
                            <input type="number" class="form-control" id="dishMaxStock" min="0" value="100">
                            </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="dishAvailable" checked>
                                <label class="form-check-label" for="dishAvailable">Disponible para venta</label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="addDish()">Guardar Plato</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Limpiar al cerrar
    modal.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modal);
    });
}

// Editar plato
async function editDish(dishId) {
    try {
        const response = await fetch(`${API_BASE}/platos/${dishId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const dish = await response.json();
        
        if (response.ok) {
            showEditDishModal(dish);
        } else {
            showToast('Error al obtener plato', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

// Mostrar modal para editar plato
function showEditDishModal(dish) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-warning text-white">
                    <h5 class="modal-title">Editar Plato: ${dish.nombre}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editDishForm">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Nombre</label>
                                <input type="text" class="form-control" id="editDishName" value="${dish.nombre}" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Precio</label>
                                <input type="number" class="form-control" id="editDishPrice" value="${dish.precio}" step="0.01" min="0" required>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Categoría</label>
                                <input type="text" class="form-control" id="editDishCategory" value="${dish.categoria || ''}">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Stock Disponible</label>
                                <input type="number" class="form-control" id="editDishStock" value="${dish.stock_disponible}" min="0" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea class="form-control" id="editDishDescription" rows="3">${dish.descripcion || ''}</textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Stock Máximo</label>
                            <input type="number" class="form-control" id="editDishMaxStock" value="${dish.stock_maximo || 100}" min="0">
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="editDishAvailable" ${dish.disponible ? 'checked' : ''}>
                                <label class="form-check-label" for="editDishAvailable">Disponible para venta</label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="saveDishEdit(${dish.id})">Guardar Cambios</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Limpiar al cerrar
    modal.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modal);
    });
}

// Agregar nuevo plato
async function addDish() {
    try {
        const formData = {
            nombre: document.getElementById('dishName').value,
            descripcion: document.getElementById('dishDescription').value,
            precio: parseFloat(document.getElementById('dishPrice').value),
            categoria: document.getElementById('dishCategory').value,
            stock_disponible: parseInt(document.getElementById('dishStock').value),
            stock_maximo: parseInt(document.getElementById('dishMaxStock').value),
            disponible: document.getElementById('dishAvailable').checked
        };
        
        const response = await fetch(`${API_BASE}/platos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Plato agregado correctamente', 'success');
            // Cerrar modal y recargar
            const modal = document.querySelector('.modal.show');
            if (modal) {
                bootstrap.Modal.getInstance(modal).hide();
            }
            loadMenuManagement(); // Recargar tabla
        } else {
            showToast(result.error || 'Error al agregar plato', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

// Guardar edición de plato
async function saveDishEdit(dishId) {
    try {
        const formData = {
            nombre: document.getElementById('editDishName').value,
            descripcion: document.getElementById('editDishDescription').value,
            precio: parseFloat(document.getElementById('editDishPrice').value),
            categoria: document.getElementById('editDishCategory').value,
            stock_disponible: parseInt(document.getElementById('editDishStock').value),
            stock_maximo: parseInt(document.getElementById('editDishMaxStock').value),
            disponible: document.getElementById('editDishAvailable').checked
        };
        
        const response = await fetch(`${API_BASE}/platos/${dishId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Plato actualizado correctamente', 'success');
            // Cerrar modal y recargar
            const modal = document.querySelector('.modal.show');
            if (modal) {
                bootstrap.Modal.getInstance(modal).hide();
            }
            loadMenuManagement(); // Recargar tabla
        } else {
            showToast(result.error || 'Error al actualizar plato', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}

// Eliminar plato
async function deleteDish(dishId) {
    if (!confirm(`¿Está seguro de eliminar este plato? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/platos/${dishId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Plato eliminado correctamente', 'success');
            loadMenuManagement(); // Recargar tabla
        } else {
            showToast(result.error || 'Error al eliminar plato', 'danger');
        }
    } catch (error) {
        showToast('Error de conexión', 'danger');
    }
}