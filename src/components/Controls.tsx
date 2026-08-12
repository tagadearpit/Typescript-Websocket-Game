const Controls: React.FC = () => {
  return (
    <div className="controls-card" aria-label="Keyboard controls">
      <span className="eyebrow">CONTROL DECK</span>
      <div className="control-row">
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd>
        <span>MOVE</span>
      </div>
      <div className="control-row">
        <kbd>SPACE</kbd>
        <span>JUMP</span>
        <kbd>SHIFT</kbd>
        <span>DASH</span>
        <kbd>R</kbd>
        <span>RESET</span>
      </div>
    </div>
  );
};

export default Controls;
