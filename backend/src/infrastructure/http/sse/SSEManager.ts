import { Response } from 'express';
import { SSEBroadcaster } from '../../../application/use-cases/HandleTuyaStatusReport';

export class SSEManager implements SSEBroadcaster {
  private clients: Set<Response> = new Set();

  public addClient(res: Response): void {
    this.clients.add(res);
    console.log(`[SSE] Cliente conectado. Total clientes: ${this.clients.size}`);

    // Enviar ping inicial para establecer canal
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);
  }

  public removeClient(res: Response): void {
    this.clients.delete(res);
    console.log(`[SSE] Cliente desconectado. Total clientes: ${this.clients.size}`);
  }

  public broadcast(event: any): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(data);
      } catch (err) {
        console.error('[SSE] Error enviando a cliente, eliminando...', err);
        this.clients.delete(client);
      }
    }
  }
}
