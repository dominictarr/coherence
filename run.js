
var api = require('./api')

//if we are in node

require('http').createServer(function (req, res) {
  var html = api.wrap(api.api, function () {
    h('html',
    h('head',
      h('script', {src: './coherence.js'}),
      h('script', {src: './templates.js'}),
    ),
    h('body',
      html.outerHTML
    )
  })

})


