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

// Cargar zonas
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
            }
        }
    } catch (error) {
        console.error('Error al cargar zonas:', error);
        showToast('Error de conexión al cargar zonas', 'danger');
    }
}