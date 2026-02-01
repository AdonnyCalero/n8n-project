// HOTFIX para el botón de login que no funciona
// Este script reemplaza la función login temporalmente

// Función login mejorada con debugging
window.login = function(email, password) {
    console.log('🚀 HOTFIX: Iniciando función de login (v2)', { email, rol: 'desconocido' });
    
    try {
        // Verificar que los parámetros sean válidos
        if (!email || !password) {
            console.warn('⚠️ Parámetros inválidos:', { email: !!email, password: !!password });
            if (typeof showToast !== 'undefined') {
                showToast('Por favor ingrese email y contraseña', 'warning');
            }
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('📊 Status de respuesta:', response.status);
        
        const data = await response.json();
        console.log('📋 Datos recibidos:', data);
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Validar que los datos del usuario sean correctos
            if (!currentUser || !currentUser.rol) {
                throw new Error('Datos de usuario inválidos recibidos del servidor');
            }
            
            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            console.log('✅ Login exitoso:', {
                id: currentUser.id,
                nombre: currentUser.nombre,
                email: currentUser.email,
                rol: currentUser.rol
            });
            
            // Mostrar notificación de éxito
            if (typeof showToast !== 'undefined') {
                showToast(`Bienvenido ${currentUser.nombre}`, 'success');
            }
            
            // Actualizar UI según rol
            if (typeof updateUIForAuthenticatedUser === 'function') {
                updateUIForAuthenticatedUser();
            }
            
            // Redirigir según rol
            if (currentUser.rol === 'administrador') {
                console.log('🔄 Redirigiendo al panel de administrador...');
                if (typeof showSection === 'function') {
                    setTimeout(() => showSection('admin'), 100);
                }
            } else {
                console.log('🔄 Redirigiendo a inicio...');
                if (typeof showSection === 'function') {
                    setTimeout(() => showSection('inicio'), 100);
                }
            }
            
            // Verificar si los listeners del formulario están funcionando
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                console.log('🔍 Verificando listeners del formulario...');
                const events = getEventListeners ? getEventListeners(loginForm) : [];
                console.log('📊 Event listeners encontrados:', events.length);
            }
            
        } else {
            console.error('❌ Error en respuesta del servidor:', data);
            if (typeof showToast !== 'undefined') {
                showToast(data.error || 'Error de autenticación', 'danger');
            }
        }
        
    } catch (error) {
        console.error('💥 Error en la función de login:', error);
        console.error('Tipo de error:', error.name);
        console.error('Mensaje de error:', error.message);
        
        // Mostrar notificación de error específica
        let errorMessage = 'Error de conexión';
        
        if (error.name === 'TypeError') {
            errorMessage = 'Error de tipo de datos. Verifique los campos del formulario.';
        } else if (error.name === 'NetworkError') {
            errorMessage = 'Error de red. Verifique su conexión a internet.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'No se puede conectar al servidor. Revise su conexión.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        
        if (typeof showToast !== 'undefined') {
            showToast(errorMessage, 'danger');
        }
    }
};

console.log('🔧 HOTFIX para login aplicado correctamente');