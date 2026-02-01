-- Crear base de datos
CREATE DATABASE IF NOT EXISTS restaurante CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE restaurante;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('cliente', 'administrador') DEFAULT 'cliente',
    telefono VARCHAR(20),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de zonas del restaurante
CREATE TABLE zonas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    capacidad_maxima INT,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mesas
CREATE TABLE mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    capacidad INT NOT NULL,
    id_zona INT,
    estado ENUM('disponible', 'ocupada', 'reservada', 'mantenimiento') DEFAULT 'disponible',
    posicion_x INT DEFAULT 0,
    posicion_y INT DEFAULT 0,
    FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE SET NULL,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de platos (menú)
CREATE TABLE platos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50),
    stock_disponible INT DEFAULT 0,
    stock_maximo INT DEFAULT 100,
    imagen VARCHAR(255),
    disponible BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de horarios de atención
CREATE TABLE horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    cerrado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reservas
CREATE TABLE reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_mesa INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    numero_comensales INT NOT NULL,
    estado ENUM('confirmada', 'cancelada', 'completada', 'no_asistio') DEFAULT 'confirmada',
    observaciones TEXT,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_mesa) REFERENCES mesas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reserva (id_mesa, fecha, hora)
);

-- Tabla de pre-pedidos
CREATE TABLE prepedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    id_plato INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reservas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_plato) REFERENCES platos(id) ON DELETE CASCADE
);

-- Tabla de notas de consumo
CREATE TABLE notas_consumo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    estado ENUM('pendiente', 'pagada', 'cancelada') DEFAULT 'pendiente',
    detalles JSON,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reservas(id) ON DELETE CASCADE
);

-- Tabla de días cerrados (festivos, mantenimiento, etc.)
CREATE TABLE dias_cerrados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    motivo VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales
INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Administrador', 'admin@restaurante.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'administrador', '1234567890'),
('Cliente Ejemplo', 'cliente@ejemplo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', 'cliente', '0987654321');

INSERT INTO zonas (nombre, descripcion, capacidad_maxima) VALUES
('Terraza', 'Área exterior con vista al jardín', 30),
('Salón Principal', 'Área interior climatizada', 50),
('VIP', 'Área exclusiva con servicio privado', 15);

INSERT INTO mesas (numero, capacidad, id_zona, posicion_x, posicion_y) VALUES
('M1', 2, 1, 10, 10), ('M2', 4, 1, 30, 10), ('M3', 2, 1, 50, 10),
('M4', 6, 2, 10, 40), ('M5', 4, 2, 30, 40), ('M6', 8, 2, 50, 40),
('M7', 2, 2, 10, 70), ('M8', 4, 2, 30, 70),
('M9', 4, 3, 10, 100), ('M10', 6, 3, 30, 100);

INSERT INTO platos (nombre, descripcion, precio, categoria, stock_disponible) VALUES
('Ensalada César', 'Lechuga romana, pollo, parmesano, crutones', 8.50, 'Entradas', 20),
('Bruschetta', 'Pan tostado con tomate y albahaca', 6.00, 'Entradas', 15),
('Sopa del día', 'Sopa casera del día', 5.50, 'Entradas', 10),
('Lomo de Res', 'Lomo a la parrilla con guarnición', 18.00, 'Platos Fuertes', 12),
('Pasta Carbonara', 'Pasta con salsa cremosa y tocino', 12.00, 'Platos Fuertes', 18),
('Salmón Asado', 'Salmón con vegetales al vapor', 15.00, 'Platos Fuertes', 8),
('Tiramisú', 'Postre italiano tradicional', 5.00, 'Postres', 25),
('Flan', 'Flan casero con caramelo', 4.00, 'Postres', 30);

INSERT INTO horarios (dia_semana, hora_apertura, hora_cierre) VALUES
('lunes', '12:00:00', '22:00:00'),
('martes', '12:00:00', '22:00:00'),
('miercoles', '12:00:00', '22:00:00'),
('jueves', '12:00:00', '23:00:00'),
('viernes', '12:00:00', '23:00:00'),
('sabado', '13:00:00', '23:00:00'),
('domingo', '13:00:00', '21:00:00');