# Node.js Lorem Ipsum ... Bogan Style!

A JavaScript implementation of [Bogan Ipsum](http://www.boganipsum.com/) by [Eleven Media](http://www.elevenmedia.com.au/).

Generate some classy Bogan speak for your Node.js apps! Why not?

## Example text

 > As cross as a mongrel my she'll be right his blood's worth bottling. As dry as a waggin' school where come a dob. She'll be right sickie when she'll be right good onya. Built like a whinge mate as busy as a tucker. Lets get some battler no worries as cross as a trackies. As cunning as a mozzie to shazza got us some tucker-bag. As busy as a doovalacky where gutful of brizzie.
 >
 > He hasn't got a feral mate she'll be right tinny. Come a digger no dramas trent from punchy bathers. We're going grundies where she'll be right fossicker. As dry as a bradman heaps as busy as a brick sh*t house. He's got a massive smoko where as cunning as a veg out. He hasn't got a pokies also flat out like a barbie.
 >
 > She'll be right sickie bloody shazza got us some slabs. Watch out for the trackies piece of piss shazza got us some true blue. Built like a cactus mate when he hasn't got a cab sav. Get a dog up ya postie flamin it'll be waggin' school. You little ripper grouse with grab us a hoon. As busy as a rack off also as dry as a reckon. She'll be right chokkie with come a beauty. Mad as a cubby house with get a dog up ya sook.
 >
 > He's got a massive ciggies flamin as cross as a kelpie. Get a dog up ya brisvegas no worries come a galah. As cunning as a bodgy and as stands out like bounce. Flat out like a grundies how flat out like a roadie. As cunning as a barbie where as busy as a roo bar. As busy as a ocker with as dry as a swagger. She'll be right wuss also gutful of ford. We're going booze bus heaps as dry as a franger.


## Installation

```sh
npm install boganipsum
# or install globally so you can use `boganipsum` on the command line!
npm install boganipsum -g
```

## Usage

```js
var bogan = require('boganipsum')
console.log(bogan())
```

Or, supply an `options` object with any of the following parameters:

  * `paragraphs` (default: `4`) - how many paragraphs to generate
  * `sentenceMin` (default: `5`) - the minimum number of sentences per paragraph
  * `sentenceMax` (default: `9`) - the maximum number of sentences per paragraph
  * `paragraphSeparator` (default: `'\n'`) - the character to separate paragraphs with

```js
// generate a single sentence
bogan({ paragraphs: 1 })
// generate 10 short paragraphs
bogan({ paragraphs: 10, sentenceMin: 2, sentenceMax: 5 })
// generate some HTML bogan
'<p>' + bogan({ paragraphSeparator: '</p><p>' }) + '</p>'
```

## Licence

This JavaScript implementation of Bogan Ipsum is Copyright (c) 2012 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.

All original Bogan Ipsum implementation credit, word & sentence construction & general algorithm goes to [Eleven Media](http://www.thehonch.net/bogan-ipsum-how-to-guide/)!