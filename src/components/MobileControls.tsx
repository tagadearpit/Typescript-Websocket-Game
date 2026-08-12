import type { ControlsKey } from "../global/types/gameTypes";

interface MobileControlsProps {
  onControl: (key: ControlsKey, value: boolean) => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({ onControl }) => {
  const button = (key: ControlsKey, label: string, className = "") => (
    <button
      className={`touch-control ${className}`}
      type="button"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onControl(key, true);
      }}
      onPointerUp={() => onControl(key, false)}
      onPointerCancel={() => onControl(key, false)}
      onPointerLeave={() => onControl(key, false)}
    >
      {label}
    </button>
  );

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <div className="touch-cluster touch-movement">
        {button("left", "←")}
        {button("down", "↓")}
        {button("right", "→")}
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
