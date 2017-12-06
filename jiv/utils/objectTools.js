var objectTools = {};

objectTools.sortByKey = function (array, key) {
  return array.sort(function (a, b) {
    var x = a[key];
    var y = b[key];
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
};

objectTools.getValues = function (obj) {
  var values = [];
  for (var key in obj) {
    values.push(obj[key]);
  }
  return values;
};

objectTools.argsToArray = function(obj) {

  if(typeof obj === 'string') {
    return [obj];
  }
  else if(obj === undefined) {
    return [];
  }
  else {
    return obj;
  }
}


module.exports = objectTools;