
var api = {
  clock: function (opts, cb) {
    setTimeout(function () {
      cb(null, Date.now())
    }, 1000)
    return 'clock'
  }
}

window.Coherence = function (template) {
  template(api, function (err, 
})
