# Blog Interactivo Estudiantil

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand 5, TanStack Query 5 y shadcn/ui con Radix. El acceso, registro, recuperación, edición del perfil y foto, y perfil público se integran con NestJS mediante el servidor Next. Las publicaciones conservan sus datos de demostración.

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
- El adaptador `src/features/auth/server/profile.ts` convierte los valores `user` y `active` observados en Heroku a `usuario` y `activo`. También acepta los valores originales en español. Login y `/me` entregan al navegador el mismo contrato interno; roles, estados y perfiles desconocidos siguen siendo rechazados.
- Next recibe `Set-Cookie` y establece únicamente `jwt` para el host del frontend: HttpOnly, SameSite Strict, Path `/`, Secure en producción. Respeta el vencimiento recibido y limita la duración a una hora. No necesita `JWT_SECRET` ni firma tokens.
- La sesión se verifica contra `/me` en el servidor. Las consultas se deduplican dentro de cada render, nunca entre usuarios. Las respuestas HTTP y el fetch del servidor usan `no-store`; el navegador mantiene el perfil público en memoria mediante TanStack Query. `/me` no prolonga la cookie.
- Login y logout comprueban `Origin`; en producción configurar `APP_ORIGIN` con el origen público exacto, por ejemplo `https://blog.example.com`, sin barra final.
- `/inicio`, `/perfil`, `/grupos`, `/mis-publicaciones`, `/notificaciones` y `/publicaciones/nueva` requieren sesión. Portada, búsqueda y lectura son públicas.
- Una sesión vencida solicita acceso nuevamente; suspensión y caída del servicio se distinguen. No existe renovación automática de tokens.
- Logout espera `204`, elimina la cookie local y carga de nuevo el acceso. Si falla la conexión, permite reintentar. Como documenta Nest, no revoca copias del JWT.
- El frontend no usa localStorage ni sessionStorage para autenticar. Los límites de espera son 15 segundos hacia Nest y 20 segundos desde el navegador, sin reintentos de mutaciones.

La navegación tras login y logout carga un documento nuevo para actualizar la identidad y descartar la caché anterior de rutas. Los enlaces principales no precargan páginas, para evitar consultas anticipadas a `/me`.

## Estado y organización por funcionalidades

`src/features/auth` reúne el transporte, los tipos, los hooks, los componentes y el código de servidor de autenticación. Esta estructura permite que los siguientes módulos tengan sus propias consultas e interfaz, compartiendo la sesión y el cliente HTTP.

| Responsabilidad | Implementación |
| --- | --- |
| Usuario, rol y sesión | TanStack Query: `['auth', 'session']`, consumida con `useSession()` por menú, perfil y saludo. |
| Login/logout, carga y errores | `useLogin()` y `useLogout()`, con mutaciones sin reintentos ni cola offline. |
| Menú abierto y avisos descartables | Zustand: `useAuthUiStore(selector)`, con una instancia por árbol. |
| Contraseña y validaciones de campos | Estado local de `LoginForm`; las variables de la mutación se limpian al finalizar. |
| Cookie y autorización | Route Handlers de Next y Nest; las páginas privadas conservan `requireUser()`. |

El servidor prepara una instantánea de sesión y la hidrata en Query, evitando una segunda petición inmediata del navegador. Cada render tiene su propio QueryClient; en el navegador la instancia permanece estable. La consulta considera los datos frescos durante 60 segundos, no hace polling ni reintentos automáticos, y revalida al recuperar visibilidad o conexión cuando están obsoletos. Este plazo no representa el vencimiento del JWT. Durante login/logout se desactiva la consulta para evitar carreras.

El cambio de sesión cancela las consultas privadas pendientes y retira sus datos. Un fallo de red conserva la última identidad conocida y permite reintentar; un `/me` con `401` o `403` la retira. Un bloqueo síncrono evita dobles envíos y mantiene la navegación bajo control de la mutación hasta reemplazar el documento.

