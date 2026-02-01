/* Mejoras de usabilidad y UX para el wizard de reservas */

// Sistema de wizard paso a paso
class ReservationWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.reservationData = {};
        this.validation = {};
        this.init();
    }

    init() {
        this.createWizardHTML();
        this.attachEventListeners();
        this.showStep(1);
    }

    createWizardHTML() {
        const reservationSection = document.getElementById('reservas');
        if (!reservationSection) return;

        reservationSection.innerHTML = `
            <h2>Realizar Reserva - Asistente Guiado</h2>
            
            <div class="reservation-wizard">
                <!-- Pasos del progreso -->
                <div class="progress-steps">
                    <div class="progress-step active" data-step="1">
                        <div class="step-number">1</div>
                        <div class="step-label">Fecha y Hora</div>
                    </div>
                    <div class="progress-step" data-step="2">
                        <div class="step-number">2</div>
                        <div class="step-label">Comensales y Zona</div>
                    </div>
                    <div class="progress-step" data-step="3">
                        <div class="step-number">3</div>
                        <div class="step-label">Seleccionar Mesa</div>
                    </div>
                    <div class="progress-step" data-step="4">
                        <div class="step-number">4</div>
                        <div class="step-label">Confirmar Reserva</div>
                    </div>
                </div>

                <!-- Contenido del wizard -->
                <div class="wizard-content">
                    <!-- Paso 1: Fecha y Hora -->
                    <div class="wizard-step active" data-step="1">
                        <h3>📅 ¿Cuándo te gustaría reservar?</h3>
                        <div class="form-row">
                            <div class="form-group-enhanced">
                                <label for="wizardFecha">
                                    Fecha de la reserva
                                    <span class="required-indicator">*</span>
                                    <span class="tooltip">
                                        <i class="fas fa-question-circle"></i>
                                        <span class="tooltip-text">Selecciona la fecha para tu reserva</span>
                                    </span>
                                </label>
                                <div class="form-input-with-icon">
                                    <i class="fas fa-calendar"></i>
                                    <input type="date" id="wizardFecha" required>
                                </div>
                                <div class="form-validation" id="wizardFechaError"></div>
                            </div>
                            <div class="form-group-enhanced">
                                <label for="wizardHora">
                                    Hora de llegada
                                    <span class="required-indicator">*</span>
                                    <span class="tooltip">
                                        <i class="fas fa-question-circle"></i>
                                        <span class="tooltip-text">Hora a la que llegarás al restaurante</span>
                                    </span>
                                </label>
                                <div class="form-input-with-icon">
                                    <i class="fas fa-clock"></i>
                                    <input type="time" id="wizardHora" required>
                                </div>
                                <div class="form-validation" id="wizardHoraError"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 2: Comensales y Zona -->
                    <div class="wizard-step" data-step="2">
                        <h3>👥 ¿Cuántos son y dónde prefieren sentarse?</h3>
                        <div class="form-row">
                            <div class="form-group-enhanced">
                                <label for="wizardComensales">
                                    Número de comensales
                                    <span class="required-indicator">*</span>
                                </label>
                                <div class="form-input-with-icon">
                                    <i class="fas fa-users"></i>
                                    <select id="wizardComensales" required>
                                        <option value="">Seleccionar...</option>
                                        <option value="1">1 persona</option>
                                        <option value="2">2 personas</option>
                                        <option value="3">3 personas</option>
                                        <option value="4">4 personas</option>
                                        <option value="5">5 personas</option>
                                        <option value="6">6 personas</option>
                                        <option value="7">7 personas</option>
                                        <option value="8">8 personas</option>
                                    </select>
                                </div>
                                <div class="form-validation" id="wizardComensalesError"></div>
                            </div>
                            <div class="form-group-enhanced">
                                <label for="wizardZona">
                                    Zona preferida
                                    <span class="tooltip">
                                        <i class="fas fa-question-circle"></i>
                                        <span class="tooltip-text">Deja en blanco para cualquier zona disponible</span>
                                    </span>
                                </label>
                                <div class="form-input-with-icon">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <select id="wizardZona">
                                        <option value="">Cualquier zona</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 3: Seleccionar Mesa -->
                    <div class="wizard-step" data-step="3">
                        <h3>🪑 Selecciona tu mesa preferida</h3>
                        <div id="mesasDisponibles" class="mesa-selection-grid">
                            <div class="loading-spinner"></div>
                        </div>
                        <div class="form-validation" id="mesaSelectionError"></div>
                    </div>

                    <!-- Paso 4: Confirmación -->
                    <div class="wizard-step" data-step="4">
                        <h3>✅ Revisa y confirma tu reserva</h3>
                        <div class="reservation-summary">
                            <div class="summary-item">
                                <span>Fecha:</span>
                                <span id="confirmFecha">-</span>
                            </div>
                            <div class="summary-item">
                                <span>Hora:</span>
                                <span id="confirmHora">-</span>
                            </div>
                            <div class="summary-item">
                                <span>Comensales:</span>
                                <span id="confirmComensales">-</span>
                            </div>
                            <div class="summary-item">
                                <span>Zona:</span>
                                <span id="confirmZona">-</span>
                            </div>
                            <div class="summary-item">
                                <span>Mesa:</span>
                                <span id="confirmMesa">-</span>
                            </div>
                            <div class="form-group-enhanced">
                                <label for="wizardObservaciones">
                                    Observaciones especiales
                                    <span class="tooltip">
                                        <i class="fas fa-question-circle"></i>
                                        <span class="tooltip-text">Alergias, celebraciones especiales, etc.</span>
                                    </span>
                                </label>
                                <textarea id="wizardObservaciones" rows="3" 
                                    placeholder="Ej: Celebración de cumpleaños, alergia al maní, etc."></textarea>
                            </div>
                            <div class="summary-item">
                                <span>Total estimado:</span>
                                <span id="confirmTotal">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Botones de navegación -->
                <div class="wizard-navigation">
                    <button type="button" class="btn btn-secondary" id="prevBtn" onclick="wizard.previousStep()" style="display: none;">
                        <i class="fas fa-arrow-left"></i> Anterior
                    </button>
                    <button type="button" class="btn btn-primary" id="nextBtn" onclick="wizard.nextStep()">
                        Siguiente <i class="fas fa-arrow-right"></i>
                    </button>
                    <button type="button" class="btn btn-success" id="confirmBtn" onclick="wizard.confirmReservation()" style="display: none;">
                        <i class="fas fa-check"></i> Confirmar Reserva
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Validación en tiempo real
        document.getElementById('wizardFecha')?.addEventListener('change', () => this.validateStep(1));
        document.getElementById('wizardHora')?.addEventListener('change', () => this.validateStep(1));
        document.getElementById('wizardComensales')?.addEventListener('change', () => this.validateStep(2));
        
        // Establecer fecha mínima
        const fechaInput = document.getElementById('wizardFecha');
        if (fechaInput) {
            const today = new Date().toISOString().split('T')[0];
            fechaInput.setAttribute('min', today);
        }

        // Cargar zonas cuando se inicializa
        this.loadZonas();
    }

    async loadZonas() {
        try {
            const response = await fetch(`${API_BASE}/zonas`);
            const zonas = await response.json();
            
            const zonaSelect = document.getElementById('wizardZona');
            if (zonaSelect) {
                zonas.forEach(zona => {
                    const option = document.createElement('option');
                    option.value = zona.id;
                    option.textContent = zona.nombre;
                    zonaSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando zonas:', error);
        }
    }

    showStep(step) {
        // Ocultar todos los pasos
        document.querySelectorAll('.wizard-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // Mostrar paso actual
        document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add('active');
        
        // Actualizar indicadores de progreso
        document.querySelectorAll('.progress-step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 < step) {
                el.classList.add('completed');
            } else if (index + 1 === step) {
                el.classList.add('active');
            }
        });
        
        // Actualizar botones de navegación
        this.updateNavigationButtons();
        
        // Cargar datos específicos del paso
        if (step === 3) {
            this.loadAvailableTables();
        } else if (step === 4) {
            this.updateConfirmation();
        }
        
        // Hacer scroll al inicio del wizard
        document.querySelector('.reservation-wizard').scrollIntoView({ behavior: 'smooth' });
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const confirmBtn = document.getElementById('confirmBtn');
        
        // Botón anterior
        prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
        
        // Botón siguiente/confirmar
        if (this.currentStep === this.totalSteps) {
            nextBtn.style.display = 'none';
            confirmBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            confirmBtn.style.display = 'none';
        }
    }

    validateStep(step) {
        let isValid = true;
        let errorMessage = '';
        
        switch(step) {
            case 1:
                const fecha = document.getElementById('wizardFecha').value;
                const hora = document.getElementById('wizardHora').value;
                
                if (!fecha) {
                    errorMessage = 'Por favor selecciona una fecha';
                    isValid = false;
                } else if (!hora) {
                    errorMessage = 'Por favor selecciona una hora';
                    isValid = false;
                } else {
                    const selectedDate = new Date(fecha);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate < today) {
                        errorMessage = 'La fecha no puede ser anterior a hoy';
                        isValid = false;
                    }
                }
                
                this.showFieldValidation('wizardFecha', isValid ? 'success' : 'error', errorMessage);
                this.showFieldValidation('wizardHora', isValid ? 'success' : 'error', errorMessage);
                
                if (isValid) {
                    this.reservationData.fecha = fecha;
                    this.reservationData.hora = hora;
                }
                break;
                
            case 2:
                const comensales = document.getElementById('wizardComensales').value;
                const zona = document.getElementById('wizardZona').value;
                
                if (!comensales) {
                    errorMessage = 'Por selecciona el número de comensales';
                    isValid = false;
                } else {
                    this.reservationData.comensales = parseInt(comensales);
                    this.reservationData.idZona = zona || null;
                }
                
                this.showFieldValidation('wizardComensales', isValid ? 'success' : 'error', errorMessage);
                break;
        }
        
        return isValid;
    }

    showFieldValidation(fieldId, status, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(fieldId + 'Error');
        
        if (status === 'success') {
            field.classList.remove('input-error');
            field.classList.add('input-success');
            errorDiv.textContent = '✅ Válido';
            errorDiv.className = 'form-validation success';
        } else {
            field.classList.remove('input-success');
            field.classList.add('input-error');
            errorDiv.textContent = message;
            errorDiv.className = 'form-validation error';
        }
    }

    async loadAvailableTables() {
        const container = document.getElementById('mesasDisponibles');
        container.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            const params = new URLSearchParams({
                fecha: this.reservationData.fecha,
                hora: this.reservationData.hora,
                comensales: this.reservationData.comensales,
                ...(this.reservationData.idZona && { id_zona: this.reservationData.idZona })
            });
            
            const response = await fetch(`${API_BASE}/disponibilidad?${params}`);
            const data = await response.json();
            
            if (response.ok && data.mesas_disponibles.length > 0) {
                this.displayAvailableTables(data.mesas_disponibles);
            } else {
                container.innerHTML = `
                    <div class="no-tables-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>No hay mesas disponibles para la fecha y hora seleccionadas.</p>
                        <p>Intenta con otra fecha, hora o número de comensales.</p>
                        <button class="btn btn-secondary" onclick="wizard.previousStep()">
                            <i class="fas fa-arrow-left"></i> Modificar búsqueda
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error al cargar mesas disponibles. Inténtalo de nuevo.</p>
                </div>
            `;
        }
    }

    displayAvailableTables(tables) {
        const container = document.getElementById('mesasDisponibles');
        container.innerHTML = '';
        
        tables.forEach(table => {
            const card = document.createElement('div');
            card.className = 'mesa-card available';
            card.innerHTML = `
                <div class="availability-indicator"></div>
                <div class="mesa-number">M${table.numero}</div>
                <div class="mesa-capacity">
                    <i class="fas fa-users"></i> ${table.capacidad} personas
                </div>
                <div class="mesa-zone">
                    <i class="fas fa-map-marker-alt"></i> ${table.zona_nombre || 'Sin zona'}
                </div>
            `;
            
            card.addEventListener('click', () => this.selectTable(table));
            container.appendChild(card);
        });
    }

    selectTable(table) {
        // Deseleccionar todas las mesas
        document.querySelectorAll('.mesa-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Seleccionar mesa actual
        event.currentTarget.classList.add('selected');
        
        // Guardar datos de la mesa
        this.reservationData.mesa = table;
        
        // Limpiar mensajes de error
        this.showFieldValidation('mesaSelection', 'success', '✅ Mesa seleccionada');
    }

    updateConfirmation() {
        document.getElementById('confirmFecha').textContent = this.formatDate(this.reservationData.fecha);
        document.getElementById('confirmHora').textContent = this.reservationData.hora;
        document.getElementById('confirmComensales').textContent = `${this.reservationData.comensales} personas`;
        document.getElementById('confirmZona').textContent = this.reservationData.mesa?.zona_nombre || 'Cualquier zona';
        document.getElementById('confirmMesa').textContent = `Mesa ${this.reservationData.mesa?.numero}`;
        
        // Estimar total (usando un promedio de $25 por persona)
        const estimatedTotal = this.reservationData.comensales * 25;
        document.getElementById('confirmTotal').textContent = `$${estimatedTotal.toFixed(2)} (estimado)`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    }

    nextStep() {
        if (this.validateStep(this.currentStep)) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    previousStep() {
        this.currentStep--;
        this.showStep(this.currentStep);
    }

    async confirmReservation() {
        const observaciones = document.getElementById('wizardObservaciones').value;
        
        if (!this.reservationData.mesa) {
            this.showFieldValidation('mesaSelection', 'error', 'Por favor selecciona una mesa');
            return;
        }
        
        // Mostrar overlay de carga
        this.showLoading();
        
        try {
            const reservationData = {
                id_mesa: this.reservationData.mesa.id,
                fecha: this.reservationData.fecha,
                hora: this.reservationData.hora,
                numero_comensales: this.reservationData.comensales,
                observaciones: observaciones
            };
            
            const response = await fetch(`${API_BASE}/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(reservationData)
            });
            
            this.hideLoading();
            
            if (response.ok) {
                this.showSuccessAnimation();
            } else {
                const error = await response.json();
                showAlert(error.error || 'Error al crear reserva', 'error');
            }
        } catch (error) {
            this.hideLoading();
            showAlert('Error de conexión. Inténtalo de nuevo.', 'error');
        }
    }

    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        overlay.id = 'wizardLoading';
        document.body.appendChild(overlay);
    }

    hideLoading() {
        const overlay = document.getElementById('wizardLoading');
        if (overlay) overlay.remove();
    }

    showSuccessAnimation() {
        const wizardContent = document.querySelector('.wizard-content');
        wizardContent.innerHTML = `
            <div class="success-animation">
                <div class="checkmark">
                    <i class="fas fa-check"></i>
                </div>
                <h2>¡Reserva Confirmada!</h2>
                <p>Tu reserva ha sido registrada exitosamente.</p>
                <div class="reservation-details">
                    <p><strong>Confirmación:</strong> #${Math.floor(Math.random() * 10000)}</p>
                    <p><strong>Fecha:</strong> ${this.formatDate(this.reservationData.fecha)}</p>
                    <p><strong>Hora:</strong> ${this.reservationData.hora}</p>
                    <p><strong>Mesa:</strong> Mesa ${this.reservationData.mesa.numero}</p>
                    <p><strong>Comensales:</strong> ${this.reservationData.comensales}</p>
                </div>
                <div style="margin-top: 2rem;">
                    <button class="btn btn-primary" onclick="showSection('mis-reservas')">
                        <i class="fas fa-list"></i> Ver Mis Reservas
                    </button>
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-plus"></i> Nueva Reserva
                    </button>
                </div>
            </div>
        `;
        
        // Ocultar botones de navegación
        document.querySelector('.wizard-navigation').style.display = 'none';
    }
}

// Inicializar wizard cuando se carga la página
let wizard;

document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en la página principal
    if (document.getElementById('reservas')) {
        wizard = new ReservationWizard();
    }
});

// Agregar los nuevos estilos
const usabilityLink = document.createElement('link');
usabilityLink.rel = 'stylesheet';
usabilityLink.href = 'css/usability-enhancements.css';
document.head.appendChild(usabilityLink);