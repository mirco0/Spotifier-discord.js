require('dotenv').config()
const { Client, GatewayIntentBits, GatewayDispatchEvents } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
  if (interaction.commandName === 'followme'){
    
  }
});

client.on('messageCreate',siu);

function siu(){
    console.log(client.application)
}
client.login(process.env.DISCORD_TOKEN);