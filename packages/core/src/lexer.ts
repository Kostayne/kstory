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
const CALL_PREFIX_LENGTH = 6; // @call:
const MULTI_COMMENT_START_LENGTH = 2; // /*
const MULTI_COMMENT_END_LENGTH = 2; // */
const CHOICE_PREFIX_LENGTH = 2; // + 
const REPLICA_PREFIX_LENGTH = 2; // " 
const SECTION_PREFIX_LENGTH = 3; // == 
const GOTO_PREFIX_LENGTH = 3; // -> or =>
const CHOICE_TEXT_BOUND_LENGTH = 3; // ```
const INLINE_CALL_PREFIX_LENGTH = 6; // {call:

export class Lexer {
  private position = 0;
  private tokens: Token<unknown>[] = [];
  private curChar: string | undefined = undefined;
  private curLine = 1;
  private curColumn = 1;
  private prevIndent = 0;
  private isInComment = false;
  private isInChoiceText = false;
  private isExtendingStr = false;
  private lastStringTokenIndex = 0;
  // Start position of the current STRING buffer (for precise text token spans)
  private stringStartLine = 1;
  private stringStartColumn = 1;

  public constructor(private source: string) {
    this.curChar = this.source[0];
  }

  public getTokens() {
    return this.tokens;
  }

  private step(times = 1) {
    for (let i = 0; i < times; i++) {
      const prevChar = this.curChar;
      this.position++;
      this.curChar = this.source[this.position];

      if (prevChar === '\n') {
        this.curLine++;
        this.curColumn = 1;
      } else {
        this.curColumn++;
      }
    }
  }

  public process() {
    let iterations = 0;
    const maxIterations = 100000; // Защита от бесконечного цикла

    while (this.curChar && iterations < maxIterations) {
      this.handleCurrentToken();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.error('Error: Lexer exceeded max iterations, possible infinite loop detected');
      console.error(`Last position: ${this.position}, line: ${this.curLine}, column: ${this.curColumn}, char: '${this.curChar}'`);
      throw new Error(`Lexer exceeded max iterations at position ${this.position}, line ${this.curLine}, column ${this.curColumn}`);
    }

    this.push(eofToken());
  }

  // Push a token stamped with the current cursor position (both start and end)
  private push(token: Token<unknown>) {
    (token as any).line = this.curLine;
    (token as any).column = this.curColumn;
    (token as any).endLine = this.curLine;
    (token as any).endColumn = this.curColumn;
    this.tokens.push(token);
  }

  // Push a token with an explicit start position; end is the current cursor
  private pushAt(token: Token<unknown>, line: number, column: number) {
    (token as any).line = line;
    (token as any).column = column;
    (token as any).endLine = this.curLine;
    (token as any).endColumn = this.curColumn;
    this.tokens.push(token);
  }

  // Insert a token at an index, stamping with the current cursor position
  private insertTokenAt(index: number, token: Token<unknown>) {
    (token as any).line = this.curLine;
    (token as any).column = this.curColumn;
    (token as any).endLine = this.curLine;
    (token as any).endColumn = this.curColumn;
    this.tokens.splice(index, 0, token);
  }

  private handleCurrentToken() {
    this.handleNewLine();
    this.handleIndent();
    this.handleComment();

    if (this.isInComment) return;

    this.handleNonCommentTokens();
    this.handleErrorIfNeeded();
  }

  private handleNonCommentTokens() {
    if (!this.isExtendingStr && !this.isInChoiceText) {
      this.handleStructuralTokens();
    }
    this.handleChoiceText();
    this.handleString();
  }

  private handleStructuralTokens() {
    this.handleCall();
    this.handleChoiceTag();
    this.handleTag();
    this.handleSection();
    this.handleGoto();
    this.handleChoice();
  }

  private handleErrorIfNeeded() {
    if (!this.isInComment && !this.isExtendingStr && !this.isInChoiceText) {
      this.handleError();
    }
  }

