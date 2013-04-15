var test = require("tape")
var xtend = require("./")

test("merge", function(assert) {
    var a = { a: "foo" }
    var b = { b: "bar" }

    assert.deepEqual(xtend({}, a,b), { a: "foo", b: "bar" })
    assert.end()
})

test("replace", function(assert) {
    var a = { a: "foo" }
    var b = { a: "bar" }

    assert.deepEqual(xtend({}, a,b), { a: "bar" })
    assert.end()
})

test("undefined", function(assert) {
    var a = { a: undefined }
    var b = { b: "foo" }

    assert.deepEqual(xtend({}, a,b), { a: undefined, b: "foo" })
    assert.deepEqual(xtend({}, b,a), { a: undefined, b: "foo" })
    assert.end()
})

test("handle 0", function(assert) {
    var a = { a: "default" }
    var b = { a: 0 }

    assert.deepEqual(xtend({}, a,b), { a: 0 })
    assert.deepEqual(xtend({}, b,a), { a: "default" })
    assert.end()
})

test("null as argument", function (assert) {
    var a = { foo: "bar" }
    var b = null
    var c = undefined

    assert.deepEqual(xtend(b, a, c), { foo: "bar" })
    assert.end()
})
