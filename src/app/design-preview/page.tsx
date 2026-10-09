import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AdminSidebar, TutorTopBar } from "@/shared/components/app-shell";
import { EmptyState } from "@/shared/components/empty-state";
import { PageContainer } from "@/shared/components/page-container";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { getCareerAbbreviation } from "@/shared/career-abbreviation";

import { careerPalette, colorTokens } from "./design-tokens";

export const metadata: Metadata = {
  title: "Vista previa del diseño | SGTA",
};

const buttonVariants = [
  { value: "default", label: "Principal" },
  { value: "secondary", label: "Secundario" },
  { value: "outline", label: "Contorno" },
  { value: "ghost", label: "Discreto" },
  { value: "destructive", label: "Destructivo" },
  { value: "link", label: "Enlace" },
] as const;

const buttonSizes = [
  { value: "default", label: "Predeterminado" },
  { value: "sm", label: "Pequeño" },
  { value: "lg", label: "Grande" },
  { value: "icon", label: "Ícono" },
] as const;

const statuses = [
  { variant: "success", label: "Activo" },
  { variant: "warning", label: "Pendiente" },
  { variant: "danger", label: "Requiere atención" },
  { variant: "info", label: "En curso" },
  { variant: "neutral", label: "Borrador" },
] as const;

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <PageContainer
      as="main"
      aria-labelledby="design-preview-heading"
      className="space-y-10 py-8 sm:py-10"
    >
      <PageHeader
        titleId="design-preview-heading"
        title={
          <span className="flex items-center gap-3 text-2xl font-display font-semibold md:text-title">
            <span
              aria-hidden="true"
              className="h-5 w-1 shrink-0 rounded-full bg-sidebar-marker"
            />
            <span>Vista previa del sistema de diseño</span>
          </span>
        }
        description="Tokens y componentes compartidos de SGTA en una vista de desarrollo."
      />

      <section aria-labelledby="typography-heading" className="space-y-4">
        <h2
          className="font-display text-xl font-semibold text-foreground"
          id="typography-heading"
        >
          Tipografía
        </h2>
        <div className="grid gap-6 border-y border-border/70 py-5 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Títulos · Source Serif 4
            </p>
            <p className="font-display text-display font-semibold leading-tight text-foreground">
              Gestión académica
            </p>
            <p className="font-display text-xl font-semibold text-foreground">
              Encabezado de sección
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
              Interfaz · Manrope
            </p>
            <p className="text-base leading-relaxed text-foreground">
              Texto de apoyo con información clara para las tareas de Tutorías.
            </p>
            <p className="text-sm font-semibold text-foreground">
              Etiqueta de campo
            </p>
            <p className="text-xs text-muted-foreground">
              Texto auxiliar de 12 píxeles.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="colors-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            className="font-display text-xl font-semibold text-foreground"
            id="colors-heading"
          >
            Tokens de color
          </h2>
          <p className="text-sm text-muted-foreground">
            Muestras vinculadas directamente con el registro de color de la aplicación.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {colorTokens.map((token) => (
            <li className="flex min-w-0 items-start gap-3" key={token.name}>
              <span
                aria-hidden="true"
                className="size-9 shrink-0 rounded-md border border-border"
                style={{ backgroundColor: `var(${token.name})` }}
              />
              <span className="min-w-0 space-y-0.5">
                <span className="block break-all text-xs font-semibold text-foreground">
                  {token.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {token.label}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="careers-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            className="font-display text-xl font-semibold text-foreground"
            id="careers-heading"
          >
            Colores de carreras
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada muestra identifica la carrera por nombre y sigla; las líneas indican recuperación.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {careerPalette.map((career) => {
            const abbreviation = getCareerAbbreviation(career.career);
            const colorToken = `--career-${career.hue}`;
            const foregroundToken = `${colorToken}-foreground`;
            const colorStyle = {
              backgroundColor: `var(${colorToken})`,
              color: `var(${foregroundToken})`,
            };

            return (
              <li className="min-w-0 space-y-2.5" key={career.hue}>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {career.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {career.career}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    Texto: {foregroundToken}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="flex min-h-11 items-center justify-between gap-1 rounded-lg px-2 text-sm font-semibold"
                    style={colorStyle}
                  >
                    <span>{abbreviation}</span>
                    <span className="text-xs font-normal">Base</span>
                  </div>
                  <div
                    className="bg-hatch flex min-h-11 items-center justify-between gap-1 rounded-lg px-2 text-sm font-semibold"
                    style={colorStyle}
                  >
                    <span>{abbreviation}</span>
                    <span className="text-xs font-normal">Recuperación</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="buttons-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            className="font-display text-xl font-semibold text-foreground"
            id="buttons-heading"
          >
            Botones
          </h2>
          <p className="text-sm text-muted-foreground">
            Variantes y tamaños. Los ejemplos no ejecutan acciones.
          </p>
        </div>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {buttonVariants.map((variant) => (
            <div
              className="space-y-3 border-t border-border/70 py-4"
              key={variant.value}
            >
              <h3 className="text-sm font-semibold text-foreground">
                {variant.label}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {buttonSizes.map((size) => (
                  <Button
                    aria-label={
                      size.value === "icon"
                        ? `${variant.label}, tamaño ${size.label}`
                        : undefined
                    }
                    key={size.value}
                    size={size.value}
                    type="button"
                    variant={variant.value}
                  >
                    {size.value === "icon" ? (
                      <ArrowRight aria-hidden="true" />
                    ) : (
                      size.label
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border/70 pt-4">
          <div className="space-y-1">
            <Button disabled type="button">
              Deshabilitado
            </Button>
            <p className="text-xs text-muted-foreground">Estado deshabilitado</p>
          </div>
          <div className="space-y-1">
            <Button id="focus-example" type="button" variant="outline">
              Foco visible
            </Button>
            <p className="text-xs text-muted-foreground">Presionar Tab para ver el foco</p>
          </div>
          <Badge variant="neutral">
            <Check aria-hidden="true" />
            Acción confirmada
          </Badge>
        </div>
      </section>

      <section aria-labelledby="controls-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            className="font-display text-xl font-semibold text-foreground"
            id="controls-heading"
          >
            Campos y selección
          </h2>
          <p className="text-sm text-muted-foreground">
            Campos de ejemplo con etiquetas visibles y estados reconocibles.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Datos de tutoría</CardTitle>
            <CardDescription>
              Controles compartidos para formularios administrativos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preview-name">Nombre del Tutor</Label>
                <Input
                  defaultValue="Andrea Gómez"
                  id="preview-name"
                  name="preview-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-disabled">Código de referencia</Label>
                <Input
                  disabled
                  id="preview-disabled"
                  readOnly
                  value="Solo lectura"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-error">Correo institucional</Label>
                <Input
                  aria-describedby="preview-error-message"
                  aria-invalid="true"
                  defaultValue="tutor@utn"
                  id="preview-error"
                  name="preview-error"
                  type="email"
                />
                <p
                  className="text-sm text-destructive"
                  id="preview-error-message"
                >
                  Ingresar un correo institucional válido.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-career">Carrera</Label>
                <NativeSelect defaultValue="systems" id="preview-career" name="preview-career">
                  <NativeSelectOption value="systems">
                    Ingeniería en Sistemas de Información
                  </NativeSelectOption>
                  <NativeSelectOption value="electromechanical">
                    Ingeniería Electromecánica
                  </NativeSelectOption>
                  <NativeSelectOption value="chemistry">
                    Ingeniería Química
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="preview-notes">Observaciones</Label>
                <Textarea
                  defaultValue="Consulta de ejemplo sobre regularidad de cursado."
                  id="preview-notes"
                  name="preview-notes"
                  rows={3}
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Preferencias
                </p>
                <div className="flex items-center gap-3">
                  <Checkbox defaultChecked id="preview-updates" />
                  <Label htmlFor="preview-updates">
                    Recibir novedades del período
                  </Label>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Tipo de horario
                </p>
                <RadioGroup
                  aria-label="Tipo de horario"
                  className="flex flex-wrap gap-x-5 gap-y-3"
                  defaultValue="regular"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="preview-regular" value="regular" />
                    <Label htmlFor="preview-regular">Regular</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="preview-special" value="special" />
                    <Label htmlFor="preview-special">Especial</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3 sm:col-span-2">
                <p className="text-sm font-semibold text-foreground">
                  Días de cursado
                </p>
                <ToggleGroup
                  aria-label="Días de cursado"
                  defaultValue={["mon", "wed", "fri"]}
                  type="multiple"
                >
                  <ToggleGroupItem aria-label="Lunes" value="mon">
                    Lun
                  </ToggleGroupItem>
                  <ToggleGroupItem aria-label="Martes" value="tue">
                    Mar
                  </ToggleGroupItem>
                  <ToggleGroupItem aria-label="Miércoles" value="wed">
                    Mié
                  </ToggleGroupItem>
                  <ToggleGroupItem aria-label="Jueves" value="thu">
                    Jue
                  </ToggleGroupItem>
                  <ToggleGroupItem aria-label="Viernes" value="fri">
                    Vie
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="shell-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            className="font-display text-xl font-semibold text-foreground"
            id="shell-heading"
          >
            Estructura de la aplicación
          </h2>
          <p className="text-sm text-muted-foreground">
            Barra lateral de administración expandida y en riel, y barra superior del tutor.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-6">
          <div className="h-160 w-sidebar overflow-hidden rounded-xl border border-border shadow-xs">
            <AdminSidebar
              currentPath="/admin/schedules"
              layout="expanded"
              user={{ name: "Camila Pérez", role: "ADMIN" }}
            />
          </div>
          <div className="h-160 w-sidebar-rail overflow-hidden rounded-xl border border-border shadow-xs">
            <AdminSidebar
              currentPath="/admin/schedules"
              layout="rail"
              user={{ name: "Camila Pérez", role: "ADMIN" }}
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border shadow-xs">
          <TutorTopBar
            currentPath="/tutor/schedule"
            user={{ name: "Julián Ramírez", role: "TUTOR" }}
          />
        </div>
      </section>

      <section aria-labelledby="table-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            className="font-display text-xl font-semibold text-foreground"
            id="table-heading"
          >
            Tabla
          </h2>
          <p className="text-sm text-muted-foreground">
            Filas de 44 píxeles para una lectura cómoda.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Actividad de tutorías</CardTitle>
            <CardDescription>Muestras con datos sintéticos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="h-row hover:bg-transparent">
                  <TableHead>Tutor</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-row">
                  <TableCell>Camila Pérez</TableCell>
                  <TableCell>Consulta</TableCell>
                  <TableCell>Activa</TableCell>
                </TableRow>
                <TableRow className="h-row">
                  <TableCell>Julián Ramírez</TableCell>
                  <TableCell>Tutoría</TableCell>
                  <TableCell>Pendiente</TableCell>
                </TableRow>
                <TableRow className="h-row">
                  <TableCell>Marina López</TableCell>
                  <TableCell>Reunión</TableCell>
                  <TableCell>Finalizada</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="status-heading" className="space-y-4">
        <h2
          className="font-display text-xl font-semibold text-foreground"
          id="status-heading"
        >
          Estados
        </h2>
        <ul className="flex flex-wrap gap-2.5">
          {statuses.map((status) => (
            <li key={status.variant}>
              <StatusBadge variant={status.variant}>
                {status.label}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="empty-heading" className="space-y-4">
        <h2
          className="font-display text-xl font-semibold text-foreground"
          id="empty-heading"
        >
          Estado vacío
        </h2>
        <EmptyState
          description="Los registros aparecerán aquí cuando estén disponibles."
          title="Sin resultados para el período"
        />
      </section>
    </PageContainer>
  );
}
