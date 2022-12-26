require('dotenv').config()
const play = require('play-dl')

const { Client, GatewayIntentBits, GatewayDispatchEvents, Events, Colors } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates 
    ,GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]});

const { generateDependencyReport, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

var userID,channelId;

//TODO:
/*
    1. make the music seekable
    2. add pause option
    3. make the bot automatically disconnect when idle for too long
    4. reafctoring

*/

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'followme'){
        
        /*

        > check if the user is in a voice channel ✓
        > joins it ✓
        > gets update about it's spotify presence (seek if needed) 
        > plays the song ✓
        
        < if paused for one minute leave the voice channel
        
        */
        
        let voiceChannelId = getUserVoiceChannel(interaction.member.voice.channel);
        if(voiceChannelId){

            userID = interaction.user.id;
            channelId = voiceChannelId;
            
            var presence = interaction.member.presence;
            fetchAndPlay(voiceChannelId,presence,error => {
                interaction.reply({content: error,ephemeral: true});
            });
        
        }else{
            interaction.reply({content: "Devi essere connesso a un canale vocale",ephemeral: true});
        }
        
    }
    
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence)  => {
    
    /*
    check if new presence comes from the same users to that
    */

    if(newPresence.userId == userID){
        fetchAndPlay(channelId, newPresence, error => {
            // channelId.send(error); temporarly disabled
        });
        console.log("Updated(?)");
    }
    
});

async function fetchAndPlay(voiceChannelId,presence, callback){
    
    var connection = connectVoiceChannel(voiceChannelId);
    var song = getPlayingSong(presence);

    if(song.name){
        
        var url = await findSong(song);
        playSong(connection,url);
        console.log("Playing "+url);
        callback("Playing");

    }else{
        callback("Devi ascoltare una canzone su spotify");
    }
}

function getUserVoiceChannel(voice){
    if(voice != null)
    return voice;
}

function connectVoiceChannel(channel){
    
    //console.log(`Joined Voice Channel: "${channel.name}"`);
    
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
    
    return connection;
}

/*
return song object {name, author} or undefined
*/
function getPlayingSong(presence){

    /*
    if not online disconnect and logout(?) 
    */
    if(presence.status != 'online') return;
   
    var activities = presence.activities;
    
    var song =  {
       name: undefined,
       author: undefined
    }
    
    activities.forEach(activity => {
        if(activity.name == 'Spotify'){
            //console.log(`listening to "${activity.details}" by "${activity.state}" at $()`);
            song.name = activity.details;
            song.author = activity.state;
            return song;
        }
    });
    
    return song;
}

async function findSong(song){
    
    console.log(`searching query "${song.name} ${song.author} ${process.env.SEARCH}"`);
    let searched = await play.search(`${song.name} ${song.author} ${process.env.SEARCH}`, { limit: 1 });
        
    return searched[0].url;
    
}

async function playSong(connection, url){
    
    let stream = await play.stream(url);
    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    });

    const player = createAudioPlayer();
    connection.subscribe(player);
    player.play(resource);

}


client.login(process.env.DISCORD_TOKEN);