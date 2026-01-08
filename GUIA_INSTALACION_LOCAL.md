# 📘 Guía de Instalación Local - Calculadora de Huella de Carbono

Esta guía te llevará paso a paso para descargar, configurar y ejecutar la aplicación en tu computador usando Visual Studio Code.

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

### 1. Node.js (versión 18 o superior)
- **Descargar**: https://nodejs.org/
- **Verificar instalación**: Abre una terminal y ejecuta:
  ```bash
  node --version
  npm --version
  ```
- Deberías ver algo como `v18.x.x` o superior

### 2. Git
- **Descargar**: https://git-scm.com/downloads
- **Verificar instalación**:
  ```bash
  git --version
  ```

### 3. Visual Studio Code
- **Descargar**: https://code.visualstudio.com/
- **Extensiones recomendadas** (instalar desde VS Code):
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### 4. MySQL (versión 8.0 o superior)
- **Opción A - MySQL Community Server**: https://dev.mysql.com/downloads/mysql/
- **Opción B - XAMPP** (incluye MySQL): https://www.apachefriends.org/
- **Opción C - Docker** (si prefieres contenedores):
  ```bash
  docker run --name mysql-carbon -e MYSQL_ROOT_PASSWORD=tu_password -p 3306:3306 -d mysql:8.0
  ```

### 5. pnpm (gestor de paquetes)
- **Instalar**:
  ```bash
  npm install -g pnpm
  ```
- **Verificar**:
  ```bash
  pnpm --version
  ```

---

## 🚀 Paso 1: Clonar el Repositorio

1. **Abre una terminal** (Command Prompt, PowerShell, o Terminal de VS Code)

2. **Navega** a la carpeta donde quieres guardar el proyecto:
   ```bash
   cd C:\Users\TuUsuario\Documentos
   ```

3. **Clona** el repositorio desde GitHub:
   ```bash
   git clone https://github.com/jlgonzal68/carbon-footprint-calculator.git
   ```

4. **Entra** a la carpeta del proyecto:
   ```bash
   cd carbon-footprint-calculator
   ```

---

## 📂 Paso 2: Abrir el Proyecto en Visual Studio Code

1. **Abre VS Code**

2. **Menú**: File → Open Folder...

3. **Selecciona** la carpeta `carbon-footprint-calculator` que acabas de clonar

4. **Confía en el workspace** cuando VS Code te lo pregunte

---

## 🔧 Paso 3: Instalar Dependencias

1. **Abre la terminal integrada** en VS Code:
   - Menú: Terminal → New Terminal
   - O presiona: `Ctrl + ñ` (Windows) / `Cmd + ñ` (Mac)

2. **Instala** todas las dependencias del proyecto:
   ```bash
   pnpm install
   ```

   Esto tomará unos 2-5 minutos. Verás muchos mensajes en la terminal.

3. **Espera** hasta que veas un mensaje como:
   ```
   dependencies: +XXX packages
   Done in XXs
   ```

---

## 🗄️ Paso 4: Configurar la Base de Datos MySQL

### 4.1 Crear la Base de Datos

1. **Abre MySQL Workbench** o **phpMyAdmin** (si usas XAMPP)

2. **Conéctate** a tu servidor MySQL:
   - Host: `localhost`
   - Puerto: `3306`
   - Usuario: `root`
   - Contraseña: (la que configuraste al instalar MySQL)

3. **Ejecuta** este comando SQL para crear la base de datos:
   ```sql
   CREATE DATABASE carbon_footprint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Verifica** que se creó:
   ```sql
   SHOW DATABASES;
   ```
   Deberías ver `carbon_footprint_db` en la lista.

### 4.2 Importar el Esquema

1. **Descarga** el archivo de esquema desde el repositorio:
   - Busca el archivo `database/schema.sql` en el proyecto

2. **Ejecuta** el script SQL:
   - En MySQL Workbench: File → Open SQL Script → Selecciona `schema.sql` → Execute
   - En phpMyAdmin: Selecciona la base de datos → Importar → Selecciona `schema.sql`

3. **Verifica** que las tablas se crearon:
   ```sql
   USE carbon_footprint_db;
   SHOW TABLES;
   ```
   Deberías ver tablas como: `organizacion`, `campus`, `ano_inventario`, `consumo_combustible`, etc.

---

## ⚙️ Paso 5: Configurar Variables de Entorno

1. **Crea** un archivo `.env` en la raíz del proyecto:
   - En VS Code, haz clic derecho en la carpeta raíz → New File
   - Nombre: `.env`

2. **Copia** el contenido de `ENV_EXAMPLE.md` y **pégalo** en `.env`

3. **Edita** las variables con tus datos reales:

```env
# Base de Datos MySQL
DATABASE_URL="mysql://root:TU_PASSWORD@localhost:3306/carbon_footprint_db"

