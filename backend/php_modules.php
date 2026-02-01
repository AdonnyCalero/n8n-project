<?php
/**
 * Módulo PHP para consultas y lógica del sistema
 * Cumple RNF-002: Restricción Técnica - PHP para consultas y lógica
 */

// Configuración de conexión a la base de datos
class DatabaseConfig {
    private $host = 'localhost';
    private $user = 'root';
    private $password = '';
    private $database = 'restaurante';
    
    public function getConnection() {
        $conn = new mysqli($this->host, $this->user, $this->password, $this->database);
        
        if ($conn->connect_error) {
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        
        return $conn;
    }
}

// Clase para consultas optimizadas de disponibilidad
class AvailabilityChecker {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Verificar disponibilidad de mesas usando procedimientos almacenados
     */
    public function checkTableAvailability($fecha, $hora, $comensales, $idZona = null) {
        $stmt = $this->conn->prepare("CALL sp_verificar_disponibilidad(?, ?, ?, ?)");
        $stmt->bind_param("ssii", $fecha, $hora, $comensales, $idZona);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $tables = array();
        
        while ($row = $result->fetch_assoc()) {
            $tables[] = $row;
        }
        
        $stmt->close();
        return $tables;
    }
    
    /**
     * Consulta rápida de disponibilidad con caching
     */
    public function getQuickAvailability($fecha, $comensales) {
        // Usar memoria cache para consultas frecuentes
        $cacheKey = "availability_{$fecha}_{$comensales}";
        $cacheFile = sys_get_temp_dir() . "/restaurante_" . md5($cacheKey);
        
        // Revisar cache (válido por 5 minutos)
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
            return json_decode(file_get_contents($cacheFile), true);
        }
        
        // Consulta optimizada
        $sql = "
            SELECT 
                COUNT(*) as mesas_disponibles,
                SUM(capacidad) as total_asientos,
                MIN(capacidad) as mesa_mas_pequena,
                MAX(capacidad) as mesa_mas_grande
            FROM mesas m
            WHERE m.capacidad >= ? 
              AND m.estado = 'disponible'
              AND NOT EXISTS (
                  SELECT 1 FROM reservas r 
                  WHERE r.id_mesa = m.id 
                    AND r.fecha = ? 
                    AND r.estado = 'confirmada'
              )
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("is", $comensales, $fecha);
        $stmt->execute();
        
        $result = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        
        // Guardar en cache
        file_put_contents($cacheFile, json_encode($result));
        
        return $result;
    }
}

// Clase para gestión de menú y stock
class MenuManager {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Obtener menú con stock real
     */
    public function getAvailableMenu() {
        $sql = "
            SELECT 
                p.*,
                c.nombre as categoria_nombre,
                fn_stock_disponible(p.id) as stock_real
            FROM platos_3fn p
            LEFT JOIN categorias c ON p.id_categoria = c.id
            WHERE p.disponible = TRUE 
              AND fn_stock_disponible(p.id) > 0
            ORDER BY c.nombre, p.nombre
        ";
        
        $result = $this->conn->query($sql);
        $menu = array();
        
        while ($row = $result->fetch_assoc()) {
            $menu[] = $row;
        }
        
        return $menu;
    }
    
    /**
     * Actualizar stock de forma transaccional
     */
    public function updateStock($platoId, $cantidad, $operacion = 'restar') {
        $this->conn->begin_transaction();
        
        try {
            if ($operacion === 'restar') {
                $sql = "UPDATE platos_3fn SET stock_disponible = stock_disponible - ? WHERE id = ? AND stock_disponible >= ?";
            } else {
                $sql = "UPDATE platos_3fn SET stock_disponible = stock_disponible + ? WHERE id = ?";
            }
            
            $stmt = $this->conn->prepare($sql);
            $params = ($operacion === 'restar') ? "iii" : "ii";
            $stmt->bind_param($params, $cantidad, $platoId, $cantidad);
            
            $success = $stmt->execute();
            $affected = $stmt->affected_rows;
            $stmt->close();
            
            if ($success && $affected > 0) {
                $this->conn->commit();
                return true;
            } else {
                $this->conn->rollback();
                return false;
            }
            
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }
}

// Clase para generación de reportes
class ReportGenerator {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Generar reporte de ocupación en tiempo real
     */
    public function getOccupancyReport() {
        $sql = "SELECT * FROM vista_dashboard_admin";
        $result = $this->conn->query($sql);
        return $result->fetch_assoc();
    }
    
