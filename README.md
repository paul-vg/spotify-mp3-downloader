spotify-mp3-downloader
======================

This is a node.js program that is controlled by a web interface. It downloads .mp3 files from Spotify and ID3-tags them accordingly.

**You need a Premium account to use this.**

# How to use:

1. Install Node.js http://nodejs.org/
2. Install id3lib
  1. OS X
```brew install id3lib```

  2. Other
http://sourceforge.net/projects/id3lib/files/

3. Run `node app.js`
This will open your browser (at least on Mac OS X). Otherwise, navigate to http://localhost:1717.

4. Drag spotify tracks from the Spotify desktop client to the website

You might not be able to run it due to different dependencies, in that case, remove the node_modules folder and run the following:

```
npm install async
npm install express
npm install socket.io
```

# Screenshots
![](http://i.imgur.com/4jSZ7HX.png)
![](http://i.imgur.com/z976IIY.png)
![](http://i.imgur.com/xGZPkIV.png)
![](http://i.imgur.com/7uSE4ns.png)


# Legal etc.
Spotify prohibits downloading music from their service, so using this tool is not really allowed and you might risk ending up with a suspended account. I am not resposible for any of that :)

# Credits
Many credits go to TooTallNate for developing https://github.com/TooTallNate/node-spotify-web