# Reemplaza TU_PASSWORD con tu contraseña de MySQL
# Ejemplo: DATABASE_URL="mysql://root:mipassword123@localhost:3306/carbon_footprint_app"

# OAuth de Manus (para autenticación)
EXPO_PUBLIC_OAUTH_PORTAL_URL="https://auth.manus.im"
EXPO_PUBLIC_OAUTH_SERVER_URL="https://oauth-server.manus.im"
EXPO_PUBLIC_APP_ID="tu_app_id_aqui"
EXPO_PUBLIC_OWNER_OPEN_ID="tu_open_id_aqui"
EXPO_PUBLIC_OWNER_NAME="Tu Nombre"

# URL de la API (se genera automáticamente en desarrollo)
EXPO_PUBLIC_API_BASE_URL="http://localhost:3000"
```

4. **Guarda** el archivo (Ctrl + S)

---

## 🎯 Paso 6: Iniciar la Aplicación

### 6.1 Iniciar el Servidor Backend

1. **En la terminal de VS Code**, ejecuta:
   ```bash
   pnpm dev:server
   ```

2. **Espera** hasta ver:
   ```
   API Server running on http://localhost:3000
   ```

3. **Deja esta terminal abierta** (no la cierres)

### 6.2 Iniciar el Frontend (en otra terminal)

1. **Abre una nueva terminal** en VS Code:
   - Click en el ícono `+` en la terminal
   - O: Terminal → New Terminal

2. **Ejecuta**:
   ```bash
   pnpm dev:metro
   ```

3. **Espera** hasta ver:
   ```
   Metro waiting on exp://localhost:8081
   ```

4. **Presiona** `w` para abrir en el navegador web

5. **Se abrirá** automáticamente en: `http://localhost:8081`

---

## 🌐 Paso 7: Acceder a la Aplicación

1. **Abre tu navegador** en: http://localhost:8081

2. Verás la aplicación con 4 pestañas en la parte inferior:
   - 🏠 Dashboard
   - 📊 Datos
   - 📄 Reportes
   - ⚙️ Configuración

3. **Primera vez**: Verás un flujo de bienvenida para crear tu organización

---

## 👤 Paso 8: Configurar Usuario Administrador

### Opción A: Usando OAuth de Manus (Recomendado)

Si tienes credenciales de OAuth configuradas:

1. **Ve a la pestaña** "Configuración" (⚙️)
2. **Haz clic** en "Iniciar Sesión"
3. **Inicia sesión** con tu cuenta de Manus
4. **Automáticamente** serás el administrador de la primera organización que crees

### Opción B: Insertar Usuario Manualmente en la Base de Datos

Si NO tienes OAuth configurado (para desarrollo local):

1. **Abre MySQL Workbench** o phpMyAdmin

2. **Ejecuta** este script SQL para crear un usuario administrador:

```sql
USE carbon_footprint_db;

-- Paso 1: Crear una organización de prueba
INSERT INTO organizacion (nombre, descripcion, ano_base, created_at, updated_at)
VALUES ('Mi Organización', 'Organización de prueba', 2024, NOW(), NOW());

-- Obtener el ID de la organización (anota este número)
SELECT @org_id := LAST_INSERT_ID();

-- Paso 2: Crear un año de inventario
INSERT INTO ano_inventario (organizacion_id, ano, estado, created_at, updated_at)
VALUES (@org_id, 2024, 'borrador', NOW(), NOW());

-- Paso 3: Crear el rol de administrador (si no existe)
INSERT IGNORE INTO roles (nombre, descripcion, permisos, created_at, updated_at)
VALUES (
  'administrador',
  'Administrador con todos los permisos',
  JSON_OBJECT(
    'crear', true,
    'editar', true,
    'eliminar', true,
    'ver', true,
    'gestionar_usuarios', true,
    'gestionar_factores', true,
    'gestionar_metas', true
  ),
  NOW(),
  NOW()
);

-- Paso 4: Crear un usuario de prueba
-- Reemplaza 'tu_open_id' con un identificador único (puede ser tu email)
INSERT INTO usuarios_organizacion (
  organizacion_id,
  user_open_id,
  user_name,
  user_email,
  rol_id,
  created_at,
  updated_at
)
VALUES (
  @org_id,
  'admin@test.com',  -- Cambia esto por tu email
  'Administrador',   -- Cambia esto por tu nombre
  'admin@test.com',  -- Cambia esto por tu email
  (SELECT id FROM roles WHERE nombre = 'administrador'),
  NOW(),
  NOW()
);

-- Verificar que se creó correctamente
SELECT 
  u.user_name,
  u.user_email,
  r.nombre as rol,
  o.nombre as organizacion
FROM usuarios_organizacion u
JOIN roles r ON u.rol_id = r.id
JOIN organizacion o ON u.organizacion_id = o.id;
```

