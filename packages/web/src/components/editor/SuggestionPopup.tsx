import { createRoot, type Root } from "react-dom/client";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

export interface SuggestionPopupState<I, TSelected = I> {
  active: boolean;
  items: I[];
  command: (item: TSelected) => void;
  clientRect: (() => DOMRect | null) | null;
}

export class SuggestionPopupManager<I, TSelected = I> {
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;
  private renderFn: (props: SuggestionPopupState<I, TSelected>) => React.ReactNode;
  private currentState: SuggestionPopupState<I, TSelected> = {
    active: false,
    items: [],
    command: () => {},
    clientRect: null,
  };

  constructor(renderFn: (props: SuggestionPopupState<I, TSelected>) => React.ReactNode) {
    this.renderFn = renderFn;
  }

  private update() {
    if (this.root && this.container) {
      this.root.render(this.renderFn(this.currentState));
    }
  }

  getState() {
    return this.currentState;
  }

  getRenderer() {
    const self = this;
    return () => ({
      onStart(props: SuggestionProps<I, TSelected>) {
        self.container = document.createElement("div");
        self.container.style.position = "absolute";
        self.container.style.zIndex = "50";
        self.container.style.pointerEvents = "auto";
        document.body.appendChild(self.container);
        self.root = createRoot(self.container);
        self.currentState = {
          active: true,
          items: props.items,
          command: props.command,
          clientRect: props.clientRect ?? null,
        };
        self.update();
        self.position();
      },
      onUpdate(props: SuggestionProps<I, TSelected>) {
        self.currentState = {
          active: true,
          items: props.items,
          command: props.command,
          clientRect: props.clientRect ?? null,
        };
        self.update();
        self.position();
      },
      onExit() {
        self.currentState = { active: false, items: [], command: () => {}, clientRect: null };
        self.update();
        setTimeout(() => {
          self.root?.unmount();
          self.root = null;
          self.container?.remove();
          self.container = null;
        }, 50);
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        const container = self.container;
        if (!container) return false;
        const listEl = container.querySelector("[data-suggestion-list]") as HTMLElement | null;
        if (!listEl) return false;
        const event = new KeyboardEvent(props.event.type, {
          key: props.event.key,
          code: props.event.code,
          shiftKey: props.event.shiftKey,
          ctrlKey: props.event.ctrlKey,
          metaKey: props.event.metaKey,
          altKey: props.event.altKey,
          bubbles: true,
        });
        listEl.dispatchEvent(event);
        return props.event.key === "ArrowDown" || props.event.key === "ArrowUp" || props.event.key === "Enter";
      },
    });
  }

  private position() {
    if (!this.container || !this.currentState.clientRect) return;
    const rect = this.currentState.clientRect();
    if (!rect) return;
    const popupWidth = 220;
    const popupHeight = 280;
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }
    if (top + popupHeight > window.innerHeight - 8) {
      top = rect.top - popupHeight - 8;
    }
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }
}
