import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatWindow from "../components/ChatWindow";

vi.stubGlobal("fetch", vi.fn());

describe("ChatWindow", () => {
  it("renders the input field", () => {
    render(<ChatWindow />);
    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
  });
});
