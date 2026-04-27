import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CommandPalette } from "./CommandPalette";
import type { Command } from "../../commands/types";

const mockCommands: Command[] = [
  { id: "a", label: "Alpha", category: "Test", execute: vi.fn() },
  { id: "b", label: "Beta", category: "Test", execute: vi.fn() },
  { id: "c", label: "Gamma", category: "Other", execute: vi.fn() },
];

describe("CommandPalette", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    for (const command of mockCommands) {
      vi.mocked(command.execute).mockClear();
    }
  });

  it("does not render when closed", () => {
    render(<CommandPalette open={false} onClose={vi.fn()} commands={mockCommands} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(<CommandPalette open onClose={vi.fn()} commands={mockCommands} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("filters commands by query", () => {
    render(<CommandPalette open onClose={vi.fn()} commands={mockCommands} />);
    const input = screen.getByPlaceholderText("Search commands or notes...");
    fireEvent.change(input, { target: { value: "alp" } });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("executes command on click", async () => {
    render(<CommandPalette open onClose={vi.fn()} commands={mockCommands} />);
    fireEvent.click(screen.getByText("Alpha"));
    await waitFor(() => expect(mockCommands[0].execute).toHaveBeenCalled());
  });

  it("navigates with arrow keys and executes with enter", () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={mockCommands} />);
    const input = screen.getByPlaceholderText("Search commands or notes...");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockCommands[1].execute).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={mockCommands} />);
    const input = screen.getByPlaceholderText("Search commands or notes...");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows no results when query matches nothing", () => {
    render(<CommandPalette open onClose={vi.fn()} commands={mockCommands} />);
    const input = screen.getByPlaceholderText("Search commands or notes...");
    fireEvent.change(input, { target: { value: "xyz" } });
    expect(screen.getByText("No commands found")).toBeInTheDocument();
  });
});
