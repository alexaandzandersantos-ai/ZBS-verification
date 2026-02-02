const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('otp')
    .setDescription('Submit OTP code'),

  async execute(interaction, client) {
    const session = client.sessions.get(interaction.user.id);
    if (!session || session.otpUsed) {
      return interaction.reply({
        content: 'You cannot submit OTP at this time.',
        ephemeral: true
      });
    }

    session.otpUsed = true;

    const modal = new ModalBuilder()
      .setCustomId('otp_modal')
      .setTitle('Enter OTP');

    const otpInput = new TextInputBuilder()
      .setCustomId('otp_code')
      .setLabel('OTP Code')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(otpInput)
    );

    await interaction.showModal(modal);
  }
};
