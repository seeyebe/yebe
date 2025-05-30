import { escapeMarkdown as djsEscapeMarkdown, Message } from 'discord.js';

/**
 * Sanitizes user input by removing mentions, links, and other potentially malicious content
 * @param input - The user input string to sanitize
 * @returns {string} - A sanitized version of the input with potentially harmful content removed
 * @example
 * // Sanitize user input before using it in a command
 * client.on('messageCreate', (message) => {
 *   if (message.content.startsWith('!echo ')) {
 *     // Extract the text after the command
 *     const userInput = message.content.slice(6);
 *
 *     // Sanitize the input to remove potentially harmful content
 *     const sanitized = sanitizeInput(userInput);
 *
 *     // Respond with the sanitized content
 *     message.channel.send(`Echo: ${sanitized}`);
 *   }
 * });
 *
 * // When accepting user input for a name, title or description
 * async function handleChangeNickname(interaction) {
 *   // Get nickname from user input
 *   const unsafeNickname = interaction.options.getString('nickname');
 *
 *   // Sanitize to prevent abuse
 *   const safeNickname = sanitizeInput(unsafeNickname);
 *
 *   try {
 *     await interaction.member.setNickname(safeNickname);
 *     interaction.reply(`Your nickname has been changed to: ${safeNickname}`);
 *   } catch (error) {
 *     interaction.reply('Failed to update nickname.');
 *   }
 * }
 */
export function sanitizeInput(input: string): string {
  if (!input) {
    return '';
  }

  // Remove @everyone and @here mentions
  let sanitized = input
    .replace(/@everyone/g, '@\u200Beveryone')
    .replace(/@here/g, '@\u200Bhere');

  // Remove user, role, and channel mentions
  sanitized = sanitized
    .replace(/<@!?(\d+)>/g, '@user')
    .replace(/<@&(\d+)>/g, '@role')
    .replace(/<#(\d+)>/g, '#channel');

  // Remove links (basic URL pattern)
  sanitized = sanitized
    .replace(/https?:\/\/\S+/g, '[link removed]')
    .replace(/www\.\S+/g, '[link removed]');

  return sanitized;
}

/**
 * Cleans a message's content by replacing mentions with readable text and escaping markdown
 * @param message - The message to clean content of
 * @returns {string} - The cleaned message content
 * @example
 * // Get a clean version of a message content for quoting
 * client.on('messageCreate', (message) => {
 *   if (message.content.startsWith('!quote') && message.reference) {
 *     const quotedMessage = await message.channel.messages.fetch(message.reference.messageId);
 *     const cleanedContent = cleanContent(quotedMessage);
 *
 *     const embed = new EmbedBuilder()
 *       .setAuthor({
 *         name: quotedMessage.author.tag,
 *         iconURL: quotedMessage.author.displayAvatarURL()
 *       })
 *       .setDescription(cleanedContent)
 *       .setTimestamp(quotedMessage.createdAt);
 *
 *     message.channel.send({ embeds: [embed] });
 *   }
 * });
 */
export function cleanContent(message: Message): string {
  let content = message.content;

  message.mentions.users.forEach((user) => {
    const regex = new RegExp(`<@!?${user.id}>`, 'g');
    content = content.replace(regex, `@${user.username}`);
  });

  message.mentions.roles.forEach((role) => {
    const regex = new RegExp(`<@&${role.id}>`, 'g');
    content = content.replace(regex, `@${role.name}`);
  });

  message.mentions.channels.forEach((channel) => {
    const regex = new RegExp(`<#${channel.id}>`, 'g');
    const name = 'name' in channel ? channel.name : 'unknown';
    content = content.replace(regex, `#${name}`);
  });

  return content
    .replace(/\*\*/g, '\\*\\*')
    .replace(/\*/g, '\\*')
    .replace(/__/g, '\\_\\_')
    .replace(/_/g, '\\_')
    .replace(/~~/g, '\\~\\~')
    .replace(/`/g, '\\`');
}

/**
 * Formats a timestamp into a human-readable relative time string
 * @param timestamp - Date object or timestamp number to format
 * @param short - Whether to use short format (e.g., "5m" vs "5 minutes ago")
 * @returns {string} - Human-readable relative time string
 * @example
 * // Standard format (e.g., "5 minutes ago")
 * const timeDisplay = formatTimeAgo(message.createdAt);
 * console.log(`Message sent ${timeDisplay}`);
 *
 * // Short format for compact displays (e.g., "5m")
 * const shortTime = formatTimeAgo(timestamp, true);
 * await message.reply(`Last seen: ${shortTime}`);
 */
export function formatTimeAgo(timestamp: Date | number, short = false): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const units: [number, string, string][] = [
    [diffSec, 'second', 's'],
    [diffMin, 'minute', 'm'],
    [diffHour, 'hour', 'h'],
    [diffDay, 'day', 'd'],
    [diffMonth, 'month', 'mo'],
    [diffYear, 'year', 'y']
  ];

  for (let i = units.length - 1; i >= 0; i--) {
    const [value, longUnit, shortUnit] = units[i];
    if (value > 0) {
      const unit = short ? shortUnit : `${longUnit}${value !== 1 ? 's' : ''}`;
      return short
        ? `${value}${unit}`
        : `${value} ${unit} ago`;
    }
  }

  return short ? 'now' : 'just now';
}

/**
 * Escapes Discord markdown characters in text
 * @param text - The text to escape markdown in
 * @returns {string} - Text with markdown characters escaped
 * @example
 * // Prevent users from using markdown in their names
 * const safeUsername = escapeMarkdown(user.username);
 * await message.channel.send(`Hello ${safeUsername}!`);
 *
 * // Display user input safely
 * const userInput = args.join(' ');
 * const safeInput = escapeMarkdown(userInput);
 * await message.reply(`You said: ${safeInput}`);
 */
export function escapeMarkdown(text: string): string {
  // Use discord.js built-in function but ensure additional characters are escaped
  // that might not be covered by the discord.js implementation
  let escaped = djsEscapeMarkdown(text);

  // Ensure backticks are properly escaped for code blocks
  escaped = escaped.replace(/`/g, '\\`');

  // Ensure spoiler markers are escaped
  escaped = escaped.replace(/\|\|/g, '\\|\\|');

  return escaped;
}
