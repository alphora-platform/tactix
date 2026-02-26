/** Alert type discriminant — determines embed colour and routing. */
export type AlertType = 'META_SHIFT' | 'NEW_COMP' | 'PATCH_DROP' | 'HOTFIX';

/**
 * Payload passed to every alert processor and forwarded to NotificationService.
 * Job processors construct this from raw DB/cache data.
 */
export interface AlertPayload {
  type: AlertType;
  /** Short title shown as Discord embed title / Telegram bold header. */
  title: string;
  /** Human-readable body text. Supports Telegram Markdown. */
  description: string;
  /** Optional comp fingerprint for drill-down links in future. */
  compId?: string;
  /** Arbitrary extra data the processor wants to pass through (for rich embeds). */
  data?: Record<string, unknown>;
}

/**
 * One field in a Discord embed.
 * `inline: true` places the field side-by-side with neighbours.
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
