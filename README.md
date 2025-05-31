# yebe

Reusable TypeScript utilities for Discord bot development.

## 📦 Installation

```bash
npm install yebe
```

## 📄 Utility Functions

### Messages & Pagination

| Function               | Description                                                           |
|------------------------|-----------------------------------------------------------------------|
| `sendPaginatedMessage` | Send multi-page content with buttons and optional custom actions      |
| `splitLongMessage`     | Splits a long message into chunks to avoid Discord's 2000-char limit  |
| `replyWithAutoDelete`  | Replies to a message and deletes it after a delay                     |
| `waitForMessage`       | Waits for the next message in a channel that matches a filter         |
| `isBotMentioned`       | Checks if the bot was mentioned in a message                          |
| `awaitReaction`        | Waits for a user to react to a message with specific emojis           |
| `batchDeleteMessages`  | Delete multiple messages with advanced filtering options              |

### Embeds

| Function               | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `buildEmbed`           | Creates a custom embed with flexible options                                |
| `buildSuccessEmbed`    | Pre-styled green embed for success messages                                 |
| `buildErrorEmbed`      | Pre-styled red embed for error messages                                     |
| `addFieldChunked`      | Adds large field values in chunks to avoid character limits                 |
| `chunkEmbedFields`     | Splits large embed field arrays into groups of 25 for Discord compliance    |
| `buildPaginatedEmbed`  | Sends embeds with pagination controls and interactive buttons               |

### Interactions

| Function                  | Description                                                               |
|---------------------------|---------------------------------------------------------------------------|
| `waitButton`              | Waits for a button interaction from a specific user                       |
| `waitSelectMenu`          | Waits for a select menu interaction from a specific user                  |
| `interactiveConfirm`      | Sends confirm/cancel buttons and waits for a user decision                |
| `createButtonRow`         | Builds a row of buttons                                                   |
| `createDisabledButtonRow` | Creates a disabled version of a button row                                |
| `collectorWithTimeout`    | Wraps a collector with a timeout and optional end callback                |
| `isInteractionButton`     | Type guard to check if interaction is a button                            |
| `isValidInteraction`      | Checks if an interaction is a valid button interaction                    |

### Command Utils

| Function             | Description                                                               |
|----------------------|---------------------------------------------------------------------------|
| `cooldownManager`    | Tracks per-user command cooldowns                                         |
| `deferOrReply`       | Abstracts interaction defer/reply/editReply patterns                      |

### Data Utilities

| Function             | Description                                                               |
|----------------------|---------------------------------------------------------------------------|
| `fetchAllMessages`   | Fetches all messages from a channel up to a set limit                     |
| `getHighestRole`     | Returns the highest role of a guild member                                |
| `getChannelMention`  | Returns a formatted channel mention string                                |



### Formatting

| Function             | Description                                                               |
|----------------------|---------------------------------------------------------------------------|
| `formatTimeAgo`      | Creates a human-readable relative time string from a timestamp            |
| `escapeMarkdown`     | Escapes Discord markdown characters in text                               |
| `cleanContent`       | Sanitizes mentions and markdown in message content                        |
| `sanitizeInput`      | Removes potentially dangerous content from user input                     |

### Users & Members

| Function               | Description                                                             |
|------------------------|-------------------------------------------------------------------------|
| `getUserDisplayName`   | Gets the most appropriate display name for a user                       |
| `hasAnyRole`           | Checks if a member has any of the specified roles                       |
| `getMembersByRole`     | Gets all members with a specific role                                   |
| `canMemberManage`      | Checks if a member can manage another member (role hierarchy)           |
| `getMemberPermissionsIn` | Gets member's effective permissions in a specific channel             |
| `checkPermissions`     | Verifies if a member has the required permissions                       |
| `addMemberRole`        | Adds a role to a member with options for reason and error handling      |
| `removeMemberRole`     | Removes a role from a member with options for reason and error handling |
| `bulkRoleManager`      | Add/remove roles for multiple members at once with feedback tracking    |

### Channels

| Function               | Description                                                             |
|------------------------|-------------------------------------------------------------------------|
| `findChannelByName`    | Finds a channel by name with optional fuzzy matching                    |
| `getThreadsInChannel`  | Gets all active threads in a channel                                    |
| `getVisibleChannels`   | Gets all channels that are visible to a member                          |
| `isValidChannel`       | Checks if a channel is valid and optionally matches a given type        |
| `isDM`                 | Checks if a message or channel is from a DM context                     |