Las pestañas se avisan por `BroadcastChannel` con un evento sin perfil ni token. La receptora limpia los datos privados y recarga para validar la cookie en el servidor. Si el navegador no admite este canal, queda la revalidación al recuperar visibilidad. Al restaurar una página desde la caché de historial también se recarga. No se persisten perfiles, queries o credenciales en almacenamiento del navegador.

Para los compañeros que implementen nuevas features:

- Importar hooks y tipos de cliente desde `@/features/auth`; importar guards exclusivamente desde `@/features/auth/server`.
- Usar TanStack Query para entidades remotas. Incluir el ID del usuario en las claves de datos privados, marcar esas queries con `meta: { private: true }`, deshabilitarlas si no existe usuario y pasar su `signal` a fetch.
- Mantener filtros compartibles en la URL y estado de interfaz compartido en Zustand. No copiar el usuario a otro store.
- Aplicar autorización también en las rutas y operaciones del servidor. Ocultar un control o cambiar Zustand no concede permisos.

El [plan de migración](docs/plan-migracion-auth.md) conserva el diagnóstico original y documenta las decisiones aplicadas.

## Interfaz compartida

Todas las vistas actuales usan la base de shadcn/ui: formularios de acceso, registro y recuperación; navegación y menú de cuenta; perfil; publicaciones y búsqueda; módulos pendientes y estados de carga, error y página inexistente. Se conservan los colores, los layouts y las ilustraciones del blog. Los componentes reutilizables están en `src/components/ui`, con composiciones comunes en `src/components` y la lógica en `src/features`.

La [guía de componentes](docs/componentes-ui.md) explica la estructura, los controles disponibles, el tema y cómo agregar componentes. Se eliminó `ui/primitives.tsx`; usar `Button` de shadcn, `FormField` y `Notice`. Esta migración mantiene Zustand, TanStack Query y el intermediario de autenticación de Next.

## Alcance actual

`/registro` crea una cuenta y lleva a `/acceso?registro=ok`, sin iniciar sesión. `/recuperar` envía la solicitud y muestra el mismo aviso para cualquier correo; `/recuperar/[token]` restablece la contraseña y lleva a `/acceso?restablecida=ok`. La entrega del correo depende del backend y queda fuera de esta integración.

`/perfil` carga datos reales y envía solo los cambios de nombre, apellido, carrera, universidad y biografía. Vaciar un campo opcional envía `null`. La foto se previsualiza al elegirla y se sube al pulsar **Guardar foto**, por separado de **Guardar cambios**. **Descartar** retira los cambios y la foto aún no guardados. El menú se actualiza sin recargar el documento; las otras pestañas revalidan mediante el canal de sesión existente.

`/usuarios/{id}` es pública y muestra nombre, foto o iniciales, carrera, universidad, biografía, fecha de registro y contadores. Nunca muestra el correo del perfil consultado. Los IDs inválidos o inexistentes usan `notFound()`; los fallos del servicio conservan el estado de error. Si se consulta el perfil propio aparece **Editar mi perfil**.

La página está en `src/app/(profiles)/usuarios/[id]/page.tsx`, con el mismo `Shell` de la comunidad. Este grupo propio evita heredar el `loading.tsx` de publicaciones: la consulta debe terminar antes de enviar los headers para que un perfil inexistente responda HTTP `404`. La URL pública sigue siendo `/usuarios/{id}`.

### Handlers de cuenta y perfil

| Handler de Next | Endpoint de Nest | Resultado |
| --- | --- | --- |
| `POST /api/auth/register` | `POST /auth/register` | `201`, cuenta creada; `409`, correo repetido. |
| `POST /api/auth/forgot-password` | `POST /auth/forgot-password` | `202`, mensaje neutro. |
| `POST /api/auth/reset-password` | `POST /auth/reset-password` | `204`; `410`, enlace inválido, vencido o utilizado. |
| `GET /api/users/me` | `GET /users/me` | Perfil filtrado de la sesión. |
| `PATCH /api/users/me` | `PATCH /users/me` | Perfil actualizado. |
| `PUT /api/users/me/photo` | `PUT /users/me/photo` | Multipart con un solo archivo `file`; perfil actualizado. |

