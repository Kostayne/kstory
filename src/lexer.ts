import { spaceRegex } from './regex';
import { type Token, type TokenType, TokenTypes } from './token';
import {
  callArgumentToken,
  callToken,
  choiceTagToken,
  choiceTextBoundToken,
  choiceTextToken,
  choiceToken,
  commentContentToken,
  commentToken,
  dedentToken,
  eofToken,
  gotoToken,
  identifierToken,
  indentToken,
  multiCommentBeginToken,
  multiCommentEndToken,
  newLineToken,
  replicaBeginToken,
  replicaEndToken,
  sectionToken,
  stringToken,
  tagToken,
  tagValueToken,
} from './tokenFactory';

const INDENT_WIDTH = 2;

export class Lexer {
  private position = 0;
  private tokens: Token<unknown>[] = [];
  private curChar: string | undefined = undefined;
  private curLine = 0;
  private prevIndent = 0;
  private isInComment = false;
  private isInChoiceText = false;
  private handledIndent = false;
  private isExtendingStr = false;
  private lastStringTokenIndex = 0;

  public constructor(private source: string) {
    this.curChar = this.source[0];
  }

  public getTokens() {
    return this.tokens;
  }

  private step(times = 1) {
    for (let i = 0; i < times; i++) {
      this.position++;
      this.curChar = this.source[this.position];
    }
  }

  public process() {
    while (this.curChar) {
      this.handleCurrentToken();
    }

    this.tokens.push(eofToken());
  }

  private handleCurrentToken() {
    this.handleIndent();
    this.handleNewLine();
    this.handleComment();

    if (!this.isInComment) 
    {
      if (!this.isExtendingStr && !this.isInChoiceText) 
      {
        this.handleCall();
        this.handleChoiceTag();
        this.handleTag();
        this.handleSection();
        this.handleGoto();
        this.handleChoice();
      }

      this.handleChoiceText();
      this.handleString();
    }

    if (!this.isInComment && !this.isExtendingStr && !this.isInChoiceText) 
    {
      this.handleError();
    }
  }

  private handleGoto() {
    if (!this.isGoto()) {
      return;
    }

    const content = `${this.curChar}> `;

    // skipping over the '-> '
    this.step(3);
    this.tokens.push(gotoToken(content));

    this.handleIdentifier();
  }

  private handleIdentifier() {
    const content = this.readLineUntilComment();

    this.step();
    this.tokens.push(identifierToken(content));
  }

  private handleError() {
    let content = '';

    while (!this.getTokenType()) {
      if (this.curChar === undefined) {
        break;
      }

      content += this.curChar;
      this.step();
    }

    if (content.trim().length > 0) {
      this.tokens.push({
        type: TokenTypes.ERROR,
        value: content,
      });
    }
  }

  private handleChoice() {
    if (!this.isChoice()) {
      return;
    }

    // skipping over the '+ '
    if (this.peek(1) === ' ') {
      this.step(2);
      this.tokens.push(choiceToken('+ '));
    } else {
      this.step(1);
      this.tokens.push(choiceToken('+'));
    }

    this.handleChoiceTextInline();
  }

  private handleChoiceTextInline() {
    const content = this.readLineUntilComment();

    if (content.length > 0) {
      // true stands for silent (inlined)
      this.tokens.push(choiceTextBoundToken(true));
      this.tokens.push(choiceTextToken(content));
      this.tokens.push(choiceTextBoundToken(true));
    }
  }

  private handleSection() {
    if (!this.isSection()) {
      return;
    }

    // skipping over the '== '
    this.step(3);
    this.tokens.push(sectionToken());

    this.handleSectionName();
  }

  private handleSectionName() {
    let content = '';

    if (this.curChar === ' ' || this.isNewLine()) {
      return;
    }

    while (this.curChar) {
      content += this.curChar;

      if (this.peek(1) === ' ' || this.isNewLine(1)) {
        break;
      }

      this.step();
    }

    this.step();
    this.tokens.push(identifierToken(content));
  }

  private handleChoiceTag() {
    if (!this.isChoiceTag()) {
      return;
    }

    // stepping over the '@', so we can use getTagName fn.
    this.step();

    const tagName = this.getTagName();
    const value = this.getTagValue();

    this.tokens.push(choiceTagToken(tagName));

    if (value) {
      this.tokens.push(tagValueToken(value));
    }
  }

  // TODO: add choice text content token
  private handleChoiceText() {
    if (this.isChoiceTextBound() && !this.isInChoiceText) {
      this.isInChoiceText = true;
      this.tokens.push(choiceTextBoundToken());
      this.step(3);

      this.handleChoiceTextExtend();
    } else if (this.isInChoiceText) {
      this.handleChoiceTextExtend();
    }
  }

