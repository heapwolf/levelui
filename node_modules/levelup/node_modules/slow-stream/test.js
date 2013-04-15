var fs               = require('fs')
  , assert           = require('assert')
  , colors           = require('colors')
  , SlowStream       = require('./')

  , boganData        =
        "He's got a massive waratah flamin he's got a massive aussie salute. As cross as a arvo also as cross as a cut lunch. She'll be right hottie also as cunning as a turps. As cunning as a sunnies bloody gutful of tucker. She'll be right dickhead flamin shazza got us some shag on a rock. He's got a massive bog standard heaps as stands out like bazza. You little ripper dipstick piece of piss as stands out like porky.\n"
      + "He's got a massive ridgy-didge mate come a cane toad. Trent from punchy road train flamin as busy as a dickhead. He hasn't got a boozer it'll be cockie. She'll be right mappa tassie how gutful of show pony. As dry as a decent nik my flat out like a ridgy-didge. We're going slaps when as cunning as a crook. As cunning as a rage on she'll be right damper. Get a dog up ya booze with as busy as a paddock.\n"
      + "Lets throw a maccas my as cunning as a fisho. Trent from punchy ropeable piece of piss as dry as a fair go. Grab us a cracker no worries lets get some chokkie. Lets throw a durry no worries he's got a massive drongo. Grab us a stonkered flamin she'll be right hoon. She'll be right fisho heaps she'll be right lizard drinking. He's got a massive stoked where it'll be going off. As cross as a pig's arse mate lets get some sheila. As cross as a metho my lets throw a digger. It'll be garbo no dramas flat out like a kero. As busy as a swagger mate we're going grog.\n"
      + "Stands out like a schooner bloody as cross as a truckie. She'll be right rip snorter flamin she'll be right butcher. Trent from punchy flick to as dry as a longneck. Gutful of yabber flamin shazza got us some gutta. As dry as a chunder flamin lets get some pozzy. She'll be right cut lunch to flat out like a longneck. strewth when gutful of flick. As dry as a gyno how as busy as a fruit loop. It'll be banana bender flamin come a true blue. As dry as a g'day flamin you little ripper divvy van. Trent from punchy banana bender when as cross as a bludger.\n"
      + "As cunning as a mates how she'll be right tucker. Stands out like a his blood's worth bottling flamin she'll be right wobbly. Lets throw a pav when stands out like a mokkies. She'll be right butcher when she'll be right wuss. Built like a longneck piece of piss built like a parma. He hasn't got a dipstick where gutful of joey. He's got a massive avos no dramas she'll be right sanger. As cross as a freo piece of piss as busy as a sickie. Stands out like a bunyip to grab us a bail up. Lets get some bloke flamin it'll be rego. captain cook piece of piss as dry as a milk bar.\n"
      + "Lets get some dunny no dramas she'll be right fly wire. bludger how it'll be jumbuck. Shazza got us some fisho uluru. You little ripper crook with you little ripper struth. He hasn't got a wuss where shazza got us some kindie. He's got a massive give it a burl heaps lets throw a ripper. He hasn't got a slaps shazza got us some big smoke. As stands out like holden how bushranger. As busy as a yobbo my shazza got us some fair go. As dry as a corker how built like a flake.\n"
      + "It'll be chunder where grab us a bottlo. As busy as a greenie as cross as a boozer. He's got a massive dipstick piece of piss as dry as a thingo. Come a bizzo where he's got a massive stoked. As cunning as a fair go with as stands out like op shop. Gutful of decent nik flamin trent from punchy aussie salute. As dry as a frog in a sock with as dry as a ocker. As busy as a rotten piece of piss he hasn't got a bail out. Gutful of chunder when mad as a outback. Lets throw a old fella he hasn't got a prezzy.\n"
      + "It'll be pint no worries trent from punchy larrikin. As dry as a jackaroo to as busy as a spit the dummy. As dry as a aussie salute when as cross as a ridgy-didge. Flat out like a corker no dramas as stands out like squizz. As dry as a mates bloody as dry as a chokkie. Gutful of his blood's worth bottling when grab us a cark it. Stands out like a banana bender flamin he's got a massive bitzer.\n"
      + "He's got a massive waratah flamin he's got a massive aussie salute. As cross as a arvo also as cross as a cut lunch. She'll be right hottie also as cunning as a turps. As cunning as a sunnies bloody gutful of tucker. She'll be right dickhead flamin shazza got us some shag on a rock. He's got a massive bog standard heaps as stands out like bazza. You little ripper dipstick piece of piss as stands out like porky.\n"
      + "He's got a massive ridgy-didge mate come a cane toad. Trent from punchy road train flamin as busy as a dickhead. He hasn't got a boozer it'll be cockie. She'll be right mappa tassie how gutful of show pony. As dry as a decent nik my flat out like a ridgy-didge. We're going slaps when as cunning as a crook. As cunning as a rage on she'll be right damper. Get a dog up ya booze with as busy as a paddock.\n"
      + "Lets throw a maccas my as cunning as a fisho. Trent from punchy ropeable piece of piss as dry as a fair go. Grab us a cracker no worries lets get some chokkie. Lets throw a durry no worries he's got a massive drongo. Grab us a stonkered flamin she'll be right hoon. She'll be right fisho heaps she'll be right lizard drinking. He's got a massive stoked where it'll be going off. As cross as a pig's arse mate lets get some sheila. As cross as a metho my lets throw a digger. It'll be garbo no dramas flat out like a kero. As busy as a swagger mate we're going grog.\n"
      + "Stands out like a schooner bloody as cross as a truckie. She'll be right rip snorter flamin she'll be right butcher. Trent from punchy flick to as dry as a longneck. Gutful of yabber flamin shazza got us some gutta. As dry as a chunder flamin lets get some pozzy. She'll be right cut lunch to flat out like a longneck. strewth when gutful of flick. As dry as a gyno how as busy as a fruit loop. It'll be banana bender flamin come a true blue. As dry as a g'day flamin you little ripper divvy van. Trent from punchy banana bender when as cross as a bludger.\n"
      + "As cunning as a mates how she'll be right tucker. Stands out like a his blood's worth bottling flamin she'll be right wobbly. Lets throw a pav when stands out like a mokkies. She'll be right butcher when she'll be right wuss. Built like a longneck piece of piss built like a parma. He hasn't got a dipstick where gutful of joey. He's got a massive avos no dramas she'll be right sanger. As cross as a freo piece of piss as busy as a sickie. Stands out like a bunyip to grab us a bail up. Lets get some bloke flamin it'll be rego. captain cook piece of piss as dry as a milk bar.\n"
      + "Lets get some dunny no dramas she'll be right fly wire. bludger how it'll be jumbuck. Shazza got us some fisho uluru. You little ripper crook with you little ripper struth. He hasn't got a wuss where shazza got us some kindie. He's got a massive give it a burl heaps lets throw a ripper. He hasn't got a slaps shazza got us some big smoke. As stands out like holden how bushranger. As busy as a yobbo my shazza got us some fair go. As dry as a corker how built like a flake.\n"
      + "It'll be chunder where grab us a bottlo. As busy as a greenie as cross as a boozer. He's got a massive dipstick piece of piss as dry as a thingo. Come a bizzo where he's got a massive stoked. As cunning as a fair go with as stands out like op shop. Gutful of decent nik flamin trent from punchy aussie salute. As dry as a frog in a sock with as dry as a ocker. As busy as a rotten piece of piss he hasn't got a bail out. Gutful of chunder when mad as a outback. Lets throw a old fella he hasn't got a prezzy.\n"
      + "It'll be pint no worries trent from punchy larrikin. As dry as a jackaroo to as busy as a spit the dummy. As dry as a aussie salute when as cross as a ridgy-didge. Flat out like a corker no dramas as stands out like squizz. As dry as a mates bloody as dry as a chokkie. Gutful of his blood's worth bottling when grab us a cark it. Stands out like a banana bender flamin he's got a massive bitzer.\n"

  , testSourceFile   = '$$_testsource_$$'
  , testDestFile     = '$$_testdest_$$'
  , chunkSize        = 128
  , maxWriteInterval = 5

  , tick             = function (msg) { console.log(('\u2714 \t' + msg).green) }

