var path = require('path')
var pub = path.join(__dirname, '../public')
var loggedIn = false

function htmlRoutes(app){
    app.get('/logged_in', function (req, res) {
        if (!loggedIn) {
            res.redirect('/sign_in')
        }
        res.sendFile(pub + '/index.html')
    })
    app.get('/', function (req, res) {
        if (loggedIn) {
            res.redirect('/logged_in')
        }
        else {
            res.redirect('/sign_in')
        }
    })
    
    app.get('/sign_in', function (req, res) {
        res.sendFile(pub + '/signin.html')
    })
    
    app.get('/assets/:ast', function (req, res) {
        res.sendFile(pub + '/assets/' + req.params.ast)
    })
}
function changeLog(){
    loggedIn = true
}

module.exports = {
    htmlRoutes: htmlRoutes,
    changeLog: changeLog,
}