Las mutaciones validan `Origin` y una lista blanca de campos. Los handlers responden `Cache-Control: private, no-store`, filtran errores y usan 15 segundos hacia Nest y 20 desde el navegador, sin reintentos. Los `401/403` privados eliminan cookie e identidad; un fallo temporal conserva la última identidad y permite reintentar. El helper temporal `features/auth/server/account-backend.ts` soporta JSON y FormData; `backendAuth` y `AuthUser` mantienen su contrato.

El tipo `Profile` tiene un adaptador propio: ID numérico seguro, roles/estados normalizados y selección explícita de campos. Ni `photoPublicId` ni los campos de suspensión llegan al navegador; el tipo público tampoco incluye email o estado. `/perfil` precarga e hidrata `['profile','me']`, marcada con `meta: { private: true }`. Esta clave fija sigue la especificación de cuenta y perfil: se elimina al cambiar o cerrar sesión, el componente comprueba el ID contra la sesión y las mutaciones descartan respuestas de otra identidad. Las nuevas entidades privadas deben seguir la convención general de incluir el ID en su clave.

Las contraseñas nuevas usan de 8 a 72 caracteres, máximo 72 bytes UTF-8, mayúscula Unicode, número y símbolo. El token requiere 43 caracteres base64url y solo se envía en el body al restablecer. Las variables de las mutaciones se limpian al finalizar y los campos de contraseña se vacían. `/recuperar/*` aplica `Referrer-Policy: no-referrer`; no registrar URLs de recuperación en analítica ni logs de aplicación.

### Fotos en Vercel