  private handleGoto() {
    if (!this.isGoto()) {
      return;
    }

    const startLine = this.curLine;
    const startColumn = this.curColumn;
    const content = `${this.curChar}> `;

    // skipping over the '-> '
    this.step(GOTO_PREFIX_LENGTH);
    this.pushAt(gotoToken(content), startLine, startColumn);

    this.handleIdentifier();
  }

  private handleIdentifier() {
    const startLine = this.curLine;
    const startColumn = this.curColumn;
    const content = this.readLineUntilComment();

    // Не делаем дополнительный step(), так как readLineUntilComment() уже продвигает позицию
    this.pushAt(identifierToken(content), startLine, startColumn);
  }

  private handleError() {
    let content = '';
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла

    while (!this.getTokenType() && iterations < maxIterations) {
      if (this.curChar === undefined) {
        break;
      }

      content += this.curChar;
      this.step();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: handleError() exceeded max iterations');
    }

    if (content.trim().length > 0) {
      this.push({
        type: TokenTypes.ERROR,
        value: content,
      });
    }
  }

  private handleChoice() {
    if (!this.isChoice()) {
      return;
    }

    const startLine = this.curLine;
    const startColumn = this.curColumn;
    // skipping over the '+ '
    if (this.peek(1) === ' ') {
      this.step(CHOICE_PREFIX_LENGTH);
      this.pushAt(choiceToken('+ '), startLine, startColumn);
    } else {
      this.step(1);
      this.pushAt(choiceToken('+'), startLine, startColumn);
    }

    this.handleChoiceTextInline();
  }

  private handleChoiceTextInline() {
    const content = this.readLineUntilComment();

    if (content.length > 0) {
      // true stands for silent (inlined)
      this.push(choiceTextBoundToken(true));
      this.push(choiceTextToken(content));
      this.push(choiceTextBoundToken(true));
    }
  }

  private handleSection() {
    if (!this.isSection()) {
      return;
    }

    const startLine = this.curLine;
    const startColumn = this.curColumn;
    // skipping over the '== '
    this.step(SECTION_PREFIX_LENGTH);
    this.pushAt(sectionToken(), startLine, startColumn);

    this.handleSectionName();
  }

  private handleSectionName() {
    let content = '';

    if (this.isWhitespace() || this.isNewLine()) {
      return;
    }

    while (this.curChar) {
      content += this.curChar;

      if (this.isWhitespace(1) || this.isNewLine(1)) {
        break;
      }

      this.step();
    }

    this.step();
    this.push(identifierToken(content));
  }

  private handleChoiceTag() {
    if (!this.isChoiceTag()) {
      return;
    }

    const startLine = this.curLine;
    const startColumn = this.curColumn;
    // stepping over the '@', so we can use getTagName fn.
    this.step();

    const tagName = this.getTagName();
    const value = this.getTagValue();

    this.pushAt(choiceTagToken(tagName), startLine, startColumn);

    if (value) {
      this.pushAt(tagValueToken(value), startLine, startColumn);
    }
  }

  // TODO: add choice text content token
  private handleChoiceText() {
    if (this.isChoiceTextBound() && !this.isInChoiceText) {
      this.isInChoiceText = true;
      this.push(choiceTextBoundToken());
      this.step(3);

      this.handleChoiceTextExtend();
    } else if (this.isInChoiceText) {
      this.handleChoiceTextExtend();
    }
  }

  private handleChoiceTextExtend(isInlined = false) {
    let content = '';
    let iterations = 0;
    const maxIterations = 10000; // Защита от бесконечного цикла

    while (this.curChar && iterations < maxIterations) {
      if (this.isChoiceTextEnding()) {
        this.finalizeChoiceText(content, isInlined);
        return;
      }

      content = this.processChoiceTextContent(content);
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: handleChoiceTextExtend() exceeded max iterations');
    }

    this.finalizeChoiceText(content, isInlined);
  }

  private isChoiceTextEnding(): boolean {
    return this.isChoiceTextBound();
  }

