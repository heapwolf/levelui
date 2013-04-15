const defaultParagraphs         = 4
    , defaultSentenceMax        = 9
    , defaultSentenceMin        = 5
    , defaultParagraphSeparator = '\n'

var data = {
        words   : require('./words')
      , phrases : require('./phrases')
      , fillers : require('./fillers')
    }

  , rtrim = function (s) {
      return s.replace(/\s+$/, '')
    }

  , pickRandom = function (type, toLower) {
      var len, r
      type += 's'
      len = data[type].length
      r = Math.min(Math.floor(Math.random() * len), len - 1)
      return rtrim(toLower ? data[type][r].toLowerCase() : data[type][r])
    }

  , generateSentence = function () {
      return [
          pickRandom('phrase', false)
        , pickRandom('word', true)
        , pickRandom('filler', true)
        , pickRandom('phrase', true)
        , pickRandom('word', true)
      ].join(' ') + '.'
    }

  , generateParagraph = function (options) {
      var sentences, i, j, sentence, arr = []
        , paragraphs  = (options && options.paragraphs != null)  ? options.paragraphs  : defaultParagraphs
        , sentenceMin = (options && options.sentenceMin != null) ? options.sentenceMin : defaultSentenceMin
        , sentenceMax = (options && options.sentenceMax != null) ? options.sentenceMax : defaultSentenceMax
        , paragraphSeparator = (options && options.paragraphSeparator != null) ? options.paragraphSeparator : defaultParagraphSeparator

      for (var i = 0; i < paragraphs; i++) {
        sentences = (Math.random() * (sentenceMax - sentenceMin)) + sentenceMin
        sentence = []
        for (var j = 0; j < sentences; j++)
          sentence.push(generateSentence()) 
        arr.push(sentence.join(' '))
      }
      return arr.join(paragraphSeparator)
    }

module.exports = generateParagraph