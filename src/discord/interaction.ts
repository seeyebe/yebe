import {
  ButtonInteraction,
  Message,
  User,
  ComponentType,
  SelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  Collector,
  TextChannel,
  DMChannel,
  NewsChannel,
  ThreadChannel,
  ButtonStyle,
  APIEmbed,
  JSONEncodable,
  Interaction,
  Guild,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

const DEFAULT_TIMEOUT = 60000;

function isSendableChannel(
  channel: unknown
): channel is TextChannel | DMChannel | NewsChannel | ThreadChannel {
  return typeof channel === 'object' && channel !== null && 'send' in channel && typeof (channel as any).send === 'function';
}

function createConfirmButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm')
      .setLabel('✅ Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Danger)
  );
}

/**
 * Waits for a button interaction on the specified message
 * @param user - The user whose button press to wait for
 * @param message - The message containing the buttons
 * @param timeout - Time in milliseconds before resolving with null (default: 60000)
 * @returns {Promise<ButtonInteraction | null>} - The button interaction or null if timeout occurs
 * @example
 * // Create a message with buttons
 * const row = createButtonRow(
 *   new ButtonBuilder().setCustomId('accept').setLabel('Accept').setStyle(ButtonStyle.Success),
 *   new ButtonBuilder().setCustomId('reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
 * );
 *
 * const sentMessage = await channel.send({
 *   content: 'Do you accept the terms?',
 *   components: [row]
 * });
 *
 * // Wait for button press
 * const buttonInteraction = await waitButton(user, sentMessage, 30000);
 *
 * if (buttonInteraction) {
 *   if (buttonInteraction.customId === 'accept') {
 *     await buttonInteraction.update({ content: 'Terms accepted!', components: [] });
 *   } else {
 *     await buttonInteraction.update({ content: 'Terms rejected.', components: [] });
 *   }
 * } else {
 *   await sentMessage.edit({ content: 'No response received.', components: [] });
 * }
 */
export function waitButton(
  user: User,
  message: Message,
  timeout = DEFAULT_TIMEOUT
): Promise<ButtonInteraction | null> {
  return new Promise((resolve) => {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (interaction) => interaction.user.id === user.id,
      time: timeout,
      max: 1
    });

    collector.on('collect', (interaction) => {
      if (interaction.isButton()) {
        resolve(interaction);
      } else {
        resolve(null);
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        resolve(null);
      }
    });
  });
}

/**
 * Waits for a select menu interaction on the specified message
 * @param user - The user whose select menu choice to wait for
 * @param message - The message containing the select menu
 * @param timeout - Time in milliseconds before resolving with null (default: 60000)
 * @returns {Promise<SelectMenuInteraction | null>} - The select menu interaction or null if timeout occurs
 * @example
 * // Create a select menu for role selection
 * const row = new ActionRowBuilder<StringSelectMenuBuilder>()
 *   .addComponents(
 *     new StringSelectMenuBuilder()
 *       .setCustomId('role_select')
 *       .setPlaceholder('Choose your favorite role')
 *       .addOptions([
 *         { label: 'Moderator', value: 'mod', emoji: '🛡️' },
 *         { label: 'Developer', value: 'dev', emoji: '💻' },
 *         { label: 'Designer', value: 'design', emoji: '🎨' }
 *       ])
 *   );
 *
 * const sentMessage = await channel.send({
 *   content: 'Please select your primary role:',
 *   components: [row]
 * });
 *
 * // Wait for the user to make a selection
 * const selectInteraction = await waitSelectMenu(user, sentMessage);
 *
 * if (selectInteraction) {
 *   const selectedValue = selectInteraction.values[0];
 *   await selectInteraction.update({
 *     content: `You selected: ${selectedValue}!`,
 *     components: []  // Remove the select menu
 *   });
 * } else {
 *   await sentMessage.edit({
 *     content: 'You did not make a selection in time.',
 *     components: []
 *   });
 * }
 */
export function waitSelectMenu(
  user: User,
  message: Message,
  timeout = DEFAULT_TIMEOUT
): Promise<SelectMenuInteraction | null> {
  return new Promise((resolve) => {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.SelectMenu,
      filter: (interaction) => interaction.user.id === user.id,
      time: timeout,
      max: 1
    });

    collector.on('collect', (interaction) => {
      if (interaction.isAnySelectMenu()) {
        resolve(interaction);
      } else {
        resolve(null);
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        resolve(null);
      }
    });
  });
}

