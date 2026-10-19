import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Header, { getInitialTheme } from "../../src/components/Header";

describe("Header", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders application title, logo, and GitHub link, with EngineBadge commented out", () => {
    const { container } = render(
      <Header engine="cloud-fallback" label="Cloud Engine" details="Detail" />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Alt Text Generator" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("WCAG 2.2")).not.toBeInTheDocument();
    expect(screen.queryByText("Cloud Engine")).not.toBeInTheDocument();

    const githubLink = screen.getByRole("link", { name: /GitHub repository/i });
    expect(githubLink).toBeInTheDocument();
    expect(githubLink).toHaveAttribute(
      "href",
      "https://github.com/svinkle/alt-text-generator",
    );

    const logoSvg = container.querySelector("header svg");
    expect(logoSvg).toBeInTheDocument();
    expect(logoSvg.getAttribute("class")).not.toContain("shadow");
    const rect = logoSvg.querySelector("rect");
    expect(rect).toHaveAttribute("stroke", "#1E1B18");
    expect(rect).toHaveAttribute("stroke-width", "3");
  });

  it("handles beforeinstallprompt and install button click", async () => {
    const promptMock = vi.fn();
    const mockPromptEvent = new Event("beforeinstallprompt");
    mockPromptEvent.prompt = promptMock;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: "accepted" });

    render(<Header engine="on-device" />);

    // Trigger beforeinstallprompt event
    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const installBtn = screen.getByRole("button", {
      name: /Install Alt Text Generator/i,
    });
    expect(installBtn).toBeInTheDocument();
    expect(installBtn).not.toHaveAttribute("title");

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Install Alt Text Generator/i }),
    ).not.toBeInTheDocument();
  });

  it("handles appinstalled event", () => {
    const mockPromptEvent = new Event("beforeinstallprompt");
    mockPromptEvent.prompt = vi.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: "dismissed" });

    render(<Header engine="on-device" />);

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(
      screen.getByRole("button", { name: /Install Alt Text Generator/i }),
    ).toBeInTheDocument();

    // Trigger appinstalled event
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(
      screen.queryByRole("button", { name: /Install Alt Text Generator/i }),
    ).not.toBeInTheDocument();
  });

  it("handles user dismissing the install prompt without clearing deferredPrompt", async () => {
    const promptMock = vi.fn();
    const mockPromptEvent = new Event("beforeinstallprompt");
    mockPromptEvent.prompt = promptMock;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: "dismissed" });

    render(<Header engine="on-device" />);

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const installBtn = screen.getByRole("button", {
      name: /Install Alt Text Generator/i,
    });
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalled();
    // Since outcome was dismissed, the install button remains available
    expect(
      screen.getByRole("button", { name: /Install Alt Text Generator/i }),
    ).toBeInTheDocument();
  });

  it("initializes with hasApiKey true when key is present in localStorage", () => {
    localStorage.setItem("gemini_api_key", "AIzaKeyStored");
    render(<Header engine="cloud-fallback" />);
    // Verify component mounts cleanly with stored key
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("opens and interacts with ApiKeyModal via onOpenApiKeyModal", async () => {
    let openModalFn;
    render(
      <Header
        engine="cloud-fallback"
        onOpenApiKeyModal={(open) => {
          openModalFn = open;
        }}
      />,
    );

    expect(openModalFn).toBeDefined();

    // Open modal
    act(() => {
      openModalFn();
    });

    expect(
      screen.getByRole("dialog", { name: /Gemini API Key/i }),
    ).toBeInTheDocument();

    // Enter key and save
    const input = screen.getByLabelText(/Google AI Studio Key/i);
    fireEvent.change(input, { target: { value: "AIzaCustomKey123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Key" }));

    expect(screen.getByText("Saved!")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("handles skip to main content link click by focusing main element", () => {
    const mainEl = document.createElement("main");
    mainEl.id = "main";
    document.body.appendChild(mainEl);
    const focusSpy = vi.spyOn(mainEl, "focus");

    render(<Header engine="cloud-fallback" />);
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main");

    // Click when main does not have tabindex yet
    fireEvent.click(skipLink);

    expect(mainEl.getAttribute("tabindex")).toBe("-1");
    expect(focusSpy).toHaveBeenCalled();

    // Click again when main already has tabindex
    fireEvent.click(skipLink);
    expect(mainEl.getAttribute("tabindex")).toBe("-1");

    document.body.removeChild(mainEl);
  });

  it("handles skip link click gracefully when main element is not in DOM", () => {
    render(<Header engine="cloud-fallback" />);
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    // Should not throw even when main landmark is missing
    fireEvent.click(skipLink);
  });

  describe("Dark Mode & Theme Switching", () => {
    let listeners = [];
    let matchMediaMatches = false;

    beforeEach(() => {
      listeners = [];
      matchMediaMatches = false;
      document.documentElement.classList.remove("dark");
      localStorage.clear();

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: matchMediaMatches,
        media: query,
        onchange: null,
        addListener: vi.fn((fn) => listeners.push(fn)),
        removeListener: vi.fn((fn) => {
          listeners = listeners.filter((l) => l !== fn);
        }),
        addEventListener: vi.fn((event, fn) => listeners.push(fn)),
        removeEventListener: vi.fn((event, fn) => {
          listeners = listeners.filter((l) => l !== fn);
        }),
        dispatchEvent: vi.fn(),
      }));
    });

    it("defaults to light theme when no saved preference and OS prefers light", () => {
      matchMediaMatches = false;
      render(<Header engine="cloud-fallback" />);

      const toggleBtn = screen.getByRole("button", { name: "Switch to dark mode" });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("defaults to dark theme when no saved preference and OS prefers dark", () => {
      matchMediaMatches = true;
      render(<Header engine="cloud-fallback" />);

      const toggleBtn = screen.getByRole("button", { name: "Switch to light mode" });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("uses saved preference from localStorage over OS preference", () => {
      localStorage.setItem("theme", "dark");
      matchMediaMatches = false; // OS is light, but localStorage is dark

      render(<Header engine="cloud-fallback" />);
      const toggleBtn = screen.getByRole("button", { name: "Switch to light mode" });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("toggles theme on click, updates documentElement, localStorage, and meta theme-color", () => {
      matchMediaMatches = false;

      // Create a meta theme-color tag to verify update
      const metaTag = document.createElement("meta");
      metaTag.name = "theme-color";
      metaTag.content = "#7C3AED";
      document.head.appendChild(metaTag);

      render(<Header engine="cloud-fallback" />);

      const toggleBtn = screen.getByRole("button", { name: "Switch to dark mode" });
      expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
      expect(metaTag.getAttribute("content")).toBe("#7C3AED");

      // Switch to dark
      fireEvent.click(toggleBtn);

      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(metaTag.getAttribute("content")).toBe("#101010");

      // Switch back to light
      fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

      expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(localStorage.getItem("theme")).toBe("light");
      expect(metaTag.getAttribute("content")).toBe("#7C3AED");

      document.head.removeChild(metaTag);
    });

    it("responds dynamically to OS preference changes when no explicit preference is stored", () => {
      matchMediaMatches = false;
      render(<Header engine="cloud-fallback" />);

      expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();

      // Simulate OS switching to dark
      act(() => {
        listeners.forEach((listener) => listener({ matches: true }));
      });

      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Simulate OS switching to light
      act(() => {
        listeners.forEach((listener) => listener({ matches: false }));
      });

      expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("ignores OS preference changes when an explicit user preference is saved in localStorage", () => {
      localStorage.setItem("theme", "light");
      matchMediaMatches = false;
      render(<Header engine="cloud-fallback" />);

      expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();

      // Simulate OS switching to dark
      act(() => {
        listeners.forEach((listener) => listener({ matches: true }));
      });

      // Still in light mode because user explicitly saved 'light'
      expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("falls back to mediaQuery.addListener and mediaQuery.removeListener when addEventListener is not supported", () => {
      const addListenerSpy = vi.fn((fn) => listeners.push(fn));
      const removeListenerSpy = vi.fn((fn) => {
        listeners = listeners.filter((l) => l !== fn);
      });

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addListener: addListenerSpy,
        removeListener: removeListenerSpy,
        // No addEventListener or removeEventListener
      }));

      const { unmount } = render(<Header engine="cloud-fallback" />);
      expect(addListenerSpy).toHaveBeenCalled();

      unmount();
      expect(removeListenerSpy).toHaveBeenCalled();
    });

    it("getInitialTheme returns light when matchMedia is not supported", () => {
      const originalMatchMedia = window.matchMedia;
      delete window.matchMedia;
      expect(getInitialTheme()).toBe("light");
      window.matchMedia = originalMatchMedia;
    });
  });
});


