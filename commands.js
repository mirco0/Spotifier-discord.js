require('dotenv').config()
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
    name: 'followme',
    description: 'enters the voice channel and plays your playlist'
  },
  {
    name: 'play',
    description: 'plays a song from youtube url',
    options: [{
      name: 'input',
      description: 'video URL to play',
      type: ApplicationCommandOptionType.String,
      required: true
    }]

  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);


rest.get(Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID))
    .then(data => {
        const promises = [];
        for (const command of data) {
            const deleteUrl = `${Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID)}/${command.id}`;
            promises.push(rest.delete(deleteUrl));
        }
        return Promise.all(promises);
    });


(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();