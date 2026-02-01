-- Actualizar credenciales del administrador
-- Usuario: Admin, Contraseña: admin

USE restaurante;

-- Eliminar usuario administrador existente
DELETE FROM usuarios WHERE email = 'admin@lumiere.com';

-- Insertar nuevo administrador con credenciales correctas
-- Contraseña "admin" hash con bcrypt
INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Administrador Lumiére', 'admin@lumiere.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'administrador', '1234567890');

-- Verificar inserción
SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE email = 'admin@lumiere.com';

-- NOTA: Las nuevas credenciales son:
-- Usuario: admin@lumiere.com
-- Contraseña: admin