

var http = require('http')
var Stack = require('stack')
var Coherence = require('../..')

var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset:'utf8'}],
      //this script must be loaded on front end!
      ['script', {src: coherence.scriptUrl}],
    ],
    ['body', content]
  ]
})
.use('clock', function (opts, apply) {
  var time = new Date()
  return ['h1', apply.cacheAttrs('/clock', 'clock', +time), time.toString()]
})


setInterval(function () {
  coherence.invalidate('clock', Date.now())
}, 1000)

http.createServer(coherence).listen(8012)




