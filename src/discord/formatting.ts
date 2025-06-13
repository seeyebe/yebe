import { escapeMarkdown as djsEscapeMarkdown, Message, User, Role, GuildChannel } from 'discord.js';

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

/**
 * Extract custom and unicode emojis from text content
 * @param content - The text content to extract emojis from
 * @param options - Configuration options
 * @param options.includeCustom - Whether to include custom emojis (default: true)
 * @param options.includeUnicode - Whether to include unicode emojis (default: true)
 * @param options.uniqueOnly - Whether to return only unique emojis (default: true)
 * @returns {Object} - Object containing arrays of custom and unicode emojis
 * @example
 * // Extract all emojis from message content
 * const emojis = extractEmojis(message.content);
 * console.log(`Found ${emojis.custom.length} custom and ${emojis.unicode.length} unicode emojis`);
 *
 * // Get only custom emojis
 * const customOnly = extractEmojis(content, { includeUnicode: false });
 *
 * // Allow duplicate emojis in results
 * const allEmojis = extractEmojis(content, { uniqueOnly: false });
 */
export function extractEmojis(
  content: string,
  options: {
    includeCustom?: boolean;
    includeUnicode?: boolean;
    uniqueOnly?: boolean;
  } = {}
): { custom: string[]; unicode: string[]; all: string[] } {
  const { includeCustom = true, includeUnicode = true, uniqueOnly = true } = options;

  let customEmojis: string[] = [];
  let unicodeEmojis: string[] = [];

  // Extract custom Discord emojis (format: <:name:id> or <a:name:id>)
  if (includeCustom) {
    const customEmojiRegex = /<(a?):([^:]+):(\d+)>/g;
    const customMatches = Array.from(content.matchAll(customEmojiRegex));
    customEmojis = customMatches.map(match => match[0]);
  }

  // Extract unicode emojis using a comprehensive regex
  if (includeUnicode) {
    const unicodeEmojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F251}]/gu;
    const unicodeMatches = Array.from(content.matchAll(unicodeEmojiRegex));
    unicodeEmojis = unicodeMatches.map(match => match[0]);
  }

  // Remove duplicates if requested
  if (uniqueOnly) {
    customEmojis = [...new Set(customEmojis)];
    unicodeEmojis = [...new Set(unicodeEmojis)];
  }

  return {
    custom: customEmojis,
    unicode: unicodeEmojis,
    all: [...customEmojis, ...unicodeEmojis]
  };
}

/**
 * Parse and extract all mentions from message content
 * @param content - The message content to parse
 * @param options - Configuration options
 * @param options.includeUsers - Whether to include user mentions (default: true)
 * @param options.includeRoles - Whether to include role mentions (default: true)
 * @param options.includeChannels - Whether to include channel mentions (default: true)
 * @param options.includeEveryone - Whether to include @everyone/@here mentions (default: true)
 * @returns {Object} - Object containing arrays of different mention types
 * @example
 * // Extract all mentions from a message
 * const mentions = extractMentions(message.content);
 * console.log(`Found ${mentions.users.length} user mentions`);
 *
 * // Get only user and role mentions
 * const userRoleMentions = extractMentions(content, {
 *   includeChannels: false,
 *   includeEveryone: false
 * });
 *
 * // Check if message mentions everyone
 * const mentions = extractMentions(content);
 * if (mentions.everyone.length > 0) {
 *   console.log('This message contains @everyone or @here');
 * }
 */
export function extractMentions(
  content: string,
  options: {
    includeUsers?: boolean;
    includeRoles?: boolean;
    includeChannels?: boolean;
    includeEveryone?: boolean;
  } = {}
): {
  users: string[];
  roles: string[];
  channels: string[];
  everyone: string[];
  all: string[];
} {
  const {
    includeUsers = true,
    includeRoles = true,
    includeChannels = true,
    includeEveryone = true
  } = options;

  let users: string[] = [];
  let roles: string[] = [];
  let channels: string[] = [];
  let everyone: string[] = [];

  if (includeUsers) {
    const userMentionRegex = /<@!?(\d+)>/g;
    const userMatches = Array.from(content.matchAll(userMentionRegex));
    users = userMatches.map(match => match[1]); // Extract just the ID
  }

  if (includeRoles) {
    const roleMentionRegex = /<@&(\d+)>/g;
    const roleMatches = Array.from(content.matchAll(roleMentionRegex));
    roles = roleMatches.map(match => match[1]);
  }

  if (includeChannels) {
    const channelMentionRegex = /<#(\d+)>/g;
    const channelMatches = Array.from(content.matchAll(channelMentionRegex));
    channels = channelMatches.map(match => match[1]);
  }

  if (includeEveryone) {
    const everyoneMentionRegex = /@(everyone|here)/g;
    const everyoneMatches = Array.from(content.matchAll(everyoneMentionRegex));
    everyone = everyoneMatches.map(match => match[1]);
  }

  return {
    users: [...new Set(users)],
    roles: [...new Set(roles)],
    channels: [...new Set(channels)],
    everyone: [...new Set(everyone)],
    all: [...users, ...roles, ...channels, ...everyone]
  };
}

