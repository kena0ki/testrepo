import { logger, wrapError } from './util';

class Token {
  constructor(private _value: string) { }
  get value(): string { return this._value; }
  get length(): number { return this._value.length; }
}
class Whitespace extends Token {}
class NewLine extends Whitespace {}
class Word extends Token {}
class SingleQuotedString extends Token {}
class Num extends Token {}
class LParen extends Token {}
class RParen extends Token {}
class Comma extends Token {}
class Cmmnt extends Token {}
class Operator extends Token {}
class Other extends Token {}

class NonCharcterStringLiteral extends Token {
  constructor(private _content: string, private _prefix: string) { super(_prefix + _content) }
  get content(): string { return this._content; }
  get prefix(): string { return this._prefix; }
}
class NationalStringLiteral extends NonCharcterStringLiteral {}
class HexStringLiteral extends NonCharcterStringLiteral {}

const SPACE = new Whitespace(' ');
const TAB = new Whitespace('\t');
const LF = new NewLine('\n');
const CRLF = new NewLine('\r\n');
const CR = new NewLine('\r');
const LPAREN = new LParen('(');
const RPAREN = new RParen(')');
const COMMA = new Comma(',');
const CONCAT = new Operator('||');
const EQ = new Operator('=');
const RARROW = new Operator('=>');
const PERIOD = new Operator('.');
const PLUS = new Operator('+');
const MINUS = new Operator('-');
const DIV = new Operator('/');
const MULT = new Operator('*');
const MOD = new Operator('%');
const NEQ = new Operator('!=');
const DOUBLE_EXCLAMATION_MARK = new Operator('!!');
const EXCLAMATION_MARK = new Operator('!');
const LT = new Operator('<');
const LTEQ = new Operator('<=');
const NEQ2 = new Operator('<>');
const SHIFT_LEFT = new Operator('<<');
const GT = new Operator('>');
const GTEQ = new Operator('>=');
const SHIFT_RIGHT = new Operator('>>');
const COLON = new Operator(':');
const DOUBLE_COLON = new Operator('::');
const SEMICOLON = new Operator(';');
const BACKSLASH = new Operator('\\');
const LBRACKET = new Operator('[');
const RBRACKET = new Operator(']');
const AMPERSAND = new Operator('&');
const CARET = new Operator('^');
const LBRACE = new Operator('{');
const RBRACE = new Operator('}');
const TILDE = new Operator('~');
const HASH = new Operator('#');
const ATSIGN = new Operator('@');

const TOKENIZE_SINGLE_QUOTED_STRING_ERROR = 'Unterminated string literal';
const TOKENIZE_DELIMITED_STRING_ERROR = (delimiter => `Expected close delimiter ${delimiter} before EOF.`)('"');
const TOKENIZE_MULTI_LINE_COMMENT_ERROR = 'Unexpected EOF while in a multi-line comment';

type Rule = { [ch: string]: (chars: string[]) => Token };
const rule: Rule = {
  // whitespaces
  ' ': () => SPACE,
  '\t': () => TAB,
  '\n': () => LF,
  '\r': chars => chars[1] === '\n' ? CRLF : CR,
  // national string: N'...'
  'N': chars => chars[1] === '\'' ? new NationalStringLiteral(tokenizeSingleQuotedString(chars.slice(1)), chars[0]) : new Word(tokenizeIdentifier(chars)),
  // hex string: X'...' or x'...'
  'X': chars => chars[1] === '\'' ? new HexStringLiteral(tokenizeSingleQuotedString(chars.slice(1)), chars[0]) : new Word(tokenizeIdentifier(chars)),
  'x': chars => chars[1] === '\'' ? new HexStringLiteral(tokenizeSingleQuotedString(chars.slice(1)), chars[0]) : new Word(tokenizeIdentifier(chars)),
  // identifier or keyword
  ident: chars => new Word(tokenizeIdentifier(chars)),
  // string
  '\'': chars => new SingleQuotedString(tokenizeSingleQuotedString(chars)),
  // delimited (quoted) identifier
  delimitedIdent: chars => new Word(takeWhileOrError(chars, 2, (c,i,chars) => ~~!isDelimiteddIdentifierStart(chars[i-1]), TOKENIZE_DELIMITED_STRING_ERROR)),
  // number
  num: chars => new Num(takeWhile(chars, 1, c => ~~(isDigit(c) || c === '.')) ),
  // puctuations
  '(': () => LPAREN,
  ')': () => RPAREN,
  ',': () => COMMA,
  // operators
  '-': chars => chars[1] === '-' ? new Cmmnt(takeWhile(chars, 2, c => ~~(c !== '\n')  /* TODO only LF? */ )) : MINUS,
  '/': chars => chars[1] === '*' ? new Cmmnt(takeWhileOrError(chars, 4, (c,i,chars) => ~~!(chars[i-2] === '*' && chars[i-1] === '/'), TOKENIZE_MULTI_LINE_COMMENT_ERROR)) : DIV,
  '+': () => PLUS,
  '*': () => MULT,
  '%': () => MOD,
  '|': chars => chars[1] === '|' ? CONCAT : new Other('|'),
  '=': chars => chars[1] === '>' ? RARROW : EQ,
  '.': () => PERIOD,
  '!': chars => chars[1] === '=' ? NEQ : chars[1] === '!' ? DOUBLE_EXCLAMATION_MARK : EXCLAMATION_MARK,
  '<': chars => chars[1] === '=' ? LTEQ : chars[1] === '>' ? NEQ2 : chars[1] === '<' ? SHIFT_LEFT : LT,
  '>': chars => chars[1] === '=' ? GTEQ : chars[1] === '>' ? SHIFT_RIGHT : GT,
  ':': chars => chars[1] === ':' ? DOUBLE_COLON : COLON,
  ';':  () => SEMICOLON,
  '\\': () => BACKSLASH,
  '[':  () => LBRACKET,
  ']':  () => RBRACKET,
  '&':  () => AMPERSAND,
  '^':  () => CARET,
  '{':  () => LBRACE,
  '}':  () => RBRACE,
  '~':  () => TILDE,
  '#':  () => HASH, // TODO dead code? this char is in isIdentifierStart
  '@':  () => ATSIGN, // TODO dead code? this char is in isIdentifierStart
};

