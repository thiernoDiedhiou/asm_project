// Registre global du socket.io — permet aux services d'émettre des événements
// sans avoir accès à l'objet `req.app`
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | null = null;

export function setIo(io: SocketIOServer): void {
  _io = io;
}

export function getIo(): SocketIOServer | null {
  return _io;
}
