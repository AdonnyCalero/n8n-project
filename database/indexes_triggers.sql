-- Índices para mejorar el rendimiento
CREATE INDEX idx_reservas_fecha_hora ON reservas(fecha, hora);
CREATE INDEX idx_reservas_usuario ON reservas(id_usuario);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_prepedidos_reserva ON prepedidos(id_reserva);
CREATE INDEX idx_prepedidos_plato ON prepedidos(id_plato);
CREATE INDEX idx_mesas_zona ON mesas(id_zona);
CREATE INDEX idx_mesas_estado ON mesas(estado);
CREATE INDEX idx_notas_consumo_reserva ON notas_consumo(id_reserva);

-- Triggers para actualización automática de stock
DELIMITER //
CREATE TRIGGER actualizar_stock_prepedido
AFTER INSERT ON prepedidos
FOR EACH ROW
BEGIN
    UPDATE platos 
    SET stock_disponible = stock_disponible - NEW.cantidad 
    WHERE id = NEW.id_plato;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER devolver_stock_prepedido
AFTER DELETE ON prepedidos
FOR EACH ROW
BEGIN
    UPDATE platos 
    SET stock_disponible = stock_disponible + OLD.cantidad 
    WHERE id = OLD.id_plato;
END//
DELIMITER ;

-- Vista para disponibilidad de mesas
CREATE VIEW vista_disponibilidad_mesas AS
SELECT 
    m.id,
    m.numero,
    m.capacidad,
    m.estado,
    z.nombre as zona,
    CASE 
        WHEN r.id IS NOT NULL THEN 'reservada'
        WHEN m.estado = 'ocupada' THEN 'ocupada'
        ELSE 'disponible'
    END as estado_actual
FROM mesas m
LEFT JOIN zonas z ON m.id_zona = z.id
LEFT JOIN reservas r ON m.id = r.id_mesa 
    AND r.fecha = CURDATE() 
    AND r.hora <= CURTIME() 
    AND DATE_ADD(r.hora, INTERVAL 2 HOUR) > CURTIME()
    AND r.estado = 'confirmada';

-- Vista para estadísticas de reservas
CREATE VIEW vista_estadisticas_reservas AS
SELECT 
    DATE(fecha) as dia,
    COUNT(*) as total_reservas,
    SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
    SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
    SUM(numero_comensales) as total_comensales
FROM reservas
WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(fecha)
ORDER BY dia DESC;