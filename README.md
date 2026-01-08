# 🌱 Calculadora de Huella de Carbono

Aplicación móvil y web para calcular y gestionar la huella de carbono organizacional según el estándar GHG Protocol e ISO 14064-1:2018.

## 📋 Características

- **Dashboard Interactivo**: Visualización de emisiones por alcance (1, 2, 3) y por campus
- **Gestión de Inventarios**: Registro de consumos de combustibles, energía, agua, residuos
- **Inventarios de Equipos**: Aires acondicionados y extintores con cálculo automático de emisiones
- **Comparativa Multi-Anual**: Gráficos de evolución de emisiones entre años
- **Exportación e Importación**: Excel con plantillas predefinidas para carga masiva
- **Reportes GHG Protocol**: Generación automática de reportes en PDF compatibles con estándares internacionales
- **Sistema de Usuarios**: Roles (Administrador, Editor, Visualizador) con permisos diferenciados
- **Sistema de Alertas**: Notificaciones automáticas de emisiones críticas
- **Gestión de Factores de Emisión**: Edición de factores con recálculo automático

## 🛠️ Tecnologías

- **Frontend**: React Native 0.81 + Expo SDK 54 + TypeScript 5.9
- **Backend**: Node.js 22 + tRPC + Express
- **Base de Datos**: MySQL 8.0
- **Autenticación**: OAuth 2.0
- **Gráficos**: Recharts
- **Exportación**: XLSX + expo-print

## 📦 Requisitos Previos

- Node.js 22.x o superior
- pnpm 9.x o superior
- MySQL 8.0 o superior
- Expo CLI (se instala automáticamente)
- Para desarrollo móvil: Expo Go app en tu dispositivo

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/carbon-footprint-app.git
cd carbon-footprint-app
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar base de datos

Crear una base de datos MySQL:

```sql
CREATE DATABASE carbon_footprint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configurar variables de entorno

Copiar el archivo de ejemplo y editar con tus credenciales:

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
# Base de datos
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=tu_usuario
DATABASE_PASSWORD=tu_contraseña
DATABASE_NAME=carbon_footprint

# OAuth (Manus)
OAUTH_CLIENT_ID=tu_client_id
OAUTH_CLIENT_SECRET=tu_client_secret
OAUTH_REDIRECT_URI=http://localhost:8081/oauth/callback

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
```

### 5. Inicializar base de datos

El esquema de base de datos se creará automáticamente al iniciar la aplicación por primera vez. Las tablas incluyen:

- `organizacion`: Organizaciones registradas
- `campus`: Campus de cada organización (5 predefinidos)
- `ano_inventario`: Años de inventario
- `factores_emision`: Factores de emisión por categoría
- `consumo_combustible`: Registro de combustibles
- `consumo_energia`: Registro de energía eléctrica
- `inventario_aires_acond`: Inventario de aires acondicionados
- `inventario_extintores`: Inventario de extintores
- `residuos_solidos`: Registro de residuos
- `consumo_agua`: Registro de agua potable y residual
- `resumen_huella_carbono`: Resumen calculado por año
- `alertas`: Sistema de alertas
- `roles`: Roles de usuario
- `usuarios_organizacion`: Relación usuarios-organizaciones-roles

### 6. Iniciar la aplicación

```bash
# Desarrollo (web + móvil)
pnpm start

# Solo web
pnpm web

# Solo servidor backend
pnpm server
```

La aplicación estará disponible en:
- **Web**: http://localhost:8081
- **API**: http://localhost:3000
- **Móvil**: Escanea el código QR con Expo Go

## 📱 Uso en Dispositivos Móviles

1. Instala **Expo Go** desde:
   - [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Ejecuta `pnpm start` en tu computadora

3. Escanea el código QR que aparece en la terminal:
   - **iOS**: Usa la cámara nativa
   - **Android**: Usa la opción "Scan QR Code" en Expo Go

## 🔐 Autenticación

La aplicación utiliza OAuth 2.0 para autenticación. Para configurar tu propio servidor OAuth:

1. Registra tu aplicación en el proveedor OAuth
2. Obtén `CLIENT_ID` y `CLIENT_SECRET`
3. Configura la URL de redirección: `http://localhost:8081/oauth/callback`
4. Actualiza las variables en `.env`

## 📊 Estructura del Proyecto

```
carbon-footprint-app/
├── app/                    # Pantallas de la aplicación
│   ├── (tabs)/            # Navegación por tabs
│   │   ├── index.tsx      # Dashboard
│   │   ├── data.tsx       # Ingreso de datos
│   │   ├── reportes.tsx   # Reportes
│   │   └── settings.tsx   # Configuración
│   ├── combustibles.tsx   # Formulario de combustibles
│   ├── energia.tsx        # Formulario de energía
│   ├── aires-acond.tsx    # Inventario de aires
│   ├── extintores.tsx     # Inventario de extintores
│   ├── residuos.tsx       # Formulario de residuos
│   ├── agua.tsx           # Formulario de agua
│   ├── exportacion.tsx    # Exportación a Excel
│   ├── importacion.tsx    # Importación desde Excel
│   ├── reportes-ghg.tsx   # Reportes GHG Protocol
│   └── usuarios.tsx       # Gestión de usuarios
├── components/            # Componentes reutilizables
├── constants/             # Constantes y temas
├── hooks/                 # Custom hooks
├── lib/                   # Utilidades y configuración
├── server/                # Backend
│   ├── trpc/             # Endpoints tRPC
│   │   └── routers/      # Routers de API
│   ├── _core/            # Core del servidor
│   └── index.ts          # Servidor principal
├── shared/                # Código compartido
├── assets/                # Imágenes y recursos
└── app.config.ts          # Configuración de Expo
```

## 🧪 Testing

```bash
# Ejecutar tests
pnpm test

# Tests con coverage
pnpm test:coverage
```

## 📦 Build para Producción

### Web

```bash
pnpm build:web
```

Los archivos estáticos se generarán en `dist/`.

### Móvil (Android/iOS)

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

Requiere configurar [EAS Build](https://docs.expo.dev/build/introduction/).

## 🌍 Despliegue

### Backend

El servidor Node.js puede desplegarse en:
- Heroku
- DigitalOcean
- AWS EC2
- Google Cloud Run

### Base de Datos

MySQL puede hospedarse en:
- PlanetScale
- AWS RDS
- DigitalOcean Managed Databases
- Google Cloud SQL

### Frontend Web

El build estático puede desplegarse en:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## 📖 Documentación de API

Los endpoints tRPC están documentados en el código. Principales routers:

- `carbon.*`: Gestión de inventarios y cálculos
- `metas.*`: Sistema de metas de reducción (en desarrollo)

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🐛 Reportar Problemas

Si encuentras algún bug o tienes sugerencias, por favor abre un [issue](https://github.com/tu-usuario/carbon-footprint-app/issues).

## 👥 Autores

- José Luis González Manosalva - Desarrollo inicial
- Juan Camilo Mejía Puerta - Pruebas y validación técnica GHG Protocol e ISO 14064-1

## 🙏 Agradecimientos

- GHG Protocol por la metodología de cálculo
- ISO 14064-1:2018 por los estándares
- Comunidad de Expo y React Native

## 📞 Soporte

Para soporte técnico o consultas:
- Email: jlgonzal68@gmail.com
- Issues: [GitHub Issues](https://github.com/tu-usuario/carbon-footprint-app/issues)

---

**Nota**: Esta aplicación calcula emisiones de GEI basándose en factores de emisión estándar. Para certificaciones oficiales, se recomienda validación por auditores certificados.
