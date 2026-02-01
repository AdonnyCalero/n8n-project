-- Optimización de Base de Datos - 3FN y Rendimiento
-- Cumplimiento de RNF-001: Mantenibilidad (3FN) y RNF-003: Rendimiento

USE restaurante;

-- Estructura optimizada 3FN
-- Tabla de categorías (separación de platos para 3FN)
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de platos optimizada
CREATE TABLE IF NOT EXISTS platos_3fn (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    stock_disponible INT DEFAULT 0,
    stock_maximo INT DEFAULT 100,
    imagen VARCHAR(255),
    disponible BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE SET NULL,
    INDEX idx_categoria (id_categoria),
    INDEX idx_disponibilidad (disponible, stock_disponible),
    INDEX idx_nombre (nombre)
);

-- Tabla de auditoría para reservas (trazabilidad)
CREATE TABLE IF NOT EXISTS reservas_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    accion VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20),
    usuario_accion VARCHAR(100),
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detalles JSON,
    INDEX idx_reserva_audit (id_reserva),
    INDEX idx_fecha_accion (fecha_accion)
);

-- Tabla de sesiones (para seguridad y tracking)
CREATE TABLE IF NOT EXISTS sesiones_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_sesion (id_usuario),
    INDEX idx_token (token_hash),
    INDEX idx_expiracion (fecha_expiracion)
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descripcion TEXT,
    tipo VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vistas optimizadas para rendimiento
CREATE OR REPLACE VIEW vista_reservas_detalles AS
SELECT 
    r.id,
    r.fecha,
    r.hora,
    r.numero_comensales,
    r.estado,
    r.observaciones,
    r.creada_en,
    u.nombre as cliente_nombre,
    u.email as cliente_email,
    m.numero as mesa_numero,
    m.capacidad as mesa_capacidad,
    z.nombre as zona_nombre,
    CASE 
        WHEN r.fecha < CURDATE() THEN 'pasada'
        WHEN r.fecha = CURDATE() AND r.hora < CURTIME() THEN 'pasada'
        WHEN r.estado = 'cancelada' THEN 'cancelada'
        ELSE r.estado
    END as estado_calculado,
    TIMESTAMPDIFF(MINUTE, r.creada_en, NOW()) as antiguedidad_minutos
FROM reservas r
JOIN usuarios u ON r.id_usuario = u.id
JOIN mesas m ON r.id_mesa = m.id
LEFT JOIN zonas z ON m.id_zona = z.id;

-- Procedimiento almacenado para verificar disponibilidad optimizado
DELIMITER //
CREATE PROCEDURE sp_verificar_disponibilidad(
    IN p_fecha DATE,
    IN p_hora TIME,
    IN p_comensales INT,
    IN p_id_zona INT
)
BEGIN
    SELECT 
        m.id,
        m.numero,
        m.capacidad,
        z.nombre as zona_nombre,
        m.posicion_x,
        m.posicion_y
    FROM mesas m
    LEFT JOIN zonas z ON m.id_zona = z.id
    WHERE m.capacidad >= p_comensales
      AND m.estado != 'mantenimiento'
      AND (p_id_zona IS NULL OR m.id_zona = p_id_zona)
      AND NOT EXISTS (
          SELECT 1 
          FROM reservas r 
          WHERE r.id_mesa = m.id 
            AND r.fecha = p_fecha
            AND r.estado = 'confirmada'
            AND ABS(TIME_TO_SEC(r.hora) - TIME_TO_SEC(p_hora)) < 7200
      )
    ORDER BY m.capacidad ASC, m.numero ASC;
END //
DELIMITER ;

-- Función optimizada para stock
DELIMITER //
CREATE FUNCTION fn_stock_disponible(p_id_plato INT) 
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_stock INT;
    
    SELECT stock_disponible INTO v_stock
    FROM platos 
    WHERE id = p_id_plato AND disponible = TRUE;
    
    RETURN IFNULL(v_stock, 0);
END //
DELIMITER ;

-- Triggers optimizados para auditoría
DELIMITER //
CREATE TRIGGER trg_reservas_insert
AFTER INSERT ON reservas
FOR EACH ROW
BEGIN
    INSERT INTO reservas_audit (
        id_reserva, accion, estado_nuevo, usuario_accion, detalles
    ) VALUES (
        NEW.id, 'INSERT', NEW.estado, 'system', 
        JSON_OBJECT(
            'id_usuario', NEW.id_usuario,
            'id_mesa', NEW.id_mesa,
            'fecha', NEW.fecha,
            'hora', NEW.hora,
            'comensales', NEW.numero_comensales
        )
    );
    
    -- Actualizar estado de mesa
    UPDATE mesas SET estado = 'reservada' WHERE id = NEW.id_mesa;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER trg_reservas_update
