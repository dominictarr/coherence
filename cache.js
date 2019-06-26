
module.exports = function () {
  var waiting = []
  var cache = {}
  var earliest = Date.now(), latest = Date.now()
  function check (opts, cb) {
    var ids = {}, since = +opts.since
    if(since >= latest) {
      return waiting.push(function (_since) {
        for(var k in cache) {
          if(cache[k] > since) {
            ids[k] = cache[k]
          }
        }
        cb(null, {ids: ids, start: earliest})
      })
    }
    else {
      for(var k in cache) {
        if(cache[k] > since) {
          ids[k] = cache[k]
        }
      }
      cb(null, {ids: ids, start: earliest})
    }
  }
  check.invalidate = function (key, ts) {
    latest = Math.max(latest, cache[key] = (ts || Date.now()))
    //callback every listener? are we sure?
    while(waiting.length) waiting.shift()(ts)
    return ts
  }

  check.invalidateAll = function () {
    var ts = earliest = latest = Date.now()
    while(waiting.length) waiting.shift()(ts)
    return ts
  }

  return check
}
