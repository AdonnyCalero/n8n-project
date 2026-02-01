"""
Sistema de Caching y Optimización para Escalabilidad
Cumple RNF-005: Escalabilidad - soportar crecimiento progresivo de usuarios
"""

import time
import json
import hashlib
import threading
from typing import Any, Optional, Dict, List, Callable
from functools import wraps
import pickle
import os
from datetime import datetime, timedelta

class CacheManager:
    """Gestor de caché en memoria con soporte para múltiples estrategias"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache = {}
        self.access_times = {}
        self.lock = threading.RLock()
        self.hits = 0
        self.misses = 0
        
    def _generate_key(self, key: Any) -> str:
        """Generar clave de caché hash"""
        if isinstance(key, str):
            return key
        return hashlib.md5(pickle.dumps(key)).hexdigest()
    
    def get(self, key: Any) -> Optional[Any]:
        """Obtener valor del caché"""
        cache_key = self._generate_key(key)
        
        with self.lock:
            if cache_key in self.cache:
                item = self.cache[cache_key]
                
                # Verificar TTL
                if item['expires_at'] and datetime.now() > item['expires_at']:
                    self._remove(cache_key)
                    self.misses += 1
                    return None
                
                # Actualizar tiempo de acceso
                self.access_times[cache_key] = time.time()
                self.hits += 1
                return item['value']
            
            self.misses += 1
            return None
    
    def set(self, key: Any, value: Any, ttl: Optional[int] = None) -> None:
        """Establecer valor en caché"""
        cache_key = self._generate_key(key)
        ttl = ttl or self.default_ttl
        expires_at = datetime.now() + timedelta(seconds=ttl) if ttl > 0 else None
        
        with self.lock:
            # Evict if necessary
            if len(self.cache) >= self.max_size and cache_key not in self.cache:
                self._evict_lru()
            
            self.cache[cache_key] = {
                'value': value,
                'created_at': datetime.now(),
                'expires_at': expires_at,
                'ttl': ttl
            }
            self.access_times[cache_key] = time.time()
    
    def _remove(self, cache_key: str) -> None:
        """Remover item del caché"""
        if cache_key in self.cache:
            del self.cache[cache_key]
        if cache_key in self.access_times:
            del self.access_times[cache_key]
    
    def _evict_lru(self) -> None:
        """Evictar least recently used item"""
        if not self.access_times:
            return
        
        lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
        self._remove(lru_key)
    
    def clear(self) -> None:
        """Limpiar todo el caché"""
        with self.lock:
            self.cache.clear()
            self.access_times.clear()
    
    def get_stats(self) -> Dict:
        """Obtener estadísticas del caché"""
        with self.lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': hit_rate,
                'size': len(self.cache),
                'max_size': self.max_size
            }
    
    def cleanup_expired(self) -> int:
        """Limpiar items expirados"""
        with self.lock:
            now = datetime.now()
            expired_keys = [
                key for key, item in self.cache.items()
                if item['expires_at'] and now > item['expires_at']
            ]
            
            for key in expired_keys:
                self._remove(key)
            
            return len(expired_keys)

class FileCache:
    """Caché basado en archivos para persistencia"""
    
    def __init__(self, cache_dir: str = 'cache'):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
    def _get_file_path(self, key: str) -> str:
        """Obtener ruta del archivo de caché"""
        safe_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_key}.cache")
    
    def get(self, key: str, ttl: int = 300) -> Optional[Any]:
        """Obtener valor del caché de archivo"""
        file_path = self._get_file_path(key)
        
        if not os.path.exists(file_path):
            return None
        
        try:
            # Verificar edad del archivo
            file_age = time.time() - os.path.getmtime(file_path)
            if file_age > ttl:
                os.remove(file_path)
                return None
            
            with open(file_path, 'rb') as f:
                return pickle.load(f)
        except Exception:
            # Archivo corrupto, removerlo
            try:
                os.remove(file_path)
            except:
                pass
            return None
    
    def set(self, key: str, value: Any) -> None:
        """Establecer valor en caché de archivo"""
        file_path = self._get_file_path(key)
        
        try:
            with open(file_path, 'wb') as f:
                pickle.dump(value, f)
        except Exception:
            pass  # Silently fail
    
    def clear(self) -> None:
        """Limpiar caché de archivos"""
        try:
            for filename in os.listdir(self.cache_dir):
                if filename.endswith('.cache'):
                    os.remove(os.path.join(self.cache_dir, filename))
        except Exception:
            pass

class DatabaseConnectionPool:
    """Pool de conexiones a base de datos para escalabilidad"""
    
    def __init__(self, db_config: Dict, min_connections: int = 2, max_connections: int = 10):
        self.db_config = db_config
        self.min_connections = min_connections
        self.max_connections = max_connections
        self.pool = []
        self.active_connections = []
        self.lock = threading.RLock()
        
        # Inicializar pool
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Inicializar pool con conexiones mínimas"""
        import mysql.connector
        from mysql.connector import Error
        
        for _ in range(self.min_connections):
            try:
                conn = mysql.connector.connect(**self.db_config, pool_name="restaurante_pool")
                self.pool.append(conn)
            except Error as e:
                print(f"Error al crear conexión en pool: {e}")
    
    def get_connection(self):
        """Obtener conexión del pool"""
        with self.lock:
            if self.pool:
                conn = self.pool.pop()
                self.active_connections.append(conn)
                return conn
            
            # Si no hay conexiones disponibles y no excede el máximo
            if len(self.active_connections) < self.max_connections:
                try:
                    import mysql.connector
                    conn = mysql.connector.connect(**self.db_config, pool_name="restaurante_pool")
                    self.active_connections.append(conn)
                    return conn
                except Exception as e:
                    raise Exception(f"No se pudo crear nueva conexión: {e}")
            
            # Esperar por una conexión disponible
            return self._wait_for_connection()
    
    def _wait_for_connection(self):
        """Esperar por una conexión disponible"""
        import time
        timeout = 30  # 30 segundos timeout
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self.pool:
                conn = self.pool.pop()
                self.active_connections.append(conn)
                return conn
            time.sleep(0.1)
        
        raise Exception("Timeout esperando conexión del pool")
    
    def return_connection(self, conn):
        """Devolver conexión al pool"""
        with self.lock:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
                
                # Verificar que la conexión sigue válida
                try:
                    if conn.is_connected():
                        self.pool.append(conn)
                    else:
                        conn.close()
                except:
                    pass  # Conexión inválida, simplemente la cerramos
                
                # Mantener el pool dentro de los límites
                while len(self.pool) > self.min_connections:
                    extra_conn = self.pool.pop()
                    extra_conn.close()
    
    def get_pool_stats(self) -> Dict:
        """Obtener estadísticas del pool"""
        with self.lock:
            return {
                'available_connections': len(self.pool),
                'active_connections': len(self.active_connections),
                'total_connections': len(self.pool) + len(self.active_connections),
                'min_connections': self.min_connections,
                'max_connections': self.max_connections
            }