AFTER UPDATE ON reservas
FOR EACH ROW
BEGIN
    IF OLD.estado != NEW.estado THEN
        INSERT INTO reservas_audit (
            id_reserva, accion, estado_anterior, estado_nuevo, usuario_accion, detalles
        ) VALUES (
            NEW.id, 'UPDATE', OLD.estado, NEW.estado, 'system',
            JSON_OBJECT('motivo_cambio', 'actualizacion_estado')
        );
        
        -- Actualizar estado de mesa según el estado de la reserva
        IF NEW.estado = 'cancelada' OR NEW.estado = 'completada' THEN
            UPDATE mesas SET estado = 'disponible' WHERE id = NEW.id_mesa;
        END IF;
    END IF;
END //
DELIMITER ;

-- Insertar categorías iniciales
INSERT IGNORE INTO categorias (nombre, descripcion) VALUES
('Entradas', 'Aperitivos y platos pequeños'),
('Platos Fuertes', 'Platos principales del menú'),
('Postres', 'Dulces y postres variados'),
('Bebidas', 'Bebidas sin y con alcohol'),
('Ensaladas', 'Opciones frescas y saludables');

-- Migrar platos existentes a la estructura 3FN
INSERT IGNORE INTO platos_3fn (id, id_categoria, nombre, descripcion, precio, stock_disponible, stock_maximo, disponible)
SELECT 
    p.id,
    CASE p.categoria
        WHEN 'Entradas' THEN 1
        WHEN 'Platos Fuertes' THEN 2
        WHEN 'Postres' THEN 3
        WHEN 'Bebidas' THEN 4
        WHEN 'Ensaladas' THEN 5
        ELSE NULL
    END,
    p.nombre,
    p.descripcion,
    p.precio,
    p.stock_disponible,
    p.stock_maximo,
    p.disponible
FROM platos p;

-- Configuración inicial del sistema
INSERT IGNORE INTO configuracion_sistema (clave, valor, descripcion, tipo) VALUES
('tiempo_reserva_default', '120', 'Tiempo por defecto para reserva en minutos', 'number'),
('max_comensales_por_mesa', '8', 'Máximo de comensales permitidos por mesa', 'number'),
('dias_anticipo_reserva', '30', 'Días máximos de anticipación para reservar', 'number'),
('hora_apertura_default', '12:00', 'Hora de apertura por defecto', 'string'),
('hora_cierre_default', '23:00', 'Hora de cierre por defecto', 'string'),
('mantenimiento_mode', 'false', 'Modo mantenimiento del sistema', 'boolean'),
('email_notifications', 'true', 'Enviar notificaciones por email', 'boolean');

-- Índices compuestos para rendimiento
CREATE INDEX idx_reservas_fecha_hora_estado ON reservas(fecha, hora, estado);
CREATE INDEX idx_mesas_capacidad_zona ON mesas(capacidad, id_zona, estado);
CREATE INDEX idx_platos_categoria_disponibilidad ON platos_3fn(id_categoria, disponible, stock_disponible);
CREATE INDEX idx_prepedidos_reserva_plato ON prepedidos(id_reserva, id_plato);

-- Optimización de consultas con particionamiento (si es MySQL 8.0+)
-- Particionar tabla de reservas por año para mejorar rendimiento en grandes volúmenes
-- ALTER TABLE reservas PARTITION BY RANGE (YEAR(fecha)) (
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION pmax VALUES LESS THAN MAXVALUE
-- );

-- Limpiar vistas antiguas
DROP VIEW IF EXISTS vista_disponibilidad_mesas;
DROP VIEW IF EXISTS vista_estadisticas_reservas;

-- Crear nuevas vistas optimizadas
CREATE OR REPLACE VIEW vista_dashboard_admin AS
SELECT 
    COUNT(DISTINCT r.id) as total_reservas,
    COUNT(DISTINCT CASE WHEN r.fecha = CURDATE() THEN r.id END) as reservas_hoy,
    COUNT(DISTINCT CASE WHEN r.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN r.id END) as reservas_semana,
    COUNT(DISTINCT CASE WHEN r.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN r.id END) as reservas_mes,
    SUM(CASE WHEN r.estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
    SUM(CASE WHEN r.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
    SUM(r.numero_comensales) as total_comensales,
    AVG(r.numero_comensales) as promedio_comensales,
    (SELECT COUNT(*) FROM mesas WHERE estado = 'disponible') as mesas_disponibles,
    (SELECT COUNT(*) FROM mesas WHERE estado = 'ocupada') as mesas_ocupadas,
    (SELECT COUNT(*) FROM mesas WHERE estado = 'reservada') as mesas_reservadas
FROM reservas r;

-- Procedimiento para limpieza automática de sesiones expiradas
DELIMITER //
CREATE PROCEDURE sp_limpiar_sesiones_expiradas()
BEGIN
    DELETE FROM sesiones_usuario 
    WHERE fecha_expiracion < NOW() 
       OR (activa = FALSE AND fecha_inicio < DATE_SUB(NOW(), INTERVAL 7 DAY));
    
    SELECT ROW_COUNT() as sesiones_eliminadas;
END //
DELIMITER ;

-- Evento programado para limpieza (MySQL 5.1.6+)
SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS evt_limpieza_sesiones
ON SCHEDULE EVERY 1 HOUR
DO CALL sp_limpiar_sesiones_expiradas();