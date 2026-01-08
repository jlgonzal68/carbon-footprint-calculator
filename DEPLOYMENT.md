# 🚀 Guía de Despliegue - Calculadora de Huella de Carbono

Esta guía cubre el despliegue completo de la aplicación en producción, incluyendo base de datos, backend y frontend.

## 📋 Tabla de Contenidos

- [Arquitectura de Despliegue](#arquitectura-de-despliegue)
- [Opción 1: Despliegue Completo en DigitalOcean](#opción-1-despliegue-completo-en-digitalocean)
- [Opción 2: Despliegue en Railway](#opción-2-despliegue-en-railway)
- [Opción 3: Despliegue en Vercel + PlanetScale](#opción-3-despliegue-en-vercel--planetscale)
- [Opción 4: Despliegue en AWS](#opción-4-despliegue-en-aws)
- [Configuración de Base de Datos](#configuración-de-base-de-datos)
- [Variables de Entorno en Producción](#variables-de-entorno-en-producción)
- [Despliegue de Aplicación Móvil](#despliegue-de-aplicación-móvil)
- [Monitoreo y Logs](#monitoreo-y-logs)
- [Backup y Recuperación](#backup-y-recuperación)

---

## 🏗️ Arquitectura de Despliegue

```
┌─────────────────┐
│   Usuarios      │
│  (Web/Móvil)    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   CDN    │ (Opcional)
    └────┬─────┘
         │
┌────────▼─────────────┐
│  Frontend (Web)      │
│  Expo Web / Vercel   │
└────────┬─────────────┘
         │
    ┌────▼────┐
    │   API   │
    │ Node.js │
    │  tRPC   │
    └────┬────┘
         │
    ┌────▼────┐
    │  MySQL  │
    │Database │
    └─────────┘
```

---

## 🌊 Opción 1: Despliegue Completo en DigitalOcean

**Recomendado para**: Control total, escalabilidad, presupuesto medio

### Paso 1: Crear Droplet

```bash
# Crear un Droplet Ubuntu 22.04
# Tamaño recomendado: 2 GB RAM / 1 vCPU ($12/mes)
```

1. Ve a [DigitalOcean](https://www.digitalocean.com/)
2. Create → Droplets
3. Selecciona: Ubuntu 22.04 LTS
4. Plan: Basic ($12/mes)
5. Agrega tu SSH key
6. Create Droplet

### Paso 2: Configurar Servidor

```bash
# Conectar al servidor
ssh root@tu_ip

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar MySQL
apt install -y mysql-server

# Configurar MySQL
mysql_secure_installation

# Instalar PM2 (gestor de procesos)
npm install -g pm2

# Instalar Nginx
apt install -y nginx

# Instalar Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

### Paso 3: Configurar Base de Datos

```bash
# Entrar a MySQL
mysql -u root -p

# Crear base de datos y usuario
CREATE DATABASE carbon_footprint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'carbon_user'@'localhost' IDENTIFIED BY 'contraseña_segura';
GRANT ALL PRIVILEGES ON carbon_footprint.* TO 'carbon_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Paso 4: Clonar y Configurar Aplicación

```bash
# Crear usuario para la app
adduser carbon
usermod -aG sudo carbon
su - carbon

# Clonar repositorio
git clone https://github.com/jlgonzal68/carbon-footprint-calculator.git
cd carbon-footprint-calculator

# Instalar dependencias
pnpm install

# Crear archivo .env
nano .env
```

Contenido del `.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=carbon_user
DATABASE_PASSWORD=contraseña_segura
DATABASE_NAME=carbon_footprint

OAUTH_CLIENT_ID=tu_client_id
OAUTH_CLIENT_SECRET=tu_client_secret
OAUTH_REDIRECT_URI=https://tudominio.com/oauth/callback

PORT=3000
NODE_ENV=production

JWT_SECRET=$(openssl rand -base64 32)
```

### Paso 5: Build y Desplegar

```bash
# Build del proyecto
pnpm build

# Iniciar con PM2
pm2 start server/index.js --name carbon-api
pm2 startup
pm2 save
```

### Paso 6: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/carbon
```

Contenido:

```nginx
server {
    listen 80;
    server_name tudominio.com;

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend Web
    location / {
        root /home/carbon/carbon-footprint-calculator/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/carbon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configurar SSL
sudo certbot --nginx -d tudominio.com
```

### Paso 7: Configurar Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**Costo estimado**: $12-24/mes (Droplet + Managed MySQL opcional)

---

## 🚂 Opción 2: Despliegue en Railway

**Recomendado para**: Despliegue rápido, sin configuración de servidor

### Paso 1: Preparar Proyecto

1. Asegúrate de tener `package.json` con scripts:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "tsc && expo export:web"
  }
}
```

### Paso 2: Desplegar en Railway

1. Ve a [Railway.app](https://railway.app/)
2. Sign up con GitHub
3. New Project → Deploy from GitHub repo
4. Selecciona `carbon-footprint-calculator`
5. Railway detectará automáticamente Node.js

### Paso 3: Agregar MySQL

1. En tu proyecto Railway → New → Database → MySQL
2. Railway creará automáticamente la base de datos

### Paso 4: Configurar Variables de Entorno

En Railway → Variables:

```env
DATABASE_HOST=${{MySQL.MYSQL_HOST}}
DATABASE_PORT=${{MySQL.MYSQL_PORT}}
DATABASE_USER=${{MySQL.MYSQL_USER}}
DATABASE_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DATABASE_NAME=${{MySQL.MYSQL_DATABASE}}

OAUTH_CLIENT_ID=tu_client_id
OAUTH_CLIENT_SECRET=tu_client_secret
OAUTH_REDIRECT_URI=https://tu-app.up.railway.app/oauth/callback

PORT=3000
NODE_ENV=production
JWT_SECRET=genera_uno_aleatorio
```

### Paso 5: Desplegar

Railway desplegará automáticamente. Obtendrás una URL como:
`https://carbon-footprint-calculator-production.up.railway.app`

**Costo estimado**: $5-20/mes (según uso)

---

## ⚡ Opción 3: Despliegue en Vercel + PlanetScale

**Recomendado para**: Máxima velocidad, escalabilidad automática

### Paso 1: Configurar PlanetScale

1. Ve a [PlanetScale](https://planetscale.com/)
2. Create database → `carbon-footprint`
3. Copia las credenciales de conexión

### Paso 2: Desplegar en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desde el directorio del proyecto
vercel

# Seguir las instrucciones
# Seleccionar: Next.js (aunque es Expo, funciona)
```

### Paso 3: Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```env
DATABASE_HOST=tu-db.planetscale.com
DATABASE_PORT=3306
DATABASE_USER=tu_usuario
DATABASE_PASSWORD=tu_password
DATABASE_NAME=carbon-footprint

OAUTH_CLIENT_ID=tu_client_id
OAUTH_CLIENT_SECRET=tu_client_secret
OAUTH_REDIRECT_URI=https://tu-app.vercel.app/oauth/callback

JWT_SECRET=genera_uno_aleatorio
```

### Paso 4: Configurar vercel.json

Crear `vercel.json` en la raíz:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ]
}
```

**Costo estimado**: $0-20/mes (Vercel gratis + PlanetScale $0-29/mes)

---

## ☁️ Opción 4: Despliegue en AWS

**Recomendado para**: Empresas, máxima escalabilidad

### Componentes AWS

- **EC2**: Servidor de aplicación
- **RDS MySQL**: Base de datos
- **S3 + CloudFront**: Frontend estático
- **Route 53**: DNS
- **Certificate Manager**: SSL

### Paso 1: Crear RDS MySQL

1. AWS Console → RDS → Create database
2. MySQL 8.0
3. Free tier o Production según necesidad
4. Configurar VPC y Security Groups

### Paso 2: Crear EC2

1. Launch Instance → Ubuntu 22.04
2. t2.micro (free tier) o t2.medium
3. Configurar Security Group:
   - SSH (22)
   - HTTP (80)
   - HTTPS (443)
   - Custom TCP (3000)

### Paso 3: Configurar EC2

```bash
# Conectar
ssh -i tu-key.pem ubuntu@ec2-ip

# Instalar dependencias (igual que DigitalOcean)
# Ver Opción 1, Paso 2
```

### Paso 4: Desplegar Frontend en S3

```bash
# Build del frontend
pnpm build:web

# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar AWS CLI
aws configure

# Crear bucket S3
aws s3 mb s3://carbon-footprint-app

# Subir archivos
aws s3 sync dist/ s3://carbon-footprint-app --acl public-read

# Configurar bucket para hosting estático
aws s3 website s3://carbon-footprint-app --index-document index.html
```

### Paso 5: Configurar CloudFront

1. AWS Console → CloudFront → Create Distribution
2. Origin: tu bucket S3
3. Configurar SSL con Certificate Manager
4. Configurar dominio personalizado

**Costo estimado**: $20-100/mes (según tráfico y recursos)

---

## 🗄️ Configuración de Base de Datos

### Migración de Esquema

El esquema se crea automáticamente al iniciar la aplicación. Para producción:

```bash
# Backup de desarrollo
mysqldump -u root -p carbon_footprint > backup.sql

# Restaurar en producción
mysql -u carbon_user -p carbon_footprint < backup.sql
```

### Optimizaciones para Producción

```sql
-- Índices adicionales para rendimiento
CREATE INDEX idx_ano_org ON ano_inventario(organizacion_id);
CREATE INDEX idx_consumo_ano ON consumo_combustible(ano_inventario_id);
CREATE INDEX idx_energia_ano ON consumo_energia(ano_inventario_id);
CREATE INDEX idx_alertas_ano ON alertas(ano_inventario_id, leida);

-- Configuración de MySQL para producción
SET GLOBAL max_connections = 200;
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
```

---

## 🔐 Variables de Entorno en Producción

### Generar Secretos Seguros

```bash
# JWT Secret
openssl rand -base64 32

# Database Password
openssl rand -base64 24
```

### Variables Requeridas

```env
# Base de datos
DATABASE_HOST=
DATABASE_PORT=3306
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=carbon_footprint

# OAuth
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
OAUTH_REDIRECT_URI=

# Servidor
PORT=3000
NODE_ENV=production

# Seguridad
JWT_SECRET=
```

---

## 📱 Despliegue de Aplicación Móvil

### Opción A: Expo Go (Desarrollo)

Los usuarios escanean QR code. No requiere publicación en stores.

### Opción B: Build Standalone (Producción)

#### Configurar EAS

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar proyecto
eas build:configure
```

#### Build para Android

```bash
# Build APK (para testing)
eas build --platform android --profile preview

# Build AAB (para Google Play)
eas build --platform android --profile production
```

#### Build para iOS

```bash
# Requiere cuenta Apple Developer ($99/año)
eas build --platform ios --profile production
```

#### Publicar en Stores

**Google Play**:
1. Crear cuenta Google Play Console ($25 único)
2. Crear aplicación
3. Subir AAB generado
4. Completar ficha de la app
5. Enviar a revisión

**App Store**:
1. Cuenta Apple Developer ($99/año)
2. App Store Connect → Nueva App
3. Subir IPA con Transporter
4. Completar metadata
5. Enviar a revisión

---

## 📊 Monitoreo y Logs

### PM2 Monitoring

```bash
# Ver logs
pm2 logs carbon-api

# Monitorear recursos
pm2 monit

# Restart automático en errores
pm2 startup
```

### Logs Centralizados

Configurar servicio como:
- **Papertrail**: Logs centralizados
- **Sentry**: Error tracking
- **New Relic**: APM

```javascript
// Agregar en server/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## 💾 Backup y Recuperación

### Backup Automático de MySQL

```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u carbon_user -p$DB_PASSWORD carbon_footprint > backup_$DATE.sql
gzip backup_$DATE.sql

# Subir a S3
aws s3 cp backup_$DATE.sql.gz s3://carbon-backups/

# Limpiar backups antiguos (mantener 30 días)
find /backups -name "backup_*.sql.gz" -mtime +30 -delete
```

### Cron para Backups Diarios

```bash
# Editar crontab
crontab -e

# Agregar (backup diario a las 2 AM)
0 2 * * * /home/carbon/backup.sh
```

### Restaurar Backup

```bash
# Descomprimir
gunzip backup_20250108.sql.gz

# Restaurar
mysql -u carbon_user -p carbon_footprint < backup_20250108.sql
```

---

## ✅ Checklist de Despliegue

Antes de ir a producción:

- [ ] Base de datos configurada y respaldada
- [ ] Variables de entorno configuradas
- [ ] SSL/HTTPS habilitado
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Monitoreo y logs configurados
- [ ] Dominio personalizado configurado
- [ ] OAuth redirect URIs actualizadas
- [ ] Pruebas de carga realizadas
- [ ] Plan de rollback definido

---

## 🆘 Troubleshooting

### Error: Cannot connect to database

```bash
# Verificar que MySQL está corriendo
systemctl status mysql

# Verificar credenciales
mysql -u carbon_user -p
```

### Error: Port 3000 already in use

```bash
# Encontrar proceso
lsof -i :3000

# Matar proceso
kill -9 <PID>
```

### Error: SSL certificate expired

```bash
# Renovar con Certbot
sudo certbot renew
sudo systemctl reload nginx
```

---

## 📞 Soporte

Para ayuda con el despliegue:
- **Issues**: https://github.com/jlgonzal68/carbon-footprint-calculator/issues
- **Email**: soporte@tuorganizacion.com

---

**Última actualización**: Enero 2025
