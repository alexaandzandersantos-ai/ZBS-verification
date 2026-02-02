require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
  require('./commands/verify').data.toJSON(),
  require('./commands/otp').data.toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
})();
