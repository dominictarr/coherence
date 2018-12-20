var h = require('hyperscript')
var morph = require('morphdom')
var qs = require('querystring')

//take an api, but give all methods a wrapper
//to create observables. then you can use it
//like a sync api.

function wrapApi(api, cb) {
  var invalidators = {}
  var n = 0
  var _api = {}
  for(var k in api) (function (k) {
    _api[k] = function (opts) {
      var mappers = []
      function obv (fn) {
        if(fn) {
          n++
          var id = api[k](opts, function (err, value) {
            var _value = mappers.reduce(function (value, map) { return map(value) }, value)
            if(Array.isArray(_value))
              _value = h('span', _value)
            _value.dataset['invalidator'] = id
            _value.dataset['invalidator_options'] = JSON.stringify([k, opts])
            fn(_value)
            if(--n) return
            cb() //all partial templates loaded
          })
          invalidators[id] = {name: k, opts: opts}
        }
      }
      obv.map = function (fn) { mappers.push(fn); return obv }
      return obv
    }
  })(k)

  api._invalidators = invalidators
  return _api
}

var api = {
  foo: function (opts, cb) {
    setTimeout(function () {
      var a = []
      for(var i = 0; i < 256; i++)
        a.push(i)
      cb(null, a)
    }, 100)
    return 'foo:'+1000
  }
}

exports.wrap = wrapApi
exports.api = api
