const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start verification process'),

  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId('phone_modal')
      .setTitle('Phone Verification');

    const phoneInput = new TextInputBuilder()
      .setCustomId('phone_number')
      .setLabel('Enter your phone number')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(phoneInput)
    );

    await interaction.showModal(modal);
  }
};
