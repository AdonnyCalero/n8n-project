// Fix para el problema del botón de login del administrador
// Reemplazar el event listener existente

// 1. Buscar el formulario de login existente
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    // 2. Remover el event listener anterior
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm);
    
    // 3. Agregar el nuevo event listener
    newLoginForm.addEventListener('submit', function(e) {
        console.log('🚀 Evento submit del formulario de login detectado');
        e.preventDefault();
        
        const email = document.getElementById('loginEmail')?.value || '';
        const password = document.getElementById('loginPassword')?.value || '';
        
        console.log('📋 Formulario enviado:', { email, password });
        
        // Llamar a la función login del archivo principal
        if (typeof login === 'function') {
            login(email, password);
        } else {
            console.error('❌ La función login() no está disponible');
            // Mostrar error al usuario
            if (document.getElementById('loginError')) {
                document.getElementById('loginError').textContent = 'Error: No se pudo procesar el formulario';
                document.getElementById('loginError').style.display = 'block';
            }
        }
    });
    
    console.log('✅ Event listener del formulario de login actualizado');
} else {
    console.error('❌ No se encontró el formulario de login');
}

// 4. Agregar logs para depuración
if (typeof showToast !== 'undefined') {
    // Guardar la función original
    const originalShowToast = showToast;
    
    // Función mejorada con logs
    function showToastWithLog(message, type = 'info') {
        console.log(`Toast mostrado [${type}]: ${message}`);
        return originalShowToast(message, type);
    }
    
    // Reemplazar temporalmente la función global
    window.showToast = showToastWithLog;
}