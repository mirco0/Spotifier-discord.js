const fs = require('fs');
require('dotenv').config()
var querystring = require('querystring')
const { saveToFile, editFile } = require('./FileIO')

const redirect_uri = 'http://localhost:3000'
const scope ='user-read-private user-read-email user-read-playback-state'

module.exports = {
    
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
        console.log(`RIGENERANDO ${obj.refresh_token}`)
    
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
        .then((response) => response.json())
        .then((json) => {
            editFile(json)
            callback()
        })
        .catch( error => { 
            console.log("Cannot regenerate Access Token")
            console.log(error) 
        })
    }
}