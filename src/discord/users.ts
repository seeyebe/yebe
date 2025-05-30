import {
  GuildMember,
  User,
  Role,
  Collection,
  PermissionResolvable,
  Guild,
  PermissionFlagsBits,
  GuildBasedChannel,
  DMChannel,
  MessageCreateOptions,
  MessagePayload,
} from 'discord.js';

/**
 * Gets the most appropriate display name for a user or guild member
 * @param userOrMember - User or GuildMember object
 * @param preferNicknames - Whether to prefer nicknames over usernames (default: true)
 * @returns {string} - The display name (nickname or username)
 * @example
 * // Get a member's display name (nickname if set, username otherwise)
 * const displayName = getUserDisplayName(member);
 * await message.reply(`Hello, ${displayName}!`);
 *
 * // Force username even when nickname exists
 * const username = getUserDisplayName(member, false);
 * console.log(`User's actual name is ${username}`);
 */
export function getUserDisplayName(
  userOrMember: User | GuildMember,
  preferNicknames = true
): string {
  if (userOrMember instanceof GuildMember) {
    if (preferNicknames && userOrMember.nickname) {
      return userOrMember.nickname;
    }
    return userOrMember.user.username;
  }

  // For users (not in guild context), return username
  return userOrMember.username;
}

/**
 * Checks if a member has any of the specified roles
 * @param memberOrUser - The guild member or user to check roles for
 * @param roles - Array of role IDs, names, or Role objects to check
 * @returns {boolean} - True if the member has at least one of the roles, false if input is a User (not GuildMember)
 * @example
 * // Check if member has any of multiple staff roles
 * const isStaff = hasAnyRole(
 *   member,
 *   ['admin', 'moderator', '123456789012345678']
 * );
 *
 * if (isStaff) {
 *   await message.reply('You have staff permissions.');
 * } else {
 *   await message.reply('You need staff permissions for this command.');
 * }
 *
 * // When dealing with a user from message.author, you need to fetch the GuildMember
 * try {
 *   const member = await message.guild?.members.fetch(message.author.id);
 *   const isAdmin = hasAnyRole(member, ['admin']);
 * } catch (error) {
 *   console.error('Could not get member from user');
 * }
 */
export function hasAnyRole(
  memberOrUser: GuildMember | User,
  roles: (string | Role)[]
): boolean {
  // If the input is a User and not a GuildMember, we can't check roles
  if (!(memberOrUser instanceof GuildMember)) {
    return false;
  }

  const member = memberOrUser;

  // Guard against empty inputs
  if (!roles.length || !member.roles?.cache?.size) {
    return false;
  }

  return roles.some(role => {
    if (typeof role === 'string') {
      if (/^\d+$/.test(role)) {
        return member.roles.cache.has(role);
      }
      return member.roles.cache.some(r => r.name.toLowerCase() === role.toLowerCase());
    }
    return member.roles.cache.has(role.id);
  });
}

/**
 * Gets all members with a specific role
 * @param role - Role to check for (ID, name, or Role object)
 * @param guild - Guild to search in
 * @returns {Collection<string, GuildMember>} - Collection of members with the specified role
 * @example
 * // Get all moderators in the server
 * const moderators = await getMembersByRole('Moderator', guild);
 * console.log(`There are ${moderators.size} moderators.`);
 *
 * // List members with a specific role
 * const roleMembers = await getMembersByRole('123456789012345678', guild);
 * const memberList = roleMembers.map(m => m.displayName).join(', ');
 * await message.reply(`Members with this role: ${memberList}`);
 */
export async function getMembersByRole(
  role: string | Role,
  guild: Guild
): Promise<Collection<string, GuildMember>> {
  await guild.members.fetch();

  let targetRole: Role | null = null;

  if (typeof role === 'string') {
    if (/^\d+$/.test(role)) {
      targetRole = guild.roles.cache.get(role) || null;
    } else {
      targetRole = guild.roles.cache.find(r =>
        r.name.toLowerCase() === role.toLowerCase()
      ) || null;
    }
  } else {
    targetRole = role;
  }

  if (!targetRole) {
    return new Collection<string, GuildMember>();
  }

  return guild.members.cache.filter(member =>
    member.roles.cache.has(targetRole!.id)
  );
}

/**
 * Checks if a member can manage another member (role hierarchy check)
 * @param member - The member attempting the action
 * @param target - The target member
 * @returns {boolean} - True if the member can manage the target
 * @example
 * // Check if a moderator can kick a user
 * if (!canMemberManage(moderator, targetUser)) {
 *   return message.reply('You cannot moderate a member with equal or higher roles.');
 * }
 *
 * // Safety check before applying moderation
 * if (canMemberManage(message.member, targetMember)) {
 *   await targetMember.timeout(60000);
 *   await message.reply('User has been timed out for 1 minute.');
 * }
 */
export function canMemberManage(
  member: GuildMember,
  target: GuildMember
): boolean {
  if (member.id === target.id) {
    return false;
  }

  if (member.id === member.guild.ownerId) {
    return true;
  }

  if (target.id === target.guild.ownerId) {
    return false;
  }

  return member.roles.highest.position > target.roles.highest.position;
}

