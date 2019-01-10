var u = require('./util')
var nested = require('libnested')
var URL = require('url')
var QS = require('querystring')
var fs = require('fs')
var path = require('path')

function path2Array (path) {
  return (path[0] == '/' ? path : '/' + path).split('/').slice(1)
}

function Render(layout) {
  var renderers = {}
  var cache = {}
  var waiting = []
  function apply (path, opts) {
    var fn = nested.get(renderers, path)
    if(!fn) throw new Error('no renderer at:'+path)
    return fn(opts, apply)
  }

  apply.toUrl = function (path, opts) {
    return '/' + path + (opts ? '?' + QS.stringify(opts) : '')
  }
  apply.since = Date.now()

  function render (req, res, next) {
    //if used in stack or express this will be defined already.
    next = next || function (err) {
      if(!err) err = new Error('not found')
      if(err) {
        res.statusCode = 500
        res.end(err.stack)
      }
      else {
        res.statusCode = 404
        res.end('not found')
      }
    }

    var fn
    var url = URL.parse(req.url)
    var paths = path2Array(url.pathname)
    var opts = QS.parse(url.query)

    console.log(req.method, paths.join('/'), opts)

    //check the cache to see if anything has updated.
    if(paths[0] === 'cache') {
      console.log('cache', paths)
      if(paths[1] == 'poll') {
        var ids = {}, since = +opts.since
        if(since >= apply.since) {
          console.log('LONG POLL')
          return waiting.push(function (_since) {
            var ids = {}
            for(var k in cache) {
              if(cache[k] > since) {
                ids[k] = cache[k]
              }
            }
            return res.end(JSON.stringify(ids))
          })
        }
        for(var k in cache) {
          if(cache[k] > since) {
            ids[k] = cache[k]
          }
        }

        return res.end(JSON.stringify(ids))
      }
    }
    else
    if(req.url == '/coherence/browser.js') {
      console.log("SERVE BROWSER.js")
      res.status = 200
      return fs.createReadStream(path.join(__dirname, 'browser.js')).pipe(res)
    }
    //if prefixed with /partial/... then render without the layout (no, headder, nav, etc)
    else {
      if(paths[0] === 'partial') {
        fn = nested.get(renderers, paths.slice(1))
        if(!fn) return next(new Error('not found:'+paths))
        val = fn(opts, apply)
      }
      else {
        var fn = nested.get(renderers, paths)
        if(!fn) return next(new Error('not found:'+paths))
        val = layout(opts, fn(opts, apply))
      }

      u.toHTML(val)(function (err, result) {
        if(err) return next(err)
        else if(Array.isArray(result)) {
          console.log('multiresult:', result.length)
          res.end(result.map(function (e) { return e.outerHTML }).join('\n'))
        }
        else res.end(result.outerHTML || '')
      })
    }
  }

  render.use = function (path, fn) {
    nested.set(renderers, path2Array(path), fn)
    return render
  }

  render.invalidate = function (key, ts) {
    apply.since = cache[key] = ts
    while(waiting.length)
      waiting.shift()(ts)
    return ts
  }

  return render
}

module.exports = Render


