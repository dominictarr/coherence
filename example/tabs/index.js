

var http = require('http')
var Stack = require('stack')
var Coherence = require('../..')

var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset:'utf8'}],
      //this script must be loaded on front end!
      ['script', {src: '/coherence/browser.js'}],
    ],
    ['body',
      ['nav',
        ['ul',
          ['li', ['a', {href: '/page?number=1', 'data-target': 'target'}, 'one']],
          ['li', ['a', {href: '/page?number=2', 'data-target': 'target'}, 'two']],
          ['li', ['a', {href: '/page?number=3', 'data-target': 'target'}, 'three']]
        ]
      ],
      content
    ]
  ]
})
.use('page', function (opts) {
  return ['h1#target', 'Number:', opts.number || 0]
})

http.createServer(coherence).listen(8013)

