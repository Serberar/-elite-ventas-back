# Guía de Despliegue

## Visión General

Esta guía describe el proceso para desplegar el backend en un entorno de producción.

---

## Requisitos de Producción

### Hardware Mínimo

- **CPU**: 2 cores
- **RAM**: 2 GB
- **Disco**: 20 GB SSD

### Software

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Nginx (recomendado como proxy reverso)
- PM2 o similar (gestión de procesos)

---

## Pasos de Despliegue

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 2. Configurar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Acceder como superusuario
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE crm_production;
CREATE USER crm_app WITH ENCRYPTED PASSWORD 'contraseña_muy_segura';
GRANT ALL PRIVILEGES ON DATABASE crm_production TO crm_app;
\q
```

### 3. Clonar y Configurar el Proyecto

```bash
# Clonar repositorio
git clone <url-del-repositorio> /var/www/crm-backend
cd /var/www/crm-backend/backend-buscador/code-back

# Instalar dependencias de producción
npm ci --only=production

# Crear archivo de entorno
cp .env.example .env
nano .env
```

### 4. Configurar Variables de Entorno

```bash
# .env para producción
NODE_ENV=production
PORT=3000

DATABASE_URL="postgresql://crm_app:contraseña_muy_segura@localhost:5432/crm_production?schema=public"

JWT_SECRET="clave_generada_con_openssl_rand_muy_larga_y_segura"
JWT_ACCESS_EXPIRATION=900
JWT_REFRESH_EXPIRATION=604800

CORS_ORIGIN=https://tu-dominio.com
CORS_CREDENTIALS=true

LOG_LEVEL=info
LOG_FORMAT=json

STORAGE_PATH=/var/www/crm-backend/storage
```

### 5. Ejecutar Migraciones

```bash
# Aplicar migraciones a la base de datos
npx prisma migrate deploy

# Generar cliente Prisma
npx prisma generate

# (Opcional) Ejecutar seed inicial
npx prisma db seed
```

### 6. Compilar el Proyecto

```bash
# Compilar TypeScript a JavaScript
npm run build
```

### 7. Configurar PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Crear archivo de configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '500M',
    error_file: '/var/log/crm/error.log',
    out_file: '/var/log/crm/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Crear directorio de logs
sudo mkdir -p /var/log/crm
sudo chown $USER:$USER /var/log/crm

# Iniciar aplicación
pm2 start ecosystem.config.js

# Guardar configuración para reinicio automático
pm2 save
pm2 startup
```

### 8. Configurar Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear configuración del sitio
sudo nano /etc/nginx/sites-available/crm-backend
```

```nginx
# /etc/nginx/sites-available/crm-backend

upstream crm_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.tu-dominio.com;

    # Redireccionar a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.tu-dominio.com;

    # Certificados SSL (usar certbot para obtenerlos)
    ssl_certificate /etc/letsencrypt/live/api.tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tu-dominio.com/privkey.pem;

    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Headers de seguridad
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Tamaño máximo de body (para subida de archivos)
    client_max_body_size 50M;

    location / {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Servir archivos estáticos de grabaciones
    location /storage/ {
        alias /var/www/crm-backend/storage/;
        internal;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/crm-backend /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 9. Configurar SSL con Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d api.tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

---

## Mantenimiento

### Monitoreo con PM2

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs crm-backend

# Monitoreo de recursos
pm2 monit

# Reiniciar aplicación
pm2 restart crm-backend

# Recargar sin downtime
pm2 reload crm-backend
```

### Actualizar la Aplicación

```bash
cd /var/www/crm-backend/backend-buscador/code-back

# Obtener últimos cambios
git pull origin main

# Instalar nuevas dependencias
npm ci --only=production

# Aplicar migraciones
npx prisma migrate deploy

# Regenerar cliente Prisma
npx prisma generate

# Recompilar
npm run build

# Recargar aplicación
pm2 reload crm-backend
```

### Backups de Base de Datos

```bash
# Crear backup
pg_dump -U crm_app -h localhost crm_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -U crm_app -h localhost crm_production < backup_20240101_120000.sql
```

### Script de Backup Automático

```bash
#!/bin/bash
# /usr/local/bin/backup-crm-db.sh

BACKUP_DIR="/var/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="crm_backup_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

# Crear backup comprimido
pg_dump -U crm_app crm_production | gzip > "$BACKUP_DIR/$FILENAME"

# Eliminar backups mayores a 30 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup creado: $FILENAME"
```

```bash
# Añadir a crontab (ejecutar diariamente a las 3am)
echo "0 3 * * * /usr/local/bin/backup-crm-db.sh" | crontab -
```

---

## Troubleshooting

### Error de Conexión a BD

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar conexión
psql -U crm_app -h localhost -d crm_production -c "SELECT 1"
```

### Error de Puerto en Uso

```bash
# Ver qué proceso usa el puerto
lsof -i :3000

# Matar proceso si es necesario
kill -9 <PID>
```

### Errores de Prisma

```bash
# Regenerar cliente
npx prisma generate

# Verificar estado de migraciones
npx prisma migrate status

# Resetear migraciones (CUIDADO: borra datos)
npx prisma migrate reset
```

### Logs de Error

```bash
# Ver logs de PM2
pm2 logs crm-backend --lines 100

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Ver logs del sistema
sudo journalctl -u nginx -f
```

---

## Checklist de Seguridad

- [ ] Variables de entorno seguras (JWT_SECRET, DB password)
- [ ] HTTPS habilitado
- [ ] Firewall configurado (solo puertos 80, 443, 22)
- [ ] Usuario no-root para la aplicación
- [ ] Backups automáticos configurados
- [ ] Logs rotados
- [ ] Actualizaciones de seguridad automáticas
- [ ] Rate limiting activo
- [ ] Headers de seguridad en Nginx
