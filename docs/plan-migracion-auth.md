**Plan de migración de autenticación a Zustand y TanStack Query**

Estado: implementación completada y verificada el 2026-11-03. Se instalaron Zustand 5.0.16 y TanStack Query 5.105.3. Las secciones de diagnóstico y propuesta se conservan como registro del plan aprobado; las rutas antiguas de la tabla describen el estado anterior.

**Decisiones aplicadas**

- Auth reúne sus tipos, utilidades, transporte, queries, mutaciones y helpers de servidor. `LoginForm` queda separado de los formularios de demostración. `index.ts` publica la API cliente y `server/index.ts` la entrada exclusiva de servidor.
- `query-options.ts` concentra la política de la sesión; `cache.ts` cancela y limpia consultas privadas; `sync.ts` coordina los avisos entre pestañas. Se añadieron estos archivos para hacer comprobables esas responsabilidades.
- Zustand conserva únicamente menú y avisos. El perfil permanece en Query, con hidratación SSR, instancias aisladas en servidor y sin persistencia. La instantánea lleva la fecha del inicio de su comprobación para que un render lento anterior no sobrescriba una sesión más reciente.
- Se mantiene la navegación de documento completo al entrar/salir. Las pestañas receptoras también recargan tras limpiar caché; validan la cookie contra el servidor sin aceptar identidad desde el evento.
- Un bloqueo por QueryClient cubre envíos simultáneos y el intervalo entre terminar la mutación y abandonar el documento. Los errores liberan el bloqueo para permitir un reintento explícito. Las variables con credenciales se vacían al terminar la petición.
- Los avisos de expiración/suspensión pueden conservarse en la URL de retorno mediante un valor permitido de `notice`; este parámetro solo afecta a la presentación y nunca autentica.
- El backend, sus contratos HTTP y los controles de origen/cookie se conservan. Registro y recuperación continúan como vistas previas.

Verificación: `npm run lint`, `npm run typecheck`, `npm test` (17 pruebas), `npm run build` y `npm run test:auth` (19 pruebas) correctos. La primera ejecución de navegador detectó una carrera de redirección tras reintentar logout; se corrigió conservando el bloqueo hasta abandonar el documento y la suite completa pasó. El recorrido real posterior con Heroku verificó login 200, perfil SSR correcto y logout 204; no se ejecutaron casos negativos contra ese despliegue. Los detalles y los límites de la simulación están en `postman/simulations/auth.context.yaml`.

**1. Diagnóstico del código actual**

El flujo actual es: formulario → cliente fetch → Route Handler de Next → Nest. Next recibe la cookie de Nest y establece una cookie HttpOnly para el host del frontend. La carga de páginas consulta `getSession()`, y las páginas privadas ejecutan `requireUser()`.

| Archivo o área | Hallazgo | Cambio propuesto |
| --- | --- | --- |
| `src/features/auth/auth-form.tsx` | Mezcla cuatro modos de formulario, validación, transporte, estados de petición y navegación. | Extraer `LoginForm`; delegar las peticiones y sus estados a hooks de mutación. |
| `src/features/auth/auth-provider.tsx` | Context distribuye una instantánea recibida del servidor; no consulta ni actualiza por sí mismo la sesión. | Sustituir el dato de sesión del Context por la query de sesión; usar un proveedor acotado para la instancia de Zustand. |
| `src/lib/api/auth.ts` | `getCurrentUser()` existe, pero la UI no lo consume. El AbortSignal solo procede del timeout. | Convertirlo en transporte de la feature y aceptar la cancelación de TanStack Query además del timeout. |
| `src/components/layout/shell.tsx` | Implementa logout, errores y bloqueo de envíos dentro del componente de navegación. | Consumir `useLogout()` y el estado de interfaz de Zustand. |
| `src/app/layout.tsx` | Obtiene sesión para toda la aplicación y entrega el resultado al proveedor. | Preparar el estado inicial de la query desde el servidor, sin una segunda consulta inmediata en el navegador. |
| `src/lib/auth/session.ts` | Valida con Nest y deduplica `/me` durante un render. Las páginas privadas tienen sus propios controles. | Mantener esa autorización en servidor y la deduplicación por petición. |
| Login/logout | Usan `window.location.replace` para cargar un documento nuevo y descartar cachés de navegación. | Mantener inicialmente este límite entre sesiones; encapsular la navegación para permitir optimizarla después. |
| Organización | Auth está repartido entre `features/auth`, `lib/api` y `lib/auth`. | Reunir el código específico de autenticación en su feature. |

