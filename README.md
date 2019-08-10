[![Build Status](https://travis-ci.org/pelevesque/NTN-parser.svg?branch=master)](https://travis-ci.org/pelevesque/NTN-parser)
[![Coverage Status](https://coveralls.io/repos/github/pelevesque/NTN-parser/badge.svg?branch=master)](https://coveralls.io/github/pelevesque/NTN-parser?branch=master)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

# NTN-parser

A parser for NTN (Nested Tuplet Notation).

NTN (Nested Tuplet Notation) is a file format for storing events in time
using nested tuplets. NTN is the brainchild of Luc St-Louis.

[NTN_specification.md](NTN_specification/NTN_specification.md)

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
const parser = require('NTN-parser')
```

### Parameters

```js
notation (required)
options  (optional) default = { timeOffset = 0, timeSpan = null }
```

### Basic Usage

```js
const notation = '(fly hog (2 cat dog elk))'
const result = parser(notation)
result === [
  { time: 0,     data: "fly" },
  { time: 0.25,  data: "hog" },
  { time: 0.5,   data: "cat" },
  { time: 0.666, data: "dog" },
  { time: 0.833, data: "elk" },
  { time: 1,     data: "$" }
]
```

### Options

#### timeOffset

Changes the notation's time offset.

```js
const notation = '(fly hog (2 cat dog elk))'
const result = parser(notation, { timeOffset: 2 })
result === [
  { time: 2,     data: "fly" },
  { time: 2.25,  data: "hog" },
  { time: 2.5,   data: "cat" },
  { time: 2.666, data: "dog" },
  { time: 2.833, data: "elk" },
  { time: 3,     data: "$" }
]
```

#### timeSpan

Changes the notation's time span.

```js
const notation = '(fly hog (2 cat dog elk))'
const result = parser(notation, { timeSpan: 5 })
result === [
  { time: 0,     data: "fly" },
  { time: 1.25,  data: "hog" },
  { time: 2.5,   data: "cat" },
  { time: 3.333, data: "dog" },
  { time: 4.166, data: "elk" },
  { time: 5,     data: "$" }
]
```
