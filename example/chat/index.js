var Coherence = require('../..')
var http      = require('http')
var QS        = require('querystring')
var ago       = require('nice-ago')
var fs        = require('fs')
var dir       = process.argv[2] || process.cwd()
var path      = require('path')
var cont      = require('cont')
var Stack     = require('stack')

//chat history in lines
var history = []
fs.readFile('/tmp/coherence-example-chat.txt', 'utf8', function (_, str) {
  history = (str || '').split('\n').filter(Boolean)
  if(!history.length)
    history.push({
      ts: Date.now(),
      author: 'coherence-bot',
      text: 'welcome to coherence chat example'
    })
  coherence.invalidate('latest', Date.now())
})


var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset: 'UTF-8'}],
      ['script', {src: '/coherence/browser.js'}],
      ['link', {rel: 'stylesheet', href: '/static/style.css'}]
    ],
    ['body', content]
  ]
})
.use('messages', function (opts) {
  var start = opts.start | 0
  var end = opts.end || history.length
  console.log('messages', opts, end - opts.start, history.slice(opts.start, end).length)
  return [
    ['div.messages']
    .concat(
        history
        .slice(opts.start, end)
        .map(function (e) {
          return ['div.message',
            ['label.time', e.ts],
            ['label.author', e.author || 'anonymous'],
            ['div', e.text]
          ]
        })
      ),
    // Always has the same id, but when it's loaded
    // it will be replaced div.messages without an id.
    // so it will only be replaced once
    ['div.latest', {
      'data-id': 'latest',
      'data-href':'/messages?start='+end,
      'data-ts': Date.now()
    }]
  ]
})
.use('chat', function (opts, apply) {
  var start = Math.max(opts.start || opts.end - 100, 0)
  var end = opts.end || history.length
  return [
    'div.page',
    ['div.chat', apply('messages', {start: start, end: end})],
    ['form', {
      method: 'POST',
      //disables suggestions. only care about text input,
      //but that's the only form field.
      autocomplete: 'off'
    },
      ['input', {type: 'text', name: 'text'}],
      ['button', 'submit']
    ]
  ]
})

http.createServer(Stack(
  function (req, res, next) {
    if(/^\/static\//.test(req.url))
      fs.createReadStream(__dirname+req.url).pipe(res)
    else next()
  },
  function (req, res, next) {
    if(req.method == 'POST') {
      var body = ''
      req.on('data', function (d) { body += d })
      req.on('end', function (d) { req.body = QS.parse(body); next() })
    }
    else
      next()
  },
  function (req, res, next) {
    if(req.method == 'POST') {
      history.push({ts: Date.now(), author: null, text: req.body.text})
      coherence.invalidate('latest', Date.now())
      console.log("RETURN EMPTY")
      return res.end('')
    }
    next()
  },
  coherence
)).listen(8011)



