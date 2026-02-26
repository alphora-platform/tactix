import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AlertPayload, DiscordEmbedField } from './interfaces/alert.interfaces';
import { ALERT_COLORS } from './constants/alerts.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly discordWebhookUrl: string | undefined;
  private readonly telegramBotToken: string | undefined;
  private readonly telegramChatId: string | undefined;

  constructor(config: ConfigService) {
    this.discordWebhookUrl = config.get<string>('DISCORD_WEBHOOK_URL');
    this.telegramBotToken = config.get<string>('TELEGRAM_BOT_TOKEN');
    this.telegramChatId = config.get<string>('TELEGRAM_CHAT_ID');
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Dispatches the alert to all configured channels (Discord and/or Telegram).
   * Failures in one channel do NOT prevent delivery to the other.
   */
  async send(payload: AlertPayload): Promise<void> {
    const results = await Promise.allSettled([
      this.discordWebhookUrl ? this.sendDiscord(payload) : Promise.resolve(),
      this.telegramBotToken && this.telegramChatId ? this.sendTelegram(payload) : Promise.resolve(),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(`[Notification] Channel delivery failed: ${String(result.reason)}`);
      }
    }
  }

  /**
   * Sends a rich embed to Discord via incoming webhook.
   *
   * Format:
   * ```json
   * { "embeds": [{ "title", "description", "color", "fields", "timestamp" }] }
   * ```
   */
  async sendDiscord(payload: AlertPayload): Promise<void> {
    if (!this.discordWebhookUrl) {
      this.logger.warn(
        '[NotificationService] DISCORD_WEBHOOK_URL not set — skipping Discord alert'
      );
      return;
    }

    const color = this.resolveColor(payload.type);
    const fields = this.buildDiscordFields(payload);

    const body = JSON.stringify({
      embeds: [
        {
          title: payload.title,
          description: payload.description,
          color,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    this.logger.debug(`[NotificationService] POST Discord webhook type=${payload.type}`);

    const res = await fetch(this.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '(no body)');
      throw new Error(`Discord webhook HTTP ${res.status}: ${text}`);
    }

    this.logger.log(`[NotificationService] ✅ Discord alert sent — ${payload.title}`);
  }

  /**
   * Sends a Markdown-formatted message to a Telegram chat via Bot API.
   *
   * Format: `*Bold Title*\n\nDescription text`
   */
  async sendTelegram(payload: AlertPayload): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) {
      this.logger.warn(
        '[NotificationService] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram'
      );
      return;
    }

    const text = `*${this.escapeTelegram(payload.title)}*\n\n${payload.description}`;

    const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id: this.telegramChatId,
      text,
      parse_mode: 'Markdown',
    });

    this.logger.debug(`[NotificationService] POST Telegram type=${payload.type}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text2 = await res.text().catch(() => '(no body)');
      throw new Error(`Telegram API HTTP ${res.status}: ${text2}`);
    }

    this.logger.log(`[NotificationService] ✅ Telegram alert sent — ${payload.title}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /** Maps alert type to a Discord embed colour integer. */
  private resolveColor(type: AlertPayload['type']): number {
    switch (type) {
      case 'META_SHIFT':
        return ALERT_COLORS.RISING; // caller may override via data.color
      case 'NEW_COMP':
        return ALERT_COLORS.NEW_COMP;
      case 'PATCH_DROP':
        return ALERT_COLORS.PATCH;
      case 'HOTFIX':
        return ALERT_COLORS.HOTFIX;
      default:
        return ALERT_COLORS.RISING;
    }
  }

  /** Converts `payload.data` keys into Discord embed fields (max 25 per Discord limit). */
  private buildDiscordFields(payload: AlertPayload): DiscordEmbedField[] {
    const fields: DiscordEmbedField[] = [];

    if (payload.data) {
      for (const [key, val] of Object.entries(payload.data).slice(0, 24)) {
        fields.push({
          name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: String(val),
          inline: true,
        });
      }
    }

    if (payload.compId) {
      fields.push({ name: 'Comp ID', value: payload.compId, inline: false });
    }

    return fields;
  }

  /**
   * Escapes special Telegram Markdown characters that could break formatting.
   * Only escapes in the title — description is passed through as-is.
   */
  private escapeTelegram(text: string): string {
    // Telegram Markdown v1 only needs `*`, `_`, `` ` ``, `[` escaped in inline code.
    return text.replace(/[*_`[\]]/g, (c) => `\\${c}`);
  }
}
