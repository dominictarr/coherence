var URL = require('url')
var QS = require('qs')
var fs = require('fs')
var path = require('path')

var nested = require('libnested')

var u = require('./util')
var names = require('./names')

function path2Array (path) {
  if(Array.isArray(path)) return path
  return (path[0] == '/' ? path : '/' + path).split('/').slice(1)
}

var doctype = '<!DOCTYPE html \n  PUBLIC "-//W3C//DTD HTML 4.01//EN"\n  "http://www.w3.org/TR/html4/strict.dtd">'

function Render(layout) {
  var renderers = {}
  var cache = {}
  var waiting = []

  function render (req, res, next) {

    function apply (path, opts) {
      var fn = nested.get(renderers, path2Array(path))
      if(!fn) {
        throw new Error('no renderer at:'+path)
      }
      return fn(opts, apply, req)
    }

    apply.since = Date.now()
    apply.scriptUrl = render.scriptUrl
    apply.toUrl = function (path, opts) {
      return '/' + path + (opts ? '?' + QS.stringify(opts) : '')
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
      var ids = {}, since = +opts.since
      if(since >= render.since) {
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
    else
    if(req.url === render.scriptUrl) {
      res.status = 200
      return fs.createReadStream(path.join(__dirname, 'browser.js')).pipe(res)
    }
    //if prefixed with /partial/... then render without the layout (no, headder, nav, etc)
    else {
      var useDocType = false
      if(paths[0] === names.Partial) {
        useDocType = false
        fn = nested.get(renderers, paths.slice(1))
        if(!fn) return next(new Error('not found:'+paths))
        val = fn(opts, apply, req)
      }
      else {
        useDocType = true
        var fn = nested.get(renderers, paths)
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

  render.since = 0

  render.use = function (path, fn) {
    nested.set(renderers, path2Array(path), fn)
    return render
  }

  render.invalidate = function (key, ts) {
    render.since = cache[key] = ts
    //callback every listener? are we sure
    while(waiting.length)
      waiting.shift()(ts)
    return ts
  }

  render.scriptUrl = '/'+names.Coherence + '/' + names.Script + '.js'

  return render
}

module.exports = Render






