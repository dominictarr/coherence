var Coherence = require('../..')
var http      = require('http')
var QS        = require('querystring')
var ago       = require('nice-ago')
var fs        = require('fs')
var dir       = process.argv[2] || process.cwd()
var path      = require('path')
var cont      = require('cont')
var Stack     = require('stack')

//chat history in lines in this file.
//in practice you'd probably have some sort of database.
var history = []
var filename = '/tmp/coherence-example-chat.txt'
function append(data, cb) {
  history.push(data)
  //really, should have a thing here to ensure that only one append happens at a time
  //but this is just example code so skip it.
  fs.appendFile(filename, JSON.stringify(data)+  '\n', 'utf8', function (err) {
    coherence.invalidate('latest', Date.now())
    cb()
  })
}

fs.readFile(filename, 'utf8', function (_, str) {
  history = (str || '').split('\n').filter(Boolean).map(function (e) {
    //it's theoritically possible that two appends happen
    //happen at once and that might cause something invalid so
    //do parse inside of try.
    try { return JSON.parse(e) }
    catch (ignore) { }
  })
  if(!history.length)
    history.push({
      ts: Date.now(),
      author: 'coherence-bot',
      text: 'welcome to coherence chat example'
    })
  coherence.invalidate('latest', Date.now())
})

//render layout. this wraps every full page.
//this is the place to include menu items, etc...
var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset: 'UTF-8'}],
      ['script', {src: '/coherence/browser.js'}],
      ['link', {rel: 'stylesheet', href: '/static/style.css'}]
    ],
    ['body',
      ['div.header',
        ['div.heading', 'coherence chat'],
        ['a', {href: '/setup', 'data-target': 'modal'}, 'setup'],
      ],
      ['div.page', content],
      ['div#modal']
    ]
  ]
})
//the body of the chat. a list of messages.
//the special part is `div.latest` which is where future messages get inserted.
.use('messages', function (opts) {
  var start = opts.start | 0
  var end = opts.end || history.length
  return [
    ['div.messages']
    .concat(
        history
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
    ['div.latest', {
      'data-id': 'latest',
      'data-href':'/messages?start='+end,
      'data-ts': Date.now()
    }]
  ]
})
//wrapper around messages view that includes a form for entering text.
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

http.createServer(Stack(
  function (req, res, next) {
    req.context = QS.parse(req.headers.cookie||'') || {}
    next()
  },
  function (req, res, next) {
    if(/^\/static\//.test(req.url))
      fs.createReadStream(__dirname+req.url).pipe(res)
    else next()
  },
  function (req, res, next) {
    if(req.method == 'POST') {
      var body = ''
      req.on('data', function (d) { body += d })
      req.on('end', function (d) {
        console.log('BODY', body)
        req.body = QS.parse(body)
        next()
      })
    }
    else
      next()
  },
  function (req, res, next) {
    function redirect () {
      //redirect to get so this still works http only app, without javascript
      //(although you have to reload to get new messages)
      res.setHeader('location', '/chat')
      res.statusCode = 303
      return res.end('')
    }

    if(req.method == 'POST') {
      if(req.body.type === 'setup') {
        res.setHeader('set-cookie', QS.stringify(req.body))
        redirect()
      }
      else {
        append({
          ts: Date.now(),
          author: req.context.name,
          text: req.body.text
        }, redirect)
      }
    }
    else
      next()
  },
  coherence
)).listen(8011)