/**
 * Displays confirm/cancel buttons and waits for user choice
 * @param user - The user who can interact with the buttons
 * @param message - Either a Message object or an object containing channel and content
 * @returns {Promise<boolean>} - True if confirmed, false if canceled or timed out
 * @example
 * // Using with a channel and content
 * const confirmed = await interactiveConfirm(
 *   message.author,
 *   {
 *     channel: message.channel,
 *     content: 'Are you sure you want to delete your profile?'
 *   }
 * );
 *
 * if (confirmed) {
 *   await message.channel.send('Profile deleted successfully!');
 *   // Handle deletion logic
 * } else {
 *   await message.channel.send('Operation cancelled.');
 * }
 *
 * // Using with an existing message
 * const warnMessage = await message.channel.send('Warning: This action cannot be undone!');
 * const confirmed = await interactiveConfirm(message.author, warnMessage);
 *
 * // Handle the confirmation result
 * await message.channel.send(confirmed ? 'Proceeding with action!' : 'Action cancelled.');
 */
export async function interactiveConfirm(
  user: User,
  message: Message | { channel: TextChannel | DMChannel | NewsChannel | ThreadChannel; content: string; embeds?: unknown[] }
): Promise<boolean> {
  const channel = message instanceof Message
    ? message.channel
    : message.channel;

  if (!isSendableChannel(channel)) {
    throw new Error('Channel does not support sending messages.');
  }

  const content = message instanceof Message
    ? message.content
    : message.content;

  const embeds: (APIEmbed | JSONEncodable<APIEmbed>)[] = message instanceof Message
    ? message.embeds
    : (message.embeds as (APIEmbed | JSONEncodable<APIEmbed>)[] ?? []);

  const sentMessage = await channel.send({
    content,
    embeds,
    components: [createConfirmButtons()]
  });

  try {
    const interaction = await sentMessage.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i: ButtonInteraction) =>
        i.user.id === user.id && ['confirm', 'cancel'].includes(i.customId),
      time: DEFAULT_TIMEOUT
    });

    await interaction.update({ components: [] });
    return interaction.customId === 'confirm';
  } catch {
    await sentMessage.edit({ components: [] });
    return false;
  }
}

/**
 * Creates a button row with the provided buttons
 * @param buttons - The buttons to add to the row
 * @returns {ActionRowBuilder<ButtonBuilder>} - A row component with the provided buttons
 * @example
 * // Create a row with multiple buttons
 * const row = createButtonRow(
 *   new ButtonBuilder()
 *     .setCustomId('accept')
 *     .setLabel('Accept')
 *     .setStyle(ButtonStyle.Success),
 *   new ButtonBuilder()
 *     .setCustomId('reject')
 *     .setLabel('Reject')
 *     .setStyle(ButtonStyle.Danger),
 *   new ButtonBuilder()
 *     .setURL('https://discord.js.org')
 *     .setLabel('Documentation')
 *     .setStyle(ButtonStyle.Link)
 * );
 *
 * // Send a message with the button row
 * await channel.send({
 *   content: 'Please choose an option:',
 *   components: [row]
 * });
 */
