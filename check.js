var morph = require('morphdom')
var inflight = 0, timer, since

function xhr (url, cb) {
  var req = new XMLHttpRequest()
  req.open('get', url)
  req.setRequestHeader('Content-Type', 'application/json')
  req.onload = function () {
    cb(null, req.response)
  }
  req.onerror = function () {
    cb(new Error(req.status + ':' + req.statusText))
  }
  req.send()
}

window.onload = function () {
  scan()
}

function schedule () {
  clearTimeout(timer)
  timer = setTimeout(function () {
    check(since)
  }, 1e2)
}

function scan () {
  if(since) throw new Error('only scan once!')
  since = Infinity
  ;[].forEach.call(
    document.querySelectorAll('[data-ts]'),
    function (el) {
      since = isNaN(+el.dataset.ts) ? since : Math.min(since, +el.dataset.ts)
    })
  check(since)
}

// call the cache server, and see if there has been any updates
// since this page was rendered.
function check (_since) {
  xhr('/cache/poll?since='+_since, function (_, data) {
    var ids
    try { ids = JSON.parse(data) } catch(_) {}
    if(ids && 'object' === typeof ids) {
      var ary = []
      for(var k in ids) {
        since = Math.max(since, ids[k])
        ary.push(k)
      }
    }

    console.log(ids)
    if(since != _since) console.log("UPDATED SINCE", since)

    if(Array.isArray(ary) && ary.length) ary.forEach(update)
    if(!inflight) schedule()
  })
}

function update (id) {
  console.log('update:'+id)
  console.log('[data-id='+JSON.stringify(id)+']')
  var el = document.querySelector('[data-id='+JSON.stringify(id)+']')
  if(!el) {
    console.log('could not find id:'+id)
    return
    //xxxxxxxx
  }
  var href = el.dataset.href
  inflight ++
  console.log("UPDATE", '/partial'+href, inflight)
  xhr('/partial'+href, function (err, content) {
    console.log("MORPH", M_EL=el, M_C=content)
    MORPH=morph
    if(!err) {
      //some node types cannot just simply be created anywhere.
      //(such as tbody, can only be inside a table)
      //if you just call morph(el, content) it doesn't work.
      //so this is a hack to make it work.
      if(content) {
        var fakeParent = document.createElement(el.parentNode.tagName)
        fakeParent.innerHTML = content
        morph(el, fakeParent.firstChild)
        //if the result received was <tag><more tags...>
        //then diff the first tag, and 
        if(fakeParent.children.length > 1) {
          var prev = el
          for(var i = 1; i< fakeParent.children.length; i++) {
            var next = fakeParent.children[i]
            if(prev.nextSibling)
              el.parentNode.insertBefore(next, prev.nextSibling)
            else
              el.parentNode.appendChild(next)
          }
        }
      } else {
        //if the replacement is empty, remove el.
        el.parentNode.removeChild(el)
      }
    }
    //check again in one second
    if(--inflight) return
    schedule()
  })
}









