var config = {
	username:	'',
	password:	'',
	port:		1717
}

process.on('uncaughtException', function (err) {
	if( err.toString().indexOf('Track is not playable in country') > -1 ) { // skip track
	
		console.log(err.toString() + ': ' + current_track);
	
		socket.emit('error', {
			id: current_track,
			err: err.toString()
		});
	
		tracks_done.push( current_track );
		waitForSpotify();
	} else if( err.code == 8 ) { // Rate limited
		waitForSpotify();
	}
});

var modules_folder = __dirname + '/node_modules.' + require('os').platform() + '.' + require('os').arch() + '/';

var fs = require('fs');
var async = require('async');
var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server, { log: false });
var spotify_web = require('spotify-web');
var socket = socket;
var current_track = {};
var tracks = [];
var tracks_done = [];

var waitForSpotify = function(){
	console.log('waitForSpotify');
	
	// remove tracks already done
	for( var i = 0; i < tracks.length; i++ ) {
		for( var j = 0; j < tracks_done.length; j++ ) {
			if( tracks[i].id == tracks_done[j] ) {
				tracks.splice(i, 1)
			}
		}
	}
		
	console.log('Waiting 1s...');
	setTimeout(function(){
		console.log('Trying again!');
		downloadTracks( tracks );
	}, 1000);
}

app.use( '/', express.static( __dirname + '/www/') );

server.listen(config.port);

console.log('Server running, to use, open http://localhost:' + config.port + ' in your browser.');

if( false && require('os').platform() != 'win32' ) {
	require('child_process').exec('open "http://localhost:' + config.port + '"');
}

io.sockets.on('connection', function (socket_) {
	socket = socket_;
	
	if( config.username != '' && config.password != '' ) {
		socket.emit('logged-in');
	}
	
	socket.on('go', function (result) {
		current_track = {};
		tracks = [];
		tracks_done = [];
		downloadTracks( result.tracks );		
	});
	socket.on('login', function (result, callback) {
		
		spotify_web.login(result.username, result.password, function(err, spotify) {
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
	
	current_track = id;
	
	socket.emit('busy', {
		id: id
	});
	
	spotify_web.login(config.username, config.password, function (err, spotify) {
	
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
			
			// generate the artist path
			var artistpath = __dirname + '/mp3/' + track.artist[0].name.replace(/\//g, ' - ') + '/';
							
			// generate folder if it does not exist
			if( !fs.existsSync(artistpath) ) {
				fs.mkdir( artistpath );
			}
			
			// generate the albumpath
			var albumpath = artistpath + track.album.name.replace(/\//g, ' - ') + ' [' + track.album.date.year + ']/';
							
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
				
				// tag the file
				if( true ) {
					require('child_process').exec('id3tag -2 --artist="' + artists + '" --album="' + track.album.name + '" --song="' + track.name + '" --year="' + track.album.date.year + '" --track="' + track.number + '" --comment="Track downloaded from Spotify: ' + uri + '" "' + filepath + '"');
				}
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