  private handleChoiceTextExtend(isInlined = false) {
    let content = '';
    let isChoiceTextEnding = false;

    while (this.curChar) {
      // Handle newline
      if (this.isNewLine()) {
        if (content.length > 0) {
          this.tokens.push(choiceTextToken(content));
          content = '';
        }
        this.tokens.push(newLineToken());
        this.step();
        continue;
      }

      // Handle single line comment
      if (this.isComment()) {
        if (content.length > 0) {
          this.tokens.push(choiceTextToken(content));
          content = '';
        }
        this.handleCommentContent();
        continue;
      }

      // Handle multiline comment
      if (this.isMultiComment()) {
        if (content.length > 0) {
          this.tokens.push(choiceTextToken(content));
          content = '';
        }
        this.isInComment = true;
        this.step(2); // skip over /*
        this.tokens.push(multiCommentBeginToken());
        this.handleMultiCommentExtend();
        continue;
      }

      // Handle choice text ending
      if (this.isChoiceTextBound()) {
        isChoiceTextEnding = true;
        break;
      }

      content += this.curChar;
      this.step();
    }

    if (content.length > 0) {
      this.tokens.push(choiceTextToken(content));
    }

    if (isChoiceTextEnding) {
      this.isInChoiceText = false;
      this.step(3); // skip over ```
      // Making token silent if it's inlined
      this.tokens.push(choiceTextBoundToken(isInlined));
    }
  }

  private handleTag() {
    if (!this.isTag()) {
      return;
    }

    const tagName = this.getTagName();
    const value = this.getTagValue();

    this.tokens.push(tagToken(tagName));

    if (value) {
      this.tokens.push(tagValueToken(value));
    }
  }

  private handleCall() {
    if (!this.isCall()) {
      return;
    }

    // Skip over @call:
    this.step(6);
    
    // Read function name
    let functionName = '';
    while (this.curChar && this.curChar !== '(' && this.curChar !== ' ') {
      functionName += this.curChar;
      this.step();
    }

    // Handle escaped parentheses in function name
    if (this.curChar === '(' && this.peek(-1) === '\\') {
      // This is an escaped parenthesis, treat as part of function name
      functionName += this.curChar;
      this.step();
      
      // Continue reading until we find the real function call
      while (this.curChar && this.curChar !== '(' && this.curChar !== ' ') {
        functionName += this.curChar;
        this.step();
      }
    }

    // Create call token first
    this.tokens.push(callToken(functionName));

    if (this.curChar === '(') {
      this.step(); // skip over (
      this.handleCallArguments();
      
      // Skip over closing )
      this.step();
    }
  }

  private handleCallArguments() {
    let depth = 1;
    let currentArg = '';
    let inQuotes = false;

    while (this.curChar && depth > 0) {
      if (this.curChar === '"' && this.peek(-1) !== '\\') {
        inQuotes = !inQuotes;
      }

      if (!inQuotes) {
        if (this.curChar === '(' && this.peek(-1) !== '\\') {
          depth++;
        } else if (this.curChar === ')' && this.peek(-1) !== '\\') {
          depth--;
          if (depth === 0) {
            break;
          }
        } else if (this.curChar === ',' && depth === 1) {
          if (currentArg.trim().length > 0) {
            this.tokens.push(callArgumentToken(currentArg.trim()));
          }
          currentArg = '';
          this.step();
          continue;
        }
      }

      currentArg += this.curChar;
      this.step();
    }

    if (currentArg.trim().length > 0) {
      this.tokens.push(callArgumentToken(currentArg.trim()));
    }
  }

  private getTagName() {
    let tagName = '';

    while (this.curChar) {
      tagName += this.curChar;

      if (this.peek(1) === ' ' || this.peek(1) === '\n') {
        break;
      }

      this.step();
    }

    this.step();
    return tagName;
  }

  private getTagValue() {
    let value = '';

    if (this.getTokenType(0)) {
      return value;
    }

    while (this.curChar) {
      if (this.getTokenType(1) || this.isEOF(1)) {
        break;
      }

      this.step();
      value += this.curChar;
    }

    this.step();
    return value;
  }

  private handleString() {
    if (this.isReplicaBegin()) {
      if (this.isExtendingStr) {
        this.handleEndReplica();
      }

      this.handleNewReplica();
    } else if (this.isExtendingStr) {
      this.handleExtendReplica();
    } else {
      // Check for inline calls in text
      this.handleInlineCall();
    }
  }

