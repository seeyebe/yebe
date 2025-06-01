import {
  Collection,
  RepliableInteraction,
} from 'discord.js';
/**
 * Manages cooldowns for commands
 * Manages command cooldowns for users
 * @class
 * @description Tracks and enforces cooldown periods for commands per user
 * @example
 * // Using cooldownManager to check if a user is on cooldown
 * const { onCooldown, timeLeft } = cooldownManager.check(
 *   '123456789012345678', // userId
 *   'ping',               // command name
 *   5000                  // 5 seconds cooldown
 * );
 *
 * if (onCooldown) {
 *   console.log(`Wait ${timeLeft / 1000}s before using this command again.`);
 * }
 */
export class CooldownManager {
  private cooldowns: Collection<string, Collection<string, number>> = new Collection();

  /**
   * Checks if a user is on cooldown for a specific command
   * @param userId - The ID of the user to check
   * @param command - The command identifier
   * @param duration - The cooldown duration in milliseconds
   * @returns {object} - Object containing cooldown status and time remaining
   * @returns {boolean} onCooldown - Whether the user is on cooldown
   * @returns {number} timeLeft - Time left in milliseconds before cooldown expires
   * @example
   * const result = cooldownManager.check(
   *   message.author.id,
   *   'daily',
   *   24 * 60 * 60 * 1000 // 24 hours
   * );
   *
   * if (result.onCooldown) {
   *   const minutes = Math.ceil(result.timeLeft / 60000);
   *   return `Wait ${minutes} minutes before using this command.`;
   * }
   */
  public check(
    userId: string,
    command: string,
    duration: number
  ): { onCooldown: boolean; timeLeft: number } {
    if (!this.cooldowns.has(command)) {
      this.cooldowns.set(command, new Collection());
    }

    const now = Date.now();
    const timestamps = this.cooldowns.get(command);

    if (!timestamps) {
      throw new Error('Could not get cooldown collection');
    }

    const cooldownAmount = duration;

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = expirationTime - now;
        return { onCooldown: true, timeLeft };
      }
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);

    return { onCooldown: false, timeLeft: 0 };
  }
}

// Singleton instance for cooldown management
export const cooldownManager = new CooldownManager();

/**
 * Abstracts the defer/reply pattern for interactions
 * @param interaction - The interaction to reply to or defer
 * @param content - The content to reply with, either as a string or object with options
 * @param content.content - The message content
 * @param content.ephemeral - Whether the response should be ephemeral (visible only to sender)
 * @returns {Promise<void>} - Resolves when the response is sent
 * @example
 * // Simple reply
 * await deferOrReply(interaction, 'Command executed successfully');
 *
 * // With ephemeral option
 * await deferOrReply(interaction, {
 *   content: 'Only you can see this message',
 *   ephemeral: true
 * });
 *
 * // Defer first (shows typing indicator)
 * await deferOrReply(interaction, '');
 * // Later update the response
 * await deferOrReply(interaction, 'Operation completed!');
 */
export async function deferOrReply(
  interaction: RepliableInteraction,
  content: string | { content?: string; ephemeral?: boolean }
): Promise<void> {
  const ephemeral = typeof content === 'object' ? content.ephemeral ?? false : false;
  const message = typeof content === 'string' ? content : content.content ?? '';

  try {
    if (interaction.deferred) {
      await interaction.editReply(message);
    } else if (interaction.replied) {
      await interaction.followUp({
        content: message,
        ephemeral
      });
    } else {
      if (message) {
        await interaction.reply({
          content: message,
          ephemeral
        });
      } else {
        await interaction.deferReply({ ephemeral });
      }
    }
  } catch (error) {
    // Handle errors silently
  }
}