export function createButtonRow(
  ...buttons: ButtonBuilder[]
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

/**
 * Creates a disabled version of a button row
 * @param row - The original button row to disable
 * @returns {ActionRowBuilder<ButtonBuilder>} - A new row with all buttons disabled
 * @example
 * // Create a row of buttons
 * const activeRow = createButtonRow(
 *   new ButtonBuilder()
 *     .setCustomId('vote_yes')
 *     .setLabel('Yes')
 *     .setStyle(ButtonStyle.Success),
 *   new ButtonBuilder()
 *     .setCustomId('vote_no')
 *     .setLabel('No')
 *     .setStyle(ButtonStyle.Danger)
 * );
 *
 * // Send the message with active buttons
 * const sentMessage = await channel.send({
 *   content: 'Vote now! Poll ends in 30 seconds.',
 *   components: [activeRow]
 * });
 *
 * // After the poll has ended, disable the buttons
 * setTimeout(async () => {
 *   const disabledRow = createDisabledButtonRow(activeRow);
 *   await sentMessage.edit({
 *     content: 'Voting has ended!',
 *     components: [disabledRow]
 *   });
 * }, 30000);
 */
export function createDisabledButtonRow(
  row: ActionRowBuilder<ButtonBuilder>
): ActionRowBuilder<ButtonBuilder> {
  const newRow = new ActionRowBuilder<ButtonBuilder>();

  for (const component of row.components) {
    if (component instanceof ButtonBuilder) {
      newRow.addComponents(
        ButtonBuilder.from(component).setDisabled(true)
      );
    }
  }

  return newRow;
}

/**
 * Creates a select menu component with customizable options
 * @param options - Configuration options for the select menu
 * @param options.customId - The custom ID for the select menu
 * @param options.placeholder - The placeholder text to show when nothing is selected
 * @param options.minValues - Minimum number of values to select (default: 1)
 * @param options.maxValues - Maximum number of values to select (default: 1)
 * @param options.choices - Array of choices for the select menu
 * @returns {ActionRowBuilder<StringSelectMenuBuilder>} - An action row containing the select menu
 * @example
 * // Create a simple role selection menu
 * const roleMenu = createSelectMenu({
 *   customId: 'role_select',
 *   placeholder: 'Select your preferred role',
 *   choices: [
 *     { label: 'Developer', value: 'dev', description: 'Software developer', emoji: '👨‍💻' },
 *     { label: 'Designer', value: 'design', description: 'UI/UX designer', emoji: '🎨' },
 *     { label: 'Manager', value: 'manager', description: 'Project manager', emoji: '📊' }
 *   ]
 * });
 *
 * await interaction.reply({
 *   content: 'Please select your role:',
 *   components: [roleMenu]
 * });
 *
 * // Create a multi-select menu
 * const languagesMenu = createSelectMenu({
 *   customId: 'languages',
 *   placeholder: 'Select programming languages',
 *   minValues: 1,
 *   maxValues: 3,
 *   choices: [
 *     { label: 'JavaScript', value: 'js' },
 *     { label: 'Python', value: 'py' },
 *     { label: 'Java', value: 'java' },
 *     { label: 'C#', value: 'csharp' },
 *     { label: 'Go', value: 'go' }
 *   ]
 * });
 */
export function createSelectMenu(
  options: {
    customId: string;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    choices: Array<{
      label: string;
      value: string;
      description?: string;
      emoji?: string;
      default?: boolean;
    }>;
  }
): ActionRowBuilder<StringSelectMenuBuilder> {
  const { customId, placeholder, minValues = 1, maxValues = 1, disabled = false, choices } = options;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setMinValues(minValues)
    .setMaxValues(maxValues)
    .setDisabled(disabled);

  if (placeholder) {
    selectMenu.setPlaceholder(placeholder);
  }

  const menuOptions = choices.map(choice => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(choice.label)
      .setValue(choice.value);

    if (choice.description) {
      option.setDescription(choice.description);
    }

    if (choice.emoji) {
      option.setEmoji(choice.emoji);
    }

    if (choice.default) {
      option.setDefault(choice.default);
    }

    return option;
  });

  selectMenu.addOptions(menuOptions);

  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(selectMenu);
}

/**
 * Creates a modal form with customizable components
 * @param options - Configuration options for the modal
 * @param options.customId - The custom ID for the modal
 * @param options.title - The title of the modal
 * @param options.components - Array of text input components
 * @returns {Modal} - The configured modal object ready to be shown
 * @example
 * // Create a feedback form modal
 * const feedbackModal = createModal({
 *   customId: 'feedback_form',
 *   title: 'Submit Feedback',
 *   components: [
 *     {
 *       customId: 'name',
 *       label: 'Your Name',
 *       style: 'SHORT',
 *       placeholder: 'foo bar',
 *       required: true
 *     },
 *     {
 *       customId: 'feedback',
 *       label: 'Your Feedback',
 *       style: 'PARAGRAPH',
 *       placeholder: 'Tell us what you think...',
 *       required: true,
 *       maxLength: 1000
 *     }
 *   ]
 * });
 *
 * // Show the modal when a button is clicked
 * client.on('interactionCreate', async (interaction) => {
 *   if (interaction.isButton() && interaction.customId === 'open_feedback') {
 *     await interaction.showModal(feedbackModal);
 *   }
 * });
 */
