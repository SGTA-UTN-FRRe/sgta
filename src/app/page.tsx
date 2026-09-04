export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-6 py-16">
      <section className="w-full max-w-2xl rounded-xl border bg-background p-8 shadow-sm sm:p-12">
        <p className="text-sm font-medium text-primary">SGTA</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Sistema de Gestión de Tutorías
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Base de ingeniería lista para construir una gestión de tutorías
          confiable, trazable y mantenible.
        </p>
      </section>
    </main>
  );
}
