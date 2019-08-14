/* global describe, it */
'use strict'

const expect = require('chai').expect
const parse = require('../index')
const f = notation => () => parse(notation)

describe('#parse()', () => {
  describe('errors', () => {
    it('should throw an error when the notation is empty', () => {
      const notation = ''
      expect(f(notation)).to.throw('The notation is empty.')
    })

    it('should throw an error when the notation is not encapsulated by parentheses', () => {
      const notations = ['(', ')', 'a', '(a', 'a)', '())(', ')(()']
      notations.forEach((e) => {
        expect(f(e)).to.throw('The notation must be encapsulated by parentheses.')
      })
    })

    it(`should throw an error when the notation's parentheses are not balanced`, () => {
      const notations = ['((()', '()))', '()))', '(())()']
      notations.forEach((e) => {
        expect(f(e)).to.throw(`The notation's parentheses are not balanced.`)
      })
    })

    it('should throw an error when the ratio is malformed', () => {
      const notations = [
        { index: 1, ratio: '01', notation: '(01)' },
        { index: 1, ratio: '01:0', notation: '(01:0)' },
        { index: 1, ratio: '01:0.1', notation: '(01:0.1)' },
        { index: 1, ratio: '0:01', notation: '(0:01)' },
        { index: 1, ratio: '0a', notation: '(0a)' },
        { index: 1, ratio: '0,1', notation: '(0,1)' },
        { index: 4, ratio: '1:a1', notation: '(a (1:a1))' }
      ]
      notations.forEach((e) => {
        expect(f(e.notation)).to.throw(`The notation ratio '` + e.ratio +
          `' at index ` + e.index + ' is malformed.')
      })
    })

    it('should throw an error when a data token contains illegal characters', () => {
      const notations = [
        { token: '0', notation: '(a 0)' },
        { token: '1', notation: '(a 1)' },
        { token: '2', notation: '(a 2)' },
        { token: '3', notation: '(a 3)' },
        { token: '4', notation: '(a 4)' },
        { token: '5', notation: '(a 5)' },
        { token: '6', notation: '(a 6)' },
        { token: '7', notation: '(a 7)' },
        { token: '8', notation: '(a 8)' },
        { token: '9', notation: '(a 9)' },
        { token: ':', notation: '(a :)' },
        { token: '$', notation: '(a $)' }
      ]
      notations.forEach((e) => {
        expect(f(e.notation)).to.throw(`The notation data token '` +
          e.token + `' contains illegal characters.`)
      })
    })

    it('should throw an error when the ratio numerator does not match the number of data tokens', () => {
      const notations = [
        { index: 1, numTokensToMatch: 5, numTokens: 4, notation: '(5:1 a b c d)' },
        { index: 1, numTokensToMatch: 0, numTokens: 1, notation: '(0:1 a)' },
        { index: 1, numTokensToMatch: 1.5, numTokens: 1, notation: '(1.5:1 a)' },
        { index: 1, numTokensToMatch: 1.5, numTokens: 0.5, notation: '(1.5:1 (0.5 a))' },
        { index: 8, numTokensToMatch: 3, numTokens: 4, notation: '(a a a (3:1 a a a a))' }
      ]
      notations.forEach((e) => {
        expect(f(e.notation)).to.throw('The notation ratio numerator at index ' +
          e.index + ' checks for ' + e.numTokensToMatch + ' data tokens, but ' +
          e.numTokens + ' were found.')
      })
    })
  })

  describe('shallow notation', () => {
    it('should only return the terminator event when the notation is empty', () => {
      const notation = '()'
      const result = parse(notation)
      const expected = [
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with one element', () => {
      const notation = '(a)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with many elements', () => {
      const notation = '(a b c d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.25, data: 'b' },
        { time: 0.5, data: 'c' },
        { time: 0.75, data: 'd' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with wild spacing', () => {
      const notation = `
        (    a  b     (
        c       d)
         e  )
         `
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.25, data: 'b' },
        { time: 0.5, data: 'c' },
        { time: 0.625, data: 'd' },
        { time: 0.75, data: 'e' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with elements of various lengths', () => {
      const notation = '(a bc def ghij)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.25, data: 'bc' },
        { time: 0.5, data: 'def' },
        { time: 0.75, data: 'ghij' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with the default ratio', () => {
      const notation = '(4:1 a b c d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.25, data: 'b' },
        { time: 0.5, data: 'c' },
        { time: 0.75, data: 'd' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with a custom ratio', () => {
      const notation = '(4:2 a b c d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.5, data: 'b' },
        { time: 1, data: 'c' },
        { time: 1.5, data: 'd' },
        { time: 2, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with only the ratio denominator', () => {
      const notation = '(2 a b c d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.5, data: 'b' },
        { time: 1, data: 'c' },
        { time: 1.5, data: 'd' },
        { time: 2, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with a fractional ratio denominator', () => {
      const notation = '(2.5 a b c d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.625, data: 'b' },
        { time: 1.25, data: 'c' },
        { time: 1.875, data: 'd' },
        { time: 2.5, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with the timeOffset option', () => {
      const notation = '(a b c d)'
      const result = parse(notation, { timeOffset: 100.5 })
      const expected = [
        { time: 100.5, data: 'a' },
        { time: 100.75, data: 'b' },
        { time: 101, data: 'c' },
        { time: 101.25, data: 'd' },
        { time: 101.5, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with the timeSpan option', () => {
      const notation = '(a b c d)'
      const result = parse(notation, { timeSpan: 5 })
      const expected = [
        { time: 0, data: 'a' },
        { time: 1.25, data: 'b' },
        { time: 2.5, data: 'c' },
        { time: 3.75, data: 'd' },
        { time: 5, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with all the allowed data token characters', () => {
      const notation = `(
        _0123456789
        abcdefghijklmnopqrstuvwxyz
        ABCDEFGHIJKLMNOPQRSTUVWXYZ
        _-.
      )`
      const result = parse(notation)
      const expected = [
        { time: 0, data: '_0123456789' },
        { time: 0.25, data: 'abcdefghijklmnopqrstuvwxyz' },
        { time: 0.5, data: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
        { time: 0.75, data: '_-.' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('-A', () => {
      const notation = '((0 a))'
      const result = parse(notation)
      const expected = [
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('-B', () => {
      const notation = '((0))'
      const result = parse(notation)
      const expected = [
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('-C', () => {
      const notation = '(a (0:1) b)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.6666666666666666, data: 'b' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('-D', () => {
      const notation = '((0.25))'
      const result = parse(notation)
      const expected = [
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('-E', () => {
      const notation = '(2.25:1 a (0.25) b)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.5555555555555556, data: 'b' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with all the allowed leading zero ratio', () => {
      const notation = '(3.75:1 a (0.75:0.75 (0.5 b) (0.25) (0 c) (0)) (0:1) d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.26666666666666666, data: 'b' },
        { time: 0.7333333333333334, data: 'd' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })
  })

  describe('deep notation', () => {
    it('should work with one level deep', () => {
      const notation = '(a (2 b c d) e)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.25, data: 'b' },
        { time: 0.41666666666666663, data: 'c' },
        { time: 0.5833333333333333, data: 'd' },
        { time: 0.7499999999999999, data: 'e' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with one level deep and fractional ratios', () => {
      const notation = '(3.5:1 a (1.5 b c) d)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.2857142857142857, data: 'b' },
        { time: 0.5, data: 'c' },
        { time: 0.7142857142857143, data: 'd' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with many levels deep', () => {
      const notation = '(a b (c d (e f (2 g h i))) j (k l (m n o p)) (2 q r s) t u)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.1111111111111111, data: 'b' },
        { time: 0.2222222222222222, data: 'c' },
        { time: 0.25925925925925924, data: 'd' },
        { time: 0.2962962962962963, data: 'e' },
        { time: 0.3055555555555555, data: 'f' },
        { time: 0.31481481481481477, data: 'g' },
        { time: 0.32098765432098764, data: 'h' },
        { time: 0.3271604938271605, data: 'i' },
        { time: 0.33333333333333337, data: 'j' },
        { time: 0.4444444444444445, data: 'k' },
        { time: 0.4814814814814815, data: 'l' },
        { time: 0.5185185185185186, data: 'm' },
        { time: 0.5277777777777779, data: 'n' },
        { time: 0.5370370370370372, data: 'o' },
        { time: 0.5462962962962965, data: 'p' },
        { time: 0.5555555555555558, data: 'q' },
        { time: 0.6296296296296299, data: 'r' },
        { time: 0.7037037037037039, data: 's' },
        { time: 0.777777777777778, data: 't' },
        { time: 0.8888888888888891, data: 'u' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with many levels deep and number of data token checks', () => {
      const notation = '(9:1 a b (3:1 c d (4:1 e f (3:2 g h i))) j (3:1 k l (4:1 m n o p)) (3:2 q r s) t u)'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.1111111111111111, data: 'b' },
        { time: 0.2222222222222222, data: 'c' },
        { time: 0.25925925925925924, data: 'd' },
        { time: 0.2962962962962963, data: 'e' },
        { time: 0.3055555555555555, data: 'f' },
        { time: 0.31481481481481477, data: 'g' },
        { time: 0.32098765432098764, data: 'h' },
        { time: 0.3271604938271605, data: 'i' },
        { time: 0.33333333333333337, data: 'j' },
        { time: 0.4444444444444445, data: 'k' },
        { time: 0.4814814814814815, data: 'l' },
        { time: 0.5185185185185186, data: 'm' },
        { time: 0.5277777777777779, data: 'n' },
        { time: 0.5370370370370372, data: 'o' },
        { time: 0.5462962962962965, data: 'p' },
        { time: 0.5555555555555558, data: 'q' },
        { time: 0.6296296296296299, data: 'r' },
        { time: 0.7037037037037039, data: 's' },
        { time: 0.777777777777778, data: 't' },
        { time: 0.8888888888888891, data: 'u' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })

    it('should work with complex depth jumping', () => {
      const notation = '(a (b) c (d) (e) (f (g (h (i (j)) k))) l (m (n)))'
      const result = parse(notation)
      const expected = [
        { time: 0, data: 'a' },
        { time: 0.125, data: 'b' },
        { time: 0.25, data: 'c' },
        { time: 0.375, data: 'd' },
        { time: 0.5, data: 'e' },
        { time: 0.625, data: 'f' },
        { time: 0.6875, data: 'g' },
        { time: 0.71875, data: 'h' },
        { time: 0.7291666666666666, data: 'i' },
        { time: 0.734375, data: 'j' },
        { time: 0.7395833333333334, data: 'k' },
        { time: 0.75, data: 'l' },
        { time: 0.875, data: 'm' },
        { time: 0.9375, data: 'n' },
        { time: 1, data: '$' }
      ]
      expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
    })
  })
})
