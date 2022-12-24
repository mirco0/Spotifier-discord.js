require('dotenv').config()
const { Client, GatewayIntentBits, GatewayDispatchEvents, Events, Colors } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates 
    ,GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]});

const { generateDependencyReport, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

var userID;

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'followme'){
        
        let voiceChannelId = getUserVoiceChannel(interaction.member.voice.channel);
        
        if(voiceChannelId){
            connectVoiceChannel(voiceChannelId);
            interaction.reply("Playing");
            userID = interaction.user.id;
            getPlayingSong(interaction.member.presence);
        }else{
            interaction.reply("Devi essere connesso a un canale vocale");
        }
        
    }
    
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence)  => {

    if(newPresence.userId == userID){

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

function getPlayingSong(presence){

    if(presence.status != 'online') return;
    
    var activities = presence.activities;
    
    activities.forEach(activity => {
        if(activity.name == 'Spotify'){
            console.log(`listening to "${activity.details}" by "${activity.state}" at $()`);
            return activity.details, activity.state;
        }
    });
    
    return;
}

function downloadSong(){

}


client.login(process.env.DISCORD_TOKEN);