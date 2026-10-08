import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Label } from "./label";
import { NativeSelect, NativeSelectOption } from "./native-select";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Textarea } from "./textarea";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

describe("primitive keyboard and accessibility contracts", () => {
  it("composes Button as a link without a nested button", () => {
    render(
      <Button asChild>
        <a href="/admin">Inicio</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("enters and contains Dialog focus, closes on Escape, and returns to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Editar tutor</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Editar tutor</DialogTitle>
          <DialogDescription>Actualizar el registro.</DialogDescription>
          <Textarea aria-label="Notas" />
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Editar tutor" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Editar tutor" });
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Notas" })).toHaveFocus(),
    );
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("runs AlertDialog's explicit action only after confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Eliminar registro</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción elimina el registro.
          </AlertDialogDescription>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirm}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const trigger = screen.getByRole("button", { name: "Eliminar registro" });
    await user.click(trigger);
    await screen.findByRole("alertdialog", { name: "Confirmar eliminación" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(confirm).not.toHaveBeenCalled();
    await user.click(trigger);
    await user.click(
        await screen.findByRole("button", { name: "Confirmar" }),
    );
    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("closes Sheet with Escape and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Ver detalle</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Detalle del tutor</SheetTitle>
          <SheetDescription>Información del registro.</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    const trigger = screen.getByRole("button", { name: "Ver detalle" });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Detalle del tutor" });
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("toggles a labelled Checkbox with Space", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Checkbox id="active" />
        <Label htmlFor="active">Activo</Label>
      </>,
    );
    await user.tab();
    const checkbox = screen.getByRole("checkbox", { name: "Activo" });
    expect(checkbox).toHaveFocus();
    await user.keyboard(" ");
    expect(checkbox).toBeChecked();
    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
  });

  it("changes RadioGroup selection with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue="regular" aria-label="Tipo de horario">
        <RadioGroupItem id="regular" value="regular" />
        <Label htmlFor="regular">Regular</Label>
        <RadioGroupItem id="special" value="special" />
        <Label htmlFor="special">Especial</Label>
      </RadioGroup>,
    );
    await user.tab();
    expect(screen.getByRole("radio", { name: "Regular" })).toHaveFocus();
    // Radix moves focus asynchronously and selects while the arrow is held.
    await user.keyboard("{ArrowDown>}");
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Especial" })).toBeChecked(),
    );
    expect(screen.getByRole("radio", { name: "Especial" })).toHaveFocus();
    await user.keyboard("{/ArrowDown}");
  });

  it("navigates and selects a single ToggleGroup with arrows and Space", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup type="single" defaultValue="monday" aria-label="Día">
        <ToggleGroupItem value="monday">Lunes</ToggleGroupItem>
        <ToggleGroupItem value="tuesday">Martes</ToggleGroupItem>
      </ToggleGroup>,
    );
    await user.tab();
    const monday = screen.getByRole("radio", { name: "Lunes" });
    const tuesday = screen.getByRole("radio", { name: "Martes" });
    expect(monday).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(tuesday).toHaveFocus());
    await user.keyboard(" ");
    expect(tuesday).toHaveAttribute("aria-checked", "true");
    expect(monday).toHaveAttribute("aria-checked", "false");
  });

  it("exposes independent pressed states in a multiple ToggleGroup", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup type="multiple" aria-label="Carreras">
        <ToggleGroupItem value="systems">Sistemas</ToggleGroupItem>
        <ToggleGroupItem value="civil">Civil</ToggleGroupItem>
      </ToggleGroup>,
    );
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Sistemas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Civil" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("associates NativeSelect and Textarea with their visible labels", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="career">Carrera</Label>
        <NativeSelect id="career">
          <NativeSelectOption value="systems">Sistemas</NativeSelectOption>
          <NativeSelectOption value="civil">Civil</NativeSelectOption>
        </NativeSelect>
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" />
      </>,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Carrera" }),
      "civil",
    );
    expect(screen.getByLabelText("Carrera")).toHaveValue("civil");
    await user.click(screen.getByLabelText("Notas"));
    await user.paste("Información del tutor.");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveValue(
      "Información del tutor.",
    );
  });

  it("shows Tooltip on keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Horario</Button>
          </TooltipTrigger>
          {/* jsdom has zero-sized geometry; collision positioning belongs to
              browser review, while this test observes focus and disclosure. */}
          <TooltipContent avoidCollisions={false}>Consultar horario</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Consultar horario",
    );
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });

  it("navigates DropdownMenu with keyboard and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Cuenta</Button>
        </DropdownMenuTrigger>
        {/* Keep geometry out of this keyboard and focus boundary. */}
        <DropdownMenuContent avoidCollisions={false}>
          <DropdownMenuItem>Perfil</DropdownMenuItem>
          <DropdownMenuItem>Salir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Salir" })).toHaveFocus(),
    );
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Cuenta" })).toHaveFocus();
  });

  it("selects Tabs with arrows and exposes the associated panel", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="summary">
        <TabsList aria-label="Información">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="hours">Horas</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">Resumen del tutor</TabsContent>
        <TabsContent value="hours">Saldo del tutor</TabsContent>
      </Tabs>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Horas" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(screen.getByRole("tabpanel", { name: "Horas" })).toHaveTextContent(
      "Saldo del tutor",
    );
  });
});
