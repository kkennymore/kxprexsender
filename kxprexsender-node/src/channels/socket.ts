import { KxUnifiedPayload } from '../types';

export class SocketChannel {
  private io: any;

  constructor(io: any) {
    this.io = io;
  }

  send(room: string, payload: KxUnifiedPayload): void {
    this.io.to(room).emit('kxprex:notification', payload);
  }
}
