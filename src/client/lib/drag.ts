export const PLAYER_MIME = 'application/x-picklegrounds-player';
export const GROUP_MIME = 'application/x-picklegrounds-group';

export function readDraggedPlayerId(
  e: React.DragEvent,
  fallbackId?: string | null,
): string | null {
  return (
    e.dataTransfer.getData(PLAYER_MIME) ||
    e.dataTransfer.getData('text/plain') ||
    fallbackId ||
    null
  );
}

export function setPlayerDragData(e: React.DragEvent, playerId: string) {
  e.dataTransfer.setData('text/plain', playerId);
  e.dataTransfer.setData(PLAYER_MIME, playerId);
  e.dataTransfer.effectAllowed = 'move';
}

export function isPlayerDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(PLAYER_MIME) || e.dataTransfer.types.includes('text/plain');
}