/**
 * Safely format text in code blocks with automatic language detection
 * @param content - The text content to format
 * @param options - Configuration options
 * @param options.language - Specific language for syntax highlighting (optional)
 * @param options.detectLanguage - Whether to auto-detect language (default: true)
 * @param options.maxLength - Maximum length before truncating (default: 1990)
 * @param options.escapeBackticks - Whether to escape existing backticks (default: true)
 * @returns {string} - Formatted code block
 * @example
 * // Simple code block
 * const formatted = formatCodeBlock('console.log("Hello World");');
 * await message.reply(formatted);
 *
 * // With specific language
 * const jsCode = formatCodeBlock(code, { language: 'javascript' });
 *
 * // Auto-detect language from common patterns
 * const autoDetected = formatCodeBlock('def hello(): print("Hello")');
 * // Returns: ```python\ndef hello(): print("Hello")\n```
 */
export function formatCodeBlock(
  content: string,
  options: {
    language?: string;
    detectLanguage?: boolean;
    maxLength?: number;
    escapeBackticks?: boolean;
  } = {}
): string {
  const {
    language,
    detectLanguage = true,
    maxLength = 1990,
    escapeBackticks = true
  } = options;

  let processedContent = escapeBackticks
    ? content.replace(/`/g, '\\`')
    : content;

  if (processedContent.length > maxLength - 10) {
    processedContent = processedContent.substring(0, maxLength - 13) + '...';
  }

  let codeLanguage = language || '';

  if (!language && detectLanguage) {
    // Simple language detection based on common patterns
    const languagePatterns: { [key: string]: RegExp[] } = {
      javascript: [/console\.(log|error|warn)/, /function\s*\(/, /=>\s*{/, /require\s*\(/],
      typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*(string|number|boolean)/, /import.*from/],
      python: [/def\s+\w+\s*\(/, /import\s+\w+/, /print\s*\(/, /if\s+__name__\s*==\s*['"]/],
      java: [/public\s+(class|static)/, /System\.out\.print/, /import\s+java\./, /public\s+static\s+void\s+main/],
      csharp: [/using\s+System/, /public\s+(class|static)/, /Console\.Write/, /namespace\s+\w+/],
      cpp: [/#include\s*</, /std::/, /cout\s*<</, /int\s+main\s*\(/],
      html: [/<(!DOCTYPE|html|head|body|div|span|p)\b/, /<\/\w+>/, /<!DOCTYPE html>/],
      css: [/[.#]\w+\s*{/, /:\s*[^;]+;/, /@media\s/, /font-family:/],
      json: [/^[\s]*{/, /^\s*\[/, /"[\w-]+":\s*["\d\[{]/, /}\s*,?\s*$/],
      sql: [/SELECT\s+.*FROM/i, /INSERT\s+INTO/i, /UPDATE\s+.*SET/i, /DELETE\s+FROM/i],
      bash: [/^#!\/bin\/(bash|sh)/, /sudo\s+/, /\$\w+/, /echo\s+/],
      yaml: [/^[\s]*\w+:\s*$/, /^[\s]*-\s+/, /---/, /^\s*\w+:\s*[|>]/],
      php: [/^\s*<\?php/, /echo\s+['"]/, /function\s+\w+\s*\(/, /require_once\s*\(/],
      ruby: [/^\s*def\s+\w+/, /puts\s+['"]/, /require\s+['"]/, /class\s+\w+/],
      go: [/^\s*package\s+\w+/, /func\s+\w+\s*\(/, /import\s+\(/, /:=\s*[\w\d]+/],
      swift: [/^\s*import\s+\w+/, /func\s+\w+\s*\(/, /let\s+\w+\s*=/, /class\s+\w+/],
      kotlin: [/^\s*package\s+\w+/, /fun\s+\w+\s*\(/, /val\s+\w+\s*=/, /class\s+\w+/],
      rust: [/^\s*fn\s+\w+\s*\(/, /let\s+\w+\s*=/, /use\s+\w+/, /struct\s+\w+/],
    };

    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(processedContent))) {
        codeLanguage = lang;
        break;
      }
    }
  }

  return `\`\`\`${codeLanguage}\n${processedContent}\n\`\`\``;
}
