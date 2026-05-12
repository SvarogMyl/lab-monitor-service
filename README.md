# Lab Monitor Service (Node.js)

Microservicio de monitoreo y "Keep-Alive" para el ecosistema del laboratorio.

## Funcionalidades
- **Monitor Worker**: Pingeo automático cada 10 minutos a los servicios de Render.
- **API Status**: Endpoint `/api/status` con información en tiempo real.
- **Dashboard**: Interfaz visual moderna (Dark Mode) en la ruta raíz.

## Instalación Local
1. `npm install`
2. `node index.js`
3. Abrir `http://localhost:3001`

## Configuración (Variables de Entorno)
- `PORT`: Puerto del servidor (default: 3001).
- `TARGET_URLS`: Lista de URLs separadas por coma.
- `MONITOR_INTERVAL_MS`: Tiempo entre pings (default: 600000ms / 10min).

## Despliegue en Render
1. Conectar el repositorio a un nuevo **Web Service**.
2. Render detectará el `Dockerfile` automáticamente.
3. Configurar las variables de entorno si es necesario.

## Keep-Alive Respaldo
El archivo `.github/workflows/keep_alive.yml` está configurado para que GitHub Actions despierte a este monitor cada 14 minutos.
