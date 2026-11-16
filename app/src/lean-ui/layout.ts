import type { Drawn, Output, Part } from "../browser/ui-library/schema";
export type { Drawn, Output, Part };
export type KeyboardKey =
  | "left"
  | "right"
  | "up"
  | "down"
  | "home"
  | "end"
  | "ctrlHome"
  | "ctrlEnd"
  | "enter"
  | "space"
  | "tab"
  | "shiftTab"
  | "escape";
export interface KeyboardState {
  focus: number;
  selected: number;
  isOpen: boolean;
  invoker: string;
}
export type KeyboardTransition = (
  profile: string,
  rows: number,
  cols: number,
  state: KeyboardState,
  key: KeyboardKey,
) => KeyboardState;
export const keyboardKey = (event: KeyboardEvent): KeyboardKey | undefined => {
  switch (event.key) {
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "Home":
      return event.ctrlKey ? "ctrlHome" : "home";
    case "End":
      return event.ctrlKey ? "ctrlEnd" : "end";
    case "Enter":
      return "enter";
    case " ":
      return "space";
    case "Tab":
      return event.shiftKey ? "shiftTab" : "tab";
    case "Escape":
      return "escape";
  }
  return undefined;
};
