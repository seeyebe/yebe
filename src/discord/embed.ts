import {
  APIEmbedField,
  ColorResolvable,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  DMChannel,
  GuildTextBasedChannel,
  ComponentType
} from 'discord.js';
import { ButtonOption } from '../utils/types';

/**
 * Builds a custom embed with the provided options
 * @param options - Configuration options for the embed
 * @param options.title - Title of the embed
 * @param options.description - Main content of the embed
 * @param options.color - Color of the embed's left border (default: #0099ff)
 * @param options.fields - Array of fields to add to the embed
 * @param options.footer - Footer text and optional icon
 * @param options.thumbnail - Small image in the top right
 * @param options.image - Large image at the bottom
 * @param options.author - Author name, optional icon and URL
 * @param options.timestamp - Whether to add a timestamp (true/false) or a specific date
 * @returns {EmbedBuilder} - The constructed embed ready to be sent
 * @example
 * // Create a simple embed
 * const embed = buildEmbed({
 *   title: 'Welcome Message',
 *   description: 'Welcome to our server!',
 *   color: '#ff0000'
 * });
 *
 * // Create a more complex embed
 * const detailedEmbed = buildEmbed({
 *   title: 'Server Rules',
 *   description: 'Please follow these rules',
 *   color: 'Green',
 *   fields: [
 *     { name: 'Rule 1', value: 'Be respectful', inline: true },
 *     { name: 'Rule 2', value: 'No spamming', inline: true }
 *   ],
 *   footer: { text: 'Updated May 2025', iconURL: 'https://example.com/logo.png' },
 *   thumbnail: 'https://example.com/thumbnail.png',
 *   timestamp: true
 * });
 */
export function buildEmbed({
  title,
  description,
  color = '#0099ff',
  fields = [],
  footer,
  thumbnail,
  image,
  author,
  timestamp = false
}: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: APIEmbedField[];
  footer?: { text: string; iconURL?: string };
  thumbnail?: string;
  image?: string;
  author?: { name: string; iconURL?: string; url?: string };
  timestamp?: boolean | number | Date;
}): EmbedBuilder {
  const embed = new EmbedBuilder();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (color) embed.setColor(color);
  if (fields.length > 0) embed.addFields(fields);
  if (footer) embed.setFooter(footer);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);
  if (timestamp === true) embed.setTimestamp();
  else if (timestamp) embed.setTimestamp(timestamp);
  return embed;
}

/**
 * Creates a success-themed embed with green color
 * @param text - The description text for the embed
 * @param options - Additional configuration options
 * @param options.title - The title of the embed (default: "Success")
 * @param options.footer - Footer text and optional icon
 * @param options.timestamp - Whether to add a timestamp or a specific date
 * @returns {EmbedBuilder} - The constructed success embed
 * @example
 * // Basic success message
 * const successEmbed = buildSuccessEmbed('Command executed successfully!');
 * message.channel.send({ embeds: [successEmbed] });
 *
 * // Customized success message
 * const customSuccessEmbed = buildSuccessEmbed('Profile updated successfully', {
 *   title: 'Profile Update',
 *   footer: { text: 'User ID: 123456789' },
 *   timestamp: true
 * });
 * interaction.reply({ embeds: [customSuccessEmbed] });
 */
export function buildSuccessEmbed(
  text: string,
  options: { title?: string; footer?: { text: string; iconURL?: string }; timestamp?: boolean | number | Date } = {}
): EmbedBuilder {
  return buildEmbed({
    title: options.title || 'Success',
    description: text,
    color: '#00FF00',
    footer: options.footer,
    timestamp: options.timestamp
  });
}

/**
 * Creates an error-themed embed with red color
 * @param text - The description text for the embed (error message)
 * @param options - Additional configuration options
 * @param options.title - The title of the embed (default: "Error")
 * @param options.footer - Footer text and optional icon
 * @param options.timestamp - Whether to add a timestamp or a specific date
 * @returns {EmbedBuilder} - The constructed error embed
 * @example
 * // Basic error message
 * const errorEmbed = buildErrorEmbed('Command failed: Invalid arguments');
 * message.channel.send({ embeds: [errorEmbed] });
 *
 * // Detailed error message
 * const detailedErrorEmbed = buildErrorEmbed('Failed to ban user: Missing permissions', {
 *   title: 'Permission Error',
 *   footer: { text: 'Contact an administrator for help' },
 *   timestamp: true
 * });
 * interaction.reply({ embeds: [detailedErrorEmbed], ephemeral: true });
 */
