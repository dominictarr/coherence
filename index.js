
Coherence(function (api) {
  return h('ol#content', api.foo('hello').map(function (ary) {
    return ary.map(function (item) {
      return h('li', h('h2', item.toString(2), ' -- ', item.toString() ))
    })
  }))
})

