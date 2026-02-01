"""
Sistema de Monitoreo y Disponibilidad
Cumple RNF-004: Disponibilidad (99% mensual) y RNF-007: Soporte/Mantenimiento
"""

import time
import logging
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import psutil
import threading
import os
from functools import wraps

class SystemMonitor:
    """Clase principal para monitoreo del sistema"""
    
    def __init__(self, log_file: str = 'system_monitor.log'):
        self.log_file = log_file
        self.setup_logging()
        self.metrics_history = []
        self.uptime_start = datetime.now()
        self.incidents = []
        self.performance_thresholds = {
            'response_time': 2000,  # ms
            'cpu_usage': 80,        # %
            'memory_usage': 85,     # %
            'disk_usage': 90        # %
        }
        
    def setup_logging(self):
        """Configurar sistema de logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def log_incident(self, severity: str, message: str, details: Dict = None):
        """Registrar incidente para seguimiento"""
        incident = {
            'timestamp': datetime.now().isoformat(),
            'severity': severity,  # INFO, WARNING, ERROR, CRITICAL
            'message': message,
            'details': details or {}
        }
        self.incidents.append(incident)
        
        log_message = f"INCIDENT [{severity}]: {message}"
        if details:
            log_message += f" | Details: {json.dumps(details)}"
        
        if severity == 'CRITICAL':
            self.logger.critical(log_message)
        elif severity == 'ERROR':
            self.logger.error(log_message)
        elif severity == 'WARNING':
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def check_system_health(self) -> Dict:
        """Verificar salud general del sistema"""
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'uptime': str(datetime.now() - self.uptime_start),
            'checks': {}
        }
        
        # Verificar uso de CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        health_status['checks']['cpu'] = {
            'usage': cpu_percent,
            'status': 'ok' if cpu_percent < self.performance_thresholds['cpu_usage'] else 'warning',
            'threshold': self.performance_thresholds['cpu_usage']
        }
        
        # Verificar uso de memoria
        memory = psutil.virtual_memory()
        health_status['checks']['memory'] = {
            'usage': memory.percent,
            'available_gb': memory.available / (1024**3),
            'status': 'ok' if memory.percent < self.performance_thresholds['memory_usage'] else 'warning',
            'threshold': self.performance_thresholds['memory_usage']
        }
        
        # Verificar uso de disco
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        health_status['checks']['disk'] = {
            'usage': disk_percent,
            'free_gb': disk.free / (1024**3),
            'status': 'ok' if disk_percent < self.performance_thresholds['disk_usage'] else 'warning',
            'threshold': self.performance_thresholds['disk_usage']
        }
        
        # Verificar estado general
        all_ok = all(check['status'] == 'ok' for check in health_status['checks'].values())
        health_status['status'] = 'healthy' if all_ok else 'degraded'
        
        return health_status

class PerformanceMonitor:
    """Monitor de rendimiento de la aplicación"""
    
    def __init__(self):
        self.response_times = []
        self.request_count = 0
        self.error_count = 0
        self.slow_queries = []
        
    def track_request(self, response_time: float, status_code: int = 200):
        """Registrar métricas de solicitud"""
        self.response_times.append(response_time)
        self.request_count += 1
        
        if status_code >= 400:
            self.error_count += 1
        
        # Registrar solicitudes lentas
        if response_time > 2000:  # más de 2 segundos
            self.slow_queries.append({
                'timestamp': datetime.now().isoformat(),
                'response_time': response_time,
                'status_code': status_code
            })
    
    def get_performance_stats(self) -> Dict:
        """Obtener estadísticas de rendimiento"""
        if not self.response_times:
            return {
                'avg_response_time': 0,
                'max_response_time': 0,
                'min_response_time': 0,
                'request_count': 0,
                'error_rate': 0,
                'slow_query_count': 0
            }
        
        return {
            'avg_response_time': sum(self.response_times) / len(self.response_times),
            'max_response_time': max(self.response_times),
            'min_response_time': min(self.response_times),
            'request_count': self.request_count,
            'error_rate': (self.error_count / self.request_count) * 100,
            'slow_query_count': len(self.slow_queries),
            'p95_response_time': sorted(self.response_times)[int(len(self.response_times) * 0.95)]
        }

def monitor_performance(monitor: PerformanceMonitor):
    """Decorator para monitorear rendimiento de funciones"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                response_time = (time.time() - start_time) * 1000
                monitor.track_request(response_time, 200)
                return result
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                monitor.track_request(response_time, 500)
                raise
        return wrapper
    return decorator

