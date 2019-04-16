'use strict'
var fs = require('fs')

module.exports = function (filename, cb) {
  var db, history = []
  fs.readFile(filename, 'utf8', function (_, str) {
    history = (str || '').split('\n').filter(Boolean).map(function (e) {
      //it's theoritically possible that two appends happen
      //happen at once and that might cause something invalid so
      //do parse inside of try.
      try { return JSON.parse(e) }
      catch (ignore) { }
    })
    if(!history.length)
      history.push({
        ts: Date.now(),
        author: 'coherence-bot',
        text: 'welcome to coherence chat example'
      })

    cb(null, db)
  })

  return db = {
    array: function () { return history },
    append: function (data, cb) {
      fs.appendFile(filename, JSON.stringify(data)+  '\n', 'utf8', function (err) {
        history.push(data)
        console.log('append', history)
        cb()
      })
    },
  }
}

