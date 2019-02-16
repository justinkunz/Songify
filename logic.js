var request = require('request')

var stats = request({
    uri: "https://api.spotify.com/v1/me/top/artists",
    method: "GET",
    json: {
      action: "create",
      fieldType: {
        name: "n$name",
        valueType: { primitive: "STRING" },
        scope: "versioned",
        namespaces: { "my.demo": "n" }
      }
    }
  })
console.log(stats);

