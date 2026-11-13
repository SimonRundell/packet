// A small recursive-descent parser and evaluator for a subset of Wireshark's
// display filter syntax: protocol barewords (tcp, udp, dns, http, tls, arp,
// icmp, ip), field comparisons (ip.addr == 1.2.3.4, tcp.port == 443,
// frame.len > 100), boolean combinators (&&/and, ||/or, !/not) and
// parentheses. See content/filterHelp.js for the user-facing cheat sheet.

import { getEthSrc, getEthDst, getIpSrc, getIpDst, getSrcPort, getDstPort, hasLayer } from './packetFields.js'

const TOKEN_PATTERN =
  /\s*(==|!=|>=|<=|&&|\|\||[()!<>]|"[^"]*"|[\w.:/-]+)\s*/g

function tokenize(input) {
  const tokens = []
  let match
  let lastIndex = 0
  TOKEN_PATTERN.lastIndex = 0
  while ((match = TOKEN_PATTERN.exec(input))) {
    if (match.index !== lastIndex) {
      throw new FilterSyntaxError(`Unexpected character near "${input.slice(lastIndex, match.index)}"`)
    }
    tokens.push(match[1])
    lastIndex = TOKEN_PATTERN.lastIndex
  }
  if (lastIndex !== input.length) {
    throw new FilterSyntaxError(`Unexpected character near "${input.slice(lastIndex)}"`)
  }
  return tokens
}

export class FilterSyntaxError extends Error {}

const WORD_OPERATORS = { eq: '==', ne: '!=' }
const COMPARISON_OPS = new Set(['==', '!=', '>=', '<=', '>', '<'])

class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  peek() {
    return this.tokens[this.pos]
  }

  next() {
    return this.tokens[this.pos++]
  }

  expect(token) {
    if (this.peek() !== token) {
      throw new FilterSyntaxError(`Expected "${token}" but found "${this.peek() ?? 'end of input'}"`)
    }
    return this.next()
  }

  parseExpression() {
    return this.parseOr()
  }

  parseOr() {
    let left = this.parseAnd()
    while (this.peek() === '||' || this.peek()?.toLowerCase() === 'or') {
      this.next()
      left = { type: 'or', left, right: this.parseAnd() }
    }
    return left
  }

  parseAnd() {
    let left = this.parseNot()
    while (this.peek() === '&&' || this.peek()?.toLowerCase() === 'and') {
      this.next()
      left = { type: 'and', left, right: this.parseNot() }
    }
    return left
  }

  parseNot() {
    if (this.peek() === '!' || this.peek()?.toLowerCase() === 'not') {
      this.next()
      return { type: 'not', operand: this.parseNot() }
    }
    return this.parseAtom()
  }

  parseAtom() {
    if (this.peek() === '(') {
      this.next()
      const expr = this.parseExpression()
      this.expect(')')
      return expr
    }

    const token = this.next()
    if (token === undefined) {
      throw new FilterSyntaxError('Unexpected end of filter expression')
    }

    const lowerNext = this.peek()?.toLowerCase()
    const op = COMPARISON_OPS.has(this.peek())
      ? this.next()
      : WORD_OPERATORS[lowerNext]
        ? (this.next(), WORD_OPERATORS[lowerNext])
        : null

    if (op) {
      const valueToken = this.next()
      if (valueToken === undefined) {
        throw new FilterSyntaxError(`Expected a value after "${token} ${op}"`)
      }
      return { type: 'cmp', field: token.toLowerCase(), op, value: unquote(valueToken) }
    }

    return { type: 'bareword', name: token.toLowerCase() }
  }
}

function unquote(token) {
  if (token.startsWith('"') && token.endsWith('"')) return token.slice(1, -1)
  return token
}

export function parseFilter(input) {
  const trimmed = input.trim()
  if (!trimmed) return null
  const tokens = tokenize(trimmed)
  const parser = new Parser(tokens)
  const ast = parser.parseExpression()
  if (parser.pos !== tokens.length) {
    throw new FilterSyntaxError(`Unexpected trailing input near "${tokens.slice(parser.pos).join(' ')}"`)
  }
  validateAst(ast)
  return ast
}

