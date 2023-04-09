const { SpotifyAPI, SpotifyEvents, fetchWebApi, startPolling, stopPolling } = require('./spotifyAPI');


startPolling()
SpotifyAPI.on(SpotifyEvents.OnSong,(playerInfo) => {
	get(playerInfo)
})

function get(playerInfo){
	if(!playerInfo) return

	var artists = ''

	playerInfo.item.artists.forEach(artist => {
		artists += `${artist.name}, `
	})

	process.stdout.clearLine()
	process.stdout.cursorTo(0)

	if(playerInfo.is_playing)
		console.log(`Listening to: ${playerInfo.item.name} by ${artists}\b`)
}