class TokenizeError extends Error {
  constructor(msg: string, public row: number, public col: number){
    super(msg)
  }
}

class TokenSet extends Array<Token> {
  constructor(...a) { super(...a); }
  get tokens(): Token[] { return this.map(v=>v); }
  toString = () => {
    const tokens = this.slice(1).reduce(
      (prev, curr) => `${prev},\n  ${curr.constructor.name}: ${JSON.stringify(curr)}`,
      `  ${this[0].constructor.name}: ${JSON.stringify(this[0].value)}`
    );
    return `[\n${tokens}\n]`;
  }
  joinValues = (delim:string = ','): string => this.slice(1).reduce((prev, curr) => `${prev}${delim}${curr.value}`, this[0].value);
}

export const tokenize = (src: string): TokenSet => {
  const chars = Array.from(src);
  const tokens: TokenSet = new TokenSet();
  let row = 1;
  let col = 1;
  let i=0;
  while(i < chars.length) {
    const c = chars[i];
    const key = ['N','X','x'].includes(c) ? c :
                isIdentifierStart(c) ? 'ident' :
                isDelimiteddIdentifierStart(c) ? 'delimitedIdent' :
                isDigit(c) ? 'num' :
                c;
    try {
      const token = rule[key]?.(chars.slice(i)) || new Other(key);
      logger.log('c:', `|${c}|`);
      logger.log('token:', `*${token.value}*`);
      i += token.length;
      tokens.push(token);
      if (token instanceof NewLine) {
        row++;
        col=1;
      } else {
        col += token.length;
      }
    } catch (err) {
      const e = wrapError(new TokenizeError('Tokenize error', row, col), err);
      logger.log(e.stack);
      throw e;
    }
  }
  return tokens;
}
const min = (...args: number[]): number => args.sort((a,b) => a-b)[0];
const takeWhile = (chars: string[], testStart: number, advanceBy: (ch: string, idx: number, chars: string[]) => number): string => {
  let i=testStart;
  let by=0;
  while(i < chars.length && (by = advanceBy(chars[i], i, chars)) ) i+=by;
  logger.log(chars, i, chars[i]);
  return chars.slice(0, min(i, chars.length)).join('');
}
const takeWhileOrError = (chars: string[], testStart: number, advanceBy: (ch: string, idx: number, chars: string[]) => number, msg: string): string => {
  let i=testStart;
  let by=0;
  while(i < chars.length && (by = advanceBy(chars[i], i, chars)) ) i+=by;
  logger.log(chars, i, chars[i]);
  if (i === chars.length) throw new Error(msg);
  return chars.slice(0, i).join('');
}
const isDigit = (ch: string): boolean => '0' <= ch && ch <= '9';
const isDelimiteddIdentifierStart = (ch: string): boolean => ['"'].includes(ch);
const isIdentifierStart = (ch: string): boolean => ['@', '#', '_'].includes(ch) ||  ('A' <= ch && ch <= 'Z' ) || ('a' <= ch && ch <= 'z');
const isIdentifierPart = (ch: string): boolean => ['@', '$', '#', '_'].includes(ch) || ('0' <= ch && ch <= '9') || ('A' <= ch && ch <= 'Z' ) || ('a' <= ch && ch <= 'z');
const tokenizeSingleQuotedString = (chars: string[]): string => takeWhileOrError(chars, 2, tokenizeSingleQuotedStringAdvanceBy, TOKENIZE_SINGLE_QUOTED_STRING_ERROR);
const tokenizeSingleQuotedStringAdvanceBy = (c:string,i:number,chars:string[]):number => chars[i-1] !== '\'' ? 1 : (chars[i-1] === '\'' && c === '\'') ? 2 : 0;
const tokenizeIdentifier = (chars: string[]): string => takeWhile(chars, 1, c => ~~isIdentifierPart(c));

