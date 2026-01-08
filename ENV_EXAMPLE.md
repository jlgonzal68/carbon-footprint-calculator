# Configuración de Variables de Entorno

Copia este contenido en un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=tu_contraseña
DATABASE_NAME=carbon_footprint

# OAuth
OAUTH_CLIENT_ID=tu_client_id
OAUTH_CLIENT_SECRET=tu_client_secret
OAUTH_REDIRECT_URI=http://localhost:8081/oauth/callback

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=genera_un_secret_aleatorio_muy_largo
```

**Nota**: Genera el JWT_SECRET con: `openssl rand -base64 32`
