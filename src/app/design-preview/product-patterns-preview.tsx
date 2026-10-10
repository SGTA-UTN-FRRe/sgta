"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CareerLegend, ConfirmationDialog, DataTable, FilterBar, FormField, PageHeader, RouteErrorState, RouteLoadingState, StatusBadge, SystemState, type LegendCareer } from "@/shared/components";
import { formatDuration } from "@/shared/format-duration";

const careers: LegendCareer[] = [
  { id: "systems", name: "Ingeniería en Sistemas de Información", color: "BLUE" },
  { id: "chemical", name: "Ingeniería Química", color: "EMERALD" },
  { id: "electrical", name: "Ingeniería Electromecánica", color: "YELLOW" },
];
const records = [
  { id: "camila", name: "Camila Pérez", career: "systems", minutes: 90, recovery: false },
  { id: "julian", name: "Julián Ramírez", career: "chemical", minutes: 60, recovery: true },
  { id: "marina", name: "Marina López", career: "electrical", minutes: 0, recovery: false },
];

export function ProductPatternsPreview() {
  const [search, setSearch] = useState("");
  const [career, setCareer] = useState("");
  const [type, setType] = useState("");
  const [selectedCareers, setSelectedCareers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rows = records.filter((record) => record.name.toLowerCase().includes(search.toLowerCase()) && (!career || record.career === career) && (!type || record.recovery === (type === "recovery")) && (selectedCareers.length === 0 || selectedCareers.includes(record.career)));
  return (
    <section aria-labelledby="patterns-heading" className="space-y-6" id="product-patterns">
      <h2 id="patterns-heading" className="font-display text-xl font-semibold">Patrones de producto</h2>
      <PageHeader title="Horarios" description="Ciclo 2027 · Vista de ejemplo" secondaryActions={<Button variant="ghost">Ver historial</Button>} action={<Button onClick={() => setOpen(true)}>Agregar asignación</Button>} />
      <h2 className="sr-only">Asignaciones de ejemplo</h2>
      <CareerLegend careers={careers} selectedCareerIds={selectedCareers} onSelectedCareerIdsChange={setSelectedCareers}
        summary={`Mostrando ${records.filter((record) => selectedCareers.length === 0 || selectedCareers.includes(record.career)).length} de ${records.length} asignaciones`} />
      <FilterBar search={{ id: "pattern-search", label: "Buscar tutor", value: search, onChange: setSearch }}
        filters={[
          { id: "pattern-career", label: "Carrera", value: career, onChange: setCareer, options: [{ value: "", label: "Todas las carreras" }, ...careers.map(({ id, name }) => ({ value: id, label: name }))] },
          { id: "pattern-type", label: "Tipo", value: type, onChange: setType, options: [{ value: "", label: "Todos" }, { value: "guard", label: "Guardia" }, { value: "recovery", label: "Recuperación" }] },
        ]}
        resultCount={rows.length} hasActiveFilters={!!search || !!career || !!type} onClear={() => { setSearch(""); setCareer(""); setType(""); }} />
      <DataTable label="Asignaciones de ejemplo" rows={rows} getRowKey={(row) => row.id} stickyHeader
        identityColumn={{ id: "name", header: "Tutor", cell: (row) => row.name }}
        columns={[
          { id: "duration", header: "Duración", numeric: true, cell: (row) => formatDuration(row.minutes) },
          { id: "status", header: "Tipo", cell: (row) => row.recovery ? <StatusBadge variant="neutral" icon={RotateCcw}>Recuperación</StatusBadge> : <StatusBadge variant="info">Guardia</StatusBadge> },
        ]}
        rowActions={(row) => <Button variant="ghost" aria-label={`Editar asignación de ${row.name}`} onClick={() => setOpen(true)}>Editar</Button>}
        empty={<SystemState variant="empty" title="Sin resultados" description="Modificar la búsqueda o los filtros." action={<Button variant="ghost" onClick={() => { setSearch(""); setCareer(""); setType(""); setSelectedCareers([]); }}>Limpiar filtros</Button>} />} />
      <div className="grid gap-6 md:grid-cols-2">
        <FormField id="pattern-name" label="Nombre" description="Nombre completo del tutor."><Input defaultValue="Camila Pérez" /></FormField>
        <FormField id="pattern-email" label="Correo" error="El correo es obligatorio."><Input type="email" /></FormField>
      </div>
      <ConfirmationDialog open={open} onOpenChange={setOpen} title="Confirmar asignación" description="Revisar los datos antes de confirmar." summary={<div className="space-y-3"><p>Camila Pérez · {formatDuration(90)}</p>{pending && <Button variant="ghost" onClick={() => { setPending(false); setOpen(false); setNotice("Los cambios se guardaron correctamente."); }}>Finalizar ejemplo</Button>}</div>}
        pending={pending} onConfirm={() => setPending(true)} />
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <ConfirmationDialog open={deleteOpen} onOpenChange={setDeleteOpen} trigger={<Button variant="outline">Ejemplo de confirmación destructiva</Button>} title="Eliminar asignación" description="Esta acción elimina la asignación seleccionada." destructive onConfirm={() => { setDeleteOpen(false); setNotice("Ejemplo de eliminación confirmado."); }} />
      <div className="grid gap-6 md:grid-cols-2">
        <SystemState variant="empty" title="Sin registros" description="Los registros aparecerán aquí cuando estén disponibles." />
        <SystemState variant="error" title="No se pudo cargar el registro" description="Intentar nuevamente." action={<Button variant="outline">Reintentar</Button>} />
        <SystemState variant="required-action" title="Sin ciclo abierto" description="Abrir un ciclo para continuar." action={<Button variant="outline">Ir a Configuración</Button>} />
        <SystemState variant="degraded" title="Fuente no disponible" description="Los datos consolidados siguen disponibles." action={<Button variant="outline">Reintentar</Button>} />
        <SystemState variant="permission" title="Acceso restringido" description="La cuenta necesita otro nivel de acceso para continuar." />
      </div>
      <DataTable label="Registros en carga" rows={records} identityColumn={{ id: "name", header: "Tutor", cell: (row) => row.name }} columns={[]} getRowKey={(row) => row.id} loading />
      <RouteLoadingState />
      <RouteErrorState homeHref="/admin" retry={() => setNotice("Ejemplo de reintento solicitado.")} />
    </section>
  );
}
