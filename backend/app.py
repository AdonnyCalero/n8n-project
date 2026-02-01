from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
import pandas as pd
import io
from werkzeug.utils import secure_filename

# Cargar variables de entorno
load_dotenv()

from models import Database, AuthManager, ReservationManager, MenuManager

# Path to the frontend assets (index.html and static files)
FRONTEND_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

app = Flask(__name__, static_folder=FRONTEND_FOLDER, static_url_path='')
CORS(app)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'restaurante_secret_key_2024')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=72)  # Extendido a 72 horas
app.config['JWT_ALGORITHM'] = 'HS256'

jwt = JWTManager(app)

db = Database()
auth_manager = AuthManager(db)
reservation_manager = ReservationManager(db)
menu_manager = MenuManager(db)

@app.route('/')
def index():
    # Serve the frontend index.html from the dedicated frontend folder
    return send_from_directory(FRONTEND_FOLDER, 'index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not all(k in data for k in ['nombre', 'email', 'password']):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    user_id = auth_manager.register(
        data['nombre'], 
        data['email'], 
        data['password'],
        data.get('telefono'),
        'cliente'
    )
    
    if user_id:
        return jsonify({'message': 'Usuario registrado exitosamente', 'user_id': user_id}), 201
    else:
        return jsonify({'error': 'El email ya está registrado'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'Email y contraseña requeridos'}), 400
    
    user = auth_manager.login(data['email'], data['password'])
    
    if user:
        access_token = create_access_token(identity=str(user['id']))
        return jsonify({
            'token': access_token,
            'user': {
                'id': user['id'],
                'nombre': user['nombre'],
                'email': user['email'],
                'rol': user['rol']
            }
        }), 200
    else:
        return jsonify({'error': 'Credenciales inválidas'}), 401

@app.route('/api/zonas', methods=['GET'])
def get_zones():
    query = """
        SELECT z.*, 
               COUNT(m.id) as total_mesas,
               SUM(m.capacidad) as total_capacidad,
               SUM(CASE WHEN m.estado = 'disponible' THEN 1 ELSE 0 END) as mesas_disponibles
        FROM zonas z
        LEFT JOIN mesas m ON z.id = m.id_zona
        GROUP BY z.id
        ORDER BY z.nombre
    """
    zones = db.execute_query(query)
    return jsonify(zones)

