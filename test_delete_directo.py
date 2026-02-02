#!/usr/bin/env python
import mysql.connector

def test_delete_mesa(mesa_id):
    print(f"=== Probando eliminación de mesa {mesa_id} ===")
    
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='restaurante'
        )
        
        cursor = conn.cursor(dictionary=True)
        
        # 1. Verificar si la mesa existe
        print("\n1. Verificando si la mesa existe...")
        cursor.execute("SELECT id, numero, capacidad, estado FROM mesas WHERE id = %s", (mesa_id,))
        mesa = cursor.fetchone()
        
        if mesa:
            print(f"   ✅ Mesa encontrada: ID={mesa['id']}, Número={mesa['numero']}, Estado={mesa['estado']}")
        else:
            print(f"   ❌ Mesa {mesa_id} NO encontrada")
            cursor.close()
            conn.close()
            return False
        
        # 2. Verificar si hay reservas activas
        print("\n2. Verificando reservas activas...")
        cursor.execute("""
            SELECT COUNT(*) as count FROM reservas 
            WHERE id_mesa = %s AND fecha >= CURDATE() AND estado != 'cancelada'
        """, (mesa_id,))
        reservation_count = cursor.fetchone()
        
        if reservation_count and reservation_count['count'] > 0:
            print(f"   ⚠️ Mesa tiene {reservation_count['count']} reservas activas")
            cursor.close()
            conn.close()
            return False
        else:
            print(f"   ✅ No hay reservas activas")
        
        # 3. Eliminar la mesa
        print(f"\n3. Eliminando mesa {mesa_id}...")
        cursor.execute("DELETE FROM mesas WHERE id = %s", (mesa_id,))
        conn.commit()
        
        affected_rows = cursor.rowcount
        print(f"   ✅ Mesas eliminadas: {affected_rows}")
        
        if affected_rows > 0:
            print(f"\n✅ Mesa {mesa_id} eliminada correctamente!")
            cursor.close()
            conn.close()
            return True
        else:
            print(f"\n❌ No se eliminó ninguna mesa")
            cursor.close()
            conn.close()
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 PRUEBA DIRECTA DE ELIMINACIÓN DE MESA")
    print("=" * 50)
    
    # Probar con mesa existente (39)
    print("\n--- Prueba 1: Eliminar mesa existente (ID 39) ---")
    test_delete_mesa(39)
    
    # Probar con mesa inexistente (999)
    print("\n--- Prueba 2: Intentar eliminar mesa inexistente (ID 999) ---")
    test_delete_mesa(999)
    
    print("\n" + "=" * 50)
    print("🏁 Pruebas completadas")
