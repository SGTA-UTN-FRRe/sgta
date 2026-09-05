import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-canvas px-6 py-12 text-foreground">
      <div className="w-full max-w-4xl space-y-8">
        <section className="rounded-md border border-border bg-surface p-8 shadow-sm sm:p-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <p className="text-sm font-semibold tracking-wide text-primary">
              ÁREA DE TUTORÍAS · UTN FRRe
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Sistema de Gestión de Tutorías
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-foreground-secondary">
            Espacio de trabajo institucional para la gestión unificada de tutores,
            horarios, cómputo de saldos y consultas académicas.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="success">Asistencia al día</Badge>
            <Badge variant="warning">Saldo deudor</Badge>
            <Badge variant="danger">Falta registrada</Badge>
            <Badge variant="info">Consulta activa</Badge>
            <Badge variant="faro">Faro institucional</Badge>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Controles accesibles</CardTitle>
              <CardDescription>
                Botones con jerarquía de radios (radius-sm) y anillo de foco.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Acción principal</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="outline">Contorno</Button>
                <Button variant="destructive">Peligro</Button>
              </div>
              <div className="space-y-2">
                <label htmlFor="tutor-search" className="text-sm font-medium text-foreground">
                  Buscar tutor
                </label>
                <Input id="tutor-search" placeholder="Búsqueda con foco accesible..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Figuras tabulares</CardTitle>
              <CardDescription>
                Alineación vertical estricta para cómputo de horas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Husak, Guillermo</TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      +12:00 hs
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Tutor Regular</TableCell>
                    <TableCell className="text-right font-semibold text-warning">
                      -02:30 hs
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