El proveedor actual puede conservar información de una sesión mientras permanece montado. Esto es una limitación de actualización de la interfaz; no significa que las páginas privadas carezcan de controles, porque `requireUser()` ya consulta al backend. Next advierte que los layouts no se vuelven a ejecutar en cada navegación y recomienda comprobar autorización cerca de los datos. [Autenticación en Next](https://nextjs.org/docs/app/guides/authentication).

**2. Reparto de responsabilidades**

| Información o responsabilidad | Propietario |
| --- | --- |
| Usuario, rol y resultado de consultar la sesión | TanStack Query, con una clave central `['auth', 'session']`. |
| Carga y errores de login/logout | Las mutaciones de TanStack Query. |
| Menú del usuario abierto y avisos de sesión descartables | Store de interfaz de Zustand. |
| Contraseña y validaciones de campos antes de enviar | Estado local del formulario. |
| Cookie jwt, autorización y acceso al backend | Next y Nest. |
| Transporte HTTP | Cliente fetch existente, invocado por queries y mutations. |

El perfil no se copiará simultáneamente a Zustand y a la caché de Query. `isAuthenticated` será un valor derivado de la sesión consultada, no otro booleano persistido. Zustand gestionará estado propio del navegador; TanStack Query, datos cuya autoridad es el servidor. Esta separación coincide con la explicación de TanStack sobre su convivencia con gestores de estado de cliente. [Estado del servidor y estado del cliente](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state).

Store inicial propuesto: `userMenuOpen`, `sessionNotice` y acciones para abrir/cerrar el menú, mostrar/descartar avisos y reiniciar la interfaz. Los avisos son información de presentación; no autorizan acceso. No contendrá el usuario, JWT, contraseña ni estados de petición duplicados. Será una fábrica de stores con una instancia por árbol de aplicación, nunca un singleton compartido entre peticiones del servidor. Puede usar Context para inyectar esa instancia. [Zustand con Next.js](https://zustand.docs.pmnd.rs/learn/guides/nextjs).

**3. Organización recomendada**

Recomendación para este equipo: organización por funcionalidades con una separación explícita entre código cliente y servidor. El proyecto ya utiliza `src/features`; se completa esa organización en auth antes de extenderla a los siguientes módulos. Next permite varias estructuras, incluida la separación por funcionalidades; esta elección responde al dominio del blog y al trabajo repartido entre integrantes. [Organización en Next](https://nextjs.org/docs/app/getting-started/project-structure).

```text
src/
  app/
    providers.tsx                 # QueryClientProvider y proveedores de aplicación
    layout.tsx
    acceso/page.tsx              # Composición y redirecciones de servidor
    api/auth/*/route.ts          # Adaptadores HTTP delgados
  features/
    auth/
      api.ts                    # login, getSession, logout por HTTP
      queries.ts                # Claves, opciones y useSession
      mutations.ts              # useLogin y useLogout
      store.ts                  # Fábrica del store de interfaz
      types.ts                  # DTOs y tipos compartibles
      utils.ts                  # Retorno seguro e iniciales
      components/
        login-form.tsx
        auth-provider.tsx       # Proveedor de instancia + coordinación de sesión
      server/
        session.ts              # getSession y requireUser
        backend.ts
        cookie.ts
        handlers.ts
        index.ts                # Entrada exclusiva de servidor
      index.ts                  # API pública de cliente y tipos
    publications/
    profile/
  components/
    ui/                         # Controles genéricos
    layout/                     # Composición de la aplicación
    brand/                      # Logo compartido
  lib/
    api/client.ts               # Transporte y errores reutilizables
    query/client.ts             # Construcción y configuración de QueryClient
```

Las rutas ensamblan features y aplican guards; no contienen stores ni lógica de mutaciones. El transporte genérico no importa features. Los módulos futuros consumen el contrato público de auth y no sus archivos internos. El barrel cliente no reexporta `server/`, cuyos archivos conservan `server-only`. Se extraen Logo y normas del shell para que el formulario no dependa del contenedor de toda la aplicación. Se crean archivos conforme sean necesarios; no se reorganiza el resto del repositorio de forma masiva.

**4. Cambios por etapas**

1. **Establecer la base de regresión.** Revisar el estado de Git y conservar los cambios existentes. Reutilizar el contrato de `postman/contracts/auth.openapi.yaml` y los tests actuales. Registrar el número de peticiones esperado para carga inicial, login, recarga y logout. El contrato público de los tres endpoints se conserva.

2. **Encapsular auth.** Mover los tipos, utilidades, transporte y funciones de servidor a la estructura de la feature. Actualizar importaciones y separar LoginForm de los formularios de demostración. Mantener operativos los guards y el comportamiento HTTP durante este movimiento.

3. **Instalar y configurar las librerías.** Agregar `zustand` y `@tanstack/react-query` en versiones estables compatibles con React 19; confirmar sus peer dependencies y fijar la resolución en `pnpm-lock.yaml`. Crear un QueryClient estable en el navegador y aislado por petición en SSR. Crear el proveedor del store de interfaz con selectores específicos.

4. **Migrar la consulta de sesión.** Crear `useSession()` sobre una clave central y preparar los datos de SSR con hidratación. En servidor se consulta Nest directamente mediante el helper existente; el navegador usa `/api/auth/me`. La sesión inicial se reutiliza sin llamar dos veces al backend por hidratar la página. Los consumidores de identidad —shell, perfil y saludo— leen la query; el servidor sigue verificando acceso. Un fallo inicial del backend se presenta como error recuperable, sin sembrar una sesión anónima o autenticada ficticia. [SSR con TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).

5. **Migrar login y logout.** Crear las mutaciones, trasladar sus estados de carga y error, y centralizar actualización/limpieza de caché. Sustituir los consumidores de `useAuth()` y retirar el proveedor anterior cuando no queden dependencias. Mantener un bloqueo efectivo de envíos duplicados: `useMutation` por sí solo no garantiza una única mutación ante dos disparos. La contraseña permanece transitoria; al finalizar o abandonar el flujo se limpian el formulario y la mutación. Las mutaciones de autenticación no se persisten ni quedan en una cola para ejecutarse después sin intervención del usuario. [Mutaciones](https://tanstack.com/query/latest/docs/framework/react/guides/mutations).

6. **Verificar y documentar el patrón.** Extender la simulación y las pruebas necesarias, actualizar el README y documentar la API pública de auth para los otros integrantes. Ejecutar lint, tipos, pruebas unitarias, compilación y pruebas de navegador contra la simulación. Como comprobación final, un único recorrido real autorizado con login, perfil y logout; no repetir los casos negativos contra Heroku.

**5. Comportamiento de consultas y errores**

Política inicial propuesta para la query de sesión: `staleTime` de 60 segundos, `retry: false`, sin `refetchInterval` y revalidación al recuperar foco o conexión solo si el dato está obsoleto. En login/logout, `retry: false`. Estos son valores de partida para este proyecto, no una duración de la sesión ni una garantía de autorización. Se medirán las llamadas con la simulación. TanStack Query considera los datos obsoletos por defecto y puede reconsultar al montar, enfocar o reconectar; por eso la configuración debe ser explícita. [Valores predeterminados](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).

| Resultado | Comportamiento previsto |
| --- | --- |
| Login 200 | Cancelar consultas antiguas de sesión, limpiar caché privada de otra identidad, guardar el perfil devuelto y navegar al retorno interno validado. No llamar inmediatamente a `/me` desde el navegador solo para repetir el perfil que llegó en login. La página privada sí conserva su comprobación de servidor. |
| Login 400/401 | Mostrar el error del intento sin disparar un cierre global ni otra petición automática. |
| Login 403 | Mostrar el error correspondiente. No inferir siempre suspensión: el intermediario también puede rechazar el origen. |
| `/me` 401 | Establecer sesión anónima, retirar los datos privados anteriores y mostrar aviso de expiración cuando corresponda. Redirigir únicamente si se está en una página que requiere sesión. |
| `/me` 403 | Bloquear la sesión y mostrar el aviso de cuenta suspendida según el contrato de este endpoint. |
| Red, timeout o 5xx | Presentar error recuperable; no simular logout ni borrar la cookie. Una respuesta anterior en caché no sustituye la autorización del backend. |
| Logout 204 | Cancelar consultas privadas en vuelo, eliminar sus datos, reiniciar el estado de interfaz y cargar el acceso después de que el servidor elimine la cookie. |
| Logout fallido | Mantener el estado existente y permitir un reintento explícito. |

Las consultas consumirán el AbortSignal de TanStack Query combinado con el límite de espera actual. Cancelar y retirar consultas evita que un `/me` antiguo repueble la identidad después del logout. No se asumirá que abortar una petición deshace una mutación en el backend. [Cancelación de queries](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).

**6. SSR, navegación y sesión**

La hidratación solo transmite datos públicos de la sesión. No transmite JWT, contraseñas ni errores internos de Nest. Una instantánea SSR anterior no debe sobrescribir un resultado más reciente de login/logout; este caso se cubre con cancelación y pruebas de cambio de identidad. No habrá persistencia de sesión en Zustand ni de queries privadas en localStorage.

En la primera migración se mantiene la carga de documento nuevo en login/logout. Esto conserva el comportamiento verificado de descarte de cachés de navegación y limita el alcance del cambio. Si después se elimina esa recarga, será un cambio explícito que coordine caché de Query, Router Cache y componentes de servidor, con pruebas de atrás/adelante y cambio de cuenta. Invalidar una query no actualiza automáticamente un Server Component; `router.refresh()` tiene responsabilidades distintas. [SSR de Query](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr), [router de Next](https://nextjs.org/docs/app/api-reference/functions/use-router).

Para varias pestañas, un evento de login/logout puede avisar mediante BroadcastChannel sin transportar usuario ni tokens. Al recibirlo, cada pestaña limpia su caché privada y revalida su sesión con el servidor; no toma el mensaje como prueba de autenticación. Se mantiene la comprobación al restaurar una página desde la caché del navegador. La expiración se conoce mediante respuestas del servidor o revalidación; `staleTime` no actúa como temporizador de expiración del JWT.

**7. Criterios de aceptación**

- Los casos funcionales de las 10 pruebas unitarias y 11 de integración existentes se mantienen; los imports se adaptan a los movimientos de archivos.
- La pantalla, el menú y el perfil consumen la misma sesión y reflejan login/logout correctamente.
- No hay una query y un store guardando copias editables del mismo usuario.
- El estado de interfaz se reinicia al salir; las credenciales no se persisten.
- La carga inicial hidratada no duplica `/me` en navegador y servidor, y dos consumidores de `useSession()` comparten la consulta cliente.
- Un doble envío produce un único login; un error no causa reintentos automáticos.
- Logout elimina datos privados; una respuesta anterior que llegue tarde no restaura el usuario.
- Entrar como A, salir y entrar como B no muestra datos de A, incluso usando el historial.
- La validación SSR sigue aislada entre peticiones; cada usuario recibe su propio estado inicial.
- Suspensión, expiración y caída del servicio conservan tratamientos diferentes.
- Dos pestañas se sincronizan sin intercambiar credenciales; no se consulta periódicamente al backend.
- No hay errores de hidratación ni importaciones de código de servidor desde componentes cliente.
- Las rutas privadas continúan protegidas aunque se altere el estado del navegador.

**8. Aplicación a los próximos módulos**

Publicaciones, comentarios y grupos pueden repetir esta estructura de feature. Cada módulo define sus query keys, invalidaciones y UI. Los datos privados se identifican por usuario o se marcan para limpieza al cambiar de sesión. El estado de filtros que deba compartirse por enlace pertenece a la URL; los borradores y controles compartidos de interfaz pueden pertenecer a Zustand; las entidades del backend pertenecen a Query. El equipo comparte el cliente HTTP y la sesión pública de auth, manteniendo sus implementaciones internas separadas.

No hay evidencia de que una estructura más compleja aporte valor en este momento. La recomendación es completar la organización por funcionalidades existente, con límites de importación y responsabilidades comprobables.
