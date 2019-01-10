

var http = require('http')
var Stack = require('stack')
var Coherence = require('../..')

var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset:'utf8'}],
      //this script must be loaded on front end!
      ['script', {src: '/coherence/browser.js'}],
    ],
    ['body', content]
  ]
})
.use('clock', function (opts) {
  var time = new Date()
  return ['h1', {
    "data-id": "clock",
    "data-href": "/clock",
    "data-ts": +time,
  }, time.toString()]
})


setInterval(function () {
  coherence.invalidate('clock', Date.now())
}, 1000)

http.createServer(coherence).listen(8012)



