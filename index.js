'use strict'

const scaleNumber = require('@pelevesque/scale-number')
const areDelimitersBalanced = require('is-balanced')

const NODE_START_DELIMITER = '('
const NODE_END_DELIMITER = ')'
const NODE_DELIMITERS_NAME = 'parentheses'
const RATIO_NUMBERS_SEPARATOR = ':'
const EVENTS_TERMINATOR = '$'
const DATA_TOKEN_VALIDATION_REGEX = '[a-zA-Z_\\.\\-][0-9a-zA-Z_\\.\\-]*'
const RATIO_TOKEN_VALIDATION_REGEX = '(0|[1-9][0-9]*)(\\.[0-9]+)?(:(0|[1-9][0-9]*)(\\.[0-9]+)?)?' // This permits .000000 (should we force a number > 0 at the end...)
const LABEL_PREFIX = '@'
const LABEL_VALIDATION_REGEX = LABEL_PREFIX + '[a-z]+'

const cleanWhitespaces = str => str.replace(/\s\s+/g, ' ').trim()

function validateDescendantNodeDelimiters (notation) {
  if (!areDelimitersBalanced(
    notation.substring(1, notation.length - 1),
    NODE_START_DELIMITER,
    NODE_END_DELIMITER)
  ) {
    throw new Error(`The notation's ` + NODE_DELIMITERS_NAME + ' are not balanced.')
  }
}

