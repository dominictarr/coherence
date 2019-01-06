var morph = require('morphdom')
var inflight = 0, timer, since

//check wether user has this tab open, if it's not open
//don't check anything again until they come back.
//note: on my tiling window manager, it doesn't notice
//if you left this page open, but switch to another workspace.
//but if you switch tabs it does.

var onScreen = document.visibilityState == 'visible'
function setOnScreen () {
  if(onScreen) return
  onScreen = true
  check(since)
}
if(!document.visibilityState) {
  window.onfocus = setOnScreen
  window.onblur = function () {
    onScreen = false
  }
  window.onmouseover = setOnScreen
}
document.onvisibilitychange = function () {
  if(document.visibilityState === 'visible') setOnScreen()
  else onScreen = false
}

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
    if(!onScreen) return //don't check if the user isn't looking!
    console.log('check agian', onScreen, document.visibilityState)
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
  checking = true
  xhr('/cache/poll?since='+_since, function (_, data) {
    checking = false
    var ids
    try { ids = JSON.parse(data) } catch(_) {}
    if(ids && 'object' === typeof ids) {
      var ary = []
      for(var k in ids) {
        since = Math.max(since, ids[k])
        ary.push(k)
      }
    }

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
  xhr('/partial'+href, function (err, content) {
    MORPH=morph
    if(!err) {
      // some node types cannot just simply be created anywhere.
      // (such as tbody, can only be inside a table)
      // if you just call morph(el, content) it becomes a flattened
      // string.
      // so, create the same node type as the parent.
      // (this will break if you try to update to a different node type)
      //
      // DocumentFragment looked promising here, but document
      // fragment does not have innerHTML! you can only
      // use it manually! (I guess I could send the html
      // encoded as json...)
      if(content) {
        var fakeParent = document.createElement(el.parentNode.tagName)
        fakeParent.innerHTML = content
        morph(el, fakeParent.firstChild)
        //sometimes, we want to send more than one tag.
        //so that the main tag is updated then some more are appended.
        //do this via a document-fragment, which means only
        //one reflow.
        if(fakeParent.children.length > 1) {
          var df = document.createDocumentFragment()
          for(var i = 1; i< fakeParent.children.length; i++) {
            df.appendChild(fakeParent.children[i])
          }
          if(el.nextSibling)
            el.parentNode.insertBefore(df, el.nextSibling)
          else
            el.parentNode.appendChild(df)
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







