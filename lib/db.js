var level = require('leveldown');

module.exports = function(path, args) {
  return level(path, args);
};

