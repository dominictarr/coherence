var URL = require('url')
var QS = require('querystring')
var H = require('h')
var cpara = require('cont').para
var pull = require('pull-stream/pull')
var Collect = require('pull-stream/sinks/collect')
var paramap = require('pull-paramap')
var nested = require('libnested')

function isFunction (f) {
  return 'function' === typeof f
}

var isArray = Array.isArray

function isEmpty (e) {
  for(var k in e) return false
  return true
}

function isString (s) {
  return 'string' === typeof s
}

exports.toUrl = function toUrl(path, opts) {
  return '/'+(
    Array.isArray(path) ? path.join('/') : ''+path
  ) + (
    !isEmpty(opts) ? '?'+QS.encode(opts) : ''
  )
}

function toCont (f) {
  if(f.length === 1) return function (cb) {
    f(function (err, hs) {
      exports.toHTML(hs)(cb)
    })
  }
  else if(f.length === 2)
    return function (cb) {
      pull(
        f,
        paramap(function (e, cb) {
          exports.toHTML(e)(cb)
        }, 32),
        Collect(cb)
      )
    }
}

function flatten (a) {
  var _a = []
  for(var i = 0; i < a.length; i++)
    if(isArray(a[i]) && !isString(a[i][0]))
      _a = _a.concat(flatten(a[i]))
    else
      _a.push(a[i])
  return _a
}


//even better would be streaming html,
//not just into arrays.
var k = 0

function toHTML (hs) {
  return function (cb) {
    if(!isFunction(cb)) throw new Error('cb must be a function, was:'+cb)
    var called = false
    var C = (
      isFunction(hs) ? toCont(hs)
    : isArray(hs) ? cpara(hs.map(toHTML))
    : function (cb) {
        if(!called) {
          called = true
          cb(null, hs)
        }
        else
          throw new Error('called twice')
      }
    )

    C(function (err, val) {
      if(err) cb(err)
      else if(isArray(val) && isString(val[0])) {
        cb(null, flatten(val))
      } else
        cb(null, val)
    })
  }
}

exports.toHTML = toHTML

exports.createHiddenInputs = function createHiddenInputs (meta, _path) {
  _path = _path ? [].concat(_path) : []
  var hidden = []
  nested.each(meta, function (value, path) {
    if(value !== undefined)
      hidden.push(['input', {
        name: _path.concat(path).map(function (e) { return '['+e+']' }).join(''),
        value: value,
        type: 'hidden'
      }])
  }, true)
  return hidden
}