    /**
     * Reporte de reservas por período
     */
    public function getReservationsByPeriod($fechaInicio, $fechaFin) {
        $sql = "
            SELECT 
                DATE(r.fecha) as dia,
                COUNT(*) as total_reservas,
                SUM(CASE WHEN r.estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
                SUM(CASE WHEN r.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                SUM(r.numero_comensales) as total_comensales,
                AVG(r.numero_comensales) as promedio_comensales,
                GROUP_CONCAT(DISTINCT z.nombre) as zonas_utilizadas
            FROM reservas r
            JOIN mesas m ON r.id_mesa = m.id
            LEFT JOIN zonas z ON m.id_zona = z.id
            WHERE r.fecha BETWEEN ? AND ?
            GROUP BY DATE(r.fecha)
            ORDER BY dia
        ";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ss", $fechaInicio, $fechaFin);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $report = array();
        
        while ($row = $result->fetch_assoc()) {
            $report[] = $row;
        }
        
        $stmt->close();
        return $report;
    }
    
    /**
     * Exportar a Excel usando PHP
     */
    public function exportToExcel($data, $filename) {
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        // Escribir encabezados
        if (!empty($data)) {
            fputcsv($output, array_keys($data[0]), "\t");
            
            // Escribir datos
            foreach ($data as $row) {
                fputcsv($output, $row, "\t");
            }
        }
        
        fclose($output);
    }
}

// API REST endpoints con PHP
class RestApi {
    private $conn;
    private $availabilityChecker;
    private $menuManager;
    private $reportGenerator;
    
    public function __construct() {
        $config = new DatabaseConfig();
        $this->conn = $config->getConnection();
        $this->availabilityChecker = new AvailabilityChecker($this->conn);
        $this->menuManager = new MenuManager($this->conn);
        $this->reportGenerator = new ReportGenerator($this->conn);
    }
    
    /**
     * Endpoint para verificar disponibilidad
     */
    public function checkAvailabilityEndpoint() {
        header('Content-Type: application/json');
        
        $fecha = $_GET['fecha'] ?? '';
        $hora = $_GET['hora'] ?? '';
        $comensales = intval($_GET['comensales'] ?? 0);
        $idZona = $_GET['id_zona'] ?? null;
        
        if (empty($fecha) || empty($hora) || $comensales <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Parámetros inválidos']);
            return;
        }
        
        try {
            $tables = $this->availabilityChecker->checkTableAvailability($fecha, $hora, $comensales, $idZona);
            echo json_encode(['mesas_disponibles' => $tables]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al verificar disponibilidad']);
        }
    }
    
    /**
     * Endpoint para menú
     */
    public function getMenuEndpoint() {
        header('Content-Type: application/json');
        
        try {
            $menu = $this->menuManager->getAvailableMenu();
            echo json_encode($menu);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al cargar menú']);
        }
    }
    
    /**
     * Endpoint para reportes
     */
    public function getReportEndpoint() {
        header('Content-Type: application/json');
        
        $fechaInicio = $_GET['fecha_inicio'] ?? date('Y-m-01');
        $fechaFin = $_GET['fecha_fin'] ?? date('Y-m-t');
        
        try {
            $report = $this->reportGenerator->getReservationsByPeriod($fechaInicio, $fechaFin);
            echo json_encode($report);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al generar reporte']);
        }
    }
    
    /**
     * Endpoint para exportación Excel
     */
    public function exportExcelEndpoint() {
        $type = $_GET['type'] ?? 'reservas';
        $fechaInicio = $_GET['fecha_inicio'] ?? date('Y-m-01');
        $fechaFin = $_GET['fecha_fin'] ?? date('Y-m-t');
        
        try {
            switch ($type) {
                case 'reservas':
                    $data = $this->reportGenerator->getReservationsByPeriod($fechaInicio, $fechaFin);
                    $filename = "reservas_{$fechaInicio}_{$fechaFin}.xls";
                    break;
                case 'ocupacion':
                    $data = [$this->reportGenerator->getOccupancyReport()];
                    $filename = "ocupacion_" . date('Y-m-d') . ".xls";
                    break;
                default:
                    throw new Exception('Tipo de reporte inválido');
            }
            
            $this->reportGenerator->exportToExcel($data, $filename);
        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

// Router para manejar solicitudes
$api = new RestApi();

$endpoint = $_GET['endpoint'] ?? '';

switch ($endpoint) {
    case 'availability':
        $api->checkAvailabilityEndpoint();
        break;
    case 'menu':
        $api->getMenuEndpoint();
        break;
    case 'report':
        $api->getReportEndpoint();
        break;
    case 'export':
        $api->exportExcelEndpoint();
        break;
    default:
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Endpoint no encontrado']);
}
?>