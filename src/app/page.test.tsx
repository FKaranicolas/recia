import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("describes the active M2 without claiming unfinished capabilities", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /menos carga manual/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("M2 EN CURSO")).toBeInTheDocument();
    expect(
      screen.getByText(/esta pantalla no procesa documentos/i),
    ).toBeInTheDocument();
  });

  it("shows the current implementation sequence", () => {
    render(<Home />);

    expect(screen.getByText("Prototipo documentado")).toBeInTheDocument();
    expect(screen.getByText("Base productiva")).toBeInTheDocument();
    expect(screen.getByText("Identidad y organizaciones")).toBeInTheDocument();
  });
});
