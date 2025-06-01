import {
  Message,
  TextChannel,
  NewsChannel,
  DMChannel,
  GuildTextBasedChannel,
  MessageCreateOptions,
  MessagePayload,
  CollectorFilter,
  MessageComponentInteraction,
  MessageEditOptions,
  ButtonStyle,
  User,
  MessageReaction,
} from 'discord.js';
import { ButtonOption } from '../utils/types';

function buildComponents(
  pageIndex: number,
  total: number,
  buttons?: ButtonOption[]
) {
  const defaultButtons = [
    {
      type: 2,
      style: ButtonStyle.Primary,
      label: '◀️',
      custom_id: 'prev',
      disabled: pageIndex === 0
    },
    {
      type: 2,
      style: ButtonStyle.Secondary,
      label: `${pageIndex + 1}/${total}`,
      custom_id: 'page',
      disabled: true
    },
    {
      type: 2,
      style: ButtonStyle.Primary,
      label: '▶️',
      custom_id: 'next',
      disabled: pageIndex === total - 1
    }
  ];

  const extra = (buttons ?? []).map((btn) => ({
    type: 2,
    style: btn.style,
    label: btn.label,
    custom_id: btn.id,
    disabled: false
  }));

  return [
    {
      type: 1,
      components: [...defaultButtons, ...extra]
    }
  ];
}

function createMessageOptions(
  page: string | MessageCreateOptions,
  pageIndex: number,
  total: number,
  buttons?: ButtonOption[]
): MessageCreateOptions {
  if (typeof page === 'string') {
    return {
      content: page,
      components: buildComponents(pageIndex, total, buttons)
    };
  }

  return {
    ...page,
    components: buildComponents(pageIndex, total, buttons)
  };
}

function createEditOptions(
  page: string | MessageCreateOptions,
  pageIndex: number,
  total: number,
  buttons?: ButtonOption[]
): MessageEditOptions {
  if (typeof page === 'string') {
    return {
      content: page,
      components: buildComponents(pageIndex, total, buttons)
    };
  }

  const { files, flags, ...rest } = page;

  return {
    ...rest,
    components: buildComponents(pageIndex, total, buttons)
  };
}

/**
 * Sends a paginated message with navigation buttons
 * @param channel - The channel to send the paginated message to
 * @param pages - Array of message content for each page
 * @param options - Configuration options for the pagination
 * @param options.timeout - Time in ms before buttons are disabled (default: 60000)
 * @param options.startPage - The initial page index to display (default: 0)
 * @param options.userId - If set, only this user can interact with the buttons
 * @param options.buttons - Custom buttons to add to the navigation
 * @returns {Promise<void>} - Resolves when the collector ends
 * @example
 * // Simple text-based pages
 * const pages = [
 *   'Page 1: Introduction to the bot',
 *   'Page 2: Basic commands',
 *   'Page 3: Advanced features'
 * ];
 *
 * // Send paginated message that only the command user can interact with
 * await sendPaginatedMessage(interaction.channel, pages, {
 *   userId: interaction.user.id,
 *   timeout: 120000 // 2 minutes
 * });
 *
 * // More complex pages with embeds
 * const richPages = [
 *   {
 *     embeds: [new EmbedBuilder().setTitle('Commands').setDescription('List of commands')],
 *     content: 'Page 1'
 *   },
 *   {
 *     embeds: [new EmbedBuilder().setTitle('Settings').setDescription('Bot settings')],
 *     content: 'Page 2'
 *   }
 * ];
 *
 * // With custom buttons
 * await sendPaginatedMessage(channel, richPages, {
 *   buttons: [
 *     {
 *       id: 'refresh',
 *       label: '🔄 Refresh',
 *       style: 'SECONDARY',
 *       callback: (page) => page
 *     }
 *   ],
 *   startPage: 1 // Start on second page
 * });
 */
