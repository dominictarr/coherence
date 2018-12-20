var Coherence = require('./')
var http = require('http')

var ago = require('nice-ago')
var fs = require('fs')
var dir = process.argv[2] || process.cwd()
var path = require('path')
var watch = require('watch').watchTree

var root = path.resolve(process.cwd(), process.argv[2] || '.')

var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset: 'UTF-8'}],
      ['script', {src: '/cache.js'}],
      ['style', `
        .tree {
          display: flex;
          flex-direction: column;
        }
        .file__meta {
          width: 100%;
          display: flex;
          flex-direction: row;
          background: grey;
          justify-content: flex-end;
        }
        .file__name {
          padding: 5px;

        }
        .file__size {
          width: 100px;
          text-align: right;
          padding: 5px;
        }
        .file__mtime {
          width: 100px;
          text-align: right;
          padding: 5px;
        }
        .dir {
          margin-left: 10px;
          display: flex;
          flex-direction: column;
        }

      `]
    ],
    ['body', content]
  ]
}).use(
  'tree', function (opts, apply) {
    return ['div.tree',
      apply('file', {file: '.'})
    ]
  }
)
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
  console.log('render:', file)
  return function (cb) {
    fs.stat(path.resolve(root, file), function (err, stat) {
      if(err) return cb(err)
      var attrs = {'data-href':apply.toUrl('file', opts), 'data-id':file, 'data-ts':apply.since}

      if(stat.isDirectory())
        fs.readdir(path.resolve(root, file), function (err, ls) {
          if(err) return cb(err)
          cb(null, ['div.file', attrs,
            ['div.file__meta',
              ['div.file__name', {title: path.join(dir, file)}, ['label', file]],
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
            ['div.file__name', ['label', file]],
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

http.createServer(coherence).listen(8010)