export function createModal(
  options: {
    customId: string;
    title: string;
    components: Array<{
      customId: string;
      label: string;
      style: 'SHORT' | 'PARAGRAPH';
      placeholder?: string;
      value?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
    }>;
  }
): any {
  const { customId, title, components } = options;

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  const rows = components.map(component => {
    const textInput = new TextInputBuilder()
      .setCustomId(component.customId)
      .setLabel(component.label)
      .setStyle(component.style === 'SHORT' ? TextInputStyle.Short : TextInputStyle.Paragraph);

    if (component.placeholder) {
      textInput.setPlaceholder(component.placeholder);
    }

    if (component.value) {
      textInput.setValue(component.value);
    }

    if (component.required !== undefined) {
      textInput.setRequired(component.required);
    }

    if (component.minLength) {
      textInput.setMinLength(component.minLength);
    }

    if (component.maxLength) {
      textInput.setMaxLength(component.maxLength);
    }

    const actionRow = new ActionRowBuilder<TextInputBuilder>();
    actionRow.addComponents(textInput);
    return actionRow;
  });

  modal.addComponents(...rows);

  return modal;
}

/**
 * Creates a collector with a timeout and an optional callback when it ends
 * @param collector - The collector to add the timeout handling to
 * @param onEnd - Optional callback function to execute when the collector ends
 * @returns {T} - The original collector with end event handling
 * @example
 * // Create a message collector
 * const filter = (m) => m.author.id === user.id;
 * const collector = channel.createMessageCollector({
 *   filter,
 *   time: 60000, // 1 minute
 *   max: 1
 * });
 *
 * // Add timeout handling and cleanup logic
 * collectorWithTimeout(collector, () => {
 *   console.log('Collector ended');
 *   message.edit({
 *     content: 'This interaction has timed out.',
 *     components: []
 *   }).catch(console.error);
 * });
 *
 * // Use the collector
 * collector.on('collect', (message) => {
 *   console.log(`Collected message: ${message.content}`);
 * });
 */
export function collectorWithTimeout<K, V, T extends Collector<K, V>>(
  collector: T,
  onEnd?: () => void
): T {
  collector.on('end', () => {
    if (onEnd) {
      onEnd();
    }
  });

  return collector;
}

/**
 * Checks if an interaction is a button interaction
 * @param interaction - The interaction object to check
 * @returns {boolean} - True if the interaction is a button interaction, false otherwise
 * @example
 * // In an interactionCreate event handler
 * client.on('interactionCreate', async (interaction) => {
 *   // Check if this is a button interaction
 *   if (isInteractionButton(interaction)) {
 *     // Now TypeScript knows this is a ButtonInteraction
 *     const customId = interaction.customId;
 *
 *     // Handle different buttons
 *     switch (customId) {
 *       case 'confirm':
 *         await interaction.reply('Confirmed!');
 *         break;
 *       case 'cancel':
 *         await interaction.reply('Cancelled.');
 *         break;
 *     }
 *   }
 * });
 */
export function isInteractionButton(
  interaction: unknown
): interaction is ButtonInteraction {
  return typeof interaction === 'object'
    && interaction !== null
    && 'isButton' in interaction
    && typeof (interaction as any).isButton === 'function'
    && (interaction as any).isButton();
}

/**
 * Checks if a message is a valid interaction
 * @param interaction - The interaction to check
 * @returns {boolean} - Returns true if the interaction is a valid button interaction in a guild, false otherwise
 * @example
 * // Check if interaction is valid before processing
 * if (!isValidInteraction(interaction)) {
 *   return 'Invalid interaction or not in a guild';
 * }
 *
 * // Type guard ensures interaction is treated as ButtonInteraction
 * // This means you can use guild-specific properties safely
 * const guild = interaction.guild;
 */
export function isValidInteraction(
  interaction: Interaction | null | undefined
): interaction is ButtonInteraction {
  return (
    interaction !== null &&
    interaction !== undefined &&
    interaction.isButton() &&
    interaction.guild instanceof Guild
  );
}