El límite del frontend y del BFF es **4 MiB (4 × 1024 × 1024 bytes)**, presentado como 4 MB en la interfaz. Nest admite 5 MB, pero [Vercel limita el cuerpo de las funciones a 4,5 MB](https://vercel.com/docs/functions/limitations). Se deja margen para multipart y se limita también la lectura del cuerpo antes de parsearlo. Solo se admiten JPG y PNG; `fetch` genera el `Content-Type` con su boundary. La validación final del contenido y el guardado en Cloudinary corresponden al backend.

La comprobación inicial de Heroku encontró una cookie sin `Secure` y `Access-Control-Allow-Origin: localhost:3000` sin protocolo. Revisar `NODE_ENV=production`, `FRONTEND_URL` y la versión desplegada del backend antes de publicar. La cookie emitida por Next aplica sus propios atributos y el navegador no llama directamente a Heroku.

Producción requiere un servidor Next y HTTPS; no usar exportación estática. Configurar `BACKEND_API_URL` y `APP_ORIGIN` en el proveedor. La implementación usa [Route Handlers como intermediario](https://nextjs.org/docs/app/guides/backend-for-frontend) y la [API de cookies de Next](https://nextjs.org/docs/app/api-reference/functions/cookies).

## Verificación

Cuenta y perfil verificados el 2026-11-06 (hora de El Salvador): lint, **31 pruebas unitarias**, typecheck, build y **35 pruebas de Playwright** correctas. Se comprobaron el HTTP 404 del perfil público, la persistencia de datos y foto, el restablecimiento de contraseña y las regresiones de sesión. La ejecución utilizó Next compilado, Edge y la simulación local; no se probaron cuentas reales, entrega de correo ni Cloudinary, y no se desplegó en Vercel.

```bash
npm run lint
npm test
npm run typecheck
npm run build
pnpm exec playwright install chromium
npm run test:auth
```

`test:auth` requiere Postman CLI (la integración de cuenta y perfil usa 1.86.0). Arranca automáticamente una simulación en el puerto 4020 y la compilación de Next en 3015; ambos puertos deben estar libres. No usa Heroku ni credenciales reales, no publica recursos y no necesita una cuenta de Postman. Cierra los servidores al finalizar. Playwright verifica cookies, login/recarga/logout, rutas privadas, errores, aislamiento SSR, hidratación sin duplicados, revalidación compartida, varias pestañas, cambio de cuenta con historial, móvil y tiempos de espera. También comprueba registro, correo repetido, recuperación neutra, restablecimiento y reutilización de tokens, edición persistente, foto, perfil público, origen y DTO. `npm run test:ui` conserva los escenarios de interfaz, teclado, consentimiento, búsqueda y módulos pendientes.

En PowerShell se puede usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`. Si ya existe Edge y no se ha instalado Chromium para Playwright, configurar `PLAYWRIGHT_CHROMIUM_EXECUTABLE` con la ruta de `msedge.exe`. La suite usa únicamente datos sintéticos.

El contrato está en `postman/contracts/auth.openapi.yaml`. El mock se generó desde ese contrato y se adaptó para modelar cookies y fallos. `postman/simulations/auth.context.yaml` registra evidencia y límites de la simulación. No regenerar el handler sin conservar esas adaptaciones.

Migración verificada el 2026-11-03: lint, tipos y build correctos; 17 pruebas unitarias y 19 pruebas de integración correctas. Se comprobó además un único recorrido real en Chromium con Heroku: login `200`, carga del perfil mediante la sesión SSR y logout `204`, confirmando los atributos de la cookie emitida por Next y su eliminación. El navegador hizo un login, un logout y ninguna petición adicional a `/api/auth/me` durante ese recorrido. Los casos de error se probaron con la simulación.

Corrección del perfil verificada el 2026-11-05: el diagnóstico real encontró `role: "user"` y `status: "active"` en Heroku, distintos del contrato original. Se realizaron dos peticiones de login para identificar la diferencia; la validación del arreglo se hizo después únicamente con la simulación. Pasaron 20 pruebas unitarias, 19 de navegador, lint, tipos y build. El mock reproduce los valores observados para Ana y conserva el formato original para Bruno. No se verificó el despliegue de Vercel ni se volvió a consultar `/me` en Heroku durante este diagnóstico. Para aplicar el arreglo es necesario publicar el código actualizado, incluidos `src/features/auth/server/backend.ts` y el nuevo `src/features/auth/server/profile.ts`.

Migración a shadcn/ui verificada el 2026-11-05 (hora de El Salvador): lint, tipos, build y 20 pruebas unitarias correctas; la ejecución final de Playwright pasó las 26 pruebas de autenticación e interfaz. Se revisaron capturas de escritorio y móvil. Los escenarios se ejecutaron solo con la simulación local; no se hicieron solicitudes a Heroku ni se desplegó en Vercel. La guía de componentes incluye los archivos y dependencias que deben acompañar el próximo despliegue.

Para una sesión manual con la simulación, en terminales separadas:

```bash
postman simulation run postman/simulations/auth.sim.yaml --port 4010 --no-history
BACKEND_API_URL=http://127.0.0.1:4010/blog-auth/api/v1 npm run dev -- --port 3005
```

La simulación escucha en IPv4, por eso su URL interna usa `127.0.0.1`; abrir el frontend en `http://localhost:3005`. Cuenta ficticia local: `ana@example.test` / `SimulationPassword123!`. El mock conserva login, me y logout y añade registro, recuperación, restablecimiento, edición, foto y perfil público. Usa `pm.state` para cuentas sintéticas, cambios y tokens utilizados; no regenerar `default.js`. Los tokens de prueba son `a` repetida 43 veces (Ana), `r` repetida 43 veces (cuenta sintética `reset@example.test`, creada por la prueba) y `e` repetida 43 veces (vencido). Los no modelados devuelven `501`. El mock verifica multipart con boundary, pero no procesa imágenes en Cloudinary ni envía correo; la expiración se representa con fixtures. Los resultados locales prueban el contrato modelado, no todos los comportamientos de Heroku.