  private handleInlineCall(): string {
    if (!this.isInlineCall()) {
      return '';
    }
    let result = '{call:';
    this.step(6);
    // Read function name
    while (this.curChar && this.curChar !== '(' && this.curChar !== '}') {
      result += this.curChar;
      this.step();
    }
    if (this.curChar === '(') {
      result += this.curChar;
      this.step();
      let depth = 1;
      while (this.curChar && depth > 0) {
        result += this.curChar;
        if (this.curChar === '(' && this.peek(-1) !== '\\') {
          depth++;
        } else if ((this.curChar as string) === ')' && this.peek(-1) !== '\\') {
          depth--;
        }
        this.step();
      }
    }
    if (this.curChar === '}') {
      result += '}';
      this.step();
    }
    return result;
  }

  private isInlineCall(offset = 0) {
    return (
      this.isNotEscapingChar('{', offset) &&
      this.peek(offset + 1) === 'c' &&
      this.peek(offset + 2) === 'a' &&
      this.peek(offset + 3) === 'l' &&
      this.peek(offset + 4) === 'l' &&
      this.peek(offset + 5) === ':'
    );
  }

  private handleNewReplica() {
    this.step(2);
    this.isExtendingStr = true;
    this.tokens.push(replicaBeginToken());

    this.handleExtendReplica();
  }

  private handleExtendReplica() {
    let content = '';

    // The start of tag, choice tag, or new replica is the end of the current string
    if (
      this.isReplicaBegin() ||
      this.isTag() ||
      this.isChoiceTag() ||
      this.isEOF()
    ) {
      this.handleEndReplica();
      return;
    }

          // Check for inline calls in replica text
      if (this.isInlineCall()) {
        // Add any accumulated content first
        if (content.trim().length > 0) {
          this.tokens.push(stringToken(content));
          this.lastStringTokenIndex = this.tokens.length - 1;
        }
        
        content += this.handleInlineCall();
        // Don't return, continue processing the replica
      }

    // skipping other tokens such as comments
    if (this.getTokenType(0)) {
      return;
    }

    let isReplicaEnding = false;
    while (this.curChar) {
      // Check for inline calls
      if (this.isInlineCall()) {
        // Add accumulated content first
        if (content.trim().length > 0) {
          this.tokens.push(stringToken(content));
          this.lastStringTokenIndex = this.tokens.length - 1;
        }
        
        // Handle inline call as part of the replica
        content += this.handleInlineCall();
        continue;
      }

      content += this.curChar;

      if (
        this.isTag(1) ||
        this.isChoiceTag(1) ||
        this.isReplicaBegin(1) ||
        this.isEOF(1)
      ) {
        isReplicaEnding = true;
        break;
      }

      if (this.getTokenType(1)) {
        break;
      }

      this.step();
    }

    this.step();
    
    // Only create string token if content is not empty
    if (content.trim().length > 0) {
      this.tokens.push(stringToken(content));
      this.lastStringTokenIndex = this.tokens.length - 1;
    }

    if (isReplicaEnding) {
      this.handleEndReplica();
    }
  }

  private handleEndReplica() {
    this.isExtendingStr = false;
    this.tokens.splice(this.lastStringTokenIndex + 1, 0, replicaEndToken());
  }

