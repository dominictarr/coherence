var names = require('./names')
var morph = require('morphdom')
var forms = require('submit-form-element')

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
document.addEventListener('visibilitychange', function () {
  if(document.visibilityState === 'visible') setOnScreen()
  else onScreen = false
})

//-- util functions ---

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

window.addEventListener('load', scan)

// --- forms ---

function isTag(element, type) {
  return element.tagName.toLowerCase() == type.toLowerCase()
}

var clicked_button = null, timer

//remember which button was clicked, or handle the click if it was a link.
window.addEventListener('click',function (ev) {
  //need this hack, because onsubmit event can't tell you what button was pressed.

  if(isTag(ev.target, 'button') || isTag(ev.target, 'input') && ev.target.type == 'submit') {
    clicked_button = ev.target
    clearTimeout(timer)
    timer = setTimeout(function () {
      clicked_button = null
    },0)
  }
  //if we have a target for a link click, apply that element.
  //unless ctrl is held down, which would open a new tab
  else if(!ev.ctrlKey && isTag(ev.target, 'a') && ev.target.dataset[names.Update]) {
    var update = document.getElementById(ev.target.dataset[names.Update])
    if(!update) return
    ev.preventDefault()

    //use getAttribute instead of ev.target.href because then it will just be / and not have
    //http:...com/...
    var href = (ev.target.dataset[names.OpenHref] || ev.target.getAttribute('href'))
    if(href)
      xhr('/' + names.Partial + href, function (err, content) {
        if(err) console.error(err) //TODO: what to do with error?
        else morph(update, content)
      })
  }
})

//handle form submit
window.addEventListener('submit', function (ev) {
  var form = ev.target
  if(form.dataset[names.Update] || form.dataset[names.Invalidate] || form.dataset[names.Reset]) {
    ev.preventDefault()
    forms.submit(form, clicked_button, function (err, content) {
      //what to do with error?
      if(form.dataset[names.Invalidate])
        update(form.dataset[names.Invalidate])
      if(form.dataset[names.Update]) {
        var target = document.getElementById(form.dataset[names.Update])
        morph(target, content)
      }
      if(form.dataset[names.Reset])
        form.reset()
    })
  }
})

// --- checking for and applying updates ------

function schedule () {
  clearTimeout(timer)
  timer = setTimeout(function () {
    if(!onScreen) return //don't check if the user isn't looking!
    console.log('check again', onScreen, document.visibilityState)
    check(since)
  }, 1e2)
}

function scan () {
  if(since) throw new Error('only scan once!')
  since = Infinity
  ;[].forEach.call(
    document.querySelectorAll('[data-'+names.Timestamp+']'),
    function (el) {
      since = isNaN(+el.dataset[names.Timestamp]) ? since : Math.min(since, +el.dataset[names.Timestamp])
    })

  //skip checking if there were no updatable elements found
  if(since != Infinity) check(since)
  else console.error('coherence: no updatable elements found')
}

// call the cache server, and see if there has been any updates
// since this page was rendered.
function check (_since) {
  if(_since == undefined) throw new Error('undefined: since')
  checking = true
  xhr('/' + names.Coherence + '/' + names.Cache + '?since='+_since, function (_, data) {
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

function mutate (el, content) {
  // update an element with new content, using morphdom.

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
  // encoded as json... but that wouldn't be as light weight)
  if(content) {
    var fakeParent = document.createElement(el.parentNode.tagName)
    fakeParent.innerHTML = content
    morph(el, fakeParent.firstChild)
    //sometimes, we want to send more than one tag.
    //so that the main tag is updated then some more are appended.
    //do this via a document-fragment, which means only
    //one reflow (faster layout).
    if(fakeParent.children.length > 1) {
      var df = document.createDocumentFragment()
      for(var i = 1; i< fakeParent.children.length; i++)
        df.appendChild(fakeParent.children[i])

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

function update (id) {
  console.log('update:'+id)
  var el = document.querySelector('[data-'+names.Identity+'='+JSON.stringify(id)+']')
  if(!el) {
    console.log('could not find id:'+id)
    return
    //xxxxxxxx
  }
  //href to update this element
  var href = el.dataset[names.PartialHref]
  if(href) {
    inflight ++
    xhr('/'+names.Partial+href, function (err, content) {
      if(!err) mutate(el, content)
      //check again in one second
      if(--inflight) return
      schedule()
    })
  }
  else {
    console.error('cannot update element, missing data-'+names.PartialHref+' attribute')
  }
}


