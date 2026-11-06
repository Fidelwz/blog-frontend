# Componentes compartidos con shadcn/ui

La aplicación utiliza shadcn/ui con Radix, el estilo Nova, Tailwind CSS 4 y Lucide. Los componentes se incorporan como código del proyecto en `src/components/ui`; sus cambios se revisan y versionan junto con las funcionalidades. `components.json` registra la configuración y `pnpm-lock.yaml` fija las versiones instaladas.

## Organización

```text
src/
  components/
    ui/                   # Primitivos de shadcn; icon.tsx adapta Lucide
    form-field.tsx        # Input, etiqueta, validación y visibilidad de contraseña
    notice.tsx            # Avisos informativos, de éxito y de error
    user-avatar.tsx       # Imagen o iniciales con los colores del blog
    empty-state.tsx       # Estado sin resultados
    coming-soon.tsx       # Presentación común de los módulos pendientes
    community-rules.tsx   # Diálogo compartido
    layout/shell.tsx      # Navegación y menú de cuenta
  features/
    auth/                 # Formularios, consultas, mutaciones, store y servidor
    profile/              # Perfil real y formulario de edición de ejemplo
    publications/         # Tarjetas, filtros y exploración
  app/
    globals.css           # Tokens del tema, layouts e ilustraciones del blog
```

La organización por funcionalidades se mantiene. Cada módulo reúne su comportamiento; la capa compartida proporciona los controles visuales. Los componentes de `ui` no importan stores, consultas, servicios ni credenciales de una feature.

| Vista                                       | Componentes utilizados                                         |
| ------------------------------------------- | -------------------------------------------------------------- |
| Acceso, registro y recuperación             | Card, Input, Field, Button, Checkbox, Alert y Dialog           |
| Navegación y sesión                         | DropdownMenu, Avatar, Badge, Input y Button                    |
| Perfil                                      | Card, Avatar, Badge, Field y Alert                             |
| Edición de perfil de ejemplo                | Los anteriores, Textarea y AlertDialog para cambios pendientes |
| Publicaciones y búsqueda                    | Card, Badge, Avatar, ToggleGroup, Input, Button y Empty        |
| Grupos, avisos, autoría y nueva publicación | Presentación ComingSoon con Card, Badge y Button               |
| Carga, errores y página inexistente         | Skeleton, Empty y Button                                       |

## Reutilización

Importar el componente compartido en lugar de crear otro botón o copiar un formulario completo de un bloque:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Notice } from "@/components/notice";

<FormField label="Título" name="title" error={errors.title} />
<Button type="submit" disabled={pending}>Guardar</Button>
<Button asChild variant="outline">
  <Link href="/inicio">Volver al inicio</Link>
</Button>
<Notice kind="error">No pudimos guardar los cambios.</Notice>
```

`FormField` relaciona etiqueta, campo y mensaje mediante IDs. Para contraseñas admite `revealPassword`; cada control de visibilidad tiene un nombre asociado al campo. Si una pantalla repite campos con el mismo `name`, asignar IDs distintos. Usar `Field` y `FieldLabel` de shadcn para composiciones con Checkbox o Textarea.

Los botones nativos dentro de formularios necesitan `type="button"` si no envían datos. `Button asChild` conserva la semántica de los enlaces. Los ítems del menú de cuenta tienen rol `menuitem`; el filtro de materia es un grupo de selección única. Dialog y DropdownMenu gestionan Escape, navegación por teclado y devolución del foco.

Cambiar colores y bordes compartidos en los tokens `--primary`, `--background`, `--foreground`, `--border`, etc. de `globals.css`. Los estilos editoriales y las ilustraciones existentes se conservan allí; los controles ya no dependen de `.button`, `.field` o de un diálogo escrito a mano. No se ha añadido un selector de tema oscuro.

Para incorporar un componente cuando un módulo lo necesite:

```bash
pnpm exec shadcn add select
```

Revisar los archivos generados y las dependencias; evitar sobrescribir componentes personalizados sin comparar los cambios. La versión del CLI está fijada por el lockfile del proyecto.

## Estado e integración

- TanStack Query conserva la sesión y las mutaciones de login/logout.
- Zustand conserva el estado compartido de interfaz, incluido `userMenuOpen`, que controla el DropdownMenu.
- Campos, visibilidad de contraseñas y filtros locales mantienen estado React.
- Next y Nest siguen gestionando autorización y cookie HttpOnly. Los componentes no acceden al JWT.
- Registro, recuperación, edición del perfil y módulos pendientes conservan su alcance de vista previa. Adoptar sus componentes no conecta nuevos endpoints.

## Comprobación y despliegue

```bash
pnpm install --frozen-lockfile
npm run lint
npm run typecheck
npm test
npm run build
npm run test:auth
# Solo interacción y presentación de componentes:
npm run test:ui
```

Las pruebas de navegador necesitan Chromium y Postman CLI. `test:auth` conserva su comando histórico y ejecuta la carpeta completa de Playwright, incluida la suite de interfaz. Los servidores se inician localmente con la simulación existente; no se usan Heroku ni cuentas reales. Se comprueban el foco del diálogo y del menú, la validación y el consentimiento, filtros y búsqueda, los módulos pendientes y anchos móviles de 320/390 px para las vistas públicas. Las capturas temporales se escriben en `test-results/`, excluido de Git.

Para publicar en Vercel, incluir el código actualizado, `components.json`, `package.json` y `pnpm-lock.yaml` con los archivos habituales del proyecto. Vercel debe instalar las nuevas dependencias y volver a compilar. Se conservan `BACKEND_API_URL` y `APP_ORIGIN`; no hacen falta variables nuevas para shadcn. No subir `.env.local`, `node_modules`, `.next` ni `test-results`.
