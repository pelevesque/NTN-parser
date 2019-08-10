# NTN Specification

## Version

v1.0 (2019-08-10)

## About NTN

Nested Tuplet Notation consists of placing data tokens at different time intervals
using nested tuplets. Any rhythm is possible, from the simplest to the most complex.

## Notation Description





## Data Token

A data token is a series of one or more accepted data token characters.

It cannot begin with a number.

### Accepted Data Token Characters

`abcdefghijklmnopqrstuvwxyz`  
`ABCDEFGHIJKLMNOPQRSTUVWXYZ`  
`0123456789`  
`_-.`  

### Example Data Tokens

`a`  
`a6b6`   
`x0000DEAD`   
`a.b.c.d`  
`-9.1_6.5`  

## Ratio

A ratio







## Node

A node is a series of whitespace separated data tokens encapsulated by parentheses
optionnally preceded by a ratio.

(a a a a)

### Example Nodes

`(a a a a)`
`(a b c d)`
`(fly b6 x0000DEAD .)`


## absolute

((3 a a (3 a . a) a (2 a 2(a a))

![alt text](example_2.png)

## Ratio


## Putting it all together


% LilyBin
\score {
  {
    \new RhythmicStaff {
	    \omit BarLine
      \once \override Staff.TimeSignature #'stencil = ##f
	    c4 \tuplet 3/2 { c c \tuplet 3/2 { c8 r c } } c c
    }
  }
  \layout{}
  \midi{}
}
