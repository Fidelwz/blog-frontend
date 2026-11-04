# Blog Interactivo Estudiantil

Next.js 16, React 19, TypeScript y Tailwind CSS 4. El acceso ya se integra con el backend NestJS: login, perfil actual, sesión al recargar y logout. Las publicaciones conservan sus datos de demostración.

## Arranque local

Requiere Node.js 22.18 o superior y pnpm.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000/acceso. Usar una cuenta ya registrada en NestJS. Las credenciales no se incluyen en el repositorio. Si `.env.local` ya existe, conservar sus valores y agregar las variables que falten. Reiniciar Next después de modificarlo.

```dotenv
NEXT_PUBLIC_DEMO_MODE=true
BACKEND_API_URL=https://blog-backend-nest-542aed7d1eb3.herokuapp.com/api/v1
```

`BACKEND_API_URL` solo se usa en el servidor. Para Nest local: `http://localhost:4000/api/v1`. Usar `localhost` de forma consistente. `NEXT_PUBLIC_DEMO_MODE` controla únicamente las publicaciones de ejemplo: nunca permite entrar a páginas privadas sin autenticación.

## Flujo de sesión

El navegador llama a `/api/auth/login`, `/api/auth/me` y `/api/auth/logout` en Next. Los Route Handlers llaman a los endpoints `/api/v1/auth/*` de Nest desde el servidor. Esto permite trabajar con Heroku manteniendo la cookie `SameSite=Strict`, sin depender de cookies entre sitios distintos.

- Login envía exclusivamente `email` y `password`; devuelve un perfil público con ID numérico.
- Next recibe `Set-Cookie` y establece únicamente `jwt` para el host del frontend: HttpOnly, SameSite Strict, Path `/`, Secure en producción. Respeta el vencimiento recibido y limita la duración a una hora. No necesita `JWT_SECRET` ni firma tokens.
- La sesión se verifica contra `/me` en el servidor. Las consultas se deduplican dentro de cada render, nunca entre usuarios. Las respuestas de autenticación no se almacenan en caché y `/me` no prolonga la cookie.
- Login y logout comprueban `Origin`; en producción configurar `APP_ORIGIN` con el origen público exacto, por ejemplo `https://blog.example.com`, sin barra final.
- `/inicio`, `/perfil`, `/grupos`, `/mis-publicaciones`, `/notificaciones` y `/publicaciones/nueva` requieren sesión. Portada, búsqueda y lectura son públicas.
- Una sesión vencida solicita acceso nuevamente; suspensión y caída del servicio se distinguen. No existe renovación automática de tokens.
- Logout espera `204`, elimina la cookie local y carga de nuevo el acceso. Si falla la conexión, permite reintentar. Como documenta Nest, no revoca copias del JWT.
- El frontend no usa localStorage ni sessionStorage para autenticar. Los límites de espera son 15 segundos hacia Nest y 20 segundos desde el navegador, sin reintentos de mutaciones.

La navegación tras login y logout carga un documento nuevo para actualizar la identidad y descartar la caché anterior de rutas. Los enlaces principales no precargan páginas, para evitar consultas anticipadas a `/me`.

## Alcance actual

`/perfil` muestra el nombre, correo y rol reales en modo lectura. Registro, recuperación de contraseña, edición del perfil y el resto de módulos siguen pendientes. Sus formularios previos no realizan operaciones reales. Los enlaces principales de acceso indican esas funciones pendientes; el envío de correo de recuperación todavía debe implementarse en Nest.

La comprobación inicial de Heroku encontró una cookie sin `Secure` y `Access-Control-Allow-Origin: localhost:3000` sin protocolo. Revisar `NODE_ENV=production`, `FRONTEND_URL` y la versión desplegada del backend antes de publicar. La cookie emitida por Next aplica sus propios atributos y el navegador no llama directamente a Heroku.

Producción requiere un servidor Next y HTTPS; no usar exportación estática. Configurar `BACKEND_API_URL` y `APP_ORIGIN` en el proveedor. La implementación usa [Route Handlers como intermediario](https://nextjs.org/docs/app/guides/backend-for-frontend) y la [API de cookies de Next](https://nextjs.org/docs/app/api-reference/functions/cookies).

## Verificación

```bash
npm run lint
npm test
npm run typecheck
npm run build
pnpm exec playwright install chromium
npm run test:auth
```

`test:auth` requiere Postman CLI (verificado con 1.84.0). Arranca automáticamente una simulación en el puerto 4020 y la compilación de Next en 3015; ambos puertos deben estar libres. No usa Heroku ni credenciales reales, no publica recursos y no necesita una cuenta de Postman. Cierra los servidores al finalizar. Playwright verifica cookies en Chromium, login/recarga/logout, rutas privadas, errores, aislamiento entre usuarios, móvil y tiempos de espera.

El contrato está en `postman/contracts/auth.openapi.yaml`. El mock se generó desde ese contrato y se adaptó para modelar cookies y fallos. `postman/simulations/auth.context.yaml` registra evidencia y límites de la simulación. No regenerar el handler sin conservar esas adaptaciones.

Verificado el 2026-11-03: lint, tipos y build correctos; 10 pruebas unitarias y 11 pruebas de integración correctas. Se comprobó también un recorrido real en Chromium con Heroku: login `200`, carga del perfil mediante la sesión y logout `204`, confirmando los atributos de la cookie emitida por Next y su eliminación. Los casos de error se probaron con la simulación.

Para una sesión manual con la simulación, en terminales separadas:

```bash
postman simulation run postman/simulations/auth.sim.yaml --port 4010 --no-history
BACKEND_API_URL=http://127.0.0.1:4010/blog-auth/api/v1 npm run dev -- --port 3005
```

La simulación escucha en IPv4, por eso su URL interna usa `127.0.0.1`; abrir el frontend en `http://localhost:3005`. Cuenta ficticia local: `ana@example.test` / `SimulationPassword123!`. El mock solo reproduce los tres endpoints de sesión; cualquier otro devuelve `501`. Los resultados locales prueban la integración con el contrato modelado, no todos los comportamientos de Heroku.