class QueryOptimizer:
    """Optimizador de consultas SQL"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.query_cache = CacheManager(max_size=100, default_ttl=600)  # 10 minutos
        
    @staticmethod
    def optimize_query(query: str) -> str:
        """Optimizar consulta SQL básica"""
        # Eliminar espacios extras
        query = ' '.join(query.split())
        
        # Agregar hints básicos
        if query.upper().startswith('SELECT'):
            if '/*+ ' not in query.upper():
                query = query.replace('SELECT', 'SELECT /*+ MAX_EXECUTION_TIME(5000) */', 1)
        
        return query
    
    def execute_cached_query(self, query: str, params: tuple = None, ttl: int = 600) -> List[Dict]:
        """Ejecutar consulta con caché"""
        cache_key = f"{query}_{params}_{ttl}"
        
        # Intentar obtener del caché
        cached_result = self.query_cache.get(cache_key)
        if cached_result is not None:
            return cached_result
        
        # Ejecutar consulta
        try:
            result = self.db.execute_query(query, params)
            self.query_cache.set(cache_key, result, ttl)
            return result
        except Exception as e:
            raise Exception(f"Error ejecutando consulta: {e}")
    
    def get_slow_queries(self) -> List[Dict]:
        """Obtener consultas lentas"""
        query = """
        SELECT 
            start_time,
            query_time,
            lock_time,
            rows_sent,
            rows_examined,
            sql_text
        FROM mysql.slow_log 
        WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY query_time DESC
        LIMIT 10
        """
        
        try:
            return self.db.execute_query(query)
        except:
            return []  # Tabla no disponible

def cache_result(ttl: int = 300, cache_manager: Optional[CacheManager] = None):
    """Decorator para cachear resultados de funciones"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Usar caché global si no se proporciona uno
            cache = cache_manager or global_cache
            
            # Generar clave de caché
            cache_key = f"{func.__name__}_{args}_{kwargs}"
            
            # Intentar obtener del caché
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Ejecutar función y cachear resultado
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

