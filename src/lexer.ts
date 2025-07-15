import { spaceRegex } from './regex';
import type { Token } from './token';
import { commentToken } from './tokens/comment';
import { dedentToken } from './tokens/dedent';
import { eofToken } from './tokens/eof';
import { indentToken } from './tokens/indent';
import { multiCommentToken } from './tokens/multiComment';
import { newLineToken } from './tokens/newLine';

const INDENT_WIDTH = 2;

export class Lexer {
  private position = 0;
  private tokens: Token<unknown>[] = [];
  private curChar: string | undefined = undefined;
  private curLine = 0;
  private prevIndent = 0;
  private isInComment = false;
  private handledIndent = false;

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
    while (this.curChar) {
      this.handleCurrentToken();
      this.step();
    }

    this.tokens.push(eofToken());
  }

  private handleCurrentToken() {
    this.handleIndent();
		this.handleComment();
		this.handleNewLine();
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
    if (this.curChar === '*' && this.peek(-1) === '/' && this.peek(-2) !== '\\') {
      this.isInComment = true;
      let content = '/';

      while (this.curChar) {
				this.step();
				content += this.curChar;

        if ((this.curChar as string) === '/' && this.peek(-1) === '*' && this.peek(-2) !== '\\') {
					this.isInComment = false;
					break;
        }
      }

			this.tokens.push(multiCommentToken(content));
      return;
    }

    if (this.curChar === '#') {
      const val = this.skipLine();
      this.tokens.push(commentToken(val));
    }
  }

	private handleNewLine() {
    if (this.curChar === '\n') {
      this.tokens.push(newLineToken());
      this.curLine++;
      this.handledIndent = false;
    }
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
