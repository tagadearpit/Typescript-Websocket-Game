export const randomMap = () => {
  const size = Math.floor(Math.random() * 10) + 20;
  const blockWeight = Math.floor(Math.random() * 7) + 3;
  const spaceWeight = Math.floor(Math.random() * 25) + 30;
  let blocksInARow = 0;
  let spacesInARow = 0;
  const map: number[][] = [];

  for (let row = 0; row < size; row += 1) {
    const line: number[] = [];
    for (let column = 0; column < size; column += 1) {
      let tile = 0;
      const protectedSpawn = row === 4 && column === 3;
      const spawnColumn =
        row === 3 || column === 4 || (row === 4 && column === 3);

      if (protectedSpawn) {
        tile = 1;
      } else if (!spawnColumn) {
        if (blocksInARow > 0) {
          tile = Math.floor(Math.random() * blockWeight) > blocksInARow ? 1 : 0;
        } else if (spacesInARow > 0) {
          tile = Math.floor(Math.random() * spaceWeight) > spacesInARow ? 0 : 1;
        } else {
          tile = Math.floor(Math.random() * 2);
        }
      }

      line.push(tile);
      if (tile === 1) {
        blocksInARow += 1;
        spacesInARow = 0;
      } else {
        spacesInARow += 1;
        blocksInARow = 0;
      }
    }
    map.push(line);
  }

  // Keep a safe floor beneath the spawn so new players never fall before input arrives.
  map[5][3] = 1;
  map[5][4] = 1;
  map[6][3] = 1;
  map[6][4] = 1;
  return map;
};
