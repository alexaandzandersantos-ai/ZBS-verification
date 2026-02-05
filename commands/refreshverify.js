const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshverify')
    .setDescription('Refresh the verification message (admin only)'),

  async execute(interaction, client) {
    // Admin check
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await client.sendOrReplaceVerificationMessage();
      await interaction.editReply('✅ Verification message refreshed.');
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Failed to refresh verification message.');
    }
  }
};
