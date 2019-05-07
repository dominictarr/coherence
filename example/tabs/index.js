

var http = require('http')
var Stack = require('stack')
var Coherence = require('../..')

function tabLink (href) {
  var attrs = {href: href}
  attrs['data-'+names.Update] = 'target'
  return ['a', attrs, name]
}

var coherence = Coherence(function (opts, content) {
  return ['html',
    ['head',
      ['meta', {charset:'utf8'}],
      //this script must be loaded on front end!
      ['script', {src: coherence.scriptUrl}],
    ],
    ['body',
      ['nav',
        ['ul',
          ['li', link('/page?number=1', 'one')],
          ['li', link('/page?number=2', 'two')],
          ['li', link('/page?number=3', 'three')]
        ]
      ],
      content
    ]
  ]
})
.use('page', function (opts) {
  return ['h1#target', 'Number:', opts.number || 0]
})
.setDefault('page')

http.createServer(coherence).listen(3000, function () {
  console.error('http://localhost:3000')
})

