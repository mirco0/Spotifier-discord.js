const fs = require('fs');
require('dotenv').config()
var querystring = require('querystring')
const { saveToFile, editFile } = require('./FileIO');
const EventEmitter = require('events');

const redirect_uri = 'http://localhost:3000'
const scope ='user-read-private user-read-email user-read-playback-state'
const SpotifyAPI = new EventEmitter();

var polling = { printing:undefined, fetching:undefined}

const frames = [
	"⣼",
	"⣹",
	"⢻",
	"⠿",
	"⡟",
	"⣏",
	"⣧",
	"⣶"
]

i = 0;

const SpotifyEvents = {
    OnSong: 'OnSong',
    OnPause: 'OnPause'
}


module.exports = {
    SpotifyEvents,
    SpotifyAPI,

    //Creates link for authorize 'Spotifier'
    generateLink(){
        const link = ('https://accounts.spotify.com/authorize?' +
                querystring.stringify({
                    response_type: 'code',
                    client_id: process.env.SPOTIFY_CLIENT_ID,
                    scope: scope,
                    redirect_uri: redirect_uri
            }))
    
        return link
    },
    
    getAuthourizationToken(code){
        fetch('https://accounts.spotify.com/api/token?',{
            method: 'POST',
            body: querystring.stringify({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            }),
    
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_TOKEN).toString('base64')),
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
        })
            .then((response) =>response.json())
            .then((json) => {
                console.log(json)
                saveToFile(json)
            })
            .catch(error => {
                console.log(error)
            })
    },

    async regenerateToken(callback){
        var obj = JSON.parse(fs.readFileSync('Alejandro.json', 'utf8'));
        console.log('Regenerating Access Token')
    
        await fetch('https://accounts.spotify.com/api/token?',{
            method: 'POST',
            body: querystring.stringify({
                refresh_token: obj.refresh_token,
                redirect_uri: redirect_uri,
                grant_type: 'refresh_token'
            }),
    
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_TOKEN).toString('base64')),
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
        })
        .then((response) => {

            switch(response.status){
                case 200: response.json()
                        .then((json) => {
                            editFile(json)
                            callback()
                        })
                        .catch((error) => console.log(error))
                        break; 
                case 400: response.json().then((json) => console.log(json.error_description)); break
                case 401: console.log('Unauthorized'); break
                case 503: case 502: console.log("Error from server"); break
            }
        })
        .catch( error => {
            console.log("Cannot regenerate Access Token")
            console.log(error)
        })
    },

    async fetchWebApi(endpoint, method, body,token) {

        const res = await fetch(`https://api.spotify.com/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            method,
            body:JSON.stringify(body)
        });

        switch(res.status){
            default:  return res.text()
            case 200: return res.json()
            case 204: return null
            case 401: module.exports.regenerateToken(function(){ module.exports.fetchWebApi(endpoint,method,body,token) }); return "The token expired"
            case 429: return "Too many request, limit exceeded";
        }
    },

    startPolling(){
        var obj = JSON.parse(fs.readFileSync('Alejandro.json', 'utf8'));
        var token = obj.access_token
        var lastProgress = Number.MAX_VALUE; 

        polling.fetching = setInterval(async function(){
            var res = await module.exports.fetchWebApi('v1/me/player','GET',undefined,token)
            if(!res) return

            if(res.is_playing && lastProgress > res.progress_ms){
                SpotifyAPI.emit(SpotifyEvents.OnSong,res)
                //TODO: REMOVE (test for when it gets fired twice in 2 consecutive fetch)
                process.stdout.write(`|         Last: ${lastProgress}, current ${res.progress_ms}`)
            }
            lastProgress = res.progress_ms - 1200

        },1200)

        polling.printing = setInterval(function(){
	        process.stdout.clearLine();
	        process.stdout.cursorTo(0);
	        i = (i + 1) % frames.length
	        process.stdout.write(`Polling ${frames[i]} `)
        },80)
    },

    stopPolling(){
        clearInterval(polling.fetching)
        clearInterval(polling.printing)
    }
}