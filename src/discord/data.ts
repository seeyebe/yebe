import {
  Collection,
  GuildMember,
  Message,
  Role,
  TextBasedChannel,
  Guild,
  GuildAuditLogsEntry,
  AuditLogEvent,
  User,
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

/**
 * Search and filter audit log entries with comprehensive filtering options
 * @param guild - The guild to search audit logs in
 * @param options - Configuration options for the search
 * @param options.type - Specific audit log event type to filter by
 * @param options.user - User who performed the action
 * @param options.target - Target user/entity of the action
 * @param options.limit - Maximum number of entries to fetch (default: 50)
 * @param options.before - Fetch entries before this entry ID
 * @param options.after - Fetch entries after this date
 * @param options.reason - Filter by audit log reason (partial match)
 * @param options.customFilter - Custom filter function for advanced filtering
 * @returns {Promise<GuildAuditLogsEntry[]>} - Array of matching audit log entries
 * @example
 * // Find all ban actions in the last 24 hours
 * const banEntries = await auditLogSearch(guild, {
 *   type: AuditLogEvent.MemberBanAdd,
 *   after: new Date(Date.now() - 24 * 60 * 60 * 1000)
 * });
 *
 * // Find actions performed by a specific moderator
 * const modActions = await auditLogSearch(guild, {
 *   user: moderatorId,
 *   limit: 100
 * });
 *
 * // Find role changes with specific reason
 * const roleChanges = await auditLogSearch(guild, {
 *   type: AuditLogEvent.MemberRoleUpdate,
 *   reason: 'promotion'
 * });
 *
 * // Advanced filtering with custom function
 * const complexSearch = await auditLogSearch(guild, {
 *   customFilter: (entry) => {
 *     return entry.changes &&
 *            entry.changes.some(change => change.key === 'nick') &&
 *            entry.createdTimestamp > Date.now() - 7 * 24 * 60 * 60 * 1000;
 *   }
 * });
 */
export async function auditLogSearch(
  guild: Guild,
  options: {
    type?: AuditLogEvent;
    user?: string | User;
    target?: string | User;
    limit?: number;
    before?: string;
    after?: Date;
    reason?: string;
    customFilter?: (entry: GuildAuditLogsEntry) => boolean;
  } = {}
): Promise<GuildAuditLogsEntry[]> {
  const {
    type,
    user,
    target,
    limit = 50,
    before,
    after,
    reason,
    customFilter
  } = options;

  const botMember = guild.members.me;
  if (!botMember?.permissions.has('ViewAuditLog')) {
    throw new Error('Bot does not have permission to view audit logs');
  }

  const fetchOptions: any = { limit };

  if (type !== undefined) {
    fetchOptions.type = type;
  }

  if (user) {
    fetchOptions.user = typeof user === 'string' ? user : user.id;
  }

  if (before) {
    fetchOptions.before = before;
  }

  try {
    const auditLogs = await guild.fetchAuditLogs(fetchOptions);
    let entries = Array.from(auditLogs.entries.values());

    if (target) {
      const targetId = typeof target === 'string' ? target : target.id;
      entries = entries.filter(entry => entry.targetId === targetId);
    }

    if (after) {
      entries = entries.filter(entry => entry.createdTimestamp > after.getTime());
    }

    if (reason) {
      entries = entries.filter(entry =>
        entry.reason && entry.reason.toLowerCase().includes(reason.toLowerCase())
      );
    }

    if (customFilter) {
      entries = entries.filter(customFilter);
    }

    return entries;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error(`Failed to fetch audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
