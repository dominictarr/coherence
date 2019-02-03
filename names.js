

module.exports = {
  //get /partial/..url to load url without layout.
  Partial: 'partial',
  Coherence: 'coherence', //url at which coherence specific things are under
  Script: 'browser', //name of the script which keeps ui up to date.
  Cache: 'cache', //query the cache state

  //the following are all set as data-* attributes

  Update: 'update',

  OpenHref: 'href',
  UpdateHref: 'href',
  PartialHref: 'href',

  Invalidate: 'invalidate',
  Reset: 'reset',
  Timestamp: 'ts',
  Identity: 'id'
}








