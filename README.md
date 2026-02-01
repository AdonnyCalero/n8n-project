# Sistema de Reservas de Restaurante

## Estructura del Proyecto
```
restaurante-reservas/
├── backend/          # API Flask (Python)
├── frontend/         # Interfaz web (HTML/CSS/JS)
├── database/         # Scripts SQL y esquema
├── docs/            # Documentación
├── assets/          # Imágenes y archivos estáticos
└── requirements.txt # Dependencias Python
```

## Tecnologías
- **Backend**: Python + Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Base de Datos**: MySQL (XAMPP)
- **Autenticación**: JWT
- **Excel**: pandas + openpyxl

## Requisitos Funcionales Implementados
- RF-01: Generación de reservas
- RF-02: Validación anti doble reserva
- RF-03: Pre-pedidos de platos
- RF-04: Dashboard de ocupación
- RF-05: Gestión rápida de mesas
- RF-06: Control de stock
- RF-07: Notas de consumo
- RF-08: Listado de reservas
- RF-09: Autenticación por roles
- RF-10: Paneles admin/cliente
- RF-11: Configuración horarios
- RF-12: Días cerrados
- RF-13: Validación de horarios
- RF-14: CRUD de zonas
- RF-15: Asignación mesas a zonas
- RF-16: Selección de zona en reserva
- RF-17: Visualización de zonas
- RF-18: Subida de Excel
- RF-19: Validación Excel
- RF-20: Previsualización
- RF-21: Registro automático

## Instalación
1. Instalar XAMPP y iniciar MySQL
2. Crear base de datos `restaurante`
3. Ejecutar scripts SQL en `database/`
4. Instalar dependencias: `pip install -r requirements.txt`
5. Configurar `.env` con datos de conexión
6. Iniciar backend: `python backend/app.py`
7. Abrir frontend en navegador

## Configuración
Crear archivo `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=restaurante
JWT_SECRET=secreto_super_seguro
```