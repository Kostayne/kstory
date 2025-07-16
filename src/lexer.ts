import { spaceRegex } from './regex';
import type { Token } from './token';
import { commentToken } from './tokens/comment';
import { dedentToken } from './tokens/dedent';
import { eofToken } from './tokens/eof';
import { indentToken } from './tokens/indent';
import { multiCommentToken } from './tokens/multiComment';
import { newLineToken } from './tokens/newLine';
import { stringToken } from './tokens/string';

const INDENT_WIDTH = 2;

export class Lexer {
  private position = 0;
  private tokens: Token<unknown>[] = [];
  private curChar: string | undefined = undefined;
  private curLine = 0;
  private prevIndent = 0;
  private isInComment = false;
  private handledIndent = false;
  private isExtendingStr = false;

  public constructor(private source: string) {
    this.curChar = this.source[0];
  }

  public getTokens() {
    return this.tokens;
  }

  private step() {
    this.position++;
    this.curChar = this.source[this.position];
  }

  public process() {
    let i = 0;

    while (this.curChar) {
      this.handleCurrentToken();
      i++;

      if (i > 5) {
        debugger
      }

      if (this.tokens.length > 35 || i > 35) {
        break;
      }
    }

    this.tokens.push(eofToken());
  }

  private handleCurrentToken() {
    this.handleComment();
    this.handleNewLine();
    this.handleIndent();
    this.handleString();
  }


  private handleString() {
    if (this.isStringBegin()) {
      this.handleNewString();
    } else if (this.isExtendingStr) {
      this.handleExtendString();
    }
  }

  private handleNewString() {
    let content = '';

    while (this.curChar) {
      content += this.curChar;
      const nextChar = this.peek(1);

      if (this.isComment(1) || this.isMultiComment(1)) {
        break;
      }

      if (nextChar === '\n') {
        this.isExtendingStr = true;
        break;
      }

      if (this.isStringBegin(1)) {
        break;
      }

      this.step();
    }

    // reached the end of the string
    // move to the next token
    this.step();

    this.tokens.push(stringToken(content));
  }

  private handleExtendString() {
    let content = '';

    if (this.isStringBegin()) {
      this.isExtendingStr = false;
      return;
    }

    if (this.isComment() || this.isMultiComment() || this.curChar === '\n') {
      return;
    }

    while (this.curChar) {
      content += this.curChar;

      if (
        this.isComment(1) ||
        this.isMultiComment(1) ||
        this.peek(1) === '\n'
      ) {
        break;
      }

      this.step();
    }

    this.step();
    this.tokens.push(stringToken(content));
  }

  private handleIndent() {
    if (this.isInComment || this.handledIndent) {
      return;
    }

    let spaces = 0;

    while (this.curChar?.match(spaceRegex)) {
      if (this.curChar === '\n') {
        break;
      }

      if (this.curChar === ' ') {
        spaces++;
      }

      if (this.curChar === '\t') {
        spaces += 2;
      }

      this.step();
    }

    let indentDiff = Math.floor((spaces - this.prevIndent) / INDENT_WIDTH);

    if (indentDiff !== 0) {
      this.isExtendingStr = false;
    }

    while (indentDiff !== 0) {
      if (indentDiff > 0) {
        this.tokens.push(indentToken());
        indentDiff--;
      } else {
        this.tokens.push(dedentToken());
        indentDiff++;
      }
    }

    this.handledIndent = true;
    this.prevIndent = spaces;
  }

  private handleComment() {
    // new multiline comment
    if (this.isMultiComment()) {
      this.isInComment = true;
      let content = '/*';

      this.step();

      while (this.curChar) {
        this.step();
        content += this.curChar;

        if (this.isMultiCommentEnd()) {
          this.isInComment = false;
          break;
        }
      }

      this.tokens.push(multiCommentToken(content));
      this.step();
      return;
    }

    if (this.isComment()) {
      const val = this.skipLine();
      this.tokens.push(commentToken(val));
    }
  }

  private handleNewLine() {
    if (this.curChar === '\n') {
      this.tokens.push(newLineToken());
      this.curLine++;
      this.handledIndent = false;
      this.step();
    }
  }

  private isStringBegin(offset = 0) {
    return this.peek(offset) === '"' && this.peek(offset - 1) !== '\\';
  }

  private isComment(offset = 0) {
    return this.peek(offset) === '#' && this.peek(offset - 1) !== '\\';
  }

  private isMultiComment(offset = 0) {
    return (
      this.peek(offset - 1) !== '\\' &&
      this.peek(offset) === '/' &&
      this.peek(offset + 1) === '*'
    );
  }

  private isMultiCommentEnd(offset = 0) {
    return (
      this.peek(offset) === '/' &&
      this.peek(offset - 1) === '*' &&
      this.peek(offset - 2) !== '\\'
    );
  }

  private skipWhitespace() {
    while (this.curChar?.match(spaceRegex)) {
      if (this.curChar === '\n') {
        break;
      }

      this.step();
    }
  }

  private skipLine() {
    let content = '';

    while (this.curChar && this.curChar !== '\n') {
      content += this.curChar;
      this.step();
    }

    return content;
  }

  private peek(pos = 0) {
    return this.source[this.position + pos];
  }
}
