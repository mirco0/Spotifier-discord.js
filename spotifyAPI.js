const fs = require('fs');
require('dotenv').config()
var querystring = require('querystring')
const { saveToFile, editFile } = require('./FileIO');
const EventEmitter = require('events');

const redirect_uri = 'http://localhost:3000'
const scope ='user-read-private user-read-email user-read-playback-state'
var token
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
                saveToFile(json)
            })
            .catch(error => {
                console.log(error)
            })
    },

    async regenerateToken(callback){
        var obj = JSON.parse(fs.readFileSync('Alejandro.json', 'utf8'));
        console.log('Regenerating Access Token')
        var result = false
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
        .then(async (response) => {
            switch(response.status){
                case 200:
                    response.json()
                        .then((json) => {
                            editFile(json)
                            token = json.access_token
                            callback()
                        })
                        .catch((error) => {
                            console.log(error)
                        });
                        result = true
                    break
                case 400:
                    json = await response.json();
                    console.log(json.error_description);                                        result = false; break
                case 401:           console.log('Unauthorized');                                break
                case 503: case 502: console.log("Error from server");                           break
            };
        })
        .catch( error => {
            console.log("Cannot regenerate Access Token")
            console.log(error)
        })
        return result
    },

    async fetchWebApi(endpoint, method, body) {

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
            case 401: 
                json = await res.json()
                console.log(json.error.message)
                if(json.error.message == 'The access token expired' || 'Invalid access token'){
                    var regenerated = await module.exports.regenerateToken(function(){ module.exports.fetchWebApi(endpoint,method,body) });
                    if(!regenerated){
                        console.log("Shutting down")
                        process.exit()
                    }
                }else{
                    console.log(jsonM.error.message)
                }
                return json.error.message
            case 429: return "Too many request, limit exceeded";
        }
    },

    startPolling(){
        var obj = JSON.parse(fs.readFileSync('Alejandro.json', 'utf8'));
        token = obj.access_token
        var lastProgress = Number.MAX_VALUE; 

        polling.fetching = setInterval(async function(){
            var res = await module.exports.fetchWebApi('v1/me/player','GET')
            if(!res) return

            if(res.is_playing && lastProgress > res.progress_ms){
                SpotifyAPI.emit(SpotifyEvents.OnSong,res)
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