fs.writeFile(testSourceFile, boganData, function (err) {
  assert(!err)

  var startTs = +new Date

  fs.createReadStream(testSourceFile, { bufferSize: chunkSize })
    .pipe(new SlowStream({ maxWriteInterval: Math.round(maxWriteInterval / 3) }))
    .pipe(new SlowStream({ maxWriteInterval: Math.round(maxWriteInterval / 2) }))
    .pipe(new SlowStream({ maxWriteInterval: maxWriteInterval })) // this one is the slowest and should be the bottleneck
    .pipe(new SlowStream({ maxWriteInterval: Math.round(maxWriteInterval / 2) }))
    .pipe(new SlowStream({ maxWriteInterval: Math.round(maxWriteInterval / 3) }))
    .pipe(new SlowStream({ maxWriteInterval: Math.round(maxWriteInterval / 10) }))
    .pipe(fs.createWriteStream(testDestFile))
    .on('close', function () {
      fs.readFile(testDestFile, function (err, data) {
        assert(!err)

        var endTs  = +new Date
          , chunks = Math.ceil(boganData.length / chunkSize)
          , time   = endTs - startTs

        assert.equal(data.toString(), boganData)
        tick('Correctly read, throttled and wrote bogan data')
        fs.unlink(testSourceFile)
        fs.unlink(testDestFile)

        console.log(('Totle time = ' + time + ' ms @ ' + (Math.round((time / chunks) * 100) / 100) + ' ms per chunk, targetted ' + maxWriteInterval + ' ms per chunk').yellow)
      })
    })
    .on('error', console.log)
})