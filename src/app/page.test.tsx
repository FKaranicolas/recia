import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("describes M3 as in progress without claiming it is deployed", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /menos carga manual/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("M3 EN CURSO")).toBeInTheDocument();
    expect(
      screen.getByText(/esta pantalla no procesa documentos/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/todavia\s+no esta desplegada/i)).toBeInTheDocument();
  });

  it("shows the current implementation sequence", () => {
    render(<Home />);

    expect(screen.getByText("Prototipo documentado")).toBeInTheDocument();
    expect(screen.getByText("Base productiva")).toBeInTheDocument();
    expect(screen.getByText("Identidad y organizaciones")).toBeInTheDocument();
    expect(screen.getByText("Ingesta segura")).toBeInTheDocument();
    expect(screen.getByText("Extraccion OCR")).toBeInTheDocument();
  });

  it("does not present the ingest milestone as finished", () => {
    render(<Home />);

    const milestones = screen.getAllByRole("listitem");
    const identity = milestones.find((item) =>
      item.textContent?.includes("Identidad y organizaciones"),
    );
    const ingest = milestones.find((item) => item.textContent?.includes("Ingesta segura"));
    const ocr = milestones.find((item) => item.textContent?.includes("Extraccion OCR"));

    expect(identity).toHaveAttribute("data-state", "Completado");
    expect(ingest).toHaveAttribute("data-state", "En curso");
    expect(ocr).toHaveAttribute("data-state", "Pendiente");
  });
});
