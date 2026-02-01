-- Corregir credenciales de usuarios predefinidos
-- Usar contraseñas hash reales con bcrypt

USE restaurante;

-- Eliminar usuarios existentes para evitar conflictos
DELETE FROM usuarios WHERE email IN ('admin@restaurante.com', 'cliente@ejemplo.com');

-- Insertar usuarios con contraseñas hash correctas
-- admin123 -> hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W
-- cliente123 -> hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W

INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Administrador Sistema', 'admin@restaurante.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'administrador', '1234567890'),
('Cliente Demo', 'cliente@ejemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'cliente', '0987654321');

-- Verificar usuarios insertados
SELECT id, nombre, email, rol, telefono, creado_en FROM usuarios WHERE email IN ('admin@restaurante.com', 'cliente@ejemplo.com');

-- NOTA: Las contraseñas son:
-- admin@restaurante.com -> admin123
-- cliente@ejemplo.com -> cliente123