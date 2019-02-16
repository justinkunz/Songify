require("dotenv").config()

var my_client_id = process.env.clientId
var client_secret = process.env.clientSecret
var redirect_uri = 'http://localhost:8080/callback/'
var scopes = 'user-read-private user-top-read playlist-modify-public playlist-modify-private'
var state = generateRandomString(16)
var express = require('express')
var querystring = require('querystring')
var request = require('request')

var setLogged = require('./htmlroutes.js').changeLog

var access_token
var limitCounter = 0
var reqType
var songData
var code
var lat
var long
var authStatus = false
var related_art_search = false
var zipAPIKey = process.env.zipAPI

function apiCalls(app) {
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // ==============================================================
    // ==================CONECTING TO SPOTIFY (USER)=================
    // ==============================================================
    app.get('/connect_spotify', function (req, res) {
        res.redirect('https://accounts.spotify.com/authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: my_client_id,
                scope: scopes,
                redirect_uri: redirect_uri,
                state: state
            }));
    });

    app.get('/callback', function (req, res) {

        userAuth = req.query.code
        res.sendFile(__dirname + '/static/index.html')

        code = req.query.code || null;
        tate = req.query.state || null;

        setLogged()
        res.redirect('/logged_in')
    });
    app.get('/logout', function (req, res) {
        limitCounter = 0
        authStatus = false
        related_art_search = false
        res.redirect('/sign_in')
    })

    // ==============================================================
    // ==================GET INITIAL AUTHORIZATION===================
    // ==============================================================
    function auth(cb, res, reqType) {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(my_client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                authStatus = true
                access_token = body.access_token
                refresh_token = body.refresh_token;
                cb(res, reqType)

            }
        });
    }

    // ==============================================================
    // ============================ROUTES============================
    // ==============================================================

    //get tracks / album art
    app.get('/get_data', function (req, res) {
        reqType = 'tracks'
        var options = {
            url: 'https://api.spotify.com/v1/me/top/' + reqType + '?time_range=long_term&limit=50',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };

        request.get(options, function (error, response, body) {
            songData = body
            res.json(songData)
        })
    });

    //get artists
    app.get('/get_data_artist', function (req, res) {
        reqType = 'artists'
        checkAuth(res, reqType)
    });

    //get recommended artists
    app.get('/get_related', function (req, res) {
        get_related_artists(res)
    }
    )

    //get events near user
    app.get('/api/events', function (req, res) {

        limitCounter = 0
        closeConcerts = []
        related_art_search = true
        for (i = 0; i < songData.items.length; i++) {
            concertAPI(songData.items[i].name, res, songData.items.length)
        }

    })
    app.post('/create_playlist', function (req, res) {
        songIds = req.body.uris
        var playlistOptions = {
            url: 'https://api.spotify.com/v1/users/1237147005/playlists',
            body: {
                name: 'Most Played Songs | Songify.me',
                description: 'Top 50 tracks. created at songify.me',
                public: 'false'
            },
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };

        request.post(playlistOptions, function (error, response, body) {
            playId = body.id
            var postPlaylistOptions = {
                url: 'https://api.spotify.com/v1/playlists/' + playId + '/tracks?position=0&uris=' + songIds,
                headers: { 'Authorization': 'Bearer ' + access_token },
                json: true
            }
            request.post(postPlaylistOptions, function(error, response, body){

            })
        });
    })


    app.post('/api/post/zip', function (req, res) {

        url = 'https://www.zipcodeapi.com/rest/' + zipAPIKey + '/info.json/' + req.body.zip + '/degrees'
        request.get(url, function (error, response, body) {
            var result = JSON.parse(body)
            lat = result.lat
            long = result.lng

        })
    })

    // ==============================================================
    // ======================LOGIC & API CALLS=======================
    // ==============================================================

    //checks authorization, if not authorized, gets authorizaton. both results call function to return data
    function checkAuth(res, reqType) {
        if (!authStatus) {
            auth(get_api_data, res, reqType)
        }
        else {
            get_api_data(res, reqType)
        }
    }
    //runs spotify api to get requested data, returns to page
    function get_api_data(res, reqType, cb) {

        var options = {
            url: 'https://api.spotify.com/v1/me/top/' + reqType + '?time_range=long_term&limit=50',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };

        request.get(options, function (error, response, body) {
            songData = body
            if (related_art_search) {
                return songData
            }
            res.json(songData)
        })
    }

    //finds recommended artists
    function get_related_artists(res) {
        related_art_search = true
        checkAuth(res, 'artists')
        relatedArt = []
        artistData = []
        filteredArray = []

        //push names from artist data to array
        for (i = 0; i < songData.items.length; i++) {
            artistData.push(songData.items[i].name)
        }
        j = 0
        ra_loop()
        function ra_loop() {

            //get the 20 related artist for each artist in the top played array
            if (j < songData.items.length) {

                var options = {
                    url: 'https://api.spotify.com/v1/artists/' + songData.items[j].id + '/related-artists',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };
                //push names of all related artists to array
                request.get(options, function (error, response, body) {

                    for (i = 0; i < body.artists.length; i++) {
                        relatedArt.push(body.artists[i].name)
                    }
                    j++
                    ra_loop()
                })
            }
            else {
                //after all related artists are added to array, sort array
                //byCount removes duplicates and orders the array from most occuring artist desc
                sortedArray = relatedArt.byCount()

                //add artist to final array only if they do not already exist in the top 50 array
                for (i = 0; i < sortedArray.length; i++) {
                    if (artistData.indexOf(sortedArray[i]) === -1) {
                        filteredArray.push(sortedArray[i])
                    }
                }

                //slims array down to 50 top results
                cutArray = []
                for (i = 0; i < 50; i++) {
                    cutArray.push(filteredArray[i])
                }
                res.json(cutArray)

            }
        }
    }

    //removes duplicates from arrays, sorts by most commonly named desc
    Array.prototype.byCount = function () {
        var itm, a = [], L = this.length, o = {};
        for (var i = 0; i < L; i++) {
            itm = this[i];
            if (!itm) continue;
            if (o[itm] == undefined) o[itm] = 1;
            else ++o[itm];
        }
        for (var p in o) a[a.length] = p;
        return a.sort(function (a, b) {
            return o[b] - o[a];
        });
    }
}

//generate random string (for state in auth)
function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

//returns local concert data of artist in top 50
function concertAPI(artist, res, limit) {
    var queryUrl = "https://rest.bandsintown.com/artists/" + artist + "/events?app_id=codingbootcamp"

    request.get(queryUrl, function (error, response, body) {
        if (error) throw error
        var isJSON = true
        try {
            results = JSON.parse(body)
        }
        catch (err) {
            isJSON = false
        }
        if (isJSON) {
            results = JSON.parse(body)
            latMin = lat - 1
            latMax = lat + 1

            longMin = long - 1
            longMax = long + 1

            for (i = 0; i < results.length; i++) {
                venueLat = results[i].venue.latitude
                venueLong = results[i].venue.longitude

                if (venueLat >= latMin && venueLat <= latMax && venueLong >= longMin && venueLong <= longMax) {

                    closeConcerts.push(results[i])
            
                }
            }
        }
        limitCounter++

        if (limitCounter === limit) {

            res.json(closeConcerts)
            return
        }
    })

}

module.exports = apiCalls