export function sendPaginatedMessage(
  channel: GuildTextBasedChannel | DMChannel,
  pages: Array<string | MessageCreateOptions>,
  options?: {
    timeout?: number;
    startPage?: number;
    userId?: string;
    buttons?: ButtonOption[];
  }
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const timeout = options?.timeout ?? 60000;
      let currentPage = options?.startPage ?? 0;
      const userId = options?.userId;

      const message = await channel.send(
        createMessageOptions(pages[currentPage], currentPage, pages.length, options?.buttons)
      );

      const collector = message.createMessageComponentCollector({
        time: timeout
      });

      collector.on(
        'collect',
        async (interaction: MessageComponentInteraction) => {
          if (userId && interaction.user.id !== userId) {
            await interaction.reply({
              content: 'You are not authorized to interact with these controls.',
              ephemeral: true
            });
            return;
          }

          await interaction.deferUpdate();

          switch (interaction.customId) {
            case 'prev':
              currentPage = Math.max(0, currentPage - 1);
              break;
            case 'next':
              currentPage = Math.min(pages.length - 1, currentPage + 1);
              break;
            default:
              const customButton = options?.buttons?.find(
                (b) => b.id === interaction.customId
              );
              if (customButton) {
                currentPage = customButton.callback(currentPage);
              }
          }

          await message.edit(
            createEditOptions(pages[currentPage], currentPage, pages.length, options?.buttons)
          );
        }
      );

      collector.on('end', () => {
        message.edit({
          components: []
        }).catch(() => {});
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Waits for a message that matches the filter in a specific channel
 * @param channel - The channel to listen for messages in
 * @param filter - A filter function to determine which messages to collect
 * @param timeout - Time in ms to wait before resolving with null (default: 60000)
 * @returns {Promise<Message | null>} - The collected message or null if timeout occurs
 * @example
 * // Wait for a message containing "yes" or "no"
 * const response = await waitForMessage(
 *   channel,
 *   msg => msg.author.id === userId && ['yes', 'no'].includes(msg.content.toLowerCase()),
 *   30000 // 30 seconds timeout
 * );
 *
 * if (response) {
 *   if (response.content.toLowerCase() === 'yes') {
 *     channel.send('You confirmed the action!');
 *   } else {
 *     channel.send('Action cancelled.');
 *   }
 * } else {
 *   channel.send('No response received, timed out.');
 * }
 */
export function waitForMessage<T extends TextChannel | DMChannel | NewsChannel>(
  channel: T,
  filter: CollectorFilter<[Message]>,
  timeout = 60000
): Promise<Message | null> {
  return new Promise((resolve) => {
    if (
      'createMessageCollector' in channel &&
      typeof channel.createMessageCollector === 'function'
    ) {
      const collector = channel.createMessageCollector({
        filter,
        max: 1,
        time: timeout
      });

      collector.on('collect', (message: Message) => {
        resolve(message);
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          resolve(null);
        }
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * Waits for a specific user to send a message in a channel
 * @param channel - The channel to listen for messages in
 * @param user - The user whose messages to capture
 * @param filter - Optional filter function to further refine message capturing
 * @param timeout - Time in ms to wait before resolving with null (default: 60000)
 * @returns {Promise<Message | null>} - The collected message or null if timeout occurs
 * @example
 * // Simple user input
 * message.channel.send('What is your favorite color?');
 * const response = await awaitUserInput(message.channel, message.author);
 *
 * if (response) {
 *   message.channel.send(`You said your favorite color is: ${response.content}`);
 * } else {
 *   message.channel.send('You did not respond in time.');
 * }
 *
 * // With additional filter for specific answers
 * message.channel.send('Please type "yes" or "no"');
 * const answer = await awaitUserInput(
 *   message.channel,
 *   message.author,
 *   msg => ['yes', 'no'].includes(msg.content.toLowerCase())
 * );
 *
 * if (!answer) {
 *   message.channel.send('You did not respond in time.');
 * }
 */
export function awaitUserInput(
  channel: GuildTextBasedChannel | DMChannel,
  user: User,
  filter?: (message: Message) => boolean,
  timeout = 60000
): Promise<Message | null> {
  return new Promise((resolve) => {
    const baseFilter = (message: Message): boolean => message.author.id === user.id;
    const messageFilter = filter
      ? (message: Message): boolean => baseFilter(message) && filter(message)
      : baseFilter;

    const collector = channel.createMessageCollector({
      filter: messageFilter,
      time: timeout,
      max: 1
    });

    collector.on('collect', (message) => {
      resolve(message);
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        resolve(null);
      }
    });
  });
}

/**
 * Replies to a message and automatically deletes the reply after a specified delay
 * @param message - The message to reply to
 * @param content - The content to include in the reply
 * @param delay - Time in milliseconds before the reply is deleted (default: 5000)
 * @returns {Promise<void>} - Resolves when the reply is sent
 * @example
 * // Simple text response that disappears after 5 seconds
 * client.on('messageCreate', async (message) => {
 *   if (message.content === '!ping') {
 *     await replyWithAutoDelete(message, 'Pong!');
 *     // The message will be automatically deleted after 5 seconds
 *   }
 * });
 *
 * // Error message with custom timeout
 * async function handleCommand(message) {
 *   try {
 *     // Command logic here...
 *   } catch (error) {
 *     // Send error message that deletes itself after 10 seconds
 *     await replyWithAutoDelete(
 *       message,
 *       {
 *         content: 'An error occurred!',
 *         embeds: [
 *           new EmbedBuilder()
 *             .setColor('Red')
 *             .setDescription(error.message)
 *         ]
 *       },
 *       10000
 *     );
 *   }
 * }
 */
export async function replyWithAutoDelete(
  message: Message,
  content: string | MessagePayload | MessageCreateOptions,
  delay = 5000
): Promise<void> {
  try {
    const reply = await message.reply(content);
    setTimeout(() => {
      reply.delete().catch(() => {});
    }, delay);
  } catch (err) {
    console.error('Failed to auto-delete message:', err);
  }
}

/**
 * Splits a long message into chunks that fit within Discord's message length limits
 * @param text - The text to split into chunks
 * @param maxLength - Maximum length of each chunk (default: 2000)
 * @returns {string[]} - Array of message chunks, each within the maximum length
 * @example
 * // Handling a long response that exceeds Discord's 2000 character limit
 * async function sendLongHelp(channel) {
 *   // This text is much longer than 2000 characters
 *   const longHelpText = generateLongHelpText(); // Assume this returns a very long string
 *
 *   // Split the text into chunks that Discord can handle
 *   const chunks = splitLongMessage(longHelpText);
 *
 *   // Send each chunk as a separate message
 *   for (const chunk of chunks) {
 *     await channel.send(chunk);
 *   }
 * }
 *
 * // With custom chunk size (e.g., for embed descriptions which have 4096 char limit)
 * function createEmbedWithLongDescription(title, longText) {
 *   // Split text into chunks that fit within embed description limit
 *   const chunks = splitLongMessage(longText, 4000);
 *
 *   // Create an embed for each chunk
 *   const embeds = chunks.map((chunk, index) => {
 *     return new EmbedBuilder()
 *       .setTitle(index === 0 ? title : `${title} (continued)`)
 *       .setDescription(chunk);
 *   });
 *
 *   return embeds;
 * }
 */
export function splitLongMessage(text: string, maxLength = 2000): string[] {
  const chunks: string[] = [];

  if (text.length <= maxLength) {
    return [text];
  }

  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if (line.length > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      let remainingLine = line;
      while (remainingLine.length > maxLength) {
        const segment = remainingLine.substring(0, maxLength);
        chunks.push(segment);
        remainingLine = remainingLine.substring(maxLength);
      }

      currentChunk = remainingLine;
    } else if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += '\n';
      }
      currentChunk += line;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Checks if a bot was mentioned in a message
 * @param message - The message to check for bot mentions
 * @returns {boolean} - True if the bot was mentioned, false otherwise
 * @example
 * // Only respond to messages that mention the bot
 * client.on('messageCreate', message => {
 *   if (isBotMentioned(message)) {
 *     message.reply('You mentioned me!');
 *   }
 * });
 *
 * // Ping detection system
 * if (message.content.toLowerCase().includes('ping') && isBotMentioned(message)) {
 *   message.channel.send('Pong!');
 * }
 */
export function isBotMentioned(
  message: Message
): boolean {
  const client = message.client;

  return (
    message.mentions.has(client.user?.id ?? '') ||
    message.content.includes(`<@!${client.user?.id}>`)
  );
}

/**
 * Creates a direct link to a Discord message
 * @param message - The message to create a link for
 * @returns {string} - The URL to the message
 * @example
 * // Get a link to the current message
 * const link = createMessageLink(message);
 * await message.reply(`Link to this message: ${link}`);
 *
 * // Get a link to a referenced message
 * if (message.reference && message.referenced) {
 *   const referenceLink = createMessageLink(message.referenced);
 *   await message.reply(`You're replying to: ${referenceLink}`);
 * }
 */
export function createMessageLink(message: Message): string {
  if (!message.guild) {
    // For DM messages, we can't create a link
    return '';
  }

  return `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
}

/**
 * Checks if a message is older than a specified duration
 * @param message - The message to check
 * @param duration - The duration in milliseconds
 * @returns {boolean} - True if the message is older than the specified duration
 * @example
 * // Check if a message is older than 1 hour
 * if (isMessageOlderThan(message, 3600000)) {
 *   await message.reply('This message is more than an hour old.');
 * }
 *
 * // Only allow interactions with messages less than 15 minutes old
 * if (isMessageOlderThan(message, 900000)) {
 *   await interaction.reply({
 *     content: 'This message is too old to interact with.',
 *     ephemeral: true
 *   });
 *   return;
 * }
 */
export function isMessageOlderThan(message: Message, duration: number): boolean {
  const now = Date.now();
  const messageTimestamp = message.createdTimestamp;
  const difference = now - messageTimestamp;

  return difference > duration;
}

/**
 * Waits for a user to react to a message with one of the specified emojis
 * @param message - The message to await reactions on
 * @param user - The user who should react
 * @param emojis - Array of emoji strings/identifiers to collect
 * @param timeout - Time in milliseconds to wait before timing out (default: 60000)
 * @returns {Promise<MessageReaction | null>} - The reaction object or null if timed out
 * @example
 * // Wait for a user to confirm or cancel with reactions
 * const confirmMessage = await channel.send('React with ✅ to confirm or ❌ to cancel');
 * const reaction = await awaitReaction(confirmMessage, user, ['✅', '❌']);
 *
 * if (reaction?.emoji.name === '✅') {
 *   await channel.send('Action confirmed!');
 * } else if (reaction?.emoji.name === '❌') {
 *   await channel.send('Action cancelled.');
 * } else {
 *   await channel.send('No response received, operation timed out.');
 * }
 *
 * // Add reactions to make it easier for users
 * const pollMessage = await channel.send('Vote on your favorite option:');
 * const pollEmojis = ['1️⃣', '2️⃣', '3️⃣'];
 *
 * for (const emoji of pollEmojis) {
 *   await pollMessage.react(emoji);
 * }
 *
 * const vote = await awaitReaction(pollMessage, user, pollEmojis, 30000);
 * if (vote) {
 *   await channel.send(`You voted for option ${vote.emoji.name}!`);
 * }
 */
export async function awaitReaction(
  message: Message,
  user: User,
  emojis: string[],
  timeout: number = 60000
): Promise<MessageReaction | null> {
  const filter = (reaction: MessageReaction, reactingUser: User) => {
    return emojis.includes(reaction.emoji.name || reaction.emoji.id || '') && reactingUser.id === user.id;
  };

  try {
    const collected = await message.awaitReactions({
      filter,
      max: 1,
      time: timeout,
      errors: ['time']
    });

    return collected.first() || null;
  } catch (error) {
    return null;
  }
}