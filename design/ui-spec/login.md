# View: Login

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/login`. Access: public.
- Purpose and success condition: a previously enabled SGTA user authenticates with Google and enters the correct workspace without creating a public account; a valid enabled identity reaches `/admin` or `/tutor`.
- Primary action: `Continuar con Google`, which starts Google sign-in and redirects to the role's home. No secondary or destructive actions.

## Content order

1. Brand zone: the Faro Beam at the leading edge of the Faro mark, with `SGTA` and `Tutorías UTN FRRe` beside it; the brand headline and its supporting sentence; and, from Medium, the `Espacio institucional de trabajo` footer line. The Faro illustration, decorative lines on the navy brand zone, sits behind this content. This is the only view with an illustration.
2. Access zone heading: the `Acceso institucional` eyebrow, the title, and the supporting text.
3. Access panel: the status message (the `Acceso restringido` notice by default, or the loading, error, or permission-denied message), then `Continuar con Google`, then the recovery guidance for an account without access. Permission denied shows the recovery guidance once, inside its message.
4. Access note below the panel: `El acceso es exclusivamente institucional. No hay registro público.`

The page needs only session state, OAuth availability, and enabled SGTA user resolution after the callback. No product data loads before authorization succeeds. Public signup does not exist.

## Wireframe

```text
+--------------------------------------------------------------+
| | [mark] SGTA           |  ACCESO INSTITUCIONAL              |
|   Tutorías UTN FRRe     |  Sistema de Gestión de Tutorías    |
|                         |  Acceso para usuarios habilitados  |
|  Brand headline         |  +----------------------------+    |
|  Supporting sentence    |  | status message             |    |
|  (Faro illustration)    |  | [ Continuar con Google ]   |    |
|                         |  | recovery guidance          |    |
|                         |  +----------------------------+    |
| ESPACIO INSTITUCIONAL   |  access note                       |
+--------------------------------------------------------------+
```

## Responsive exceptions

- Wide: a branded two-zone composition; the login content stays narrower than the application workspace. The brand headline uses the Display role.
- Medium: the same two zones with narrower proportions; the brand headline uses the Compact Page title size so it stays within three lines.
- Compact: one column with a short brand block above the form: the mark, headline, and supporting sentence, without the footer line. The brand block keeps its content height, `Continuar con Google` stays within the first 844px viewport, and the action fills the usable form width.

## States

| State | Treatment |
| --- | --- |
| Default | Brand, the `Acceso restringido` notice, and the primary action. |
| Loading | The action is disabled against repeated activation and shows compact progress without layout shift; the status message reads `Conectando…` with `Verificando el acceso. Espere un momento.` |
| Error | A technical explanation with `Reintentar`, announced through a live region. |
| Permission denied | An access explanation with administrative recovery, distinct from the technical error. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Sistema de Gestión de Tutorías |
| Supporting text | Acceso para usuarios habilitados de Tutorías UTN FRRe. |
| Access eyebrow | Acceso institucional |
| Brand headline | Un espacio claro para acompañar cada trayectoria. |
| Brand supporting sentence | Organizar tutorías, horarios y horas con una mirada compartida sobre el acompañamiento institucional. |
| Brand footer | Espacio institucional de trabajo |
| Default notice | `Acceso restringido` with `Solo pueden ingresar las personas habilitadas por la administración.` |
| Primary action | Continuar con Google |
| Recovery guidance | Contactar a la administración de Tutorías para solicitar acceso. |
| Access note | El acceso es exclusivamente institucional. No hay registro público. |
| Loading | `Conectando…` with `Verificando el acceso. Espere un momento.` |
| Empty | None |
| Error | `No se pudo iniciar sesión` with `Reintentar en unos instantes. Si el problema continúa, contactar a la administración.` and the `Reintentar` action |
| Permission denied | `Esta cuenta no está habilitada en SGTA` with `Contactar a la administración de Tutorías para solicitar acceso.` |
| Success | None; the user is redirected |

## Accessibility

- One `h1`, the title; the brand headline is an `h2` inside the `Identidad institucional` region, and the form zone is the `Acceso institucional` region.
- The sign-in button has a clear accessible name.
- Errors are announced through a live region.
- The brand mark, the Faro Beam, and the Faro illustration are decorative and hidden from assistive technology.
- The access panel is described by its status message, the recovery guidance when shown, and the access note.
- Focus never lands on decorative elements.

## Acceptance criteria

- [ ] Admin and Tutor route to their own home.
- [ ] Public signup is absent.
- [ ] Technical error and permission denied are distinct.
- [ ] The Compact layout remains complete.
- [ ] Keyboard and screen-reader behavior are verified.
