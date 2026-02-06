const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshverify')
    .setDescription('Refresh the verification message (authorized roles only)'),

  async execute(interaction, client) {
    const allowedRoles = process.env.REFRESH_VERIFY_ROLE_IDS
      .split(',')
      .map(id => id.trim());

    const memberRoles = interaction.member.roles.cache;

    const hasPermission = allowedRoles.some(roleId =>
      memberRoles.has(roleId)
    );

    if (!hasPermission) {
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
