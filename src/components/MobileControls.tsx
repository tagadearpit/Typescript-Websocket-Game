import { useCallback, useEffect, useRef } from "react";
import type { ControlsKey } from "../global/types/gameTypes";

interface MobileControlsProps {
  onControl: (key: ControlsKey, value: boolean) => void;
}

const JUMP_HOLD_MS = 140;

const MobileControls: React.FC<MobileControlsProps> = ({ onControl }) => {
  const activeKeysRef = useRef<Set<ControlsKey>>(new Set());
  const releaseTimersRef = useRef<
    Map<ControlsKey, ReturnType<typeof setTimeout>>
  >(new Map());

  const release = useCallback(
    (key?: ControlsKey) => {
      const keys = key ? [key] : Array.from(activeKeysRef.current);
      for (const activeKey of keys) {
        if (!activeKeysRef.current.has(activeKey)) continue;
        activeKeysRef.current.delete(activeKey);

        const existingTimer = releaseTimersRef.current.get(activeKey);
        if (existingTimer) clearTimeout(existingTimer);

        if (activeKey === "jump") {
          const timer = setTimeout(() => {
            onControl(activeKey, false);
            releaseTimersRef.current.delete(activeKey);
          }, JUMP_HOLD_MS);
          releaseTimersRef.current.set(activeKey, timer);
        } else {
          onControl(activeKey, false);
        }
      }
    },
    [onControl]
  );

  useEffect(() => {
    const releaseTimers = releaseTimersRef.current;
    const releaseAll = () => release();
    const handleVisibilityChange = () => {
      if (document.hidden) releaseAll();
    };

    window.addEventListener("pointerup", releaseAll, { passive: true });
    window.addEventListener("pointercancel", releaseAll, { passive: true });
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerup", releaseAll);
      window.removeEventListener("pointercancel", releaseAll);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseTimers.forEach((timer) => clearTimeout(timer));
      releaseTimers.clear();
      releaseAll();
    };
  }, [release]);

  const press = useCallback(
    (key: ControlsKey, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const existingTimer = releaseTimersRef.current.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      releaseTimersRef.current.delete(key);
      activeKeysRef.current.add(key);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      onControl(key, true);
    },
    [onControl]
  );

  const button = (key: ControlsKey, label: string, className = "") => (
    <button
      className={`touch-control ${className}`}
      type="button"
      onPointerDown={(event) => press(key, event)}
      onPointerUp={() => release(key)}
      onPointerCancel={() => release(key)}
      onLostPointerCapture={() => release(key)}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <div className="touch-cluster touch-movement">
        {button("left", "←", "touch-direction")}
        {button("down", "↓", "touch-direction")}
        {button("right", "→", "touch-direction")}
      </div>
      <div className="touch-cluster touch-actions">
        {button("jump", "JUMP", "touch-primary")}
        {button("sprint", "DASH")}
        {button("respawn", "RESET")}
      </div>
    </div>
  );
};

export default MobileControls;
