var URL = require('url')
var QS = require('qs')
var fs = require('fs')
var path = require('path')

var u = require('./util')
var names = require('./names')

function toPath(path) {
  return '/' + path.join('/')
}

function path2Array (path) {
  if(Array.isArray(path)) return path
  return (path[0] == '/' ? path : '/' + path).split('/').slice(1)
}

var doctype = '<!DOCTYPE html \n  PUBLIC "-//W3C//DTD HTML 4.01//EN"\n  "http://www.w3.org/TR/html4/strict.dtd">'

function get(obj, path) {
  return obj[toPath(path)]
}
function set(obj, path, value) {
  if('string' == typeof path)
    path = path2Array(path)
  return obj['/' + path.join('/')] = value
}

function Render(layout) {
  var renderers = {}
  var cache = {}
  var waiting = []
  var latest = Date.now(), earliest = Date.now()

  function render (req, res, next) {

    function apply (path, opts) {
      var fn = get(renderers, path2Array(path))
      if(!fn) {
        throw new Error('no renderer at:'+path)
      }
      return fn(opts, apply, req)
    }

    apply.since = latest
    apply.scriptUrl = render.scriptUrl
    apply.toUrl = function (path, opts) {
      return '/' + path + (opts ? '?' + QS.stringify(opts) : '')
    }

    apply.cacheAttrs = function (href, id, ts) {
      return {
        'data-href': href,
        'data-id': id,
        'data-ts': ts || apply.since
      }
    }

    //if used in stack/connect/express this will be defined already.
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

    //check the cache to see if anything has updated.
    if(paths[0] === names.Coherence && paths[1] == names.Cache) {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      var ids = {}, since = +opts.since
      if(since >= render.since) {
        return waiting.push(function (_since) {
          var ids = {}
          for(var k in cache) {
            if(cache[k] > since) {
              ids[k] = cache[k]
            }
          }
          return res.end(JSON.stringify({ids: ids, start: earliest}))
        })
      }

      for(var k in cache) {
        if(cache[k] > since) {
          ids[k] = cache[k]
        }
      }

      return res.end(JSON.stringify({ids: ids, start: earliest}))
    }
    else
    if(req.url === render.scriptUrl) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript')
      return fs.createReadStream(path.join(__dirname, 'browser.js')).pipe(res)
    }
    //if prefixed with /partial/... then render without the layout (no, headder, nav, etc)
    else {
      res.statusCode = 200
      var useDocType = false
      if(paths[0] === names.Partial) {
        res.setHeader('Content-Type', 'text/plain')
        useDocType = false
        fn = get(renderers, paths.slice(1))
        if(!fn) return next(new Error('not found:'+paths))
        val = fn(opts, apply, req)
      }
      else {
        useDocType = true
        var fn = get(renderers, paths)
        res.setHeader('Content-Type', 'text/html')
        if(!fn) return next(new Error('not found:'+paths))
        val = layout(opts, fn(opts, apply, req), apply, req)
      }

      u.toHTML(val)(function (err, result) {
        if(err) return next(err)
        else if(Array.isArray(result)) {
          res.end(result.map(function (e) { return e.outerHTML }).join('\n'))
        }
        else res.end((useDocType ? doctype : '') + result.outerHTML || '')
      })
    }
  }

  render.since = Date.now()

  render.use = function (path, fn) {
    set(renderers, path2Array(path), fn)
    return render
  }

  function concat() {
    return [].concat.apply([], [].map.call(arguments, path2Array))
  }

  render.group = function (group_path, fn) {
    function use (_path, fn) {
      set(renderers, concat(group_path, _path), fn)
    }
    //`{system_path}/{key}` -> `{group_path}/{to}`
    use.map = function (_path, key, to) {
      render.map(_path, key, concat(group_path, to))
      return use
    }

    use.list = function (path, to) {
      return render.list(path, concat(group_path, to))
    }

    fn(use)
    return render
  }

  render.map = function (path, key, to) {
    var _path = concat(path, key)
    set(renderers, _path, function (opts, apply, req) {
      return get(renderers, to)(opts, apply, req)
    })
  }

  render.list = function (path, to) {
    if(!get(renderers, path)) {
      var ary = [to]
      function list (opts, apply, req) {
        return ary.map(function (fn) {
          return get(renderers, to)(opts, apply, req)
        })
      }
      list.ary = ary
      set(renderers, path, list)
    }
    else
      get(renderers, path).ary.push(to)
  }

  render.setDefault = function (path) {
    var a = path2Array(path)
    set(renderers, [], function (opts, apply, req) {
      return get(renderers, a)(opts, apply, req)
    })
    return render
  }

  render.invalidate = function (key, ts) {
    latest = render.since = Math.max(render.since, cache[key] = (ts || Date.now()))
    //callback every listener? are we sure
    while(waiting.length)
      waiting.shift()(ts)
    return ts
  }

  //invalidate all cache records, this makes the frontend reload everything
  render.invalidateAll = function () {
    var ts = earliest = latest = render.since = Date.now()
    while(waiting.length)
      waiting.shift()(ts)
    return ts
  }

  render.scriptUrl = '/'+names.Coherence + '/' + names.Script + '.js'

  return render
}

module.exports = Render