export function buildErrorEmbed(
  text: string,
  options: { title?: string; footer?: { text: string; iconURL?: string }; timestamp?: boolean | number | Date } = {}
): EmbedBuilder {
  return buildEmbed({
    title: options.title || 'Error',
    description: text,
    color: '#FF0000',
    footer: options.footer,
    timestamp: options.timestamp
  });
}

/**
 * Adds a field to an embed, automatically chunking content that exceeds Discord's character limit
 * @param embed - The embed to add the field to
 * @param name - The name of the field
 * @param values - An array of strings to combine and add as field value
 * @param chunkSize - Maximum size of each field value chunk (default: 1024)
 * @example
 * // Create an embed and add a large field that will be automatically chunked
 * const embed = buildEmbed({
 *   title: 'Server Members',
 *   color: 'Blue'
 * });
 *
 * // List of long member names that might exceed Discord's character limit
 * const members = guild.members.cache.map(member =>
 *   `${member.displayName} (${member.user.tag})`
 * );
 *
 * // Automatically chunks the members list into multiple fields if needed
 * addFieldChunked(embed, 'Members List', members);
 *
 * // Chunk with smaller chunk size and make fields inline
 * addFieldChunked(embed, 'Online Members', onlineMembers, 500, true);
 *
 * channel.send({ embeds: [embed] });
 */
export function addFieldChunked(
  embed: EmbedBuilder,
  name: string,
  values: string[],
  chunkSize = 1024,
  inline = false
): EmbedBuilder {
  if (values.length === 0) {
    embed.addFields({ name, value: 'None', inline });
    return embed;
  }

  let current = '';
  const chunks: string[] = [];

  for (const value of values) {
    if (current.length + value.length + 1 > chunkSize) {
      chunks.push(current);
      current = value;
    } else {
      if (current) current += '\n';
      current += value;
    }
  }

  if (current) chunks.push(current);

  embed.addFields({ name, value: chunks[0], inline });

  for (const chunk of chunks.slice(1)) {
    embed.addFields({
      name: `${name} (continued)`,
      value: chunk,
      inline
    });
  }

  return embed;
}

/**
 * Chunks an array of embed fields into groups of specified maximum size
 * @param fields - The array of embed fields to chunk
 * @param max - The maximum number of fields per chunk (Discord limit is 25)
 * @returns {APIEmbedField[][]} - An array of embed field arrays, each containing at most 'max' fields
 * @example
 * // Create a large array of fields representing server roles
 * const roleFields = guild.roles.cache.map(role => ({
 *   name: role.name,
 *   value: `Members: ${role.members.size} | Color: ${role.hexColor}`,
 *   inline: true
 * }));
 *
 * // Split into groups of 25 fields (Discord's limit per embed)
 * const fieldChunks = chunkEmbedFields(roleFields);
 *
 * // Create multiple embeds with the chunked fields
 * const embeds = fieldChunks.map(chunk => {
 *   const embed = buildEmbed({
 *     title: 'Server Roles',
 *     color: 'Blue'
 *   });
 *
 *   // Add all fields from this chunk
 *   embed.addFields(chunk);
 *   return embed;
 * });
 *
 * // Send all embeds in sequence
 * for (const embed of embeds) {
 *   await channel.send({ embeds: [embed] });
 * }
 */
export function chunkEmbedFields(fields: APIEmbedField[], max = 25): APIEmbedField[][] {
  const chunks: APIEmbedField[][] = [];
  for (let i = 0; i < fields.length; i += max) {
    chunks.push(fields.slice(i, i + max));
  }
  return chunks.length ? chunks : [[]];
}