  private processChoiceTextContent(content: string): string {
    if (this.isNewLine()) {
      return this.handleChoiceTextNewline(content);
    }

    if (this.isComment()) {
      return this.handleChoiceTextComment(content);
    }

    if (this.isMultiComment()) {
      return this.handleChoiceTextMultiComment(content);
    }

    content += this.curChar;
    this.step();
    return content;
  }

  private handleChoiceTextNewline(content: string): string {
    if (content.length > 0) {
      this.push(choiceTextToken(content));
    }
    this.push(newLineToken());
    this.step();
    return '';
  }

  private handleChoiceTextComment(content: string): string {
    if (content.length > 0) {
      this.push(choiceTextToken(content));
    }
    this.handleCommentContent();
    return '';
  }

  private handleChoiceTextMultiComment(content: string): string {
    if (content.length > 0) {
      this.push(choiceTextToken(content));
    }
    this.isInComment = true;
    this.step(2); // skip over /*
    this.push(multiCommentBeginToken());
    this.handleMultiCommentExtend();
    return '';
  }

  private finalizeChoiceText(content: string, isInlined: boolean): void {
    if (content.length > 0) {
      this.push(choiceTextToken(content));
    }

    this.isInChoiceText = false;
          this.step(CHOICE_TEXT_BOUND_LENGTH); // skip over ```
    this.push(choiceTextBoundToken(isInlined));
  }

  private handleTag() {
    if (!this.isTag()) {
      return;
    }

    const startLine = this.curLine;
    const startColumn = this.curColumn;
    const tagName = this.getTagName();
    const value = this.getTagValue();

    this.pushAt(tagToken(tagName), startLine, startColumn);

    if (value) {
      this.pushAt(tagValueToken(value), startLine, startColumn);
    }
  }

  private handleCall() {
    if (!this.isCall()) {
      return;
    }

    // Skip over @call:
    const startLine = this.curLine;
    const startColumn = this.curColumn;
    this.step(CALL_PREFIX_LENGTH);
    
    // Read function name
    let functionName = '';
    while (this.curChar && this.curChar !== '(' && this.curChar !== ' ' && !this.isNewLine()) {
      functionName += this.curChar;
      this.step();
    }

    // Handle escaped parentheses in function name
    if (this.curChar === '(' && this.isEscapedChar()) {
      // This is an escaped parenthesis, treat as part of function name
      functionName += this.curChar;
      this.step();
      
      // Continue reading until we find the real function call
      while (this.curChar && this.curChar !== '(' && this.curChar !== ' ' && !this.isNewLine()) {
        functionName += this.curChar;
        this.step();
      }
    }

    // Create call token first
    this.pushAt(callToken(functionName), startLine, startColumn);

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
    let argStartLine = this.curLine;
    let argStartColumn = this.curColumn;
    let iterations = 0;
    const maxIterations = 10000; // Защита от бесконечного цикла

    while (this.curChar && depth > 0 && iterations < maxIterations) {
      if (this.curChar === '"' && !this.isEscapedChar()) {
        inQuotes = !inQuotes;
      }

      if (!inQuotes) {
        if (this.curChar === '(' && !this.isEscapedChar()) {
          depth++;
        } else if (this.curChar === ')' && !this.isEscapedChar()) {
          depth--;
          if (depth === 0) {
            break;
          }
        } else if (this.curChar === ',' && depth === 1) {
          if (currentArg.trim().length > 0) {
            this.pushAt(callArgumentToken(currentArg.trim()), argStartLine, argStartColumn);
          }
          currentArg = '';
          this.step();
          argStartLine = this.curLine;
          argStartColumn = this.curColumn;
          iterations++;
          continue;
        }
      }

      currentArg += this.curChar;
      this.step();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: handleCallArguments() exceeded max iterations');
    }

    if (currentArg.trim().length > 0) {
      this.pushAt(callArgumentToken(currentArg.trim()), argStartLine, argStartColumn);
    }
  }

