var chance = new (require('chance'))();

exports.getNameWithInitial = function (initial) {
  initial = initial.toUpperCase()[0];
  var name;
  do {
    name = chance.first();
  } while(name[0] !== initial);

  return name;
};