@app.route('/api/zonas', methods=['POST'])
@jwt_required()
def create_zone():
    """
    Crear una nueva zona del restaurante
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    if not data.get('nombre'):
        return jsonify({'error': 'El nombre de la zona es requerido'}), 400
    
    # Verificar que no exista una zona con el mismo nombre
    check_query = "SELECT COUNT(*) as count FROM zonas WHERE nombre = %s"
    existing = db.execute_query(check_query, (data['nombre'],), fetch_one=True)
    
    if existing and existing['count'] > 0:
        return jsonify({'error': 'Ya existe una zona con ese nombre'}), 400
    
    try:
        insert_query = """
            INSERT INTO zonas (nombre, descripcion, capacidad_maxima, activa)
            VALUES (%s, %s, %s, %s)
        """
        zone_id = db.execute_insert(insert_query, (
            data.get('nombre'),
            data.get('descripcion', ''),
            data.get('capacidad_maxima', 50),
            data.get('activa', True)
        ))
        
        if zone_id:
            # Obtener la zona creada para devolverla
            select_query = "SELECT * FROM zonas WHERE id = %s"
            new_zone = db.execute_query(select_query, (zone_id,), fetch_one=True)
            
            return jsonify({
                'message': 'Zona creada correctamente',
                'zona': new_zone
            }), 201
        else:
            return jsonify({'error': 'Error al crear zona'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/zonas/<int:zone_id>', methods=['PUT'])
@jwt_required()
def update_zone(zone_id):
    """
    Actualizar una zona existente
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Verificar que la zona exista
    zone_check = "SELECT * FROM zonas WHERE id = %s"
    zone_existente = db.execute_query(zone_check, (zone_id,), fetch_one=True)
    
    if not zone_existente:
        return jsonify({'error': 'Zona no encontrada'}), 404
    
    data = request.get_json()
    
    # Verificar que el nuevo nombre no esté en uso por otra zona
    if data.get('nombre') and data['nombre'] != zone_existente['nombre']:
        check_query = "SELECT COUNT(*) as count FROM zonas WHERE nombre = %s AND id != %s"
        existing = db.execute_query(check_query, (data['nombre'], zone_id), fetch_one=True)
        
        if existing and existing['count'] > 0:
            return jsonify({'error': 'Ya existe otra zona con ese nombre'}), 400
    
    try:
        update_query = """
            UPDATE zonas 
            SET nombre = %s, descripcion = %s, capacidad_maxima = %s, activa = %s
            WHERE id = %s
        """
        success = db.execute_query(update_query, (
            data.get('nombre', zone_existente['nombre']),
            data.get('descripcion', zone_existente['descripcion']),
            data.get('capacidad_maxima', zone_existente['capacidad_maxima']),
            data.get('activa', zone_existente['activa']),
            zone_id
        ), fetch_all=False)
        
        if success:
            # Obtener la zona actualizada
            zona_actualizada = db.execute_query("SELECT * FROM zonas WHERE id = %s", (zone_id,), fetch_one=True)
            
            return jsonify({
                'message': 'Zona actualizada correctamente',
                'zona': zona_actualizada
            })
        else:
            return jsonify({'error': 'Error al actualizar zona'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/zonas/<int:zone_id>', methods=['DELETE'])
@jwt_required()
def delete_zone(zone_id):
    """
    Eliminar una zona del restaurante
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Verificar que la zona exista
    zone_check = "SELECT * FROM zonas WHERE id = %s"
    zone_existente = db.execute_query(zone_check, (zone_id,), fetch_one=True)
    
    if not zone_existente:
        return jsonify({'error': 'Zona no encontrada'}), 404
    
    # Verificar si hay mesas asociadas
    tables_check = "SELECT COUNT(*) as count FROM mesas WHERE id_zona = %s"
    tables_count = db.execute_query(tables_check, (zone_id,), fetch_one=True)
    
    if tables_count and tables_count['count'] > 0:
        return jsonify({
            'error': f'No se puede eliminar la zona porque tiene {tables_count["count"]} mesas asociadas. Mueva o elimine las mesas primero.'
        }), 400
    
    # Eliminar zona
    delete_query = "DELETE FROM zonas WHERE id = %s"
    success = db.execute_query(delete_query, (zone_id,), fetch_all=False)
    
    if success:
        return jsonify({'message': 'Zona eliminada correctamente'})
    else:
        return jsonify({'error': 'Error al eliminar zona'}), 500

@app.route('/api/zonas/<int:zone_id>/estadisticas', methods=['GET'])
@jwt_required()
def get_zone_statistics(zone_id):
    """
    Obtener estadísticas detalladas de una zona
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Verificar que la zona exista
    zone_check = "SELECT * FROM zonas WHERE id = %s"
    zone = db.execute_query(zone_check, (zone_id,), fetch_one=True)
    
    if not zone:
        return jsonify({'error': 'Zona no encontrada'}), 404
    
    # Estadísticas de mesas
    tables_stats_query = """
        SELECT 
            COUNT(*) as total_mesas,
            SUM(capacidad) as total_capacidad,
            SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as disponibles,
            SUM(CASE WHEN estado = 'ocupada' THEN 1 ELSE 0 END) as ocupadas,
            SUM(CASE WHEN estado = 'reservada' THEN 1 ELSE 0 END) as reservadas,
            SUM(CASE WHEN estado = 'mantenimiento' THEN 1 ELSE 0 END) as mantenimiento
        FROM mesas 
        WHERE id_zona = %s
    """
    tables_stats = db.execute_query(tables_stats_query, (zone_id,), fetch_one=True)
    
    # Estadísticas de reservas (últimos 30 días)
    reservations_stats_query = """
        SELECT 
            COUNT(*) as total_reservas,
            SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
            SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
            SUM(numero_comensales) as total_comensales,
            COUNT(DISTINCT CASE WHEN fecha >= CURDATE() THEN id END) as reservas_hoy
        FROM reservas r
        JOIN mesas m ON r.id_mesa = m.id
        WHERE m.id_zona = %s 
        AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    """
    reservations_stats = db.execute_query(reservations_stats_query, (zone_id,), fetch_one=True)
    
    return jsonify({
        'zona': zone,
        'estadisticas_mesas': tables_stats,
        'estadisticas_reservas': reservations_stats
    })

@app.route('/api/mesas', methods=['GET'])
def get_tables():
    id_zona = request.args.get('id_zona')
    
    if id_zona:
        query = "SELECT * FROM mesas WHERE id_zona = %s ORDER BY numero"
        tables = db.execute_query(query, (id_zona,))
    else:
        query = """
            SELECT m.*, z.nombre as zona_nombre 
            FROM mesas m 
            LEFT JOIN zonas z ON m.id_zona = z.id 
            ORDER BY z.nombre, m.numero
        """
        tables = db.execute_query(query)
    
    return jsonify(tables)

@app.route('/api/disponibilidad', methods=['GET'])
def check_availability():
    fecha = request.args.get('fecha')
    hora = request.args.get('hora')
    comensales = int(request.args.get('comensales', 1))
    id_zona = request.args.get('id_zona')
    
    if not all([fecha, hora]):
        return jsonify({'error': 'Fecha y hora requeridas'}), 400
    
    available_tables = reservation_manager.check_availability(fecha, hora, comensales, id_zona)
    return jsonify({'mesas_disponibles': available_tables})

@app.route('/api/reservas', methods=['POST'])
@jwt_required()
def create_reservation():
    data = request.get_json()
    user_id = int(get_jwt_identity())
    
    required_fields = ['id_mesa', 'fecha', 'hora', 'numero_comensales']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    reservation_id = reservation_manager.create_reservation(
        user_id,
        data['id_mesa'],
        data['fecha'],
        data['hora'],
        data['numero_comensales'],
        data.get('observaciones')
    )
    
    if reservation_id:
        # Procesar pre-pedidos si existen
        preorders = data.get('preorders', [])
        if preorders:
            for preorder in preorders:
                menu_manager.create_preorder(
                    reservation_id,
                    preorder['id_plato'],
                    preorder['cantidad']
                )
        
        return jsonify({
            'message': 'Reserva creada exitosamente',
            'reservation_id': reservation_id
        }), 201
    else:
        return jsonify({'error': 'No se pudo crear la reserva'}), 500

@app.route('/api/mis-reservas', methods=['GET'])
@jwt_required()
def get_user_reservations():
    user_id = int(get_jwt_identity())
    reservations = reservation_manager.get_user_reservations(user_id)
    
    # Agregar pre-pedidos a cada reserva
    for reservation in reservations:
        preorders = menu_manager.get_reservation_preorders(reservation['id'])
        summary = menu_manager.get_preorder_summary(reservation['id'])
        reservation['preorders'] = preorders
        reservation['preorder_summary'] = summary
    
    return jsonify(reservations)

@app.route('/api/reservas/<int:reservation_id>/preorders', methods=['GET'])
@jwt_required()
def get_reservation_preorders(reservation_id):
    user_id = int(get_jwt_identity())
    
    # Verificar que el usuario es dueño de la reserva o admin
    query = "SELECT id_usuario FROM reservas WHERE id = %s"
    reservation = db.execute_query(query, (reservation_id,), fetch_one=True)
    
    if not reservation:
        return jsonify({'error': 'Reserva no encontrada'}), 404
    
    user_query = "SELECT rol FROM usuarios WHERE id = %s"
    user_info = db.execute_query(user_query, (user_id,), fetch_one=True)
    is_admin = user_info and user_info['rol'] == 'administrador'
    
    if not is_admin and reservation['id_usuario'] != user_id:
        return jsonify({'error': 'No autorizado'}), 403
    
    preorders = menu_manager.get_reservation_preorders(reservation_id)
    summary = menu_manager.get_preorder_summary(reservation_id)
    
    return jsonify({
        'preorders': preorders,
        'summary': summary
    })

@app.route('/api/reservas/<int:reservation_id>/preorders', methods=['POST'])
@jwt_required()
def add_reservation_preorder(reservation_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Verificar que el usuario es dueño de la reserva o admin
    query = "SELECT id_usuario FROM reservas WHERE id = %s"
    reservation = db.execute_query(query, (reservation_id,), fetch_one=True)
    
    if not reservation:
        return jsonify({'error': 'Reserva no encontrada'}), 404
    
    user_query = "SELECT rol FROM usuarios WHERE id = %s"
    user_info = db.execute_query(user_query, (user_id,), fetch_one=True)
    is_admin = user_info and user_info['rol'] == 'administrador'
    
    if not is_admin and reservation['id_usuario'] != user_id:
        return jsonify({'error': 'No autorizado'}), 403
    
    if not all(k in data for k in ['id_plato', 'cantidad']):
        return jsonify({'error': 'Faltan campos requeridos: id_plato, cantidad'}), 400
    
    preorder_id = menu_manager.create_preorder(
        reservation_id,
        data['id_plato'],
        data['cantidad']
    )
    
    if preorder_id:
        return jsonify({
            'message': 'Pre-pedido agregado exitosamente',
            'preorder_id': preorder_id
        }), 201
    else:
        return jsonify({'error': 'No se pudo agregar el pre-pedido'}), 500

@app.route('/api/notas-consumo', methods=['POST'])
@jwt_required()
def generate_consumption_note():
    """
    Genera una nota de consumo para una reserva
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data.get('id_reserva'):
        return jsonify({'error': 'ID de reserva requerido'}), 400
    
    # Verificar que el usuario es dueño de la reserva o admin
    query = "SELECT id_usuario FROM reservas WHERE id = %s"
    reservation = db.execute_query(query, (data['id_reserva'],), fetch_one=True)
    
    if not reservation:
        return jsonify({'error': 'Reserva no encontrada'}), 404
    
    user_query = "SELECT rol FROM usuarios WHERE id = %s"
    user_info = db.execute_query(user_query, (user_id,), fetch_one=True)
    is_admin = user_info and user_info['rol'] == 'administrador'
    
    if not is_admin and reservation['id_usuario'] != user_id:
        return jsonify({'error': 'No autorizado'}), 403
    
    # Generar nota de consumo
    note_data = menu_manager.generate_consumption_note(
        data['id_reserva'],
        data.get('items_adicionales')
    )
    
    if note_data:
        return jsonify({
            'message': 'Nota de consumo generada exitosamente',
            'nota': note_data
        }), 201
    else:
        return jsonify({'error': 'No se pudo generar la nota de consumo'}), 500

@app.route('/api/notas-consumo', methods=['GET'])
@jwt_required()
def get_consumption_notes():
    """
    Obtiene notas de consumo (filtrar por reserva o todas si es admin)
    """
    user_id = int(get_jwt_identity())
    id_reserva = request.args.get('id_reserva')
    
    # Verificar si es admin
    user_query = "SELECT rol FROM usuarios WHERE id = %s"
    user_info = db.execute_query(user_query, (user_id,), fetch_one=True)
    is_admin = user_info and user_info['rol'] == 'administrador'
    
    if id_reserva:
        # Verificar acceso a la reserva específica
        reservation_query = "SELECT id_usuario FROM reservas WHERE id = %s"
        reservation = db.execute_query(reservation_query, (id_reserva,), fetch_one=True)
        
        if not reservation:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        
        if not is_admin and reservation['id_usuario'] != user_id:
            return jsonify({'error': 'No autorizado'}), 403
        
        notes = menu_manager.get_consumption_notes(int(id_reserva))
    else:
        # Solo admin puede ver todas las notas
        if not is_admin:
            return jsonify({'error': 'No autorizado'}), 403
        
        notes = menu_manager.get_consumption_notes()
    
    return jsonify({'notas': notes})

@app.route('/api/notas-consumo/<int:note_id>', methods=['GET'])
@jwt_required()
def get_consumption_note_details(note_id):
    """
    Obtiene detalles completos de una nota de consumo específica
    """
    user_id = int(get_jwt_identity())
    
    # Obtener la nota para verificar acceso
    note_data = menu_manager.get_consumption_note_details(note_id)
    
    if not note_data:
        return jsonify({'error': 'Nota de consumo no encontrada'}), 404
    
    # Verificar si es admin o dueño de la reserva
    user_query = "SELECT rol FROM usuarios WHERE id = %s"
    user_info = db.execute_query(user_query, (user_id,), fetch_one=True)
    is_admin = user_info and user_info['rol'] == 'administrador'
    
    # Verificar acceso a la reserva asociada
    reservation_query = "SELECT id_usuario FROM reservas WHERE id = %s"
    reservation = db.execute_query(reservation_query, (note_data['id_reserva'],), fetch_one=True)
    
    if not is_admin and (not reservation or reservation['id_usuario'] != user_id):
        return jsonify({'error': 'No autorizado'}), 403
    
    return jsonify({'nota': note_data})

@app.route('/api/prepedidos/excel/upload', methods=['POST'])
@jwt_required()
def upload_excel_preorders():
    """
    Subir archivo Excel de pre-pedidos
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Verificar que se haya subido un archivo
    if 'file' not in request.files:
        return jsonify({'error': 'No se ha subido ningún archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400
    
    # Verificar extensión del archivo
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'error': 'El archivo debe ser un Excel (.xlsx o .xls)'}), 400
    
    try:
        # Leer el archivo Excel
        df = pd.read_excel(file)
        
        # Validar estructura del Excel
        required_columns = ['nombre_plato', 'cantidad', 'id_reserva']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return jsonify({
                'error': 'El archivo no tiene las columnas requeridas',
                'columnas_requeridas': required_columns,
                'columnas_faltantes': missing_columns,
                'columnas_encontradas': list(df.columns)
            }), 400
        
        # Validar datos
        validation_errors = []
        valid_preorders = []
        
        for index, row in df.iterrows():
            row_errors = []
            
            # Validar nombre_plato
            if pd.isna(row['nombre_plato']) or not str(row['nombre_plato']).strip():
                row_errors.append(f"Fila {index+1}: El nombre del plato es requerido")
            else:
                # Verificar que el plato exista
                plato_query = "SELECT id, nombre, stock_disponible, precio FROM platos WHERE nombre = %s"
                plato = db.execute_query(plato_query, (str(row['nombre_plato']).strip(),), fetch_one=True)
                
                if not plato:
                    row_errors.append(f"Fila {index+1}: El plato '{row['nombre_plato']}' no existe")
                elif plato['stock_disponible'] <= 0:
                    row_errors.append(f"Fila {index+1}: El plato '{row['nombre_plato']}' no tiene stock disponible")
            
            # Validar cantidad
            try:
                cantidad = int(row['cantidad'])
                if cantidad <= 0:
                    row_errors.append(f"Fila {index+1}: La cantidad debe ser mayor a 0")
            except (ValueError, TypeError):
                row_errors.append(f"Fila {index+1}: La cantidad debe ser un número válido")
            
            # Validar id_reserva
            try:
                id_reserva = int(row['id_reserva'])
                if id_reserva <= 0:
                    row_errors.append(f"Fila {index+1}: El ID de reserva debe ser mayor a 0")
                else:
                    # Verificar que la reserva exista
                    reservation_query = "SELECT id, estado FROM reservas WHERE id = %s"
                    reservation = db.execute_query(reservation_query, (id_reserva,), fetch_one=True)
                    
                    if not reservation:
                        row_errors.append(f"Fila {index+1}: La reserva {id_reserva} no existe")
                    elif reservation['estado'] != 'confirmada':
                        row_errors.append(f"Fila {index+1}: La reserva {id_reserva} no está confirmada")
            except (ValueError, TypeError):
                row_errors.append(f"Fila {index+1}: El ID de reserva debe ser un número válido")
            
            if row_errors:
                validation_errors.extend(row_errors)
            else:
                valid_preorders.append({
                    'fila': index + 1,
                    'id_reserva': int(row['id_reserva']),
                    'nombre_plato': str(row['nombre_plato']).strip(),
                    'cantidad': int(row['cantidad']),
                    'plato_info': plato
                })
        
        if validation_errors:
            return jsonify({
                'error': 'Errores de validación en el archivo',
                'errores': validation_errors,
                'total_filas': len(df),
                'filas_validas': len(valid_preorders),
                'previsualizacion': valid_preorders[:10]  # Solo primeras 10 filas válidas
            }), 400
        
        return jsonify({
            'message': 'Archivo validado correctamente',
            'total_prepedidos': len(valid_preorders),
            'prepedidos': valid_preorders,
            'listo_para_procesar': True
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al procesar el archivo Excel: {str(e)}'
        }), 500

@app.route('/api/prepedidos/excel/procesar', methods=['POST'])
@jwt_required()
def process_excel_preorders():
    """
    Procesar y registrar pre-pedidos validados desde Excel
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    prepedidos = data.get('prepedidos', [])
    
    if not prepedidos:
        return jsonify({'error': 'No hay pre-pedidos para procesar'}), 400
    
    resultados = {
        'procesados': [],
        'errores': [],
        'total_procesados': 0,
        'total_errores': 0
    }
    
    for preorder in prepedidos:
        try:
            # Crear pre-pedido
            preorder_id = menu_manager.create_preorder(
                preorder['id_reserva'],
                preorder['plato_info']['id'],
                preorder['cantidad']
            )
            
            if preorder_id:
                resultados['procesados'].append({
                    'fila': preorder['fila'],
                    'id_reserva': preorder['id_reserva'],
                    'plato': preorder['nombre_plato'],
                    'cantidad': preorder['cantidad'],
                    'preorder_id': preorder_id
                })
                resultados['total_procesados'] += 1
            else:
                resultados['errores'].append({
                    'fila': preorder['fila'],
                    'error': 'No se pudo crear el pre-pedido (posiblemente sin stock)',
                    'plato': preorder['nombre_plato']
                })
                resultados['total_errores'] += 1
                
        except Exception as e:
            resultados['errores'].append({
                'fila': preorder['fila'],
                'error': str(e),
                'plato': preorder['nombre_plato']
            })
            resultados['total_errores'] += 1
    
    return jsonify({
        'message': 'Proceso completado',
        'resultados': resultados,
        'prepedidos_exitosos': resultados['total_procesados'],
        'prepedidos_con_errores': resultados['total_errores']
    })

@app.route('/api/platos/exportar/plantilla', methods=['GET'])
@jwt_required()
def export_preorder_template():
    """
    Exportar plantilla Excel para pre-pedidos
    """
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Obtener lista de platos disponibles
    platos_query = "SELECT id, nombre, precio, stock_disponible FROM platos WHERE disponible = TRUE AND stock_disponible > 0"
    platos = db.execute_query(platos_query)
    
    # Obtener lista de reservas confirmadas futuras
    reservations_query = """
        SELECT r.id, r.fecha, r.hora, u.nombre as cliente_nombre, m.numero as mesa_numero
        FROM reservas r
        JOIN usuarios u ON r.id_usuario = u.id
        JOIN mesas m ON r.id_mesa = m.id
        WHERE r.estado = 'confirmada' 
        AND r.fecha >= CURDATE()
        ORDER BY r.fecha, r.hora
    """
    reservas = db.execute_query(reservations_query)
    
    # Crear DataFrame de ejemplo
    example_data = []
    if platos and reservas:
        example_data = [
            {
                'nombre_plato': platos[0]['nombre'],
                'cantidad': 2,
                'id_reserva': reservas[0]['id']
            },
            {
                'nombre_plato': platos[1]['nombre'] if len(platos) > 1 else platos[0]['nombre'],
                'cantidad': 1,
                'id_reserva': reservas[1]['id'] if len(reservas) > 1 else reservas[0]['id']
            }
        ]
    
    # Crear Excel en memoria
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Hoja de datos de ejemplo
        if example_data:
            pd.DataFrame(example_data).to_excel(writer, sheet_name='Pre-pedidos', index=False)
        
        # Hoja con lista de platos disponibles
        if platos:
            platos_df = pd.DataFrame(platos)
            platos_df.to_excel(writer, sheet_name='Platos Disponibles', index=False)
        
        # Hoja con lista de reservas
        if reservas:
            reservas_df = pd.DataFrame(reservas)
            reservas_df.to_excel(writer, sheet_name='Reservas Activas', index=False)
        
        # Hoja de instrucciones
        instructions = pd.DataFrame([
            {'Instrucción': 'Use la hoja "Pre-pedidos" para cargar los datos'},
            {'Instrucción': 'Los campos requeridos son: nombre_plato, cantidad, id_reserva'},
            {'Instrucción': 'nombre_plato: Debe coincidir exactamente con un plato disponible'},
            {'Instrucción': 'cantidad: Número entero mayor a 0'},
            {'Instrucción': 'id_reserva: ID de una reserva confirmada activa'},
            {'Instrucción': 'Consulte las otras hojas para información de referencia'}
        ])
        instructions.to_excel(writer, sheet_name='Instrucciones', index=False)
    
    output.seek(0)
    
    return send_from_directory(
        directory='',
        filename=output,
        as_attachment=True,
        download_name='plantilla_prepedidos.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@app.route('/api/menu', methods=['GET'])
def get_menu():
    menu_items = menu_manager.get_menu_items()
    return jsonify(menu_items)

@app.route('/api/platos/<int:plato_id>/stock', methods=['GET'])
def check_plato_stock(plato_id):
    cantidad = int(request.args.get('cantidad', 1))
    available = menu_manager.check_stock(plato_id, cantidad)
    return jsonify({'disponible': available})

@app.route('/api/platos', methods=['POST'])
@jwt_required()
def create_plato():
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    try:
        insert_query = """
            INSERT INTO platos (nombre, descripcion, precio, categoria, 
                              stock_disponible, stock_maximo, disponible) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        plato_id = db.execute_insert(insert_query, (
            data.get('nombre'), data.get('descripcion'), data.get('precio'),
            data.get('categoria'), data.get('stock_disponible'), 
            data.get('stock_maximo', 100), data.get('disponible', True)
        ))
        
        if plato_id:
            return jsonify({'message': 'Plato creado correctamente', 'plato_id': plato_id}), 201
        else:
            return jsonify({'error': 'Error al crear plato'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/platos/<int:plato_id>', methods=['PUT'])
@jwt_required()
def update_plato(plato_id):
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    try:
        update_query = """
            UPDATE platos 
            SET nombre = %s, descripcion = %s, precio = %s, categoria = %s,
                stock_disponible = %s, stock_maximo = %s, disponible = %s
            WHERE id = %s
        """
        success = db.execute_query(update_query, (
            data.get('nombre'), data.get('descripcion'), data.get('precio'),
            data.get('categoria'), data.get('stock_disponible'), 
            data.get('stock_maximo'), data.get('disponible'), plato_id
        ), fetch_all=False)
        
        if success:
            return jsonify({'message': 'Plato actualizado correctamente'})
        else:
            return jsonify({'error': 'Error al actualizar plato'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/platos/<int:plato_id>', methods=['DELETE'])
@jwt_required()
def delete_plato(plato_id):
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Eliminar plato
    delete_query = "DELETE FROM platos WHERE id = %s"
    success = db.execute_query(delete_query, (plato_id,), fetch_all=False)
    
    if success:
        return jsonify({'message': 'Plato eliminado correctamente'})
    else:
        return jsonify({'error': 'Error al eliminar plato'}), 500

@app.route('/api/admin/reservas', methods=['GET'])
@jwt_required()
def get_all_reservations():
    user_id = int(get_jwt_identity())
    
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    reservations = reservation_manager.get_all_reservations()
    return jsonify(reservations)

@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    stats_query = """
        SELECT 
            COUNT(*) as total_reservas,
            SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
            SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
            SUM(numero_comensales) as total_comensales,
            COUNT(DISTINCT CASE WHEN fecha = CURDATE() THEN id END) as reservas_hoy
        FROM reservas
        WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """
    
    tables_query = """
        SELECT 
            COUNT(*) as total_mesas,
            SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as disponibles,
            SUM(CASE WHEN estado = 'ocupada' THEN 1 ELSE 0 END) as ocupadas,
            SUM(CASE WHEN estado = 'reservada' THEN 1 ELSE 0 END) as reservadas
        FROM mesas
    """
    
    stats = db.execute_query(stats_query, fetch_one=True)
    tables = db.execute_query(tables_query, fetch_one=True)
    
    return jsonify({
        'reservas': stats,
        'mesas': tables
    })

@app.route('/api/mesas', methods=['POST'])
@jwt_required()
def create_table():
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    # Validar datos requeridos
    if not all(k in data for k in ['numero', 'capacidad', 'id_zona']):
        return jsonify({'error': 'Faltan datos requeridos: numero, capacidad, id_zona'}), 400
    
    try:
        # Verificar que no exista otra mesa con el mismo número en la misma zona
        check_query = "SELECT COUNT(*) as count FROM mesas WHERE numero = %s AND id_zona = %s"
        existing = db.execute_query(check_query, (data['numero'], data['id_zona']), fetch_one=True)
        
        if existing and existing['count'] > 0:
            return jsonify({'error': 'Ya existe una mesa con ese número en esta zona'}), 400
        
        # Insertar nueva mesa
        insert_query = """
            INSERT INTO mesas (numero, capacidad, id_zona, posicion_x, posicion_y, estado)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        new_table_id = db.execute_query(insert_query, (
            data['numero'],
            data['capacidad'],
            data['id_zona'],
            data.get('posicion_x', 0),
            data.get('posicion_y', 0),
            data.get('estado', 'disponible')
        ), fetch_all=False)
        
        if new_table_id:
            # Obtener la mesa creada para devolverla
            select_query = "SELECT * FROM mesas WHERE id = %s"
            new_table = db.execute_query(select_query, (new_table_id,), fetch_one=True)
            
            return jsonify({
                'message': 'Mesa creada correctamente',
                'mesa': new_table
            }), 201
        else:
            return jsonify({'error': 'Error al crear mesa'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mesas/<int:table_id>', methods=['PUT'])
@jwt_required()
def update_table(table_id):
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    # Logging para depuración
    print(f"DEBUG: Actualizando mesa {table_id} con datos: {data}")
    print(f"DEBUG: Usuario ID: {user_id}")
    
    try:
        # Validar datos requeridos
        if not all(k in data for k in ['numero', 'capacidad', 'id_zona']):
            print(f"DEBUG: Faltan datos requeridos. Data: {data}")
            return jsonify({'error': 'Faltan datos requeridos'}), 400
        
        # Validar que la mesa exista
        mesa_check = "SELECT * FROM mesas WHERE id = %s"
        mesa_existente = db.execute_query(mesa_check, (table_id,), fetch_one=True)
        
        if not mesa_existente:
            print(f"DEBUG: Mesa {table_id} no existe")
            return jsonify({'error': 'Mesa no encontrada'}), 404
        
        print(f"DEBUG: Mesa existente: {mesa_existente}")
        
        update_query = """
            UPDATE mesas 
            SET numero = %s, capacidad = %s, id_zona = %s, 
                posicion_x = %s, posicion_y = %s, estado = %s 
            WHERE id = %s
        """
        
        params = (
            data.get('numero'), data.get('capacidad'), data.get('id_zona'),
            data.get('posicion_x'), data.get('posicion_y'), 
            data.get('estado'), table_id
        )
        
        print(f"DEBUG: Ejecutando query con params: {params}")
        
        success = db.execute_query(update_query, params, fetch_all=False)
        
        print(f"DEBUG: Resultado de actualización: {success}")
        
        if success:
            # Verificar que se actualizó correctamente
            verify_query = "SELECT * FROM mesas WHERE id = %s"
            mesa_actualizada = db.execute_query(verify_query, (table_id,), fetch_one=True)
            print(f"DEBUG: Mesa actualizada: {mesa_actualizada}")
            
            return jsonify({
                'message': 'Mesa actualizada correctamente',
                'mesa': mesa_actualizada,
                'registros_afectados': success
            })
        else:
            # Caso especial: puede ser que no hubo cambios pero la consulta fue exitosa
            print(f"DEBUG: La consulta no afectó registros (posiblemente no hay cambios)")
            
            # Devolver la mesa actual aunque no haya cambios
            mesa_actual = db.execute_query("SELECT * FROM mesas WHERE id = %s", (table_id,), fetch_one=True)
            
            return jsonify({
                'message': 'No se realizaron cambios - los datos son los mismos',
                'mesa': mesa_actual,
                'sin_cambios': True
            }), 200
            
    except Exception as e:
        print(f"DEBUG: Excepción en update_table: {str(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Error al actualizar mesa: {str(e)}'}), 500

@app.route('/api/mesas/<int:table_id>', methods=['DELETE'])
@jwt_required()
def delete_table(table_id):
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    # Verificar si hay reservas asociadas
    reservation_check = """
        SELECT COUNT(*) as count FROM reservas 
        WHERE id_mesa = %s AND fecha >= CURDATE() 
        AND estado != 'cancelada'
    """
    reservation_count = db.execute_query(reservation_check, (table_id,), fetch_one=True)
    
    if reservation_count and reservation_count['count'] > 0:
        return jsonify({'error': 'No se puede eliminar una mesa con reservas activas'}), 400
    
    # Eliminar mesa
    delete_query = "DELETE FROM mesas WHERE id = %s"
    success = db.execute_query(delete_query, (table_id,), fetch_all=False)
    
    if success:
        return jsonify({'message': 'Mesa eliminada correctamente'})
    else:
        return jsonify({'error': 'Error al eliminar mesa'}), 500

@app.route('/api/reservas/<int:reservation_id>', methods=['PUT'])
@jwt_required()
def update_reservation(reservation_id):
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    try:
        update_query = """
            UPDATE reservas 
            SET fecha = %s, hora = %s, numero_comensales = %s, 
                observaciones = %s, estado = %s 
            WHERE id = %s
        """
        if not db.connection or not db.connection.is_connected():
            db.connect()
        
        cursor = db.connection.cursor()
        cursor.execute(update_query, (
            data.get('fecha'), data.get('hora'), 
            data.get('numero_comensales'), data.get('observaciones'),
            data.get('estado'), reservation_id
        ))
        db.connection.commit()
        rows_affected = cursor.rowcount
        cursor.close()
        
        if rows_affected > 0:
            return jsonify({'message': 'Reserva actualizada correctamente'})
        else:
            return jsonify({'error': 'No se encontró la reserva o no se realizaron cambios'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reservas/<int:reservation_id>', methods=['DELETE'])
@jwt_required()
def delete_reservation(reservation_id):
    user_id = get_jwt_identity()
    
    # Verificar que es administrador
    query = "SELECT rol FROM usuarios WHERE id = %s"
    user = db.execute_query(query, (user_id,), fetch_one=True)
    
    if not user or user['rol'] != 'administrador':
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        # Primero obtener el id_mesa de la reserva para actualizar la mesa después
        reservation_query = "SELECT id_mesa FROM reservas WHERE id = %s"
        reservation = db.execute_query(reservation_query, (reservation_id,), fetch_one=True)
        
        if not reservation:
            return jsonify({'error': 'Reserva no encontrada'}), 404
        
        # Eliminar reserva
        delete_query = "DELETE FROM reservas WHERE id = %s"
        if not db.connection or not db.connection.is_connected():
            db.connect()
        
        cursor = db.connection.cursor()
        cursor.execute(delete_query, (reservation_id,))
        db.connection.commit()
        rows_affected = cursor.rowcount
        cursor.close()
        
        if rows_affected > 0:
            # Actualizar estado de la mesa a disponible
            update_query = "UPDATE mesas SET estado = 'disponible' WHERE id = %s"
            if not db.connection or not db.connection.is_connected():
                db.connect()
            
            cursor = db.connection.cursor()
            cursor.execute(update_query, (reservation['id_mesa'],))
            db.connection.commit()
            cursor.close()
            
            return jsonify({'message': 'Reserva eliminada correctamente'})
        else:
            return jsonify({'error': 'No se pudo eliminar la reserva'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Recurso no encontrado'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    if db.connect():
        print("Conexion a la base de datos establecida")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("No se pudo conectar a la base de datos")
