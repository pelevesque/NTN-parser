[![Build Status](https://travis-ci.org/pelevesque/NTN-parser.svg?branch=master)](https://travis-ci.org/pelevesque/NTN-parser)
[![Coverage Status](https://coveralls.io/repos/github/pelevesque/NTN-parser/badge.svg?branch=master)](https://coveralls.io/github/pelevesque/NTN-parser?branch=master)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

# NTN-parser

A parser for NTN (Nested Tuplet Notation).

NTN is a file format for storing timed events using nested tuplets.

Any rhythm can be created to store these events, from the very simple
to the hyper complex.

NTN is the brainchild of Luc St-Louis.

## Example 1

In this example, animal words are placed in time.

1) `(fly (bee ant) ((fly bee) ant) bug)`

2) ![notation example](examples/example_1.png)

## Example 2

In this example, animal words are placed in time.

1) `((4 a (2 a (a . a)) (. a)) (a a))`

2) ![notation example](examples/example_2.png)

## Node Repository

https://www.npmjs.com/package/NTN-parser

## Installation

`npm install NTN-parser`

## Tests

### Standard Style & Unit Tests

`npm test`

### Unit Tests & Coverage

`npm run cover`

## Usage

### Requiring

```js
const parse = require('NTN-parser')
```

### Parameters

```js
notation (required)
options  (optional) default = { timeOffset = 0, timeSpan = null }
```

### Basic Usage

```js
const notation = '(c4 g4 (2 f4 e4 d4))'
const result = parse(notation)
result === [
  { time: 0,     data: "c4" },
  { time: 0.25,  data: "g4" },
  { time: 0.5,   data: "f4" },
  { time: 0.666, data: "e4" },
  { time: 0.833, data: "d4" },
  { time: 1,     data: "$" }
]
```

### Options

#### timeOffset

Changes the notation's time offset.

```js
const notation = '(c4 g4 (2 f4 e4 d4))'
const result = parse(notation, { timeOffset: 2 })
result === [
  { time: 2,     data: "c4" },
  { time: 2.25,  data: "g4" },
  { time: 2.5,   data: "f4" },
  { time: 2.666, data: "e4" },
  { time: 2.833, data: "d4" },
  { time: 3,     data: "$" }
```

#### timeSpan

Changes the notation's time span.

```js
const notation = '(fly hog (2 cat dog elk))'
const result = parse(notation, { timeSpan: 5 })
result === [
  { time: 0,     data: "fly" },
  { time: 1.25,  data: "hog" },
  { time: 2.5,   data: "cat" },
  { time: 3.333, data: "dog" },
  { time: 4.166, data: "elk" },
  { time: 5,     data: "$" }
]
```
