# Guía de Instalación y Ejecución

## 1. Prerrequisitos

- **Python 3.8+**
- **XAMPP** (Apache + MySQL)
- **Navegador web moderno**

## 2. Configuración de la Base de Datos

1. **Iniciar XAMPP**
   - Ejecuta XAMPP Control Panel
   - Inicia Apache y MySQL

2. **Crear Base de Datos**
   - Abre phpMyAdmin (http://localhost/phpmyadmin)
   - Crea una nueva base de datos llamada `restaurante`
   - Importa el archivo `database/schema.sql`
   - Importa el archivo `database/indexes_triggers.sql` (opcional pero recomendado)

## 3. Configuración del Backend

1. **Instalar Python**
   ```bash
   # Verificar versión
   python --version
   ```

2. **Crear Entorno Virtual**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Instalar Dependencias**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar Variables de Entorno**
   - El archivo `.env` ya está configurado para XAMPP por defecto
   - Si usas diferentes credenciales, edita el archivo `.env`:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=tu_password
     DB_NAME=restaurante
     JWT_SECRET=restaurante_secret_key_2024
     ```

## 4. Iniciar la Aplicación

1. **Iniciar el Backend**
   ```bash
   cd backend
   python app.py
   ```
   El servidor se iniciará en `http://localhost:5000`

2. **Abrir el Frontend**
   - Abre tu navegador web
   - Ve a `http://localhost:5000`
   - La aplicación servirá automáticamente el frontend

## 5. Acceso Inicial

### Cuentas de Usuario Predefinidas

**Administrador:**
- Email: `admin@restaurante.com`
- Contraseña: `admin123`

**Cliente de Prueba:**
- Email: `cliente@ejemplo.com`
- Contraseña: `cliente123`

## 6. Características Disponibles

### Para Clientes
- ✅ Registro e inicio de sesión
- ✅ Consulta de disponibilidad de mesas
- ✅ Creación de reservas
- ✅ Visualización del menú
- ✅ Gestión de reservas propias

### Para Administradores
- ✅ Dashboard con estadísticas
- ✅ Gestión completa de reservas
- ✅ Control de mesas y zonas
- ✅ Gestión del menú y stock
- ✅ Carga masiva de pre-pedidos (Excel)
- ✅ Configuración de horarios
- ✅ Reportes y visualizaciones

## 7. Estructura del Proyecto

```
restaurante-reservas/
├── backend/              # API Flask
│   ├── app.py          # Aplicación principal
│   ├── models.py       # Modelos y lógica de negocio
│   └── config.py       # Configuración
├── frontend/            # Interfaz web
│   ├── index.html      # Página principal
│   ├── css/
│   │   └── styles.css  # Estilos
│   └── js/
│       ├── app.js      # Lógica principal
│       └── admin-functions.js # Funciones admin
├── database/           # Scripts SQL
│   ├── schema.sql      # Estructura de la BD
│   └── indexes_triggers.sql # Optimizaciones
├── docs/              # Documentación
├── assets/            # Archivos estáticos
├── requirements.txt   # Dependencias Python
├── .env             # Variables de entorno
└── README.md        # Este archivo
```

## 8. Solución de Problemas Comunes

### Error de Conexión a la Base de Datos
- Verifica que MySQL esté corriendo en XAMPP
- Confirma que la base de datos `restaurante` exista
- Revisa las credenciales en el archivo `.env`

### Error de Módulos Faltantes
```bash
pip install -r requirements.txt
```

### Problemas con CORS
El backend ya está configurado con CORS habilitado para `http://localhost:5000`

### Error de Autenticación
- Asegúrate de estar usando las credenciales correctas
- Verifica que el JWT_SECRET esté configurado correctamente

## 9. Desarrollo y Personalización

### Agregar Nuevas Funciones
1. **Backend**: Agrega nuevos endpoints en `app.py`
2. **Modelos**: Extiende las clases en `models.py`
3. **Frontend**: Agrega nuevas secciones en `index.html` y funciones en los archivos JS

### Personalización Visual
- Editar `frontend/css/styles.css`
- Los colores principales se definen en las variables CSS al inicio

### Base de Datos
- Las tablas ya están optimizadas con índices
- Triggers automáticos para gestión de stock
- Vistas predefinidas para consultas complejas

## 10. Seguridad Implementada

- 🔐 Autenticación JWT
- 🛡️ Contraseñas hasheadas con bcrypt
- 🔒 Validación anti-doble reserva
- 📊 Control de acceso por roles
- ✅ Validación de datos de entrada

## 11. Contacto y Soporte

Para reportes de errores o sugerencias:
- Revisa la consola del navegador para errores JavaScript
- Revisa la terminal del backend para errores Python
- Verifica los logs de MySQL en XAMPP

---

**¡Listo!** Tu sistema de reservas de restaurante está completamente funcional.