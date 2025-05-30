import {
  Guild,
  GuildBasedChannel,
  Collection,
  GuildMember,
  ChannelType,
  ThreadChannel,
  BaseGuildTextChannel,
  TextChannel,
  PermissionFlagsBits,
  GuildTextBasedChannel,
  Channel,
  Message
} from 'discord.js';

/**
 * Finds a channel by name with optional fuzzy matching
 * @param guild - The guild to search channels in
 * @param name - The name to search for
 * @param options - Optional configuration for the search
 * @param options.exact - Whether to require exact name match (default: false)
 * @param options.type - Channel type to filter by
 * @param options.includeThreads - Whether to include threads in the search (default: false)
 * @returns {GuildBasedChannel | null} - The found channel or null
 * @example
 * // Find a channel that contains "rules" in its name
 * const rulesChannel = findChannelByName(guild, 'rules');
 *
 * if (rulesChannel) {
 *   await rulesChannel.send('New rules have been added!');
 * }
 *
 * // Find a voice channel with exact name match
 * const voiceChannel = findChannelByName(guild, 'General Voice', {
 *   exact: true,
 *   type: ChannelType.GuildVoice
 * });
 */
export function findChannelByName(
  guild: Guild,
  name: string,
  options: {
    exact?: boolean;
    type?: ChannelType;
    includeThreads?: boolean;
  } = {}
): GuildBasedChannel | null {
  const { exact = false, type, includeThreads = false } = options;
  const normalizedName = name.toLowerCase();

  const nameMatches = (channelName: string) => {
    channelName = channelName.toLowerCase();
    return exact ? channelName === normalizedName : channelName.includes(normalizedName);
  };

  let channel = guild.channels.cache.find(ch => {
    if (type && ch.type !== type) {
      return false;
    }
    return nameMatches(ch.name);
  });

  if (!channel && includeThreads) {
    guild.channels.cache.forEach(ch => {
      if (ch.isTextBased() && 'threads' in ch) {
        const textChannel = ch as BaseGuildTextChannel;
        const thread = textChannel.threads.cache.find(t => nameMatches(t.name));
        if (thread) {
          channel = thread;
          return;
        }
      }
    });
  }

  return channel || null;
}

/**
 * Gets all active threads in a text channel
 * @param channel - The text channel to get threads from
 * @param options - Optional configuration for fetching threads
 * @param options.fetchAll - Whether to fetch all threads (including archived) (default: false)
 * @returns {Promise<Collection<string, ThreadChannel>>} - Collection of threads in the channel
 * @example
 * // Get active threads in a channel
 * const threads = await getThreadsInChannel(channel);
 * console.log(`This channel has ${threads.size} active threads.`);
 *
 * // Get all threads including archived ones
 * const allThreads = await getThreadsInChannel(channel, { fetchAll: true });
 * const threadList = allThreads.map(t => `#${t.name}`).join(', ');
 * await message.reply(`All threads: ${threadList}`);
 */
export async function getThreadsInChannel(
  channel: TextChannel,
  options: { fetchAll?: boolean } = {}
): Promise<Collection<string, ThreadChannel>> {
  const { fetchAll = false } = options;

  if (!fetchAll) {
    return channel.threads.cache;
  }

  const [publicThreads, privateThreads] = await Promise.all([
    channel.threads.fetchArchived({ type: 'public' }),
    channel.threads.fetchArchived({ type: 'private' })
  ]);

  const allThreads = new Collection<string, ThreadChannel>();

  channel.threads.cache.forEach(thread => {
    allThreads.set(thread.id, thread);
  });

  publicThreads.threads.forEach(thread => {
    if (!allThreads.has(thread.id)) {
      allThreads.set(thread.id, thread);
    }
  });

  privateThreads.threads.forEach(thread => {
    if (!allThreads.has(thread.id)) {
      allThreads.set(thread.id, thread);
    }
  });

  return allThreads;
}

/**
 * Gets all channels that are visible to a guild member
 * @param member - The guild member to check channel visibility for
 * @param options - Optional configuration for filtering channels
 * @param options.types - Array of channel types to include (default: all)
 * @param options.categoryId - Only include channels in this category (optional)
 * @returns {Collection<string, GuildBasedChannel>} - Collection of visible channels
 * @example
 * // Get all text channels visible to a member
 * const visibleChannels = getVisibleChannels(member, {
 *   types: [ChannelType.GuildText]
 * });
 *
 * // List all announcement channels visible to a member
 * const announceChannels = getVisibleChannels(member, {
 *   types: [ChannelType.GuildAnnouncement]
 * });
 * const channelList = announceChannels.map(c => `#${c.name}`).join(', ');
 * await message.reply(`Visible announcement channels: ${channelList}`);
 */
export function getVisibleChannels(
  member: GuildMember,
  options: {
    types?: ChannelType[];
    categoryId?: string;
  } = {}
): Collection<string, GuildBasedChannel> {
  const { types, categoryId } = options;

  return member.guild.channels.cache.filter(channel => {
    if (types && !types.includes(channel.type)) {
      return false;
    }

    if (categoryId && 'parentId' in channel && channel.parentId !== categoryId) {
      return false;
    }

    const permissions = channel.permissionsFor(member);
    return permissions?.has(PermissionFlagsBits.ViewChannel) ?? false;
  });
}

/**
 * Checks if a channel is a valid channel of the specified type
 * @param channel - The channel to check, can be a Channel, Message, or an object containing a channel
 * @param type - The type of channel to check against, optional
 * @returns {boolean} - Returns true if the channel is valid and matches the specified type, false otherwise
 * @example
 * import { ChannelType } from 'discord.js';
 *
 * // Check if channel is a text channel
 * if (!isValidChannel(channel, ChannelType.GuildText)) {
 *   return 'This command can only be used in text channels';
 * }
 *
 * // Check if channel exists (any type)
 * if (!isValidChannel(channel)) {
 *   return 'Invalid channel';
 * }
 */
export function isValidChannel<T extends ChannelType>(
  channel: Channel | null | undefined,
  type?: T
): boolean {
  if (!channel) {
    return false;
  }

  if (type === undefined) {
    return true;
  }

  return channel.type === type;
}

/**
 * Checks if a channel is a direct message (DM) channel
 * @param channel - The channel to check, can be a Channel, Message, or an object containing a channel
 * @returns {boolean} - Returns true if the channel is a DM channel, false otherwise
 * @example
 * // Check if command is used in DMs
 * if (isDM(message)) {
 *   return 'This command cannot be used in DMs';
 * }
 *
 * // Conditional message based on channel type
 * const response = isDM(channel)
 *   ? 'This is a private message'
 *   : 'This is a server channel';
 */
export function isDM(
  channel: Channel | Message | { channel: Channel }
): boolean {
  const targetChannel = 'channel' in channel ? channel.channel : channel;
  return targetChannel.type === 1 || targetChannel.type === 3;
}
