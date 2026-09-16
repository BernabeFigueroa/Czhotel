import TelegramBot from 'node-telegram-bot-api';
import { INotificationService, ShiftAlertPayload } from '../../application/ports/INotificationService';

export class TelegramBotService implements INotificationService {
  private bot: TelegramBot;

  constructor(token: string, private adminChatId: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.registerCommands();
  }

  private registerCommands(): void {
    this.bot.onText(/\/start/, (msg) => {
      this.bot.sendMessage(
        msg.chat.id,
        "👋 *Sistema de Auditoría de Habitaciones Conectado*.\nRecibirás alertas en tiempo real de los 18 relés de las habitaciones.",
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.onText(/\/id/, (msg) => {
      this.bot.sendMessage(msg.chat.id, `Tu Chat ID es: \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
    });
  }

  async sendShiftAlert(payload: ShiftAlertPayload): Promise<void> {
    const hora = payload.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    let mensaje = '';
    if (payload.action === 'INICIO') {
      mensaje = `🔴 *${payload.roomName.toUpperCase()}*\n\n` +
                `*ESTADO:* OCUPADA\n` +
                `*HORA:* ${hora} hs\n` +
                `_⚡ Llave subida en administración._`;
    } else {
      const horas = Math.floor((payload.durationMinutes || 0) / 60);
      const mins = (payload.durationMinutes || 0) % 60;
      const duracionTexto = horas > 0 ? `${horas}h ${mins}m` : `${mins} minutos`;

      mensaje = `🟢 *${payload.roomName.toUpperCase()}*\n\n` +
                `*ESTADO:* LIBRE\n` +
                `*HORA:* ${hora} hs\n` +
                `*DURACIÓN:* ${duracionTexto}\n` +
                `_⚡ Llave bajada en administración._`;
    }

    try {
      await this.bot.sendMessage(this.adminChatId, mensaje, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Telegram] Error enviando alerta a chat:', err);
    }
  }

  async sendDailySummary(reportText: string): Promise<void> {
    const mensaje = `📋 *RESUMEN DIARIO - CIERRE DE JORNADA*\n` +
                    `====================================\n\n` +
                    reportText +
                    `\n====================================\n` +
                    `_Auditoría automática de 18 habitaciones._`;
    try {
      await this.bot.sendMessage(this.adminChatId, mensaje, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Telegram] Error enviando resumen diario:', err);
    }
  }
}
