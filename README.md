# Blog Interactivo Estudiantil — primer avance

Frontend local con Next.js 16.2.6, React 19.2.4, TypeScript estricto y Tailwind CSS 4 integrado en la compilación. Basado en el análisis de `Fase 2.pdf` y las exportaciones de los wireframes de Stitch. Este incremento entrega la base y una demostración navegable; no completa todavía el Sprint 1 de identidad integrado con el backend.

## Ejecutar la demostración

Requiere Node.js 22.18 o superior; verificado con Node.js 24.15.0.

```bash
cd /home/fidev/Descargas/ricoTecnicaSoftware/blog-frontend
npm run dev
```

Abrir http://localhost:3000. Las dependencias y `.env.local` ya están preparados en este espacio de trabajo. Para una copia nueva del proyecto:

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
npm run dev
```

El lockfile de pnpm fija las dependencias. No se necesita conexión a la API para la demostración. Si el puerto está ocupado: `npm run dev -- --port 3005`.

## Recorrido para presentar avances

1. `/`: portada, navegación, publicaciones de ejemplo y diseño adaptable.
2. Filtrar por materia, cargar más publicaciones y abrir un artículo.
3. `/buscar`: buscar «calculo», con o sin tilde, y probar una consulta sin resultados.
4. `/registro`: enviar campos vacíos, completar requisitos de contraseña y comprobar confirmación y aceptación de normas. Solo usar datos de prueba.
5. `/acceso` y `/recuperar`: mostrar validaciones y avisos del flujo previsto. `/recuperar/demo` muestra el formulario de nueva contraseña, sin validar un token real.
6. `/inicio` y `/perfil`: vista de estudiante de ejemplo; editar el perfil, previsualizar foto, descartar o guardar cambios locales y comprobar el aviso al seguir un enlace con cambios pendientes.
7. Reducir el navegador a ancho de teléfono para revisar la navegación inferior.

Registro, inicio de sesión, recuperación y perfil **no realizan operaciones en un backend**. El perfil se restaura al recargar. Los contadores de comentarios y recursos son ejemplos; no hay descarga de archivos ni conversación implementada. Grupos, editor, notificaciones y mis publicaciones muestran su estado pendiente explícitamente.

## Organización

- `src/app`: rutas App Router, layouts y estados de carga/error/404.
- `src/components`: controles compartidos, modal accesible y navegación.
- `src/features`: formularios y presentación de publicaciones.
- `src/lib/api`: tipos y cliente HTTP base; cookies incluidas, errores centralizados y respuestas 204. Todavía no conectado a las pantallas.
- `src/mocks`: seis publicaciones y paginación de demostración.
- `tests`: seis pruebas de validación, búsqueda/paginación y transporte HTTP.

`NEXT_PUBLIC_DEMO_MODE=true` activa los datos de ejemplo explícitamente. Con `false`, inicio y perfil redirigen al acceso y las publicaciones muestran el estado de integración pendiente. Cambiar variables públicas requiere reiniciar desarrollo o recompilar producción. Este interruptor no sustituye la futura autorización del backend.

`NEXT_PUBLIC_API_URL` reserva la URL de NestJS `/api/v1`; todavía no se consume desde las pantallas. La siguiente entrega debe integrar sesión mediante cookie HttpOnly, `/auth/me`, registro, recuperación y perfil. No se guardan JWT ni contraseñas en almacenamiento del navegador. PostgreSQL, Prisma, SMTP y Cloudinary pertenecen al backend.

## Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```
