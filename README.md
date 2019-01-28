# coherence

frontend framework based on a cache `coherence`
protocol.

## Architecture

Take a traditional RESTful http application, but then supercharge it with
_cache invalidation_. This means just write templates and queries, rendered
serverside, but then the front end checks at certain appropiate times wether
parts of the page have changed, and if so updates just those parts.
Because they way the cache (front end views) are invalidated and updated is
standardized into a protocol, _it is not necessary to write any custom front end javascript_.

To facillitate this, the back end needs to provide a little extra information
and constraints. Firstly, we assume that application is comprised of a number of views,
which are composed from a layout and partials. The "layout" is a wrapper around every
page in the app, usually adding nav and footer etc. "partials" are templates for just
a part of the page, that are reused across multiple views. This is a very common way
to create an http application. The different thing, is that it needs to be possible
to request just a single partial at a time (as well as the full page) via an http request,
(without the layout). And finally, each rendered partial must have the url to update it
in an attribute, and an cache id and state. Similar to an [etag](https://en.wikipedia.org/wiki/HTTP_ETag)
header (but more powerful) but it represents the cache state of a single element.

Several examples are provided, the simplest is `examples/clock/index.js`.
it renders a single partial (displaying the current time) and it updates every second.
This `data-id` `data-href` and `data-ts` must be provided. The front end calls
the server to check if it has something newer that `data-ts` and if so, rerequests
the partial from `data-href`.

``` html
<h1 data-id="clock" data-href="/clock" data-ts="1547118223052">Fri Jan 11 2019 00:03:43 GMT+1300 (NZDT)</h1>
```

in an etag header, a resource has a single opaque token. It's just a string that
identifies the state of a resource. It could be the hash of a file or the timestamp
a record is updated, or just a random number. In `coherence` cache state is split into
two parts - the `id` and the `ts` (timestamp). The id just identifies the caching resource.
the `ts` indicates how old that record is. Since it's a timestamp - we can XXXXXXXXXX

The frontend checks with the server when necessary to see if things should be updated.
(it asks again when ever something changes, but if the user has switched to another tab,
until they switch back) of course, this is a contrived example, `coherence` is not intended
for things that constantly update, but is a good demonstration of the basics.

When the server reports that the current clock is invalid (which happens every second, in this case)
the partial is requested again from `/clock`, and the result is inserted into the current document.

updates are applied with [morphdom](https://www.npmjs.com/package/morphdom),
this makes updates very slick and gives the feeling of using a single page application, but
the feeling of developing a simple http application.

Because `coherence` only uses a very small amount of front end javascript, memory usage
is very low, similar to a static page, unlike typical react or angular applications with
front end rendering and JSON apis. [your web app is bloated](https://github.com/dominictarr/your-web-app-is-bloated)


## License

MIT

