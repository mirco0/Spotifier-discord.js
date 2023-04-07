const fs = require('fs');
const { regenerateToken } = require('./spotifyAPI');


var obj = JSON.parse(fs.readFileSync('Alejandro.json', 'utf8'));
var token = obj.access_token

async function fetchWebApi(endpoint, method, body) {
	
	const res = await fetch(`https://api.spotify.com/${endpoint}`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method,
		body:JSON.stringify(body)
	});

	console.log(`Status: ${res.status}`)
	
	switch(res.status){
		default:  return res.text()
		case 200: return res.json()
		case 401: regenerateToken(function(){ fetchWebApi(endpoint,method,body) }); return "The token expired"
		case 429: return "Too many request, limit exceeded"; break
	}
	
	
}

async function getInfo(){
  return fetchWebApi('v1/me/player','GET')
}

async function get(){
	const playerInfo = await getInfo()
	var artists = ''

	playerInfo.item.artists.forEach(artist => {
		artists += `${artist.name}, `
	})

	console.log(`Listening to: ${playerInfo.item.name} by ${artists}\b`)
}

get()


frames = [
	"⣼",
	"⣹",
	"⢻",
	"⠿",
	"⡟",
	"⣏",
	"⣧",
	"⣶"
]

//https://www.npmjs.com/package/cli-spinners?activeTab=code

i = 0;
var print = setInterval(function() {		
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	i = (i + 1) % frames.length
	process.stdout.write(`Polling ${frames[i]} `)
},80)

clearInterval(print)