/**
 * Gets a member's effective permissions in a specific channel
 * @param member - The guild member to check permissions for
 * @param channel - The channel to check permissions in
 * @returns {bigint} - Bitfield of member's permissions in the channel
 * @example
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * // Check if a member can manage messages in a specific channel
 * const permissions = getMemberPermissionsIn(member, channel);
 * const canManageMessages = (permissions & PermissionFlagsBits.ManageMessages) === PermissionFlagsBits.ManageMessages;
 *
 * if (canManageMessages) {
 *   await message.reply('You can manage messages in this channel.');
 * }
 */
export function getMemberPermissionsIn(
  member: GuildMember,
  channel: GuildBasedChannel
): bigint {
  if (member.id === member.guild.ownerId) {
    return Object.values(PermissionFlagsBits).reduce(
      (acc, perm) => acc | perm, 0n
    );
  }

  const permissions = channel.permissionsFor(member);
  return permissions ? permissions.bitfield : 0n;
}

/**
 * Checks if a member has the required permissions
 * @param member - The guild member to check permissions for
 * @param requiredPerms - Array of permissions to check
 * @returns {object} - Object containing permission status
 * @returns {boolean} hasPermission - Whether the member has all required permissions
 * @returns {string[]} missing - Array of missing permission names
 * @example
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * const { hasPermission, missing } = checkPermissions(
 *   member,
 *   [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers]
 * );
 *
 * if (!hasPermission) {
 *   return `Missing permissions: ${missing.join(', ')}`;
 * }
 */
export function checkPermissions(
  member: GuildMember | null,
  requiredPerms: PermissionResolvable[]
): { hasPermission: boolean; missing: string[] } {
  if (!member) {
    return { hasPermission: false, missing: ['Member not found'] };
  }

  const missingPerms: string[] = [];
  let hasPermission = true;

  for (const perm of requiredPerms) {
    if (!member.permissions.has(perm)) {
      hasPermission = false;
      if (typeof perm === 'string') {
        missingPerms.push(perm);
      } else {
        const entry = Object.entries(PermissionFlagsBits).find(([, value]) => value === perm);
        missingPerms.push(entry?.[0] ?? 'Unknown permission');
      }
    }
  }

  return { hasPermission, missing: missingPerms };
}

/**
 * Sends a direct message to a user with error handling
 * @param userOrMember - The user or guild member to send the DM to
 * @param content - The message content to send
 * @param options - Configuration options for sending the DM
 * @param options.throwError - Whether to throw an error if the DM fails (default: false)
 * @param options.fallbackAction - Optional callback function to execute if DM fails
 * @returns {Promise<DMChannel | null>} - The DM channel if successful, null if failed and not throwing
 * @example
 * // Simple DM to a user
 * try {
 *   await sendDM(user, 'Your verification was successful!');
 *   console.log('DM sent successfully');
 * } catch (error) {
 *   console.error('Failed to send DM');
 * }
 *
 * // With rich embed content
 * const embed = buildEmbed({
 *   title: 'Welcome to the server!',
 *   description: 'Thank you for joining our community.',
 *   color: 'Green'
 * });
 *
 * await sendDM(member, { embeds: [embed] });
 *
 * // With fallback for users who have DMs disabled
 * await sendDM(user, 'Your verification code is: 123456', {
 *   fallbackAction: async () => {
 *     await channel.send(`${user}, I couldn't DM you. Please enable direct messages.`);
 *   }
 * });
 *
 * // When you need to know if the DM was successful
 * const dmChannel = await sendDM(member, 'Important notification');
 * if (dmChannel) {
 *   console.log('User has received the message');
 * } else {
 *   console.log('User has DMs disabled');
 * }
 */