class DatabaseMonitor:
    """Monitor específico para base de datos"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.connection_pool_status = {}
        
    def check_database_health(self) -> Dict:
        """Verificar salud de la base de datos"""
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'status': 'unknown',
            'metrics': {}
        }
        
        try:
            # Verificar conexión
            start_time = time.time()
            result = self.db.execute_query("SELECT 1 as test", fetch_one=True)
            connection_time = (time.time() - start_time) * 1000
            
            health_status['metrics']['connection_time_ms'] = connection_time
            health_status['metrics']['connection_status'] = 'ok'
            
            # Verificar consultas lentas
            slow_query_result = self.db.execute_query(
                "SELECT COUNT(*) as count FROM information_schema.processlist WHERE time > 5",
                fetch_one=True
            )
            
            health_status['metrics']['slow_queries_count'] = slow_query_result['count'] if slow_query_result else 0
            
            # Verificar uso de conexiones
            connection_result = self.db.execute_query(
                "SHOW STATUS LIKE 'Threads_connected'",
                fetch_one=True
            )
            
            health_status['metrics']['active_connections'] = int(connection_result['Value']) if connection_result else 0
            
            # Verificar tamaño de la base de datos
            size_result = self.db.execute_query(
                "SELECT SUM(data_length + index_length) / 1024 / 1024 as size_mb FROM information_schema.tables WHERE table_schema = DATABASE()",
                fetch_one=True
            )
            
            health_status['metrics']['database_size_mb'] = round(size_result['size_mb'], 2) if size_result else 0
            
            health_status['status'] = 'healthy'
            
        except Exception as e:
            health_status['status'] = 'error'
            health_status['error'] = str(e)
        
        return health_status

class AvailabilityMonitor:
    """Monitor de disponibilidad del servicio"""
    
    def __init__(self, service_url: str = "http://localhost:5000"):
        self.service_url = service_url
        self.availability_history = []
        
    def check_service_availability(self) -> Dict:
        """Verificar disponibilidad del servicio web"""
        check_result = {
            'timestamp': datetime.now().isoformat(),
            'url': self.service_url,
            'available': False,
            'response_time_ms': 0,
            'status_code': None,
            'error': None
        }
        
        try:
            start_time = time.time()
            response = requests.get(self.service_url, timeout=10)
            response_time = (time.time() - start_time) * 1000
            
            check_result['available'] = response.status_code == 200
            check_result['response_time_ms'] = response_time
            check_result['status_code'] = response.status_code
            
        except Exception as e:
            check_result['error'] = str(e)
        
        self.availability_history.append(check_result)
        
        # Mantener solo las últimas 1000 verificaciones
        if len(self.availability_history) > 1000:
            self.availability_history = self.availability_history[-1000:]
        
        return check_result
    
    def calculate_uptime_percentage(self, hours: int = 24) -> float:
        """Calcular porcentaje de uptime en las últimas N horas"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_checks = [
            check for check in self.availability_history
            if datetime.fromisoformat(check['timestamp']) > cutoff_time
        ]
        
        if not recent_checks:
            return 0.0
        
        successful_checks = sum(1 for check in recent_checks if check['available'])
        return (successful_checks / len(recent_checks)) * 100

class AlertManager:
    """Gestor de alertas y notificaciones"""
    
    def __init__(self, monitor: SystemMonitor):
        self.monitor = monitor
        self.alert_rules = {
            'service_down': {'severity': 'CRITICAL', 'message': 'Servicio no disponible'},
            'high_error_rate': {'severity': 'WARNING', 'message': 'Tasa de error elevada (>5%)'},
            'slow_response': {'severity': 'WARNING', 'message': 'Tiempo de respuesta elevado (>2s)'},
            'high_cpu': {'severity': 'WARNING', 'message': 'Uso de CPU elevado (>80%)'},
            'high_memory': {'severity': 'CRITICAL', 'message': 'Uso de memoria crítico (>90%)'},
            'database_issue': {'severity': 'CRITICAL', 'message': 'Problema en base de datos'}
        }
        
    def check_alerts(self, system_health: Dict, performance_stats: Dict, db_health: Dict, availability: Dict):
        """Verificar condiciones de alerta"""
        alerts_triggered = []
        
        # Alerta por servicio no disponible
        if not availability.get('available', False):
            alerts_triggered.append({
                'rule': 'service_down',
                'details': {'url': availability.get('url'), 'error': availability.get('error')}
            })
        
        # Alerta por alta tasa de error
        if performance_stats.get('error_rate', 0) > 5:
            alerts_triggered.append({
                'rule': 'high_error_rate',
                'details': {'error_rate': performance_stats.get('error_rate')}
            })
        
        # Alerta por respuestas lentas
        if performance_stats.get('avg_response_time', 0) > 2000:
            alerts_triggered.append({
                'rule': 'slow_response',
                'details': {'avg_response_time': performance_stats.get('avg_response_time')}
            })
        
        # Alerta por alto uso de CPU
        cpu_check = system_health.get('checks', {}).get('cpu', {})
        if cpu_check.get('usage', 0) > 80:
            alerts_triggered.append({
                'rule': 'high_cpu',
                'details': {'cpu_usage': cpu_check.get('usage')}
            })
        
        # Alerta por alto uso de memoria
        memory_check = system_health.get('checks', {}).get('memory', {})
        if memory_check.get('usage', 0) > 90:
            alerts_triggered.append({
                'rule': 'high_memory',
                'details': {'memory_usage': memory_check.get('usage')}
            })
        
        # Alerta por problemas en base de datos
        if db_health.get('status') != 'healthy':
            alerts_triggered.append({
                'rule': 'database_issue',
                'details': {'db_status': db_health.get('status'), 'error': db_health.get('error')}
            })
        
        # Registrar alertas
        for alert in alerts_triggered:
            rule_config = self.alert_rules.get(alert['rule'], {})
            self.monitor.log_incident(
                severity=rule_config.get('severity', 'WARNING'),
                message=rule_config.get('message', 'Alerta generada'),
                details=alert.get('details', {})
            )
        
        return alerts_triggered

