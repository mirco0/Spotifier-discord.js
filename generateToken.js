require('dotenv').config()
const { regenerateToken,getAuthourizationToken,generateLink } = require('./spotifyAPI');
require('./FileIO')

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

console.log(generateLink())

readline.question('Insert token: ', token => {
	getAuthourizationToken(token)
	readline.close()
});