class LoadBalancer:
    """Balanceador de carga simple para escalabilidad horizontal"""
    
    def __init__(self):
        self.servers = []
        self.current_index = 0
        self.lock = threading.Lock()
    
    def add_server(self, server_url: str, weight: int = 1):
        """Agregar servidor al balanceador"""
        self.servers.append({
            'url': server_url,
            'weight': weight,
            'healthy': True,
            'last_check': datetime.now()
        })
    
    def get_next_server(self) -> Optional[str]:
        """Obtener siguiente servidor (round-robin)"""
        with self.lock:
            healthy_servers = [s for s in self.servers if s['healthy']]
            
            if not healthy_servers:
                return None
            
            server = healthy_servers[self.current_index % len(healthy_servers)]
            self.current_index += 1
            
            return server['url']
    
    def check_server_health(self, server_url: str) -> bool:
        """Verificar salud de un servidor"""
        try:
            import requests
            response = requests.get(f"{server_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def health_check_all(self):
        """Verificar salud de todos los servidores"""
        for server in self.servers:
            server['healthy'] = self.check_server_health(server['url'])
            server['last_check'] = datetime.now()

class AsyncTaskQueue:
    """Cola de tareas asíncronas para mejorar rendimiento"""
    
    def __init__(self, max_workers: int = 4):
        from concurrent.futures import ThreadPoolExecutor
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.pending_tasks = {}
        self.task_id_counter = 0
        self.lock = threading.Lock()
    
    def submit_task(self, func: Callable, *args, **kwargs) -> str:
        """Enviar tarea a la cola"""
        with self.lock:
            task_id = str(self.task_id_counter)
            self.task_id_counter += 1
            
            future = self.executor.submit(func, *args, **kwargs)
            self.pending_tasks[task_id] = future
        
        return task_id
    
    def get_task_result(self, task_id: str) -> Optional[Any]:
        """Obtener resultado de tarea"""
        with self.lock:
            if task_id not in self.pending_tasks:
                return None
            
            future = self.pending_tasks[task_id]
            
            if future.done():
                try:
                    result = future.result()
                    del self.pending_tasks[task_id]
                    return result
                except Exception as e:
                    del self.pending_tasks[task_id]
                    raise e
            else:
                return None  # Tarea no completada aún
    
    def get_queue_stats(self) -> Dict:
        """Obtener estadísticas de la cola"""
        with self.lock:
            total_tasks = len(self.pending_tasks)
            completed_tasks = sum(1 for f in self.pending_tasks.values() if f.done())
            
            return {
                'pending_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'running_tasks': total_tasks - completed_tasks
            }

# Instancias globales
global_cache = CacheManager(max_size=1000, default_ttl=300)
file_cache = FileCache()
task_queue = AsyncTaskQueue(max_workers=4)

# Funciones de utilidad para escalabilidad
def setup_database_pool(db_config: Dict) -> DatabaseConnectionPool:
    """Configurar pool de conexiones a base de datos"""
    return DatabaseConnectionPool(db_config)

def setup_load_balancer() -> LoadBalancer:
    """Configurar balanceador de carga"""
    return LoadBalancer()

def get_system_performance_metrics() -> Dict:
    """Obtener métricas de rendimiento del sistema"""
    return {
        'cache_stats': global_cache.get_stats(),
        'queue_stats': task_queue.get_queue_stats(),
        'memory_usage': psutil.virtual_memory()._asdict(),
        'cpu_usage': psutil.cpu_percent(interval=1)
    }

def optimize_for_high_load():
    """Optimizaciones para alta carga"""
    import gc
    
    # Forzar garbage collection
    gc.collect()
    
    # Limpiar caché expirado
    expired_count = global_cache.cleanup_expired()
    
    return {
        'gc_collections': gc.collect(),
        'expired_cache_items': expired_count
    }

# Exportar clases y funciones
__all__ = [
    'CacheManager',
    'FileCache', 
    'DatabaseConnectionPool',
    'QueryOptimizer',
    'LoadBalancer',
    'AsyncTaskQueue',
    'cache_result',
    'global_cache',
    'file_cache',
    'task_queue',
    'setup_database_pool',
    'setup_load_balancer',
    'get_system_performance_metrics',
    'optimize_for_high_load'
]