class MonitoringDashboard:
    """Panel de control para monitoreo"""
    
    def __init__(self):
        self.system_monitor = SystemMonitor()
        self.performance_monitor = PerformanceMonitor()
        self.db_monitor = None  # Se inicializa con conexión DB
        self.availability_monitor = AvailabilityMonitor()
        self.alert_manager = AlertManager(self.system_monitor)
        
    def initialize_db_monitor(self, db_connection):
        """Inicializar monitor de base de datos"""
        self.db_monitor = DatabaseMonitor(db_connection)
        
    def get_comprehensive_status(self) -> Dict:
        """Obtener estado completo del sistema"""
        status = {
            'timestamp': datetime.now().isoformat(),
            'system_health': self.system_monitor.check_system_health(),
            'performance': self.performance_monitor.get_performance_stats(),
            'availability_24h': self.availability_monitor.calculate_uptime_percentage(24),
            'availability_7d': self.availability_monitor.calculate_uptime_percentage(24 * 7),
            'recent_incidents': self.system_monitor.incidents[-5:]  # Últimos 5 incidentes
        }
        
        if self.db_monitor:
            status['database_health'] = self.db_monitor.check_database_health()
        
        return status
    
    def generate_health_report(self) -> Dict:
        """Generar reporte completo de salud del sistema"""
        comprehensive_status = self.get_comprehensive_status()
        
        report = {
            'report_timestamp': datetime.now().isoformat(),
            'summary': {
                'overall_status': 'healthy',
                'uptime_24h': comprehensive_status['availability_24h'],
                'uptime_7d': comprehensive_status['availability_7d'],
                'avg_response_time': comprehensive_status['performance']['avg_response_time'],
                'error_rate': comprehensive_status['performance']['error_rate']
            },
            'details': comprehensive_status,
            'recommendations': []
        }
        
        # Generar recomendaciones
        if comprehensive_status['availability_24h'] < 99:
            report['recommendations'].append("El uptime está por debajo del 99% requerido")
        
        if comprehensive_status['performance']['avg_response_time'] > 1000:
            report['recommendations'].append("El tiempo de respuesta promedio es elevado")
        
        if comprehensive_status['performance']['error_rate'] > 2:
            report['recommendations'].append("La tasa de error está por encima del 2%")
        
        # Determinar estado general
        if (comprehensive_status['availability_24h'] >= 99 and 
            comprehensive_status['performance']['avg_response_time'] <= 1000 and
            comprehensive_status['performance']['error_rate'] <= 2):
            report['summary']['overall_status'] = 'healthy'
        elif (comprehensive_status['availability_24h'] >= 95 and 
              comprehensive_status['performance']['avg_response_time'] <= 2000):
            report['summary']['overall_status'] = 'degraded'
        else:
            report['summary']['overall_status'] = 'critical'
        
        return report

# Instancia global para el monitoreo
monitoring_dashboard = MonitoringDashboard()

def start_background_monitoring():
    """Iniciar monitoreo en segundo plano"""
    def monitor_loop():
        while True:
            try:
                # Verificar disponibilidad del servicio
                availability = monitoring_dashboard.availability_monitor.check_service_availability()
                
                # Verificar salud del sistema
                system_health = monitoring_dashboard.system_monitor.check_system_health()
                
                # Obtener estadísticas de rendimiento
                performance_stats = monitoring_dashboard.performance_monitor.get_performance_stats()
                
                # Verificar base de datos si está disponible
                db_health = {}
                if monitoring_dashboard.db_monitor:
                    db_health = monitoring_dashboard.db_monitor.check_database_health()
                
                # Verificar alertas
                monitoring_dashboard.alert_manager.check_alerts(
                    system_health, performance_stats, db_health, availability
                )
                
                # Esperar 60 segundos para la próxima verificación
                time.sleep(60)
                
            except Exception as e:
                monitoring_dashboard.system_monitor.log_incident(
                    'ERROR', 
                    'Error en monitoreo background', 
                    {'error': str(e)}
                )
                time.sleep(60)
    
    # Iniciar thread en segundo plano
    monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitor_thread.start()
    return monitor_thread

# Exportar clases principales
__all__ = [
    'SystemMonitor',
    'PerformanceMonitor', 
    'DatabaseMonitor',
    'AvailabilityMonitor',
    'MonitoringDashboard',
    'monitor_performance',
    'monitoring_dashboard',
    'start_background_monitoring'
]