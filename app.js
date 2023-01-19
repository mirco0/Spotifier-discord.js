require('dotenv').config()
const play = require('play-dl')

const { Client, GatewayIntentBits, GatewayDispatchEvents, Events, Colors } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates 
    ,GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]});

const { generateDependencyReport, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

var userID,channelId,voiceChannelId,channel;

//QUICK FIX
var times = 0;
//TODO:
/*
    0. remove quick fix asap
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
        channel = interaction.channel;
        voiceChannelId = getUserVoiceChannel(interaction.member.voice.channel);
        channelId = interaction.channelId;
        if(voiceChannelId){

            userID = interaction.user.id;
            
            var presence = interaction.member.presence;
            fetchAndPlay(voiceChannelId,presence,
                (song,messageInfo) => {
                    createPlayingSongMessage(song,messageInfo,
                        embed => {
                            interaction.reply({embeds:[embed]});
                        });
                },
                error => {
                    interaction.reply({content: error,ephemeral: true});
                }
            );
        
        }else{
            interaction.reply({content: "Devi essere connesso a un canale vocale",ephemeral: true});
        }
        
    }
    
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence)  => {
    
    /*
    check if new presence comes from the same users to that the bot is following
    */
    times = (times+=1)%2;   //Quick FIX remove asap
    if(times == 0) return   //Quick FIX remove asap
    if(newPresence.userId == userID){

        fetchAndPlay(voiceChannelId, newPresence, 
            (song,messageInfo) => {
                createPlayingSongMessage(song,messageInfo,embed => {
                    channel.send({embeds:[embed]});
                    
                });
            },
            error => {
            // channelId.send(error); temporarly disabled
        });
    }
    
});

async function fetchAndPlay(voiceChannelId,presence, callback, error){
    var messageInfo = {
        url: undefined,
        thumbnail: undefined,
        duration: undefined
    }

    var connection = connectVoiceChannel(voiceChannelId);
    var song = getPlayingSong(presence);

    if(song.name){
        
        await findSong(song,messageInfo);
        console.log(`found: ${messageInfo.url}`);

        playSong(connection,messageInfo.url);

        callback(song,messageInfo);

    }else{
        error("Devi ascoltare una canzone su spotify");
    }
}

function getUserVoiceChannel(voice){
    if(voice != null)
    return voice;
}

function connectVoiceChannel(channel){
    
    console.log(`Joined Voice Channel: "${channel.name}"`);
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
    var song =  {
        name: undefined,
        author: undefined
    }
    
    if(presence.status != 'online') return song;
   
    var activities = presence.activities;
    
    activities.forEach(activity => {
        if(activity.name == 'Spotify'){
            //console.log(`listening to "${activity.details}" by "${activity.state}" at $()`);
            song.name = activity.details.replace('-',"");
            song.author = activity.state.replace(';',",");
            return song;
        }
    });
    
    return song;
}

async function findSong(song,messageInfo){
    
    console.log(`searching query "${song.name} ${song.author} ${process.env.SEARCH}"`);
    let searched = await play.search(`${song.name} ${song.author} ${process.env.SEARCH}`, { limit: 1 });

    var video = searched[0];
    if(video == undefined)  console.log("Song not found");

    messageInfo.url = video.url;
    messageInfo.thumbnail = video.thumbnails[0].url;
    messageInfo.duration = video.durationRaw;
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

async function createPlayingSongMessage(song,messageInfo,callback){
    const embed = {
            "type": "rich",
            "title": `Now Playing`,
            "description": `[${song.name}](${messageInfo.url}) by ${song.author} [${messageInfo.duration}]`,
            thumbnail: {
                url: messageInfo.thumbnail,
            }
        }
        callback(embed);
}

client.login(process.env.DISCORD_TOKEN);