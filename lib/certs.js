
var forge = require('node-forge')
var fs = require('fs')

exports.createPEMObject = function createPEMObject(attrs) {

  try {
    var pems = JSON.parse(fs.readFileSync('./pems.json', 'utf8'))
    return pems
  }
  catch($) {
    // continue
  }

  var keys = forge.pki.rsa.generateKeyPair(1024)
  var cert = forge.pki.createCertificate()

  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  
  attrs = attrs || [{
    name: 'commonName',
    value: 'example.org'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'Virginia'
  }, {
    name: 'localityName',
    value: 'Blacksburg'
  }, {
    name: 'organizationName',
    value: 'Test'
  }, {
    shortName: 'OU',
    value: 'Test'
  }]

  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 6, // URI
      value: 'http://example.org/webid#me'
    }]
  }])
  
  cert.publicKey = keys.publicKey

  cert.sign(keys.privateKey)

  var pem = {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    cert: forge.pki.certificateToPem(cert)
  }

  var caStore = forge.pki.createCaStore()
  caStore.addCertificate(cert)

  try {
    forge.pki.verifyCertificateChain(caStore, [cert],
      function(vfd, depth, chain) {
        if(vfd === true) {
          console.log('Certificate verified.')
        }
        return true
    })
  }
  catch(ex) {
    console.log('Certificate verification failure: ' +
      JSON.stringify(ex, null, 2))
  }

  fs.writeFileSync('./pems.json', JSON.stringify(pem))

  return pem
}
