
var bcrypt = require('bcrypt')
var uuid = require('node-uuid')

exports.create = function(db, opts, cb) {

  if (!opts.user) {
    return cb(new Error('No username provided'))
  }

  db.get('user!' + opts.user, function(err, record) {

    record = record || {}

    if (!record.groups) {
      record.groups = []
    }

    if (opts.rm && record.groups) {
      var pos = record.groups.indexOf(opts.rm)
      if (pos > -1) {
        record.groups.splice(pos, 1)
      }
    }
    else if (opts.add) {
      if (record.groups.indexOf(opts.add) < 0) {
        record.groups.push(opts.add)
      }
      else {
        return cb(new Error('User already in group'))
      }
    }

    if (opts.pass) {

      bcrypt.hash(opts.pass, 5, function(err, bcryptedPassword) {

        record.salt = bcryptedPassword

        db.put('user!' + opts.user, record, cb)
      })
    }
    else {
      db.put('user!' + opts.user, record, cb)
    }

  })
}

exports.get = function(db, opts, cb) {
  db.get('user!' + opts.user, cb)
}

exports.validate = function(db, opts, cb) {

  var key = 'user!' + opts.user

  db.get(key, function(err, value) {

    if (err) {
      return cb(err)
    }

    bcrypt.compare(opts.pass, value.salt, function(err, match) {

      if (err) {
        return cb(err)
      }

      if (!match) {
        return cb('not authorized')
      }

      var sessionId = uuid.v4()

      var details = {
        sessionId: sessionId,
        username: opts.user,
        groups: value.groups
      }

      value.sessionId = sessionId

      db.put(key, value, function(err) {

        if (err) {
          return cb(err)
        }
        cb(null, details)
      })
    })
  })
}

exports.update = function() {
  exports.create.apply(null, arguments)
}

exports.delete = function(db, opts, cb) {
  db.del('user!' + opts.user, cb)
}

exports.getByUUID = function(db, sessionId, username, cb) {

  db.get('user!' + username, function(err, value) {

    if (err) {
      return cb(err)
    }

    if (value.sessionId === sessionId) {
      cb(null, value)
    }
  })
}
