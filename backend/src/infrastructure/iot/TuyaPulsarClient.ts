import WebSocket from 'ws';
import crypto from 'crypto';
import { HandleTuyaStatusReportUseCase } from '../../application/use-cases/HandleTuyaStatusReport';

export class TuyaPulsarConsumer {
  private ws: WebSocket | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    private accessId: string,
    private accessSecret: string,
    private env: string,
    private region: string,
    private handler: HandleTuyaStatusReportUseCase
  ) {}

  public start(): void {
    this.isRunning = true;
    this.connect();
  }

  public stop(): void {
    this.isRunning = false;
    this.clearPing();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        console.error('[TuyaPulsar] Error cerrando WebSocket:', e);
      }
    }
  }

  private connect(): void {
    const wsUrl = this.getTopicUrl();
    console.log(`[TuyaPulsar] Conectando a la cola de mensajes de Tuya (${this.region})...`);

    try {
      const password = this.generatePassword();

      this.ws = new WebSocket(wsUrl, {
        headers: {
          Connection: 'Upgrade',
          username: this.accessId,
          password: password
        },
        rejectUnauthorized: false
      });

      this.ws.on('open', () => {
        console.log('✅ [TuyaPulsar] Conectado exitosamente al stream de eventos de Tuya.');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (err) => {
        console.error('[TuyaPulsar] Error en el socket:', err.message);
      });

      this.ws.on('close', (code, reason) => {
        console.warn(`[TuyaPulsar] Socket cerrado (código: ${code}).`);
        this.clearPing();
        this.scheduleReconnect();
      });

    } catch (err: any) {
      console.error('[TuyaPulsar] Error al inicializar conexión:', err.message);
      this.scheduleReconnect();
    }
  }

  private generatePassword(): string {
    const md5Secret = crypto.createHash('md5').update(this.accessSecret).digest('hex');
    const mixStr = this.accessId + md5Secret;
    return crypto.createHash('md5').update(mixStr).digest('hex').substring(8, 24);
  }

  private getTopicUrl(): string {
    const urls: Record<string, string> = {
      cn: 'wss://mqe.tuyacn.com:8285/',
      us: 'wss://mqe.tuyaus.com:8285/',
      'us-e': 'wss://mqe.tuyaus.com:8285/',
      eu: 'wss://mqe.tuyaeu.com:8285/'
    };
    const base = urls[this.region] || urls['us'];
    return `${base}ws/v2/consumer/persistent/${this.accessId}/out/event/${this.accessId}-sub?ackTimeoutMillis=3000&subscriptionType=Failover`;
  }

  private startHeartbeat(): void {
    this.clearPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private clearPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning) return;
    this.reconnectAttempts++;
    const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
    console.log(`[TuyaPulsar] Reintentando en ${delay / 1000}s (Intento #${this.reconnectAttempts})...`);

    setTimeout(() => {
      if (this.isRunning) this.connect();
    }, delay);
  }

  private handleMessage(dataStr: string): void {
    try {
      const messageJson = JSON.parse(dataStr);

      if (messageJson.payload) {
        const payloadStr = Buffer.from(messageJson.payload, 'base64').toString('utf8');
        const dataMap = JSON.parse(payloadStr);

        const decryptedJson = this.decryptTuyaPayload(dataMap.data);
        const eventData = JSON.parse(decryptedJson);

        console.log('📬 [TuyaPulsar] Evento descifrado:', JSON.stringify(eventData));

        if (eventData.bizCode === 'statusReport' || eventData.status) {
          const deviceId = eventData.devId;
          const statusArray = eventData.status || [];

          const switchDp = statusArray.find((dp: any) => dp.code === 'switch_1' || dp.code === 'switch');
          if (switchDp !== undefined) {
            const switchValue = Boolean(switchDp.value);
            const timestamp = eventData.t || Date.now();
            console.log(`⚡ [TuyaPulsar] Dispositivo ${deviceId} -> switch = ${switchValue}`);
            this.handler.execute(deviceId, switchValue, timestamp);
          }
        }
      }

      // Enviar confirmación (ack) a Pulsar
      if (messageJson.messageId && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ messageId: messageJson.messageId }));
      }
    } catch (e: any) {
      console.error('[TuyaPulsar] Error procesando mensaje:', e.message);
    }
  }

  private decryptTuyaPayload(encryptedBase64: string): string {
    const key = this.accessSecret.substring(8, 24);
    const raw = Buffer.from(encryptedBase64, 'base64');

    // 1. Intento con AES-GCM (estándar moderno de Tuya: 12 bytes IV, Ciphertext, 16 bytes Tag)
    if (raw.length > 28) {
      try {
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(raw.length - 16);
        const ciphertext = raw.subarray(12, raw.length - 16);

        const decipher = crypto.createDecipheriv('aes-128-gcm', key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (gcmErr) {
        // Fallback a ECB si GCM falla
      }
    }

    // 2. Fallback a AES-128-ECB
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, '');
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(raw, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
