import {
  Collection,
  GuildMember,
  Message,
  Role,
  TextBasedChannel,
} from 'discord.js';

/**
 * Fetches all messages from a channel up to the limit
 * @param channel - The channel to fetch messages from
 * @param limit - Maximum number of messages to fetch (default: 100)
 * @returns {Promise<Collection<string, Message>>} - Collection of fetched messages
 * @example
 * // Fetch up to 200 messages from a channel
 * const messages = await fetchAllMessages(channel, 200);
 *
 * // Find messages containing a specific word
 * const filtered = messages.filter(msg => msg.content.includes('hello'));
 * console.log(`Found ${filtered.size} messages containing 'hello'`);
 */
export async function fetchAllMessages(
  channel: TextBasedChannel,
  limit = 100
): Promise<Collection<string, Message>> {
  if (!channel.isTextBased()) {
    return new Collection<string, Message>();
  }

  let lastId: string | undefined;
  const allMessages = new Collection<string, Message>();
  let remainingLimit = limit;

  while (remainingLimit > 0) {
    const fetchLimit = Math.min(remainingLimit, 100);
    const options = { limit: fetchLimit, ...(lastId && { before: lastId }) };

    const messages = await channel.messages.fetch(options);

    if (messages.size === 0) {
      break;
    }

    for (const [id, message] of messages) {
      allMessages.set(id, message);
    }

    remainingLimit -= messages.size;
    lastId = messages.last()?.id;
  }

  return allMessages;
}

/**
 * Gets the highest role of a guild member
 * @param member - The guild member to get the highest role from
 * @returns {Role | null} - The highest role of the member or null if they have no roles
 * @example
 * // Get the highest role of a member
 * const highestRole = getHighestRole(member);
 *
 * if (highestRole) {
 *   console.log(`Highest role: ${highestRole.name}`);
 *   console.log(`Role color: ${highestRole.hexColor}`);
 *   console.log(`Position: ${highestRole.position}`);
 * } else {
 *   console.log('Member has no roles');
 * }
 */
export function getHighestRole(
  member: GuildMember
): Role | null {
  if (!member.roles.cache.size) {
    return null;
  }

  return member.roles.highest;
}

/**
 * Returns a channel mention string that renders as a clickable link in Discord
 * @param id - The ID of the channel to mention
 * @returns {string} - A formatted channel mention that will appear as a clickable link in Discord
 * @example
 * // Create a welcome message with channel mentions
 * const rulesChannelId = '123456789012345678';
 * const welcomeMessage = `Please read our rules in ${getChannelMention(rulesChannelId)}`;
 *
 * // Output: Please read our rules in <#123456789012345678>
 * // The channel mention will be clickable in Discord
 */
export function getChannelMention(id: string): string {
  return `<#${id}>`;
}
