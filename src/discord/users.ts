import {
  GuildMember,
  User,
  Role,
  Collection,
  PermissionResolvable,
  Guild,
  PermissionFlagsBits,
  GuildBasedChannel
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
        missingPerms.push('Unknown permission');
      }
    }
  }

  return { hasPermission, missing: missingPerms };
}
