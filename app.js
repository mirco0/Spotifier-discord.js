require('dotenv').config()
const play = require('play-dl')

const { Client, GatewayIntentBits, GatewayDispatchEvents, Events, Colors } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates ,GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]});
    
    const { generateDependencyReport, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } = require('@discordjs/voice');
    
    client.on(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user.tag}!`);
});

const player = createAudioPlayer();
var queue = [];
/**
 * userID used to follow user's presence
 * voiceChannelID used to connect to voice channel
 * channel used to send messages where the command was executed
 * VoiceConnection used to stream audio in a VoiceChannel
 */
var userID,voiceChannelID,channel,VoiceConnection;

//QUICK FIX
var times = 0;

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    resetVariables();
    channel = interaction.channel;
    voiceChannelID = interaction.member.voice.channel;
    userID = interaction.user.id;

    if(!voiceChannelID){
        interaction.reply({content: "Devi essere connesso a un canale vocale",ephemeral: true});
        // resetVariables();
        return;
    }
    
    switch(interaction.commandName){
        case 'followme':
            
            VoiceConnection = connectVoiceChannel(voiceChannelID);
            var presence = interaction.member.presence;
            var song = getPlayingSong(presence);

            findSong(song)
                .then( (result) => { 
                    var playerPromise = playSong(result.url);
                    playerPromise.catch((error)=> {console.log(error)});
                
                    var embed = createPlayingSongMessage(song,result);
                    interaction.reply({embeds:[embed]});
                    }
                )
                .catch( (error) => {
                    interaction.reply({content: error,ephemeral: true});
                } );


        break;

        case 'play':

            var connection = connectVoiceChannel(voiceChannelID);
            var url = interaction.options.getString('input');
            
            var videoFromURL = getSongFromURL(url);
            videoFromURL.then( (result) => {
                var playerPromise = playSong(connection,url)
                    .then()
                    .catch((error)=> {console.log(error)});

                var embed = createPlayingSongMessage(result.song,result.messageInfo);
                interaction.reply({embeds:[embed]});
            })
                .catch( (error)=> {console.log(error)});

            break;
    }

});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence)  => {
    times = (times+=1)%2;   //Quick FIX remove asap
    if(times == 0) return   //Quick FIX remove asap
    if(newPresence.userId == userID){
        
        var song = getPlayingSong(newPresence);

        findSong(song)
            then( (result) => { 
                var playerPromise = playSong(result.url);
                playerPromise.catch((error)=> {console.log(error)});
            
                var embed = createPlayingSongMessage(song,result);
                channel.send({embeds:[embed]});
                }
            )
            .catch( (error) => {
                channel.send(error);
            } );

            

    }
});

/**
 * 
 * @param {*} voiceChannelID
 * @param {*} presence
 * @returns
 */
async function followSpotifyPresence(){

}

/**
 * Gets in input a song object and searches it on youtube
 * @param {*} song
 * @returns a messageInfo object
 */
async function findSong(song){
    if(!song.name){
        return Promise.reject("Devi ascoltare una canzone su spotify");
    }

    let searched = await play.search(`${song.name} ${song.author} ${process.env.SEARCH}`, { limit: 1 })

    var video = searched[0];

    if(video == undefined){
        return Promise.reject("Video not found");
    }else{

        return Promise.resolve( {
            url: video.url,
            thumbnail: video.thumbnails[0].url,
            duration: video.durationRaw
            }
        );
    }
}

/**
 * Gets in input a url string and creates a song and a messageInfo object
 * @param {string} url 
 * @param {*} error 
 * @returns a messageInfo object
 */
async function getSongFromURL(url){
    let video =  await play.video_info(url)
    if(!video || !video.video_details.channel){
     return Promise.reject("Video non disponibile");
    }

    let messageInfo = {
        url: url,
        thumbnail: video.video_details.thumbnails[0].url,
        duration: video.video_details.durationRaw
    }
    
    let song = {
        name: video.video_details.title,
        author: video.video_details.channel.name
    }

 return Promise.resolve({song: song,messageInfo: messageInfo});
}

/**
 * 
 * @param {string} url
 */
async function playSong(url){
    let stream = await play.stream(url);
    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    });

    VoiceConnection.subscribe(player);
    player.play(resource);
    
    player.on(AudioPlayerStatus.Idle, () => {

        setTimeout(checkAndDisconnect,60000);
    });

    return Promise.resolve();
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

function createPlayingSongMessage(song,messageInfo){
    const embed = {
        "type": "rich",
        "title": `Now Playing`,
        "description": `[${song.name}](${messageInfo.url}) by ${song.author} [${messageInfo.duration}]`,
        thumbnail: {
            url: messageInfo.thumbnail,
        }
    }
    return embed;
}

function getPlayingSong(presence){

    var song =  {
        name: undefined,
        author: undefined
    }
    
    if(presence.status != 'online') return song;
   
    var activities = presence.activities;
    
    activities.forEach(activity => {
        if(activity.name == 'Spotify'){
            song.name = activity.details.replace('-',"");
            song.author = activity.state.replace(';',",");
            return song;
        }
    });
    
    return song;
}

function checkAndDisconnect(){
    if(player.state.status != AudioPlayerStatus.Playing){
        connection.disconnect();
        console.log(`Disconnected Voice Channel: "${voiceChannelID.name}"`);
        channel.send("Disconnesso dal canale Vocale per Inattivit??");
        resetVariables();
    }
}

function resetVariables(){
    userID = voiceChannelID = channel = undefined;
    times = 0;
}

client.login(process.env.DISCORD_TOKEN);