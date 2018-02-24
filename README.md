# usage

/# node
> var u = require('./utils')
  > var o = u.readJson('relative file name')
> u.reduceArrays(o) // not recursive only check the root element's properties
  > u.writeJson('file name', o)
  > o // print out the object, it's javascrpit..

