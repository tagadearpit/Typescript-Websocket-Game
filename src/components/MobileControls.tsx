import { MutableRefObject } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowDownIcon } from "@heroicons/react/24/solid";
import { KeyMap } from "../global/types/gameEnums";
import { ControlsInterface } from "../global/types/gameTypes";

interface MobileControlsProps {
  controlsRef: MutableRefObject<ControlsInterface>;
}

const MobileControls: React.FC<MobileControlsProps> = ({ controlsRef }) => {
  const setControl = (key: KeyMap, active: boolean) => {
    switch (key) {
      case KeyMap.Down:
        controlsRef.current.down = active;
        break;
      case KeyMap.Left:
        controlsRef.current.left = active;
        break;
      case KeyMap.Right:
        controlsRef.current.right = active;
        break;
      case KeyMap.Jump:
        controlsRef.current.jump = active;
        break;
      case KeyMap.Respawn:
        controlsRef.current.respawn = active;
        break;
      case KeyMap.Sprint:
        controlsRef.current.sprint = active;
        break;
    }
  };

  const bind = (key: KeyMap) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setControl(key, true);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setControl(key, false);
    },
    onPointerCancel: () => setControl(key, false),
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  });

  return (
    <div
      id="mobilecontrols"
      className="fixed bottom-0 left-0 z-20 grid w-full grid-cols-12 grid-rows-2 rounded-md bg-zinc-800/70 md:hidden"
      style={{ touchAction: "none" }}
    >
      <button {...bind(KeyMap.Left)} className="col-span-3 row-start-1 flex items-center justify-center p-4">
        <ArrowLeftIcon className="h-8 w-8 text-blue-500" />
      </button>
      <button {...bind(KeyMap.Jump)} className="col-span-6 row-start-1 flex items-center justify-center p-4">
        <span className="text-lg font-bold text-blue-500">Jump</span>
      </button>
      <button {...bind(KeyMap.Right)} className="col-span-3 row-start-1 flex items-center justify-center p-4">
        <ArrowRightIcon className="h-8 w-8 text-blue-500" />
      </button>
      <button {...bind(KeyMap.Sprint)} className="col-span-5 row-start-2 flex items-center justify-center p-4">
        <span className="text-lg font-bold text-blue-500">Sprint</span>
      </button>
      <button {...bind(KeyMap.Down)} className="col-span-2 row-start-2 flex items-center justify-center p-4">
        <ArrowDownIcon className="h-8 w-8 text-blue-500" />
      </button>
      <button {...bind(KeyMap.Respawn)} className="col-span-5 row-start-2 flex items-center justify-center p-4">
        <span className="text-lg font-bold text-blue-500">Respawn</span>
      </button>
    </div>
  );
};

export default MobileControls;
