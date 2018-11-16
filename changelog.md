# 2017-11-16 - v2.0.0

 - Removed the `Sakota.changes` method. It used to be the only way to get changes from the proxy.
 - The handler can be accessed with the string key `__sakota__` the handler has a `getChanges` method.
 - Added the type `Proxied<T>` which will add the `__sakota__` property to the proxied object type.

# 2017-11-06 - v1.0.0

 - Initial Release!