export async function sendDM(
  userOrMember: User | GuildMember,
  content: string | MessagePayload | MessageCreateOptions,
  options?: {
    throwError?: boolean;
    fallbackAction?: () => Promise<void>;
  }
): Promise<DMChannel | null> {
  const user = userOrMember instanceof GuildMember ? userOrMember.user : userOrMember;
  const { throwError = false, fallbackAction } = options || {};

  try {
    const dmChannel = await user.createDM();

    await dmChannel.send(content);

    return dmChannel;
  } catch (error) {
    if (fallbackAction) {
      await fallbackAction();
    }

    if (throwError) {
      throw new Error(`Failed to send DM to ${user.tag}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return null;
  }
}

/**
 * Gets a random member from a guild with optional role filter
 * @param guild - The guild to select a random member from
 * @param options - Optional configuration options
 * @param options.excludeBots - Whether to exclude bot users (default: true)
 * @param options.roleFilter - Role ID or Role object to filter members by
 * @param options.onlineOnly - Only include online members (default: false)
 * @returns {GuildMember | null} - A random guild member or null if none match criteria
 * @example
 * // Get a random member from the server
 * const winner = getRandomMember(guild);
 * if (winner) {
 *   await channel.send(`Congratulations ${winner}! You've been randomly selected.`);
 * }
 *
 * // Get a random member with a specific role
 * const subscriber = getRandomMember(guild, {
 *   roleFilter: '123456789012345678',
 *   onlineOnly: true
 * });
 */
export function getRandomMember(
  guild: Guild,
  options: {
    excludeBots?: boolean;
    roleFilter?: string | Role;
    onlineOnly?: boolean;
  } = {}
): GuildMember | null {
  const { excludeBots = true, roleFilter, onlineOnly = false } = options;

  let members = guild.members.cache.filter(member => {
    if (excludeBots && member.user.bot) {
      return false;
    }

    if (roleFilter) {
      const roleId = typeof roleFilter === 'string' ? roleFilter : roleFilter.id;
      if (!member.roles.cache.has(roleId)) {
        return false;
      }
    }

    if (onlineOnly && member.presence?.status !== 'online') {
      return false;
    }

    return true;
  });

  if (members.size === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * members.size);
  return members.at(randomIndex) || null;
}

/**
 * Finds a member in a guild by their name or nickname with optional fuzzy matching
 * @param guild - The guild to search within
 * @param name - The name or nickname to search for
 * @param options - Optional configuration options
 * @param options.exact - Whether to require an exact match (default: false)
 * @param options.caseSensitive - Whether to make the search case-sensitive (default: false)
 * @param options.includeTag - Whether to include discriminator in search (default: false)
 * @returns {GuildMember | null} - The found member or null if no match is found
 * @example
 * // Find a member by name with fuzzy matching
 * const member = findMemberByName(guild, 'seeyebe');
 * if (member) {
 *   await channel.send(`Found member: ${member.displayName}`);
 * }
 *
 * // Find a member with exact name match
 * const member = findMemberByName(guild, 'foo bar', { exact: true });
 */
export function findMemberByName(
  guild: Guild,
  name: string,
  options: {
    exact?: boolean;
    caseSensitive?: boolean;
    includeTag?: boolean;
  } = {}
): GuildMember | null {
  const { exact = false, caseSensitive = false, includeTag = false } = options;

  if (!name || !guild) {
    return null;
  }

  const searchName = caseSensitive ? name : name.toLowerCase();

  const exactMatch = guild.members.cache.find(member => {
    const username = caseSensitive ? member.user.username : member.user.username.toLowerCase();
    const nickname = member.nickname ? (caseSensitive ? member.nickname : member.nickname.toLowerCase()) : null;
    const tag = includeTag ? (caseSensitive ? member.user.tag : member.user.tag.toLowerCase()) : null;

    return username === searchName ||
           (nickname && nickname === searchName) ||
           (includeTag && tag === searchName);
  });

  if (exactMatch || exact) {
    return exactMatch || null;
  }

  return guild.members.cache.find(member => {
    const username = caseSensitive ? member.user.username : member.user.username.toLowerCase();
    const nickname = member.nickname ? (caseSensitive ? member.nickname : member.nickname.toLowerCase()) : null;
    const tag = includeTag ? (caseSensitive ? member.user.tag : member.user.tag.toLowerCase()) : null;

    return username.includes(searchName) ||
           (nickname && nickname.includes(searchName)) ||
           (includeTag && tag && tag.includes(searchName));
  }) || null;
}

/**
 * Gets a sorted array of a member's roles
 * @param member - The guild member to get roles for
 * @param options - Optional configuration options
 * @param options.excludeEveryone - Whether to exclude the @everyone role (default: true)
 * @param options.sortBy - How to sort the roles ('position', 'name', or 'id') (default: 'position')
 * @param options.sortDescending - Whether to sort in descending order (default: true)
 * @returns {Role[]} - Array of the member's roles
 * @example
 * // Get all roles for a member sorted by position (highest first)
 * const roles = getUserRoles(member);
 * console.log(`${member.displayName} has ${roles.length} roles`);
 *
 * // Get roles sorted by name (alphabetically)
 * const rolesByName = getUserRoles(member, {
 *   sortBy: 'name',
 *   sortDescending: false
 * });
 *
 * // List all role names
 * const roleNames = getUserRoles(member)
 *   .map(role => role.name)
 *   .join(', ');
 * await channel.send(`Your roles: ${roleNames}`);
 */
export function getUserRoles(
  member: GuildMember,
  options: {
    excludeEveryone?: boolean;
    sortBy?: 'position' | 'name' | 'id';
    sortDescending?: boolean;
  } = {}
): Role[] {
  const {
    excludeEveryone = true,
    sortBy = 'position',
    sortDescending = true
  } = options;

  let roles = [...member.roles.cache.values()];

  if (excludeEveryone) {
    roles = roles.filter(role => role.id !== member.guild.id);
  }

  roles.sort((a, b) => {
    let valueA: string | number;
    let valueB: string | number;

    switch (sortBy) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'id':
        valueA = a.id;
        valueB = b.id;
        break;
      case 'position':
      default:
        valueA = a.position;
        valueB = b.position;
        break;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDescending ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
    } else {
      return sortDescending ? Number(valueB) - Number(valueA) : Number(valueA) - Number(valueB);
    }
  });

  return roles;
}