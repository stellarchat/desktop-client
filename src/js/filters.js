/* global myApp */

myApp.filter('shortaddress', function() {
  return function(address) {
    if (!address || address.length < 8) {
      return address;
    }
    var start = address.substring(0, 8);
    var end = address.substring(address.length - 8);
    return start + '...' + end;
  }
});
