#!/usr/bin/env python
import requests
import json

# Configuración
API_URL = "http://localhost:5000"
TOKEN = None

def login():
    global TOKEN
    print("=== INICIANDO SESIÓN ===")
    
    response = requests.post(
        f"{API_URL}/api/login",
        json={
            "email": "admin@restaurante.com",
            "password": "admin123"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        TOKEN = data['token']
        print(f"✅ Login exitoso. Token: {TOKEN[:50]}...")
        return True
    else:
        print(f"❌ Error de login: {response.status_code}")
        print(response.text)
        return False

def test_delete_mesa(mesa_id):
    print(f"\n=== ELIMINANDO MESA {mesa_id} ===")
    
    if not TOKEN:
        print("❌ No hay token. Iniciando sesión...")
        if not login():
            return False
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}"
    }
    
    try:
        response = requests.delete(
            f"{API_URL}/api/mesas/{mesa_id}",
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 200:
            print("✅ Mesa eliminada correctamente")
            return True
        else:
            print(f"❌ Error al eliminar mesa")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                pass
            return False
            
    except Exception as e:
        print(f"❌ Excepción: {e}")
        return False

def test_get_mesas():
    print("\n=== OBTENIENDO MESAS ===")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}"
    }
    
    try:
        response = requests.get(
            f"{API_URL}/api/mesas",
            headers=headers
        )
        
        if response.status_code == 200:
            mesas = response.json()
            print(f"✅ Total de mesas: {len(mesas)}")
            for mesa in mesas:
                print(f"  - ID: {mesa['id']}, Número: {mesa['numero']}, Estado: {mesa['estado']}")
            return mesas
        else:
            print(f"❌ Error al obtener mesas: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"❌ Excepción: {e}")
        return []

if __name__ == "__main__":
    print("🧪 PRUEBA DE ELIMINACIÓN DE MESA")
    print("=" * 50)
    
    # 1. Login
    if not login():
        exit(1)
    
    # 2. Obtener mesas antes
    mesas_antes = test_get_mesas()
    
    if len(mesas_antes) == 0:
        print("\n⚠️ No hay mesas para eliminar")
        exit(1)
    
    # 3. Seleccionar primera mesa
    mesa_a_eliminar = mesas_antes[0]
    mesa_id = mesa_a_eliminar['id']
    print(f"\n📋 Mesa a eliminar:")
    print(f"  - ID: {mesa_id}")
    print(f"  - Número: {mesa_a_eliminar['numero']}")
    print(f"  - Estado: {mesa_a_eliminar['estado']}")
    
    # 4. Eliminar mesa
    if test_delete_mesa(mesa_id):
        print(f"\n✅ Eliminación completada")
        
        # 5. Verificar mesas después
        mesas_despues = test_get_mesas()
        
        print(f"\n📊 Comparación:")
        print(f"  - Antes: {len(mesas_antes)} mesas")
        print(f"  - Después: {len(mesas_despues)} mesas")
        print(f"  - Diferencia: {len(mesas_antes) - len(mesas_despues)} mesas eliminadas")
    else:
        print(f"\n❌ Error en la eliminación")
        exit(1)
    
    print("\n" + "=" * 50)
    print("🏁 PRUEBA COMPLETADA")
