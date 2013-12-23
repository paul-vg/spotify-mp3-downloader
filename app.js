var config = {
	username:	'',
	password:	'',
	port:		1717
}

var fs = require('fs');
var async = require('async');
var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server, { log: false });
var socket = socket;
var tracks = [];
var tracks_done = [];

global.waitForSpotify = function(){
	console.log('waitForSpotify');
	
	// remove tracks already done
	for( var i = 0; i < tracks.length; i++ ) {
		for( var j = 0; j < tracks_done.length; j++ ) {
			if( tracks[i].id == tracks_done[j] ) {
				tracks.splice(i, 1)
			}
		}
	}
		
	console.log('Waiting 5s...');
	setTimeout(function(){
		console.log('Trying again!');
		downloadTracks( tracks );
	}, 1000);
}

app.use( '/', express.static('./www/') );

server.listen(config.port);

//console.log('Server running, to use, open http://localhost:' + config.port + ' in your browser.');

require('child_process').exec('open "http://localhost:' + config.port + '"');

io.sockets.on('connection', function (socket_) {
	socket = socket_;
	
	if( config.username != '' && config.password != '' ) {
		socket.emit('logged-in');
	}
	
	socket.on('go', function (result) {
		downloadTracks( result.tracks );		
	});
	socket.on('login', function (result, callback) {
		
		require('spotify-web').login(result.username, result.password, function(err, spotify) {
			if( typeof spotify != 'undefined' ) {
				config.username = result.username;
				config.password = result.password;			
			}
			
			if( typeof callback == 'function' ){
				callback( typeof spotify != 'undefined' );
			}
		});
	});
});

var downloadTracks = function(tracks_) {
	
	tracks = tracks_;
	
	async.eachSeries(tracks, function (track, callback) {
		downloadTrack( 'spotify:track:' + track.id, callback );
	}, function (err) {
		if (err) { console.log(err); }
		console.log('All done!');
		tracks_done = [];
	});	
}

var downloadTrack = function( uri, callback ){
		
	// generate id
	var id = uri.split(':');
		id = id[ id.length-1 ];	
			
	socket.emit('busy', {
		id: id
	});
	
	require('spotify-web').login(config.username, config.password, function (err, spotify) {
	
		// first get a "Track" instance from the track URI
		spotify.get(uri, function (err, track) {
			if (err) {
				socket.emit('error', {
					id: id
				});
				return false;
			}
			
			// generate artists, seperate multiple by slash (/)
			var artists = [];
			for( var i = 0; i < track.artist.length; i++ ) {
				artists.push(track.artist[i].name);
			}
			artists = artists.join(' / ');
	
			// generate the albumpath
			var albumpath = './mp3/' + track.artist[0].name.replace(/\//g, ' - ') + ' - ' + track.album.name.replace(/\//g, ' - ') + ' [' + track.album.date.year + ']/';
							
			// generate folder if it does not exist
			if( !fs.existsSync(albumpath) ) {
				fs.mkdir( albumpath );
			}
			
			// generate the filepath
			var filepath = albumpath + track.artist[0].name.replace(/\//g, ' - ') + ' - ' + track.name.replace(/\//g, ' - ') + '.mp3';
	
			// create filestream for the .mp3
			var out = fs.createWriteStream( filepath );
	
			// play() returns a readable stream of MP3 audio data	
			track.play().pipe(out).on('finish', function () {
				console.log('-----------------------------------------');
				console.log('Downloaded: %s - %s', track.artist[0].name, track.name);
				//spotify.disconnect();
				
				require('child_process').exec('id3tag --artist="' + artists + '" --album="' + track.album.name + '" --song="' + track.name + '" --year="' + track.album.date.year + '" --track="' + track.number + '" --comment="Track downloaded from Spotify: ' + uri + '" "' + filepath + '"');
				console.log('ID3\'d: %s - %s', track.artist[0].name, track.name);
				
				socket.emit('done', {
					id: id,
					filepath: filepath
				});
				
				tracks_done.push( id );
				
				if( typeof callback == 'function' ) {
					callback();
				}
				
			});
	
		});
	});
}