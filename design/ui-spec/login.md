# View: Login

Global rules, system states, and the route inventory live in [UI-SPEC](../UI-SPEC.md).

- Route: `/login`. Access: public.
- Purpose and success condition: a previously enabled SGTA user authenticates with Google and enters the correct workspace without creating a public account; a valid enabled identity reaches `/admin` or `/tutor`.
- Primary action: `Continuar con Google`, which starts Google sign-in and redirects to the role's home. No secondary or destructive actions.

## Content order

1. Tutorías and SGTA identity: the Faro mark with the Faro Beam and the UTN FRRe context. This is the only view with an illustration.
2. Title and restricted-access explanation.
3. `Continuar con Google`.
4. Recovery guidance for an account without access.

The page needs only session state, OAuth availability, and enabled SGTA user resolution after the callback. No product data loads before authorization succeeds. Public signup does not exist.

## Wireframe

```text
+--------------------------------------------------------------+
|                         |                                    |
| Brand identity          |  Sistema de Gestión de Tutorías    |
| Faro mark / beam        |  Acceso para usuarios habilitados  |
| UTN FRRe context        |                                    |
|                         |  [ Continuar con Google ]          |
|                         |                                    |
|                         |  access/help copy                  |
+--------------------------------------------------------------+
```

## Responsive exceptions

- Wide: a branded two-zone composition; the login content stays narrower than the application workspace.
- Medium: the same two zones with narrower proportions.
- Compact: one column with the brand block above the form; the action fills the usable form width.

## States

| State | Treatment |
| --- | --- |
| Default | Brand and primary action. |
| Loading | The action is disabled against repeated activation and shows compact progress without layout shift. |
| Error | A technical explanation with `Reintentar`, announced through a live region. |
| Permission denied | An access explanation with administrative recovery, distinct from the technical error. |

## Copy

| Element | Copy |
| --- | --- |
| Title | Sistema de Gestión de Tutorías |
| Supporting text | Acceso para usuarios habilitados de Tutorías UTN FRRe. |
| Primary action | Continuar con Google |
| Empty | None |
| Error | `No se pudo iniciar sesión` with `Reintentar` |
| Permission denied | `Esta cuenta no está habilitada en SGTA` with `Contactar a la administración de Tutorías para solicitar acceso.` |
| Success | None; the user is redirected |

## Accessibility

- One `h1`.
- The sign-in button has a clear accessible name.
- Errors are announced through a live region.
- The brand mark is decorative when it repeats visible text.
- Focus never lands on decorative elements.

## Acceptance criteria

- [ ] Admin and Tutor route to their own home.
- [ ] Public signup is absent.
- [ ] Technical error and permission denied are distinct.
- [ ] The Compact layout remains complete.
- [ ] Keyboard and screen-reader behavior are verified.
