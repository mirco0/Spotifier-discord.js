require('dotenv').config()
const play = require('play-dl')

const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
    const newUdp = Reflect.get(newNetworkState, 'udp');
    clearInterval(newUdp?.keepAliveInterval);
}

const { Client, GatewayIntentBits, GatewayDispatchEvents, Events, Colors, Presence } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages,GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates ,GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]});    
const { generateDependencyReport, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior } = require('@discordjs/voice');
const { SpotifyEvents, SpotifyAPI } = require('./spotifyAPI');

client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

const player = createAudioPlayer();
player.on(AudioPlayerStatus.Idle, () => {

    setTimeout(checkAndDisconnect,60000);
});
var queue = [];

/**
 * userID used to follow user's presence
 * guild used to avoid firing event multiple times (caused by the presence update from possble multiple servers) 
 * voiceChannelID used to connect to voice channel
 * channel used to send messages where the command was executed
 * VoiceConnection used to stream audio in a VoiceChannel
 */
var userID,guild,voiceChannelID,channel,VoiceConnection;

//QUICK FIX
var times = 0;

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    resetVariables();
    channel = interaction.channel;
    voiceChannelID = interaction.member.voice.channel;
    userID = interaction.user.id;
    guild = interaction.guild;

    if(!voiceChannelID){
        interaction.reply({content: "Devi essere connesso a un canale vocale",ephemeral: true});
        return;
    }
    
    switch(interaction.commandName){
        case 'followme':
            
            VoiceConnection = connectVoiceChannel(voiceChannelID);

            VoiceConnection.on('stateChange', (oldState, newState) => {
                const oldNetworking = Reflect.get(oldState, 'networking');
                const newNetworking = Reflect.get(newState, 'networking');
              
                oldNetworking?.off('stateChange', networkStateChangeHandler);
                newNetworking?.on('stateChange', networkStateChangeHandler);
            });
            
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

            VoiceConnection = connectVoiceChannel(voiceChannelID);
            var url = interaction.options.getString('input');
            
            var videoFromURL = getSongFromURL(url);
            videoFromURL.then( (result) => {
                var playerPromise = playSong(url)
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
    if(newPresence.userId == userID && newPresence.guild == guild){
        
        var song = getPlayingSong(newPresence);

        findSong(song)
            .then( (result) => { 
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

SpotifyAPI.on(SpotifyEvents.OnSong, function(){

})

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
        VoiceConnection.disconnect();
        console.log(`Disconnected Voice Channel: "${voiceChannelID.name}"`);
        channel.send("Disconnesso dal canale Vocale per Inattività");
        resetVariables();
    }
}

function resetVariables(){
    userID = voiceChannelID = channel = guild = undefined;
    times = 0;
}

client.login(process.env.DISCORD_TOKEN);