3. **Anota** el `user_open_id` que usaste (ejemplo: `admin@test.com`)

4. **Modifica** el archivo `hooks/use-auth.ts` para simular autenticación local:

```typescript
// En hooks/use-auth.ts, línea ~15
// Agrega esto temporalmente para desarrollo local:

const mockUser = {
  id: 1,
  openId: "admin@test.com", // El mismo que usaste en SQL
  name: "Administrador",
  email: "admin@test.com",
};

// Y en la función useAuth, reemplaza temporalmente:
// const [user, setUser] = useState<User | null>(null);
// Por:
const [user, setUser] = useState<User | null>(mockUser);
```

5. **Guarda** y **recarga** la aplicación

---

## ✅ Paso 9: Verificar que Todo Funciona

### 9.1 Verificar Backend

1. **Abre** en tu navegador: http://localhost:3000/api/health

2. Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-15T10:30:00.000Z"
   }
   ```

### 9.2 Verificar Base de Datos

1. **En MySQL**, ejecuta:
   ```sql
   USE carbon_footprint_db;
   SELECT COUNT(*) FROM organizacion;
   SELECT COUNT(*) FROM factores_emision;
   ```

2. Deberías ver al menos 1 organización y varios factores de emisión

### 9.3 Verificar Frontend

1. **En el navegador** (http://localhost:8081):
   - ✅ Puedes ver el Dashboard
   - ✅ Puedes navegar entre pestañas
   - ✅ Puedes ver tu organización
   - ✅ Puedes ingresar datos de prueba

---

## 🐛 Solución de Problemas Comunes

### Problema 1: "Cannot connect to MySQL"

**Solución**:
- Verifica que MySQL esté corriendo:
  - Windows: Servicios → MySQL → Iniciar
  - Mac: System Preferences → MySQL → Start
- Verifica la contraseña en `.env`
- Verifica el puerto (debe ser 3306)

### Problema 2: "Port 3000 already in use"

**Solución**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <numero_pid> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Problema 3: "Module not found"

**Solución**:
```bash
# Limpia caché y reinstala
rm -rf node_modules
pnpm install
```

### Problema 4: "OAuth not configured"

**Solución**:
- Usa la Opción B (usuario manual en base de datos)
- O contacta al administrador de Manus para obtener credenciales OAuth

### Problema 5: "Database schema outdated"

**Solución**:
```bash
# Ejecuta las migraciones
pnpm db:migrate
```

---

## 📱 Paso 10: Probar en Dispositivo Móvil (Opcional)

### 10.1 Instalar Expo Go

1. **Descarga Expo Go** en tu teléfono:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### 10.2 Conectar

1. **Asegúrate** de que tu teléfono y computador estén en la misma red WiFi

2. **En la terminal** donde corre Metro, presiona `r` para mostrar el código QR

3. **Escanea** el código QR:
   - iOS: Usa la app Cámara nativa
   - Android: Usa Expo Go directamente

4. **La app se abrirá** en tu teléfono

---

## 🎓 Próximos Pasos

Ahora que tienes la aplicación funcionando:

1. **Explora** las funcionalidades:
   - Crea un año de inventario
   - Ingresa datos de combustibles
   - Genera un reporte

2. **Lee la documentación**:
   - `README.md`: Visión general
   - `DEPLOYMENT.md`: Cómo desplegar en producción
   - `server/README.md`: Documentación del backend

3. **Personaliza**:
   - Modifica colores en `constants/theme.ts`
   - Cambia el logo en `assets/images/icon.png`
   - Ajusta factores de emisión según tu país

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa** la sección de Solución de Problemas arriba
2. **Consulta** los logs en las terminales
3. **Abre un issue** en GitHub: https://github.com/jlgonzal68/carbon-footprint-calculator/issues
4. **Contacta** al equipo de desarrollo

---

## 📚 Recursos Adicionales

- **Expo Documentation**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/docs/getting-started
- **tRPC**: https://trpc.io/docs
- **MySQL**: https://dev.mysql.com/doc/
- **GHG Protocol**: https://ghgprotocol.org/

---

¡Felicidades! 🎉 Ya tienes la Calculadora de Huella de Carbono funcionando en tu computador.