  private handleIndent() {
    if (this.isInComment || this.handledIndent) {
      return;
    }

    let spaces = 0;

    while (this.curChar?.match(spaceRegex)) {
      if (this.isNewLine()) {
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

    // End current replica on indent change
    if (indentDiff !== 0 && this.isExtendingStr) {
      this.handleEndReplica();
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
    if (this.isInComment) {
      this.handleMultiCommentExtend();
      return;
    }

    // new multiline comment
    if (this.isMultiComment()) {
      this.isInComment = true;
      this.step(2); // skip over /*
      
      this.tokens.push(multiCommentBeginToken());
      this.handleMultiCommentExtend();
      return;
    }

    if (this.isComment()) {
      this.handleCommentContent();
    }
  }

  private handleCommentContent() {
    // Include the # symbol in the content
    let content = '#';
    this.step(); // skip over #
    
    while (this.curChar && this.curChar !== '\n') {
      content += this.curChar;
      this.step();
    }
    
    if (content.length > 1) { // More than just '#'
      this.tokens.push(commentToken(content));
    }
  }

  private handleMultiCommentExtend() {
    let content = '';

    // check cur char
    if (this.isMultiCommentEnd()) {
      this.isInComment = false;
      this.tokens.push(multiCommentEndToken());
      this.step(2); // skip over */
      return;
    }

    if (this.isNewLine()) {
      return;
    }

    // check next char
    while (this.curChar) {
      content += this.curChar;

      if (this.isNewLine(1) || this.isMultiCommentEnd(1)) {
        break;
      }

      this.step();
    }

    // adding comment content
    this.tokens.push(commentContentToken(content));

    if (this.isMultiCommentEnd(1)) {
      this.isInComment = false;
      this.tokens.push(multiCommentEndToken());
      this.step(2);
    }

    this.step();
  }

  private handleNewLine() {
    if (this.curChar === '\n') {
      this.tokens.push(newLineToken());
      this.handledIndent = false;
      this.curLine++;
      this.step();
    }
  }

  private getTokenType(offset = 0): TokenType | undefined {
    type TokenInfo = {
      type: TokenType;
      fn: (offset: number) => boolean;
    };

    const tokens: TokenInfo[] = [
      { type: TokenTypes.NEWLINE, fn: this.isNewLine },
      { type: TokenTypes.CHOICE_TAG, fn: this.isChoiceTag },
      { type: TokenTypes.TAG, fn: this.isTag },
      { type: TokenTypes.COMMENT, fn: this.isComment },
      { type: TokenTypes.COMMENT_MULTILINE_BEGIN, fn: this.isMultiComment },
      { type: TokenTypes.GOTO, fn: this.isGoto },
      { type: TokenTypes.SECTION, fn: this.isSection },
      { type: TokenTypes.CHOICE, fn: this.isChoice },
      { type: TokenTypes.STRING, fn: this.isReplicaBegin },
      { type: TokenTypes.CHOICE_TEXT_BOUND, fn: this.isChoiceTextBound },
      { type: TokenTypes.CALL, fn: this.isCall },
    ];

    return tokens.find((info) => {
      return info.fn.call(this, offset);
    })?.type;
  }

  private isGoto(offset = 0) {
    if (
      !this.isNotEscapingChar('=', offset) &&
      !this.isNotEscapingChar('-', offset)
    ) {
      return false;
    }

    return this.peek(offset + 1) === '>' && this.peek(offset + 2) === ' ';
  }

  private isSection(offset = 0) {
    return (
      this.isNotEscapingChar('=', offset) &&
      this.peek(offset + 1) === '=' &&
      this.peek(offset + 2) === ' '
    );
  }

  private isChoice(offset = 0) {
    if (!this.isFirstOnLine(offset)) {
      return false;
    }

    return this.isNotEscapingChar('+', offset);
  }

  private isChoiceTextBound(offset = 0) {
    return (
      this.isNotEscapingChar('`', offset) &&
      this.peek(offset + 1) === '`' &&
      this.peek(offset + 2) === '`'
    );
  }

  private isReplicaBegin(offset = 0) {
    return this.isNotEscapingChar('"', offset) && this.peek(offset + 1) === ' ';
    // return this.peek(offset) === '"' && this.peek(offset - 1) !== '\\';
  }

  private isTag(offset = 0) {
    return this.isNotEscapingChar('@', offset);
  }

  private isChoiceTag(offset = 0) {
    return this.isNotEscapingChar('@', offset) && this.peek(1) === '@';
  }

  private isComment(offset = 0) {
    return this.peek(offset) === '#' && this.peek(offset - 1) !== '\\';
  }

  private isMultiComment(offset = 0) {
    return this.isNotEscapingChar('/', offset) && this.peek(offset + 1) === '*';
  }

  private isMultiCommentEnd(offset = 0) {
    return this.isNotEscapingChar('*', offset) && this.peek(offset + 1) === '/';
  }

  private isNewLine(offset = 0) {
    return this.peek(offset) === '\n';
  }

  private isEOF(offset = 0) {
    return this.peek(offset) === undefined;
  }

  private isFirstOnLine(offset = 0) {
    let prevPos = offset - 1;

    while (true) {
      if (this.peek(prevPos) === undefined || this.peek(prevPos) === '\n') {
        return true;
      }

      if (!this.peek(prevPos).match(spaceRegex)) {
        return false;
      }

      prevPos--;
    }
  }

  private readLine() {
    let content = '';

    while (this.curChar && this.curChar !== '\n') {
      content += this.curChar;
      this.step();
    }

    return content;
  }

  private readLineUntilComment() {
    let content = '';

    while (this.curChar && this.curChar !== '\n') {
      if (this.isComment() || this.isMultiComment()) {
        break;
      }

      content += this.curChar;
      this.step();
    }

    return content;
  }

  private isNotEscapingChar(char: string, offset = 0) {
    return this.peek(offset) === char && this.peek(offset - 1) !== '\\';
  }

  private peek(pos = 0) {
    return this.source[this.position + pos];
  }

  private isCall(offset = 0) {
    return (
      this.isNotEscapingChar('@', offset) &&
      this.peek(offset + 1) === 'c' &&
      this.peek(offset + 2) === 'a' &&
      this.peek(offset + 3) === 'l' &&
      this.peek(offset + 4) === 'l' &&
      this.peek(offset + 5) === ':'
    );
  }
}