/**
 * Creates a paginated embed message with navigation buttons
 * @param channel - The channel to send the paginated embed to
 * @param embeds - An array of EmbedBuilders to paginate through
 * @param options - Configuration options for the pagination
 * @param options.timeout - Time in ms before buttons are disabled (default: 60000)
 * @param options.startPage - The initial page index to display (default: 0)
 * @param options.userId - If set, only this user can interact with the buttons
 * @param options.buttons - Custom buttons to add to the navigation row
 * @returns {Promise<void>} - Resolves when the collector ends
 * @example
 * // Create multiple embeds for pages
 * const helpEmbeds = [
 *   buildEmbed({
 *     title: 'Help Page 1: Getting Started',
 *     description: 'Basic commands to get started with the bot',
 *     color: 'Blue',
 *     fields: [
 *       { name: '/help', value: 'Shows this help message', inline: true },
 *       { name: '/ping', value: 'Checks bot latency', inline: true }
 *     ]
 *   }),
 *   buildEmbed({
 *     title: 'Help Page 2: Moderation',
 *     description: 'Commands for server moderation',
 *     color: 'Red',
 *     fields: [
 *       { name: '/kick', value: 'Kicks a user from the server', inline: true },
 *       { name: '/ban', value: 'Bans a user from the server', inline: true }
 *     ]
 *   })
 * ];
 *
 * // Display the paginated embeds with custom options
 * await sendPaginatedEmbed(interaction.channel, helpEmbeds, {
 *   timeout: 120000, // 2 minutes before buttons are disabled
 *   userId: interaction.user.id, // Only the command user can navigate
 *   startPage: 0, // Start at first page
 *   buttons: [
 *     {
 *       id: 'refresh',
 *       label: 'Refresh',
 *       style: ButtonStyle.Secondary,
 *       callback: (page) => page // Return current page to refresh it
 *     }
 *   ]
 * });
 */
export function sendPaginatedEmbed(
  channel: GuildTextBasedChannel | DMChannel,
  embeds: EmbedBuilder[],
  options?: {
    timeout?: number;
    startPage?: number;
    userId?: string;
    buttons?: ButtonOption[];
  }
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (embeds.length === 0) return reject(new Error('No embeds provided'));

    const timeout = options?.timeout ?? 60000;
    let currentPage = Math.min(options?.startPage ?? 0, embeds.length - 1);
    const userId = options?.userId;

    const defaultButtons = [
      { id: 'first', label: '⏮️', style: ButtonStyle.Secondary, callback: () => 0 },
      { id: 'prev', label: '◀️', style: ButtonStyle.Primary, callback: (page: number) => (page > 0 ? page - 1 : embeds.length - 1) },
      { id: 'next', label: '▶️', style: ButtonStyle.Primary, callback: (page: number) => (page < embeds.length - 1 ? page + 1 : 0) },
      { id: 'last', label: '⏭️', style: ButtonStyle.Secondary, callback: () => embeds.length - 1 }
    ];

    const allButtons = [...defaultButtons, ...(options?.buttons ?? [])];
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      allButtons.map(btn =>
        new ButtonBuilder().setCustomId(btn.id).setLabel(btn.label).setStyle(btn.style)
      )
    );

    const message = await channel.send({
      embeds: [embeds[currentPage].setFooter({ text: `Page ${currentPage + 1}/${embeds.length}` })],
      components: [row]
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (interaction) => {
        if (userId && interaction.user.id !== userId) {
          interaction.reply({ content: 'You cannot use these buttons.', ephemeral: true });
          return false;
        }
        return allButtons.some(button => button.id === interaction.customId);
      },
      time: timeout
    });

    collector.on('collect', async (interaction) => {
      const button = allButtons.find(b => b.id === interaction.customId);
      if (!button) return;

      currentPage = button.callback(currentPage);
      await interaction.update({
        embeds: [embeds[currentPage].setFooter({ text: `Page ${currentPage + 1}/${embeds.length}` })],
        components: [row]
      });
    });

    collector.on('end', () => {
      message.edit({ components: [] }).catch(() => {});
      resolve();
    });
  });
}
