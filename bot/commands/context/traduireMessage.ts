import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} from 'discord.js';
import type { Command } from '@/types';

const TranslateMessageCommand: Command = {
  data: new ContextMenuCommandBuilder()
    .setName('Traduire le message')
    .setType(ApplicationCommandType.Message),

  async execute(interaction: MessageContextMenuCommandInteraction) {
    if (!interaction.guild || !interaction.targetMessage.content) {
      await interaction.reply({
        content:
          "Cette commande ne peut être utilisée que sur un message contenant du texte dans un serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`translate_select_${interaction.targetMessage.id}`)
        .setPlaceholder('Choisir une langue de destination...')
        .addOptions(
            { label: 'Français', value: 'French' },
            { label: 'Anglais', value: 'English' },
            { label: 'Espagnol', value: 'Spanish' },
            { label: 'Allemand', value: 'German' },
            { label: 'Japonais', value: 'Japanese' },
            { label: 'Chinois (Simplifié)', value: 'Chinese (Simplified)' },
            { label: 'Russe', value: 'Russian' }
        )
    );

    await interaction.reply({
      content: 'Dans quelle langue souhaitez-vous traduire ce message ?',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default TranslateMessageCommand;
