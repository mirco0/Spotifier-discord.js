require('dotenv').config()
const { Client, GatewayIntentBits, GatewayDispatchEvents, Events } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates ] });
const { generateDependencyReport, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }

    if (interaction.commandName === 'followme'){

        let voiceChannelId = getUserVoiceChannel(interaction.member.voice.channel);
        
        if(voiceChannelId){
            connectVoiceChannel(voiceChannelId);
            interaction.reply("Playing");
            
        }else{
            client.channels.send("Devi essere connesso a un canale vocale");
        }

    }

});

function getUserVoiceChannel(voice){
    if(voice != null)
        return voice;
}

function connectVoiceChannel(channel){
    
    console.log(`Joined Voice Channel: "${channel.name}"`);

    const player = createAudioPlayer();

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const resource = createAudioResource('');
	player.play(resource);

    const subscription = connection.subscribe(player);

}

function getPlayingSong(){

}

function downloadSong(){

}


client.login(process.env.DISCORD_TOKEN);