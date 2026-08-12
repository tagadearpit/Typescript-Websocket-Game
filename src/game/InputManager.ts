import type { ControlsInterface, ControlsKey } from "../global/types/gameTypes";

const keyBindings: Record<string, ControlsKey> = {
  w: "up",
  arrowup: "up",
  s: "down",
  arrowdown: "down",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
  " ": "jump",
  space: "jump",
  r: "respawn",
  shift: "sprint",
};

export interface InputTarget {
  setControl: (key: ControlsKey, value: boolean) => void;
}

export class InputManager {
  private readonly target: InputTarget;
  private readonly pressed = new Set<ControlsKey>();
  private readonly handleKeyDownBound = (event: KeyboardEvent) =>
    this.handleKey(event, true);
  private readonly handleKeyUpBound = (event: KeyboardEvent) =>
    this.handleKey(event, false);
  private readonly handleBlurBound = () => this.clear();

  public constructor(target: InputTarget) {
    this.target = target;
  }

  public mount() {
    window.addEventListener("keydown", this.handleKeyDownBound, {
      passive: false,
    });
    window.addEventListener("keyup", this.handleKeyUpBound, { passive: false });
    window.addEventListener("blur", this.handleBlurBound);
  }

  public unmount() {
    window.removeEventListener("keydown", this.handleKeyDownBound);
    window.removeEventListener("keyup", this.handleKeyUpBound);
    window.removeEventListener("blur", this.handleBlurBound);
    this.clear();
  }

  public setTouchControl(key: ControlsKey, value: boolean) {
    this.set(key, value);
  }

  public clear() {
    for (const key of this.pressed) this.target.setControl(key, false);
    this.pressed.clear();
  }

  private handleKey(event: KeyboardEvent, value: boolean) {
    const key = keyBindings[event.key.toLowerCase()];
    if (!key) return;
    event.preventDefault();
    this.set(key, value);
  }

  private set(key: ControlsKey, value: boolean) {
    if (value) this.pressed.add(key);
    else this.pressed.delete(key);
    this.target.setControl(key, value);
  }
}

export type InputState = ControlsInterface;