function parse (notation, timeOffset, timeSpan) {
  const nodes = []
  const events = []
  let deepestNodeDepth = -1

  // ---------------------------------------------------------------------------
  // Finds all nodes and saves their properties in the node array.
  //
  // Example given (a (3:2 a (2 a a a)) a)
  //
  // nodes = [
  //  { depth: 0, startIndex: 1, endIndex: 21, content: 'a (3:2 a (2 a a a)) a' }
  //  { depth: 1, startIndex: 4, endIndex: 18, content: '3:2 a (2 a a a)' }
  //  { depth: 2, startIndex: 11, endIndex: 17, content: '2 a a a' }
  // ]
  // ---------------------------------------------------------------------------
  function findNodes () {
    function findHighestNodeIndexForGivenDepth (depth) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].depth === depth) return i
      }
    }
    let depth = -1
    for (let n = 0, len = notation.length; n < len; n++) {
      const char = notation.charAt(n)
      if (char === NODE_START_DELIMITER) {
        depth++
        if (depth > deepestNodeDepth) {
          deepestNodeDepth = depth
        }
        nodes.push({ depth: depth, startIndex: n + 1 })
      } else if (char === NODE_END_DELIMITER) {
        const i = findHighestNodeIndexForGivenDepth(depth)
        nodes[i].endIndex = n - 1
        nodes[i].content = notation.substring(nodes[i].startIndex, nodes[i].endIndex + 1)
        depth--
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tokenizes each node and saves new properties in the node array.
  // ---------------------------------------------------------------------------
  function tokenizeNodes () {
    // -------------------------------------------------------------------------
    // Sets the data from the content.
    //
    // If the data is separated by nested groups, it is returned in chunks.
    //
    // Example given (a (3:2 a (2 a a a)) a)
    //
    // node[0].data = [['a'], ['a']]
    // node[1].data = [['3:2', 'a']]
    // node[2].data = [['2', 'a', 'a', 'a']]
    // -------------------------------------------------------------------------
    function setDataFromContent (i) {
      const tokenizeData = data => data.trim().split(/\s/)
      let depth = 0
      let data = ''
      nodes[i].data = []
      for (let n = 0, len = nodes[i].content.length; n < len; n++) {
        const char = nodes[i].content.charAt(n)
        if (char === NODE_START_DELIMITER) {
          depth++
          if (depth === 1) {
            nodes[i].data.push(tokenizeData(data))
            data = ''
          }
        }
        if (depth === 0) {
          data += char
        }
        if (char === NODE_END_DELIMITER) {
          depth--
        }
      }
      nodes[i].data.push(tokenizeData(data))
    }

    // -------------------------------------------------------------------------
    // Cuts the ratio from the first data chunk when it is present.
    //
    // If no ratio is set, the ratio parameter is set to null.
    //
    // Example given (a (3:2 a (2 a a a)) a)
    //
    // node[0].data  = [['a'], ['a']]
    // node[0].ratio = null
    // node[1].data  = [['a']]
    // node[1].ratio = '3:2'
    // node[2].data  = [[a', 'a', 'a']]
    // node[2].ratio = '2'
    // -------------------------------------------------------------------------
    function cutRatioFromData (i) {
      function validateRatio (ratio) {
        const regex = new RegExp('^' + RATIO_TOKEN_VALIDATION_REGEX + '\\s$')
        if (!regex.test(ratio + ' ')) {
          throw new Error(`The notation ratio '` + ratio + `' at index ` +
            nodes[i].startIndex + ' is malformed.')
        }
      }
      const ratio = nodes[i].data[0][0]
      if (ratio !== '' && ratio.match(/^[0-9]/)) {
        validateRatio(ratio)
        nodes[i].ratio = ratio
        nodes[i].data[0].shift()
      } else {
        nodes[i].ratio = null
      }
    }

    // -------------------------------------------------------------------------
    // Separates the ratio into a numerator and a denominator.
    //
    // If no numerator is found, it defaults to null.
    // If no denominator is found, it defaults to 1.
    //
    // Example given (a (3:2 a (2 a a a)) a)
    //
    // node[0].ratioNumerator   = null
    // node[0].ratioDenominator = 1
    // node[1].ratioNumerator   = 3
    // node[1].ratioDenominator = 2
    // node[2].ratioNumerator   = null
    // node[2].ratioDenominator = 2
    // -------------------------------------------------------------------------
    function separateRatioNumbers (i) {
      if (nodes[i].ratio === null) {
        nodes[i].ratioNumerator = null
        nodes[i].ratioDenominator = 1
      } else {
        const ratioNumbers = nodes[i].ratio.split(RATIO_NUMBERS_SEPARATOR)
        if (ratioNumbers.length === 1) {
          nodes[i].ratioNumerator = null
          nodes[i].ratioDenominator = parseFloat(ratioNumbers[0])
        } else {
          nodes[i].ratioNumerator = parseFloat(ratioNumbers[0])
          nodes[i].ratioDenominator = parseFloat(ratioNumbers[1])
        }
      }
    }

    // -------------------------------------------------------------------------
    // Validates and counts data tokens.
    //
    // Example given (a (3:2 a (2 a a a)) a)
    //
    // node[0].numDataTokens = 4
    // node[1].numDataTokens = 3
    // node[1].numDataTokens = 3
    // -------------------------------------------------------------------------
    function validateAndCountDataTokens (i) {
      function validateDataToken (dataToken) {
        const regex = new RegExp('^' + DATA_TOKEN_VALIDATION_REGEX + '\\s$')
        if (!regex.test(dataToken + ' ')) {
          throw new Error(`The notation data token '` +
            dataToken + `' contains illegal characters.`)
        }
      }
      function validateAndCountParentDataTokens (i) {
        for (let n = 0, len = nodes[i].data.length; n < len; n++) {
          for (let j = 0, len = nodes[i].data[n].length; j < len; j++) {
            if (nodes[i].data[n][j] !== '') {
              validateDataToken(nodes[i].data[n][j])
              nodes[i].numDataTokens++
            }
          }
        }
      }
      function addDataTokenCountFromDescendants (i) {
        for (let n = i + 1, len = nodes.length; n < len; n++) {
          if (nodes[n].depth === nodes[i].depth + 1) {
            nodes[i].numDataTokens += nodes[n].ratioDenominator
          } else if (nodes[n].depth <= nodes[i].depth) {
            break
          }
        }
      }
      nodes[i].numDataTokens = 0
      validateAndCountParentDataTokens(i)
      addDataTokenCountFromDescendants(i)
    }

    // -------------------------------------------------------------------------
    // Validates the ratio numerator.
    //
    // The ratio numerator is optional and serves as a check to make sure the
    // number of data tokens for a given node are correct.
    // -------------------------------------------------------------------------
    function validateRatioNumerator (i) {
      if (
        nodes[i].ratioNumerator !== null &&
        nodes[i].ratioNumerator !== nodes[i].numDataTokens
      ) {
        throw new Error('The notation ratio numerator at index ' +
          nodes[i].startIndex + ' checks for ' + nodes[i].ratioNumerator +
          ' data tokens, but ' + nodes[i].numDataTokens + ' were found.')
      }
    }

    // -------------------------------------------------------------------------
    // Runs the tokenizers from deepest to shallowest depth.
    // -------------------------------------------------------------------------
    for (let depth = deepestNodeDepth; depth >= 0; depth--) {
      for (let i = 0, len = nodes.length; i < len; i++) {
        if (nodes[i].depth === depth) {
          setDataFromContent(i)
          cutRatioFromData(i)
          separateRatioNumbers(i)
          validateAndCountDataTokens(i)
          validateRatioNumerator(i)
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Renders the events into an array of objects with time and data parameters.
  //
  // Example given (a (3:2 a (2 a a a)) a)
  //
  // events = [
  //  { time: 0, data: 'a' },
  //  { time: 0.25, data: 'a' },
  //  { time: 0.41666666666666663, data: 'a' },
  //  { time: 0.5277777777777777, data: 'a' },
  //  { time: 0.6388888888888888, data: 'a' },
  //  { time: 0.75, data: 'a' },
  //  { time: 1, data: '^' }
  // ]
  // ---------------------------------------------------------------------------
  function renderEvents () {
    // -------------------------------------------------------------------------
    // Adds an event while adding the time offset.
    // -------------------------------------------------------------------------
    function addEvent (time, data) {
      events.push({ time: time + timeOffset, data: data })
    }

    // -------------------------------------------------------------------------
    // Sets the time span of a single event for a given node.
    // -------------------------------------------------------------------------
    function setEventTimeSpan (i) {
      function getParentEventTimeSpan (i) {
        if (i === 0) return 1
        for (let n = i - 1; n >= 0; n--) {
          if (nodes[i].depth === nodes[n].depth + 1) {
            return nodes[n].eventTimeSpan
          }
        }
      }
      const nodeTimeSpan = getParentEventTimeSpan(i) * nodes[i].ratioDenominator
      const numDataTokens = nodes[i].numDataTokens !== 0 ? nodes[i].numDataTokens : 1
      nodes[i].eventTimeSpan = nodeTimeSpan / numDataTokens
    }

    // -------------------------------------------------------------------------
    // Renders the events of the next data chunk for a given node.
    //
    // The next data chunk is always at index 0. Once rendered into the
    // events array, it is removed from the nodes array thusby moving
    // the next data chunk to index 0.
    // -------------------------------------------------------------------------
    let timeNeedle = 0
    function renderNodeEventsOfNextDataChunk (i) {
      if (nodes[i].data.length > 0) {
        if (nodes[i].numDataTokens === 0) {
          timeNeedle += nodes[i].eventTimeSpan
        } else {
          for (let n = 0, len = nodes[i].data[0].length; n < len; n++) {
            const data = nodes[i].data[0][n]
            if (data !== '') {
              if (nodes[i].ratioDenominator > 0) {
                addEvent(timeNeedle, data)
              }
              timeNeedle += nodes[i].eventTimeSpan
            }
          }
          nodes[i].data.shift()
        }
      }
    }

    // -------------------------------------------------------------------------
    // Renders all events starting from a given node index and going down
    // depth by depth until the final target depth is reached.
    // -------------------------------------------------------------------------
    function renderAllEventsGoingDownFromNodeIndexToTargetDepth (i, finalTargetDepth) {
      let nextTargetDepth = nodes[i].depth - 1
      for (i; i >= 0; i--) {
        if (nodes[i].depth === nextTargetDepth) {
          renderNodeEventsOfNextDataChunk(i)
          nextTargetDepth--
        }
        if (nodes[i].depth === finalTargetDepth) {
          break
        }
      }
    }

    // -------------------------------------------------------------------------
    // Renders all node events
    // -------------------------------------------------------------------------
    function renderNodeEvents () {
      for (let i = 0, len = nodes.length; i < len; i++) {
        setEventTimeSpan(i)
        const previousNodeIndex = i - 1
        if (i > 0 && nodes[i].depth <= nodes[previousNodeIndex].depth) {
          const finalTargetDepth = nodes[i].depth - 1
          renderAllEventsGoingDownFromNodeIndexToTargetDepth(previousNodeIndex, finalTargetDepth)
        }
        renderNodeEventsOfNextDataChunk(i)
      }
      const lastNodeIndex = nodes.length - 1
      const finalTargetDepth = 0
      renderAllEventsGoingDownFromNodeIndexToTargetDepth(lastNodeIndex, finalTargetDepth)
    }

    // -------------------------------------------------------------------------
    // Adds the events terminator
    //
    // To know how long the last event lasts, we create a special final event
    // called the events terminator.
    // -------------------------------------------------------------------------
    function addEventsTerminator () {
      addEvent(nodes[0].ratioDenominator, EVENTS_TERMINATOR)
    }

    // -------------------------------------------------------------------------
    // Changes the time span for the entire notation.
    // -------------------------------------------------------------------------
    function changeNotationTimeSpan () {
      const min = events[0].time
      const oldMax = events[events.length - 1].time
      const newMax = min + timeSpan
      for (let i = 0, len = events.length; i < len; i++) {
        events[i].time = scaleNumber(events[i].time, min, oldMax, min, newMax)
      }
    }

    renderNodeEvents()
    addEventsTerminator()
    if (timeSpan !== null) {
      changeNotationTimeSpan()
    }
  }

  findNodes()
  tokenizeNodes()
  renderEvents()

  return events
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
function preprocess (notation) {
  function validateLabel (label, index) {
    const regex = new RegExp('^' + LABEL_VALIDATION_REGEX + '\\s$')
    if (!regex.test(label + ' ')) {
      throw new Error(`The notation label '` + label +
        `' at index ` + index + ' is malformed.')
    }
  }
  function validateLabelOrder () {
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i].type === 'label' && tokens[i + 1].type !== 'node') {
        throw new Error(`The notation label '` + tokens[i].token +
          `' at index ` + tokens[i].startIndex + ' must be followed by a node.')
      }
    }
  }
  // maybe we could do a split
  // this code is super dirty and should be way better
  const tokens = []
  let token = ''
  let depth = 0
  let startIndex, endIndex
  for (let i = 0; i < notation.length; i++) {
    const char = notation.charAt(i)
    if (depth === 0) {
      if (char !== ' ' && char !== '(') {
        if (token.length === 0) {
          startIndex = i
        }
        token += char
      }
      if (char === ' ' && token.length > 0) {
        endIndex = i - 1
        validateLabel(token, startIndex)
        const obj = {
          startIndex: startIndex,
          endIndex: endIndex,
          type: 'label',
          token: token
        }
        tokens.push(obj)
        token = ''
      }
    }
    if (char === '(') {
      depth++
      if (depth === 1) {
        startIndex = i
      }
    }
    if (depth >= 1) {
      token += char
    }
    if (char === ')') {
      depth--
      if (depth === 0) {
        endIndex = i
        const obj = {
          startIndex: startIndex,
          endIndex: endIndex,
          type: 'node',
          token: token
        }
        tokens.push(obj)
        token = ''
      }
    }
  }
  validateLabelOrder()

  function validateRepeatedLabels () {
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i].type === 'label') {
        for (let j = i + 1; j < tokens.length - 1; j++) {
          if (tokens[i].token.localeCompare(tokens[j].token) === 0) {
            throw new Error(`The notation label '` + tokens[i].token +
              `' is defined multiple times.`)
          }
        }
      }
    }
  }
  validateRepeatedLabels()

  function validateLabelInNode (label) {
    const regex = new RegExp('^' + LABEL_VALIDATION_REGEX + '\\s$')
    if (!regex.test(label + ' ')) {
      throw new Error(`The notation label '` + label + `' is malformed.`)
    }
  }

  for (let i = 1, len = tokens.length; i < len; i++) { // start at one since no labels exist before that.
    if (tokens[i].type === 'node') {
      const regex = /(?<=\s)@[^()\s]*/g // regex for a label, put it somewhere else
      const matches = tokens[i].token.match(regex)
      if (matches) {
        for (let j = 0; j < matches.length; j++) {
          validateLabelInNode(matches[j])
          let index = null
          for (let k = 0; k < i; k++) { // only search labels that come before the current node
            if (tokens[k].token.localeCompare(matches[j]) === 0) {
              index = k + 1
            }
          }
          if (index === null) {
            throw Error(`The notation label '` + matches[j] + `' is not defined.`)
          } else {
            tokens[i].token = tokens[i].token.replace(matches[j], tokens[index].token)
          }
        }
      }
    }
  }

  return (tokens.length > 0) ? tokens[tokens.length - 1].token : notation
}
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

module.exports = (notation, { timeOffset = 0, timeSpan = null } = {}) => {
  if (notation === '') {
    throw new Error('The notation is empty.')
  }
  notation = cleanWhitespaces(notation)
  validateDescendantNodeDelimiters('(' + notation + ')') // need my own custom function that says where there is a mistake
  notation = preprocess(notation)
  return parse(notation, timeOffset, timeSpan)
}