  private getTagName() {
    let tagName = '';
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла

    while (this.curChar && iterations < maxIterations) {
      tagName += this.curChar;

      if (this.isWhitespace(1) || this.isNewLine(1)) {
        break;
      }

      this.step();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: getTagName() exceeded max iterations');
    }

    this.step();
    return tagName;
  }

  private getTagValue() {
    let value = '';
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла

    if (this.getTokenType(0)) {
      return value;
    }

    while (this.curChar && iterations < maxIterations) {
      if (this.getTokenType(1) || this.isEOF(1)) {
        break;
      }

      this.step();
      value += this.curChar;
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: getTagValue() exceeded max iterations');
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
    this.step(INLINE_CALL_PREFIX_LENGTH);
    // Read function name
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла
    
    while (this.curChar && this.curChar !== '(' && this.curChar !== '}' && iterations < maxIterations) {
      result += this.curChar;
      this.step();
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn('Warning: handleInlineCall() function name reading exceeded max iterations');
    }
    
    if (this.curChar === '(') {
      result += this.curChar;
      this.step();
      let depth = 1;
      let parenIterations = 0;
      const maxParenIterations = 10000; // Защита от бесконечного цикла
      
      while (this.curChar && depth > 0 && parenIterations < maxParenIterations) {
        result += this.curChar;
        if (this.curChar === '(' && !this.isEscapedChar()) {
          depth++;
        } else if ((this.curChar as string) === ')' && !this.isEscapedChar()) {
          depth--;
        }
        this.step();
        parenIterations++;
      }
      
      if (parenIterations >= maxParenIterations) {
        console.warn('Warning: handleInlineCall() parentheses processing exceeded max iterations');
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
    const startLine = this.curLine;
    const startColumn = this.curColumn;
    this.step(REPLICA_PREFIX_LENGTH);
    this.isExtendingStr = true;
    this.pushAt(replicaBeginToken(), startLine, startColumn);

    this.handleExtendReplica();
  }

  private handleExtendReplica() {
    let content = '';

    if (this.shouldEndReplica()) {
      this.handleEndReplica();
      return;
    }

    content = this.handleInlineCallInReplica(content);

    if (this.getTokenType(0)) {
      return;
    }

    content = this.processReplicaContent(content);

    this.finalizeReplicaContent(content);
  }

  private shouldEndReplica(): boolean {
    return (
      this.isReplicaBegin() ||
      this.isTag() ||
      this.isChoiceTag() ||
      this.isGoto() ||
      this.isChoice() ||
      this.isSection() ||
      this.isEOF()
    );
  }

  private handleInlineCallInReplica(content: string): string {
    if (this.isInlineCall()) {
      this.addStringTokenIfNotEmpty(content);
      return this.handleInlineCall();
    }
    return content;
  }

  private addStringTokenIfNotEmpty(content: string): void {
    if (content.trim().length > 0) {
      this.pushAt(stringToken(content), this.stringStartLine, this.stringStartColumn);
      this.lastStringTokenIndex = this.tokens.length - 1;
    }
  }

  private processReplicaContent(content: string): string {
    let isReplicaEnding = false;
    let iterations = 0;
    const maxIterations = 10000; // Защита от бесконечного цикла

    while (this.curChar && iterations < maxIterations) {
      if (this.isInlineCall()) {
        this.addStringTokenIfNotEmpty(content);
        content = this.handleInlineCall();
        iterations++;
        continue;
      }

      if (content.length === 0) {
        this.stringStartLine = this.curLine;
        this.stringStartColumn = this.curColumn;
      }
      content += this.curChar;

      if (this.isReplicaEnding()) {
        isReplicaEnding = true;
        break;
      }

      if (this.getTokenType(1)) {
        break;
      }

      this.step();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: processReplicaContent() exceeded max iterations');
    }

    this.step();
    return content;
  }

  private isReplicaEnding(): boolean {
    return (
      this.isTag(1) ||
      this.isChoiceTag(1) ||
      this.isReplicaBegin(1) ||
      this.isEOF(1)
    );
  }

  private finalizeReplicaContent(content: string): void {
    if (content.trim().length > 0) {
      this.pushAt(stringToken(content), this.stringStartLine, this.stringStartColumn);
      this.lastStringTokenIndex = this.tokens.length - 1;
    }
  }

  private handleEndReplica() {
    this.isExtendingStr = false;
    this.insertTokenAt(this.lastStringTokenIndex + 1, replicaEndToken());
  }

  private handleIndent() {
    if (this.isInComment) {
      return;
    }

    // Only process indentation if we're at the beginning of a line
    if (!this.isFirstOnLine()) {
      return;
    }

    let spaces = 0;
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла

    while (this.curChar && this.isWhitespace() && iterations < maxIterations) {
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
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: handleIndent() exceeded max iterations');
    }

    let indentDiff = Math.floor((spaces - this.prevIndent) / INDENT_WIDTH);

    // End current replica on indent change
    if (indentDiff !== 0 && this.isExtendingStr) {
      this.handleEndReplica();
    }

    while (indentDiff !== 0) {
      if (indentDiff > 0) {
        this.push(indentToken());
        indentDiff--;
      } else {
        this.push(dedentToken());
        indentDiff++;
      }
    }

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
      this.step(MULTI_COMMENT_START_LENGTH); // skip over /*
      this.push(multiCommentBeginToken());
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
    
    while (this.curChar && !this.isEndOfLine()) {
      content += this.curChar;
      this.step();
    }
    
    if (content.length > 1) { // More than just '#'
      this.push(commentToken(content));
    }
  }

  private handleMultiCommentExtend() {
    let content = '';
    let iterations = 0;
    const maxIterations = 10000; // Защита от бесконечного цикла

    // check cur char
    if (this.isMultiCommentEnd()) {
      this.isInComment = false;
      this.push(multiCommentEndToken());
      this.step(MULTI_COMMENT_END_LENGTH); // skip over */
      return;
    }

    if (this.isNewLine()) {
      return;
    }

    // check next char
    while (this.curChar && iterations < maxIterations) {
      content += this.curChar;

      if (this.isEndOfLine(1) || this.isMultiCommentEnd(1)) {
        break;
      }

      this.step();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: handleMultiCommentExtend() exceeded max iterations');
    }

    // adding comment content
    this.push(commentContentToken(content));

    if (this.isMultiCommentEnd(1)) {
      this.isInComment = false;
      this.push(multiCommentEndToken());
      this.step(2);
    }

    this.step();
  }

  private handleNewLine() {
    if (this.curChar === '\n') {
      this.push(newLineToken());
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

    while (prevPos >= 0) {
      if (this.isEOF(prevPos) || this.isNewLine(prevPos)) {
        return true;
      }

      if (!this.isWhitespace(prevPos)) {
        return false;
      }

      prevPos--;
    }

    return true; // Достигли начала файла
  }

  private readLine() {
    let content = '';

    while (this.curChar && !this.isEndOfLine()) {
      content += this.curChar;
      this.step();
    }

    return content;
  }

  private readLineUntilComment() {
    let content = '';
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла

    while (this.curChar && !this.isEndOfLine() && iterations < maxIterations) {
      if (this.isComment() || this.isMultiComment()) {
        break;
      }

      content += this.curChar;
      this.step();
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn('Warning: readLineUntilComment() exceeded max iterations');
    }

    return content;
  }

  private isNotEscapingChar(char: string, offset = 0) {
    return this.peek(offset) === char && this.peek(offset - 1) !== '\\';
  }

  private isEndOfLine(offset = 0): boolean {
    return this.isNewLine(offset) || this.isEOF(offset);
  }

  private isWhitespace(offset = 0): boolean {
    const char = this.peek(offset);
    return char === ' ' || char === '\t';
  }

  private isEscapedChar(offset = 0): boolean {
    return this.peek(offset - 1) === '\\';
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
