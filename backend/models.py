import mysql.connector
from mysql.connector import Error
import bcrypt
from datetime import datetime, timedelta
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class Database:
    def __init__(self):
        self.connection = None
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'restaurante'),
            'autocommit': True,
            'get_warnings': True,
            'charset': 'utf8mb4',
            'use_unicode': True
        }
    
    def connect(self):
        try:
            self.connection = mysql.connector.connect(**self.config)
            return True
        except Error as e:
            print(f"Error de conexión: {e}")
            return False
    
    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()
    
    def execute_query(self, query, params=None, fetch_one=False, fetch_all=True):
        try:
            if not self.connection or not self.connection.is_connected():
                self.connect()
            
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params)
            
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            else:
                result = None
            
            cursor.close()
            
            # Handle datetime/timedelta serialization
            if result and isinstance(result, list):
                for row in result:
                    self._serialize_datetime_fields(row)
            elif result:
                self._serialize_datetime_fields(result)
            
            return result
        except Error as e:
            print(f"Error en consulta: {e}")
            return None
    
    def _serialize_datetime_fields(self, obj):
        """Convert datetime and timedelta objects to strings for JSON serialization"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                if hasattr(value, 'strftime'):  # datetime objects
                    obj[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                elif hasattr(value, 'total_seconds'):  # timedelta objects
                    total_seconds = int(value.total_seconds())
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    seconds = total_seconds % 60
                    obj[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    def execute_insert(self, query, params):
        try:
            if not self.connection or not self.connection.is_connected():
                self.connect()
            
            cursor = self.connection.cursor()
            cursor.execute(query, params)
            last_id = cursor.lastrowid
            cursor.close()
            return last_id
        except Error as e:
            print(f"Error en inserción: {e}")
            return None

class AuthManager:
    def __init__(self, db):
        self.db = db
    
    def hash_password(self, password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password, hashed):
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def login(self, email, password):
        query = "SELECT * FROM usuarios WHERE email = %s"
        user = self.db.execute_query(query, (email,), fetch_one=True)
        
        if user and self.verify_password(password, user['password']):
            return user
        return None
    
    def register(self, nombre, email, password, telefono=None, rol='cliente'):
        existing = self.db.execute_query(
            "SELECT id FROM usuarios WHERE email = %s", 
            (email,), 
            fetch_one=True
        )
        
        if existing:
            return None
        
        hashed_password = self.hash_password(password)
        query = """
            INSERT INTO usuarios (nombre, email, password, rol, telefono) 
            VALUES (%s, %s, %s, %s, %s)
        """
        user_id = self.db.execute_insert(query, (nombre, email, hashed_password, rol, telefono))
        return user_id

class ReservationManager:
    def __init__(self, db):
        self.db = db
    
    def check_availability(self, fecha, hora, comensales, id_zona=None):
        query = """
            SELECT m.* FROM mesas m
            LEFT JOIN reservas r ON m.id = r.id_mesa 
                AND r.fecha = %s 
                AND ABS(TIME_TO_SEC(r.hora) - TIME_TO_SEC(%s)) < 7200
                AND r.estado = 'confirmada'
            WHERE m.capacidad >= %s 
            AND (r.id IS NULL)
            AND (%s IS NULL OR m.id_zona = %s)
            AND m.estado != 'mantenimiento'
        """
        return self.db.execute_query(query, (fecha, hora, comensales, id_zona, id_zona))
    
    def create_reservation(self, id_usuario, id_mesa, fecha, hora, comensales, observaciones=None):
        try:
            # Iniciar transacción para atomicidad
            if not self.db.connection or not self.db.connection.is_connected():
                self.db.connect()
            
            # Desactivar autocommit temporalmente
            self.db.connection.autocommit = False
            cursor = self.db.connection.cursor()
            
            try:
                # Verificación final de disponibilidad con locking de la mesa
                check_query = """
                    SELECT COUNT(*) as conflicting_reservations 
                    FROM reservas 
                    WHERE id_mesa = %s 
                    AND fecha = %s 
                    AND ABS(TIME_TO_SEC(hora) - TIME_TO_SEC(%s)) < 7200
                    AND estado = 'confirmada'
                    FOR UPDATE
                """
                cursor.execute(check_query, (id_mesa, fecha, hora))
                result = cursor.fetchone()
                
                if result[0] > 0:
                    cursor.close()
                    self.db.connection.rollback()
                    return None  # Mesa no disponible (doble reserva)
                
                # Insertar reserva
                insert_query = """
                    INSERT INTO reservas (id_usuario, id_mesa, fecha, hora, numero_comensales, observaciones, estado)
                    VALUES (%s, %s, %s, %s, %s, %s, 'confirmada')
                """
                cursor.execute(insert_query, (id_usuario, id_mesa, fecha, hora, comensales, observaciones))
                reservation_id = cursor.lastrowid
                
                # Actualizar estado de la mesa
                update_query = "UPDATE mesas SET estado = 'reservada' WHERE id = %s"
                cursor.execute(update_query, (id_mesa,))
                
                # Confirmar transacción
                self.db.connection.commit()
                cursor.close()
                
                return reservation_id
                
            except Exception as e:
                # Rollback en caso de error
                self.db.connection.rollback()
                if 'cursor' in locals():
                    cursor.close()
                raise e
                
        except Exception as e:
            print(f"Error al crear reserva (atomicidad): {e}")
            return None
        finally:
            # Restaurar autocommit
            if self.db.connection:
                self.db.connection.autocommit = True
    
    def get_user_reservations(self, user_id):
        query = """
            SELECT r.*, m.numero as mesa_numero, z.nombre as zona_nombre
            FROM reservas r
            JOIN mesas m ON r.id_mesa = m.id
            LEFT JOIN zonas z ON m.id_zona = z.id
            WHERE r.id_usuario = %s
            ORDER BY r.fecha DESC, r.hora DESC
        """
        return self.db.execute_query(query, (user_id,))
    
    def get_all_reservations(self):
        query = """
            SELECT r.*, u.nombre as cliente_nombre, u.email, m.numero as mesa_numero, z.nombre as zona_nombre
            FROM reservas r
            JOIN usuarios u ON r.id_usuario = u.id
            JOIN mesas m ON r.id_mesa = m.id
            LEFT JOIN zonas z ON m.id_zona = z.id
            ORDER BY r.fecha DESC, r.hora DESC
        """
        return self.db.execute_query(query)

class MenuManager:
    def __init__(self, db):
        self.db = db
    
    def get_menu_items(self):
        query = """
            SELECT p.*, c.nombre as categoria_nombre 
            FROM platos p 
            LEFT JOIN (SELECT DISTINCT categoria as nombre FROM platos) c ON p.categoria = c.nombre
            WHERE p.disponible = TRUE AND p.stock_disponible > 0
            ORDER BY p.categoria, p.nombre
        """
        return self.db.execute_query(query)
    
    def check_stock(self, id_plato, cantidad):
        query = "SELECT stock_disponible FROM platos WHERE id = %s"
        plato = self.db.execute_query(query, (id_plato,), fetch_one=True)
        return plato and plato['stock_disponible'] >= cantidad
    
    def update_stock(self, id_plato, cantidad):
        query = "UPDATE platos SET stock_disponible = stock_disponible - %s WHERE id = %s"
        return self.db.execute_query(query, (cantidad, id_plato), fetch_all=False)
    
    def create_preorder(self, id_reserva, id_plato, cantidad):
        try:
            # Verificar stock antes de crear pre-pedido
            if not self.check_stock(id_plato, cantidad):
                return None
            
            # Iniciar transacción
            if not self.db.connection or not self.db.connection.is_connected():
                self.db.connect()
            
            self.db.connection.autocommit = False
            cursor = self.db.connection.cursor()
            
            try:
                # Insertar pre-pedido
                insert_query = """
                    INSERT INTO prepedidos (id_reserva, id_plato, cantidad, precio_unitario)
                    VALUES (%s, %s, %s, (SELECT precio FROM platos WHERE id = %s))
                """
                cursor.execute(insert_query, (id_reserva, id_plato, cantidad, id_plato))
                preorder_id = cursor.lastrowid
                
                # Actualizar stock
                update_query = "UPDATE platos SET stock_disponible = stock_disponible - %s WHERE id = %s"
                cursor.execute(update_query, (cantidad, id_plato))
                
                # Confirmar transacción
                self.db.connection.commit()
                cursor.close()
                
                return preorder_id
                
            except Exception as e:
                self.db.connection.rollback()
                if 'cursor' in locals():
                    cursor.close()
                raise e
                
        except Exception as e:
            print(f"Error al crear pre-pedido: {e}")
            return None
        finally:
            if self.db.connection:
                self.db.connection.autocommit = True
    
    def get_reservation_preorders(self, id_reserva):
        query = """
            SELECT pp.*, p.nombre as plato_nombre, p.precio as plato_precio
            FROM prepedidos pp
            JOIN platos p ON pp.id_plato = p.id
            WHERE pp.id_reserva = %s
            ORDER BY p.nombre
        """
        return self.db.execute_query(query, (id_reserva,))
    
    def get_preorder_summary(self, id_reserva):
        query = """
            SELECT 
                SUM(pp.cantidad * pp.precio_unitario) as total,
                COUNT(*) as items_count,
                SUM(pp.cantidad) as total_items
            FROM prepedidos pp
            WHERE pp.id_reserva = %s
        """
        return self.db.execute_query(query, (id_reserva,), fetch_one=True)
    
    def generate_consumption_note(self, id_reserva, additional_items=None):
        """
        Genera una nota de consumo consolidada con pre-pedidos y consumo adicional
        """
        try:
            # Obtener información de la reserva
            reservation_query = """
                SELECT r.*, u.nombre as cliente_nombre, u.email as cliente_email,
                       m.numero as mesa_numero, z.nombre as zona_nombre
                FROM reservas r
                JOIN usuarios u ON r.id_usuario = u.id
                JOIN mesas m ON r.id_mesa = m.id
                LEFT JOIN zonas z ON m.id_zona = z.id
                WHERE r.id = %s
            """
            reservation = self.db.execute_query(reservation_query, (id_reserva,), fetch_one=True)
            
            if not reservation:
                return None
            
            # Obtener pre-pedidos
            preorders = self.get_reservation_preorders(id_reserva)
            preorder_summary = self.get_preorder_summary(id_reserva)
            
            # Calcular totales
            preorder_total = preorder_summary['total'] if preorder_summary else 0
            additional_total = 0
            
            if additional_items:
                for item in additional_items:
                    additional_total += item['cantidad'] * item['precio_unitario']
            
            # Crear nota de consumo
            note_data = {
                'reserva': reservation,
                'pre_pedidos': preorders,
                'items_adicionales': additional_items or [],
                'resumen': {
                    'subtotal_prepedidos': preorder_total,
                    'subtotal_adicional': additional_total,
                    'total_general': preorder_total + additional_total,
                    'total_items': (preorder_summary['total_items'] if preorder_summary else 0) + 
                                  (sum(item['cantidad'] for item in additional_items) if additional_items else 0)
                },
                'fecha_generacion': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'estado': 'generada'
            }
            
            # Opcional: Guardar en base de datos
            insert_query = """
                INSERT INTO notas_consumo (id_reserva, subtotal_prepedidos, subtotal_adicional, 
                                         total_general, estado, fecha_generacion)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            note_id = self.db.execute_insert(insert_query, (
                id_reserva,
                preorder_total,
                additional_total,
                preorder_total + additional_total,
                'generada',
                note_data['fecha_generacion']
            ))
            
            if note_id:
                note_data['id'] = note_id
                
                # Guardar detalles de la nota
                if preorders:
                    for preorder in preorders:
                        detail_query = """
                            INSERT INTO notas_consumo_detalle (id_nota, tipo_item, id_item, descripcion, 
                                                             cantidad, precio_unitario, subtotal)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """
                        self.db.execute_insert(detail_query, (
                            note_id,
                            'prepedido',
                            preorder['id'],
                            f"Pre-pedido: {preorder['plato_nombre']}",
                            preorder['cantidad'],
                            preorder['precio_unitario'],
                            preorder['cantidad'] * preorder['precio_unitario']
                        ))
                
                if additional_items:
                    for item in additional_items:
                        detail_query = """
                            INSERT INTO notas_consumo_detalle (id_nota, tipo_item, id_item, descripcion, 
                                                             cantidad, precio_unitario, subtotal)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """
                        self.db.execute_insert(detail_query, (
                            note_id,
                            'adicional',
                            item.get('id_plato'),
                            item.get('descripcion', f"Consumo adicional"),
                            item['cantidad'],
                            item['precio_unitario'],
                            item['cantidad'] * item['precio_unitario']
                        ))
            
            return note_data
            
        except Exception as e:
            print(f"Error al generar nota de consumo: {e}")
            return None
    
    def get_consumption_notes(self, id_reserva=None):
        """
        Obtiene notas de consumo (todas o de una reserva específica)
        """
        if id_reserva:
            query = """
                SELECT nc.*, r.fecha as reserva_fecha, u.nombre as cliente_nombre,
                       m.numero as mesa_numero
                FROM notas_consumo nc
                JOIN reservas r ON nc.id_reserva = r.id
                JOIN usuarios u ON r.id_usuario = u.id
                JOIN mesas m ON r.id_mesa = m.id
                WHERE nc.id_reserva = %s
                ORDER BY nc.fecha_generacion DESC
            """
            return self.db.execute_query(query, (id_reserva,))
        else:
            query = """
                SELECT nc.*, r.fecha as reserva_fecha, u.nombre as cliente_nombre,
                       m.numero as mesa_numero
                FROM notas_consumo nc
                JOIN reservas r ON nc.id_reserva = r.id
                JOIN usuarios u ON r.id_usuario = u.id
                JOIN mesas m ON r.id_mesa = m.id
                ORDER BY nc.fecha_generacion DESC
            """
            return self.db.execute_query(query)
    
    def get_consumption_note_details(self, id_nota):
        """
        Obtiene detalles completos de una nota de consumo específica
        """
        # Obtener la nota principal
        note_query = """
            SELECT nc.*, r.fecha as reserva_fecha, u.nombre as cliente_nombre,
                   u.email as cliente_email, m.numero as mesa_numero, z.nombre as zona_nombre
            FROM notas_consumo nc
            JOIN reservas r ON nc.id_reserva = r.id
            JOIN usuarios u ON r.id_usuario = u.id
            JOIN mesas m ON r.id_mesa = m.id
            LEFT JOIN zonas z ON m.id_zona = z.id
            WHERE nc.id = %s
        """
        note = self.db.execute_query(note_query, (id_nota,), fetch_one=True)
        
        if not note:
            return None
        
        # Obtener detalles
        details_query = """
            SELECT * FROM notas_consumo_detalle 
            WHERE id_nota = %s 
            ORDER BY tipo_item, descripcion
        """
        details = self.db.execute_query(details_query, (id_nota,))
        
        note['detalles'] = details
        return note