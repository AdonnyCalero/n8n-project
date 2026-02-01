// HOTFIX para el botón de login - Versión 3 (Final)
// Este archivo debe ser cargado DESPUÉS del script principal para corregir el problema

// Función login reescrita completamente
window.login = function(email, password) {
    console.log('🚀 INICIANDO LOGIN - VERSIÓN 3 FINAL', { email: email });
    
    // Validar parámetros
    if (!email || !password) {
        console.warn('⚠️ PARÁMETROS INVÁLIDOS');
        if (typeof showToast !== 'undefined') {
            showToast('Por favor ingrese email y contraseña', 'warning');
        }
        return;
    }
    
    // Verificar que el formulario existe
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ FORMULARIO LOGIN NO ENCONTRADO');
        if (typeof showToast !== 'undefined') {
            showToast('Error: No se encontró el formulario de login', 'danger');
        }
        return;
    }
    
    console.log('✅ Formulario de login encontrado:', loginForm.id);
    
    // Remover listeners existentes para evitar conflictos
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm);
    
    // Agregar nuevo event listener
    newLoginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        console.log('🚀 EVENTO SUBMIT DETECTADO');
        
        const email = document.getElementById('loginEmail');
        const password = document.getElementById('loginPassword');
        
        console.log('📧 DATOS DEL FORMULARIO:', {
            email: email ? email.value : 'NO ENCONTRADO',
            password: password ? password.value : 'NO ENCONTRADO',
            buttonType: event.submitter ? event.submitter.type : 'NO IDENTIFICADO'
        });
        
        if (!email || !password) {
            console.warn('⚠️ FORMULARIO INCOMPLETO');
            if (typeof showToast !== 'undefined') {
                showToast('Por favor complete todos los campos', 'warning');
            }
            return;
        }
        
        const emailValue = email.value.trim();
        const passwordValue = password.value.trim();
        
        console.log('🔑 ENVIANDO LOGIN:', { email: emailValue, rol: 'admin' });
        
        // Mostrar loading
        const submitButton = newLoginForm.querySelector('button[type="submit"]');
        if (submitButton) {
            const originalText = submitButton.textContent;
            submitButton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Enviando...';
            submitButton.disabled = true;
        }
        
        // Realizar login
        fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailValue, password: passwordValue })
        })
        .then(response => {
            console.log('📊 RESPUESTA RECIBIDA:', response.status);
            
            return response.json();
        })
        .then(data => {
            console.log('📋 DATOS RECIBIDOS:', data);
            
            if (data.token && data.user) {
                // Guardar datos del usuario
                authToken = data.token;
                currentUser = data.user;
                
                console.log('✅ LOGIN EXITOSO:', {
                    id: currentUser.id,
                    nombre: currentUser.nombre,
                    email: currentUser.email,
                    rol: currentUser.rol
                });
                
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Mostrar notificación
                if (typeof showToast !== 'undefined') {
                    showToast(`Bienvenido ${currentUser.nombre}`, 'success');
                }
                
                // Actualizar UI
                if (typeof updateUIForAuthenticatedUser === 'function') {
                    updateUIForAuthenticatedUser();
                }
                
                // Redirigir según rol
                if (currentUser.rol === 'administrador') {
                    console.log('🔄 REDIRIGIENDO AL PANEL DE ADMINISTRADOR');
                    if (typeof showSection === 'function') {
                        showSection('admin');
                    }
                } else {
                    console.log('🔄 REDIRIGIENDO A INICIO');
                    if (typeof showSection === 'function') {
                        showSection('inicio');
                    }
                }
                
                // Recuperar botón
                if (submitButton) {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
                
                // Verificar que la redirección funcione
                setTimeout(() => {
                    const currentSection = document.querySelector('.section.active');
                    console.log('📊 Sección actual:', currentSection ? currentSection.id : 'NINGUNA');
                    
                    if (currentSection && currentUser.rol === 'administrador' && currentSection.id !== 'admin') {
                        console.log('⚠️ La redirección al admin no funcionó, intentando de nuevo...');
                        if (typeof showSection === 'function') {
                            showSection('admin');
                        }
                    }
                }, 500);
                
            } else {
                console.error('❌ ERROR EN RESPUESTA:', data);
                
                // Recuperar botón
                if (submitButton) {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
                
                if (typeof showToast !== 'undefined') {
                    showToast(data.error || 'Error de autenticación', 'dialog');
                }
            }
            
        })
        .catch(error => {
            console.error('💥 ERROR EN LOGIN:', error);
            console.error('TIPO:', error.name);
            console.error('MENSAJE:', error.message);
            
            // Recuperar botón
            if (submitButton) {
                submitButton.textContent = 'Iniciar Sesión';
                submitButton.disabled = false;
            }
            
            // Mostrar error específico
            let errorMessage = 'Error de conexión';
            
            if (error.name === 'TypeError') {
                errorMessage = 'Error de tipo de datos';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No se puede conectar con el servidor';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Error de red. Verifique su conexión';
            } else {
                errorMessage = `Error: ${error.message}`;
            }
            
            if (typeof showToast !== 'undefined') {
                showToast(errorMessage, 'danger');
            }
        });
        
        // Marcar como procesado
        newLoginForm.setAttribute('data-fixed', 'true');
        console.log('🔧 FUNCIÓN LOGIN CORREGIDA Y APLICADA');
    });
    
    console.log('🎯 HOTFIX V3 - Inicializado exitosamente');
};

// Marcar como procesado
console.log('🔧 HOTFIX V3 - Script de corrección para el botón de login cargado');