/** Walks the AST and throws if it references an unknown field or bareword, independent of any packet. */
function validateAst(node) {
  switch (node.type) {
    case 'and':
    case 'or':
      validateAst(node.left)
      validateAst(node.right)
      return
    case 'not':
      validateAst(node.operand)
      return
    case 'bareword':
      if (!(node.name in PROTOCOL_BAREWORDS)) {
        throw new FilterSyntaxError(`Unknown filter term "${node.name}"`)
      }
      return
    case 'cmp':
      if (!(node.field in FIELD_RESOLVERS)) {
        throw new FilterSyntaxError(`Unknown field "${node.field}"`)
      }
      return
    default:
      return
  }
}

const FIELD_RESOLVERS = {
  'ip.addr': (p) => [getIpSrc(p), getIpDst(p)],
  'ip.src': (p) => getIpSrc(p),
  'ip.dst': (p) => getIpDst(p),
  'eth.addr': (p) => [getEthSrc(p), getEthDst(p)],
  'eth.src': (p) => getEthSrc(p),
  'eth.dst': (p) => getEthDst(p),
  'tcp.port': (p) => [getSrcPort(p), getDstPort(p)],
  'tcp.srcport': (p) => getSrcPort(p),
  'tcp.dstport': (p) => getDstPort(p),
  'udp.port': (p) => [getSrcPort(p), getDstPort(p)],
  'udp.srcport': (p) => getSrcPort(p),
  'udp.dstport': (p) => getDstPort(p),
  port: (p) => [getSrcPort(p), getDstPort(p)],
  'frame.len': (p) => p.length,
}

const PROTOCOL_BAREWORDS = {
  arp: (p) => p.protocol === 'ARP',
  icmp: (p) => p.protocol === 'ICMP',
  dns: (p) => p.protocol === 'DNS',
  http: (p) => p.protocol === 'HTTP',
  tls: (p) => p.protocol === 'TLS',
  ssl: (p) => p.protocol === 'TLS',
  tcp: (p) => hasLayer(p, 'transmission control'),
  udp: (p) => hasLayer(p, 'user datagram'),
  ip: (p) => hasLayer(p, 'internet protocol'),
}

function compareValues(actual, op, expected) {
  if (actual === undefined || actual === null) return false

  const actualNum = Number(actual)
  const expectedNum = Number(expected)
  const bothNumeric = !Number.isNaN(actualNum) && !Number.isNaN(expectedNum)

  if (op === '==') {
    return bothNumeric ? actualNum === expectedNum : String(actual).toLowerCase() === String(expected).toLowerCase()
  }
  if (op === '!=') {
    return !compareValues(actual, '==', expected)
  }
  if (!bothNumeric) return false
  if (op === '>') return actualNum > expectedNum
  if (op === '<') return actualNum < expectedNum
  if (op === '>=') return actualNum >= expectedNum
  if (op === '<=') return actualNum <= expectedNum
  return false
}

function evaluateNode(node, packet) {
  switch (node.type) {
    case 'and':
      return evaluateNode(node.left, packet) && evaluateNode(node.right, packet)
    case 'or':
      return evaluateNode(node.left, packet) || evaluateNode(node.right, packet)
    case 'not':
      return !evaluateNode(node.operand, packet)
    case 'bareword': {
      const test = PROTOCOL_BAREWORDS[node.name]
      if (!test) throw new FilterSyntaxError(`Unknown filter term "${node.name}"`)
      return test(packet)
    }
    case 'cmp': {
      const resolver = FIELD_RESOLVERS[node.field]
      if (!resolver) throw new FilterSyntaxError(`Unknown field "${node.field}"`)
      const resolved = resolver(packet)
      if (Array.isArray(resolved)) {
        return resolved.some((v) => compareValues(v, node.op, node.value))
      }
      return compareValues(resolved, node.op, node.value)
    }
    default:
      return false
  }
}

export function evaluateFilter(ast, packet) {
  if (!ast) return true
  return evaluateNode(ast, packet)
}

/** Parses and applies a filter string in one step; throws FilterSyntaxError on bad input. */
export function filterPackets(packets, filterText) {
  const ast = parseFilter(filterText)
  if (!ast) return packets
  return packets.filter((p) => evaluateFilter(ast, p))
}
