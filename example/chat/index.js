var Coherence  = require('../..')
var http       = require('http')
var QS         = require('querystring')
var ago        = require('nice-ago')
var dir        = process.argv[2] || process.cwd()
var path       = require('path')
var cont       = require('cont')
var Stack      = require('stack')
var BodyParser = require('urlencoded-request-parser')
var Static     = require('ecstatic')

//chat history in lines in this file.
//in practice you'd probably have some sort of database.
var db = require('./db')(
  '/tmp/coherence-example-chat.txt',
  function () {
    coherence.invalidate('latest', Date.now())
  })

//render layout. this wraps every full page.
//this is the place to include menu items, etc...
var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset: 'UTF-8'}],
      ['script', {src: coherence.scriptUrl}],
      ['link', {rel: 'stylesheet', href: '/static/style.css'}]
    ],
    ['body',
      ['div.header',
        ['div.heading', 'coherence chat'],
        ['a', {href: '/setup', 'data-update': 'modal'}, 'setup'],
      ],
      ['div.page', content],
      ['div#modal']
    ]
  ]
})
//the body of the chat. a list of messages.
//the special part is `div.latest` which is where future messages get inserted.
.use('messages', function (opts, apply) {
  var start = opts.start | 0
  var end = opts.end || db.array().length
  return [
    ['div.messages']
    .concat(
        db.array()
        .slice(opts.start, end)
        .map(function (e) {
          var date = new Date(e.ts)
          return ['div.message',
            ['div.meta',
              ['label.author', e.author || 'anonymous'],
              ' ',
              ['label.time', {title: date.toString()}, date.getHours()+':'+date.getMinutes()],
            ],
            ['div', e.text]
          ]
        })
      ),
    // Empty partial at the end. when this is invalidated,
    // new messages will be inserted here.
    // Always has the same id, but when it's loaded
    // it will be replaced div.messages without an id.
    // so it will only be replaced once.
    ['div.latest#latest', 
      apply.cacheAttrs('/messages?start='+end, 'latest', Date.now())
//{
//      'data-id': 'latest',
//      'data-href':'/messages?start='+end,
//      'data-ts': Date.now()
//    }
    ]
  ]
})
//wrapper around messages view that includes a form for entering text.
.use('chat', function (opts, apply) {
  var start = Math.max(opts.start || opts.end - 100, 0)
  var end = opts.end || db.array().length
  return [
    'div.page',
    ['div.chat', apply('messages', {start: start, end: end})],
    ['form', {
      method: 'POST',
      //disables suggestions. only care about text input,
      //but that's the only form field.
      autocomplete: 'off',
      'data-invalidate': 'latest',
      'data-reset': 'true',
    },
      ['input', {type: 'text', name: 'text'}],
      ['button', 'submit']
    ]
  ]
})
.use('setup', function (opts, apply, req) {
  return [
    'div.modal',
      ['form', {
          method: 'POST',
          autocomplete: 'off',
        },
        ['input', {type: 'text', name: "name", value: req.context.name || 'anonymous'}],
        ['input', {type: 'hidden', name: 'type', value: 'setup'}],
        ['button', 'submit']
      ]
    ]
})
.setDefault('chat')

http.createServer(Stack(
  function (req, res, next) {
    req.context = QS.parse(req.headers.cookie||'') || {}
    next()
  },
  Static({
    root: path.join(__dirname, 'static'),
    baseDir: '/static'
  }),
  BodyParser(),
  function (req, res, next) {
    console.log('BODY', req.body)
    function redirect () {
      //redirect to get so this still works http only app, without javascript
      //(although you have to reload to get new messages)
      res.setHeader('location', '/chat?cache='+Date.now()+'#latest')
      res.statusCode = 303
      return res.end('')
    }

    if(req.method == 'POST') {
      if(req.body.type === 'setup') {
        res.setHeader('set-cookie', QS.stringify(req.body))
        redirect()
      }
      else {
        var ts = Date.now()
        db.append({
          ts: ts, author: req.context.name, text: req.body.text
        }, function () {
          coherence.invalidate('latest', ts)
          redirect()
        })
      }
    }
    else
      next()
  },
  coherence
)).listen(3000, function () {
  console.error('http://localhost:3000')
})

