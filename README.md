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

To facillitate this, the back end needs to provide a little extra information.
Firstly, it must be possible to request (via http) the html for single "partial"
without the "layout". (using ruby on rails terminology, a partial is a template
for part of a page that is reused on other pages, and typically combined with other
partials on one page, and a layout is a template that adds a header and footer,
and other stuff such as style sheets that appears on every page). Also, a partial
must contain a referece to the URL used to reload it, and a cache id and timestamp.

Several examples are provided, the simplest is `examples/clock/index.js`.
it renders a single partial (displaying the current time) and it updates every second.
This `data-id` `data-href` and `data-ts` must be provided. The front end calls
the server to check if it has something newer that `data-ts` and if so, rerequests
the partial from `data-href`.

``` html
<h1 data-id="clock" data-href="/clock" data-ts="1547118223052">Fri Jan 11 2019 00:03:43 GMT+1300 (NZDT)</h1>
```

The front checks with the server when necessary to see if things should be updated.
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


