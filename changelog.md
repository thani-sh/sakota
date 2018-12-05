# 2017-12-03 - v2.1.1

 - Fixed a bug with getChanges method result cache used when the prefix changes.

# 2017-12-03 - v2.1.0

 - Added a `hasChanges` method to check whether the proxy has any changes
 - Cached `getChanges` method result to improve performance
 - Fixed a bug with tracking changes when deleting newly added property

# 2017-11-16 - v2.0.0

 - Removed the `Sakota.changes` method. It used to be the only way to get changes from the proxy.
 - The handler can be accessed with the string key `__sakota__` the handler has a `getChanges` method.
 - Added the type `Proxied<T>` which will add the `__sakota__` property to the proxied object type.

# 2017-11-06 - v1.0.0

 - Initial Release!
