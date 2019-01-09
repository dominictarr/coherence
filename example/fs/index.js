var Coherence = require('../..')
var http      = require('http')
var QS        = require('querystring')
var ago       = require('nice-ago')
var fs        = require('fs')
var dir       = process.argv[2] || process.cwd()
var path      = require('path')
var watch     = require('watch').watchTree
var cont      = require('cont')
var Stack     = require('stack')
var ecstatic  = require('ecstatic')
var cp        = require('child_process')

var root = path.resolve(process.cwd(), process.argv[2] || '.')

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
.use('tree', function (opts, apply) {
  return ['div.tree', apply('file', {file: opts.file || '.'}) ]
})
.use('read', function (opts, apply) {
  return ['pre.file__raw', cont.to(fs.readFile)(opts.file, 'utf8')]
})
.use('edit', function (opts, apply) {
  return ['form', {method: 'post'},
    ['input', {type:'hidden', value: opts.file, name: 'file'}],
    ['textarea.file__raw', {name: 'content'},
      cont.to(fs.readFile)(opts.file, 'utf8')
    ],
    ['button', 'save'],
  ]
})
.use('file', render_file)

watch(dir, {
}, function (filename, newStat, oldStat) {
  if('object' === typeof filename) return
  var ts = Date.now()
  //interpret new files and deletes as updates to the directory.
  if(!oldStat || newStat.nLink === 0) {
    console.log("UPDATE", filename)
    filename = path.dirname(filename)
    console.log("UPDATE", filename)
  }
  var id = path.relative(root, filename) || '.'
  coherence.invalidate(id, ts)
})

function render_file(opts, apply) {
  if(!opts.file) throw new Error('file must be provided')
  var file = opts.file || '.'
  return function (cb) {
    fs.stat(path.resolve(root, file), function (err, stat) {
      if(err) return cb(err)
      var attrs = {'data-href':apply.toUrl('file', opts), 'data-id':file, 'data-ts':apply.since}

      if(stat.isDirectory())
        fs.readdir(path.resolve(root, file), function (err, ls) {
          if(err) return cb(err)
          cb(null, ['div.file', attrs,
            ['div.file__meta',
              ['div.file__name', {title: path.join(dir, file)},
                ['a',
                {href: apply.toUrl('tree', {file: file})},
                file
              ]],
              ['div.file__size'],
              ['div.file__mtime', stat.mtimeMs],
            ],
            ['div.dir'].concat(ls.map(function (_file) {
              return apply('file', {file: path.join(file, _file)})
            }))
          ])
        })
      else
        cb(null,  ['div.file', attrs,
          ['div.file__meta',
            ['div.file__name',
              ['a',
                {href: apply.toUrl('read', {file: file})},
                file
              ]
            ],
            ['div.file__size', ''+stat.size],
            ['div.file__mtime',
              {title: new Date(stat.mtimeMs).toString()},
              stat.mtimeMs
            ]
          ]
        ])
    })
  }
}

http.createServer(Stack(
  function (req, res, next) {
    if(req.method === 'POST') {
      console.log("POST", req)
      var body = ''
      req.on('data', function (d) {
        body += d
      })
      req.on('end', function (d) {
        req.body = QS.parse(body)
        console.log("BODY", req.body)
        next()
      })
    }
    else
      next()
  },
  function (req, res, next) {
    var body = req.body
    if(req.method === "POST" && body.file && body.content) {
      return fs.writeFile(
        body.file,
        body.content.split('\r').join(''),
        function (err) {
          if(err) next(err)
          else    next()
        }
      )
    }
    next()
  },
//  ecstatic({
//    root:path.join(__dirname, 'static'),
//    showDir: true,
//    baseDir: '/static'
//  }),
  function (req, res, next) {
    if(/^\/static\//.test(req.url))
      fs.createReadStream(__dirname+req.url).pipe(res)
    else next()
  },
  coherence
)).listen(8010)


var ticker = cp.spawn('bash', ['-c', 'while true; do date; sleep 1; done'])
var output = ''
ticker.stdout.on('data', function (d) {
  output += d
  var ts = Date.now()
  console.log('invalidate', 'ticker', ts)
  coherence.invalidate('ticker', ts)
})

coherence.use('ticker', function (opts, apply) {
  var start = opts.start || 0
  var tail = opts.end == null
  var end = opts.end == null ? output.length : opts.end
  return [
    ['pre.stdout', output.substring(start, end)],
    tail ? ['pre.stdout', {
      'data-href': apply.toUrl('ticker', {start: end}),
      'data-id': 'ticker',
      'data-ts': apply.since
    }] : ''
  ]
})

