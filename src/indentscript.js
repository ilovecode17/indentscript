#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

class Lexer {
  constructor(code) {
    this.code = code;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
  }

  isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\r';
  }

  isNewline(ch) {
    return ch === '\n';
  }

  isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  isAlpha(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
  }

  isAlphaNum(ch) {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.code.length ? this.code[idx] : '';
  }

  advance() {
    const ch = this.code[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  skipWhitespace() {
    while (this.pos < this.code.length && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  readString(quote) {
    let value = '';
    let isTemplate = false;
    const startQuote = quote;
    
    if (this.peek() === quote && this.peek(1) === quote) {
      this.advance();
      this.advance();
      this.advance();
      
      while (this.pos < this.code.length) {
        if (this.peek() === quote && this.peek(1) === quote && this.peek(2) === quote) {
          this.advance();
          this.advance();
          this.advance();
          break;
        }
        value += this.advance();
      }
      return { value, isTemplate: false, isMultiline: true };
    }
    
    this.advance();
    let escaped = false;
    
    while (this.pos < this.code.length) {
      const ch = this.peek();
      
      if (escaped) {
        if (ch === 'n') value += '\n';
        else if (ch === 't') value += '\t';
        else if (ch === 'r') value += '\r';
        else if (ch === '\\') value += '\\';
        else if (ch === quote) value += quote;
        else value += ch;
        escaped = false;
        this.advance();
        continue;
      }
      
      if (ch === '\\') {
        escaped = true;
        this.advance();
        continue;
      }
      
      if (ch === quote) {
        this.advance();
        break;
      }
      
      if (ch === '{' && (startQuote === 'f' || startQuote === 'F')) {
        isTemplate = true;
      }
      
      value += ch;
      this.advance();
    }
    
    return { value, isTemplate, isMultiline: false };
  }

  readNumber() {
    let value = '';
    let hasDecimal = false;
    
    while (this.pos < this.code.length) {
      const ch = this.peek();
      if (this.isDigit(ch)) {
        value += this.advance();
      } else if (ch === '.' && !hasDecimal && this.isDigit(this.peek(1))) {
        hasDecimal = true;
        value += this.advance();
      } else if (ch === '_') {
        this.advance();
      } else {
        break;
      }
    }
    
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }
    
    return value;
  }

  readIdentifier() {
    let value = '';
    while (this.pos < this.code.length && this.isAlphaNum(this.peek())) {
      value += this.advance();
    }
    return value;
  }

  tokenize() {
    const indentStack = [0];
    let atLineStart = true;

    while (this.pos < this.code.length) {
      if (atLineStart && this.isWhitespace(this.peek())) {
        let indent = 0;
        
        while (this.pos < this.code.length && this.isWhitespace(this.peek())) {
          if (this.peek() === ' ') indent += 1;
          if (this.peek() === '\t') indent += 4;
          this.advance();
        }
        
        if (this.isNewline(this.peek()) || this.peek() === '#' || this.peek() === '') {
          continue;
        }
        
        if (indent > indentStack[indentStack.length - 1]) {
          indentStack.push(indent);
          this.tokens.push(new Token('INDENT', indent, this.line, 1));
        } else if (indent < indentStack[indentStack.length - 1]) {
          while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            this.tokens.push(new Token('DEDENT', indent, this.line, 1));
          }
        }
        
        atLineStart = false;
        continue;
      }

      this.skipWhitespace();

      if (this.pos >= this.code.length) break;

      const ch = this.peek();
      const startCol = this.col;

      if (this.isNewline(ch)) {
        if (this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type !== 'NEWLINE') {
          this.tokens.push(new Token('NEWLINE', '\\n', this.line, this.col));
        }
        this.advance();
        atLineStart = true;
        continue;
      }

      if (ch === '#') {
        while (this.pos < this.code.length && !this.isNewline(this.peek())) {
          this.advance();
        }
        continue;
      }

      if ((ch === 'f' || ch === 'F') && (this.peek(1) === '"' || this.peek(1) === "'")) {
        this.advance();
        const quote = this.peek();
        const strData = this.readString(quote);
        this.tokens.push(new Token('FSTRING', strData.value, this.line, startCol));
        atLineStart = false;
        continue;
      }

      if (ch === '"' || ch === "'") {
        const strData = this.readString(ch);
        this.tokens.push(new Token('STRING', strData.value, this.line, startCol));
        atLineStart = false;
        continue;
      }

      if (ch === '`') {
        const strData = this.readString(ch);
        this.tokens.push(new Token('TEMPLATE', strData.value, this.line, startCol));
        atLineStart = false;
        continue;
      }

      if (this.isDigit(ch)) {
        const value = this.readNumber();
        this.tokens.push(new Token('NUMBER', value, this.line, startCol));
        atLineStart = false;
        continue;
      }

      if (this.isAlpha(ch)) {
        const value = this.readIdentifier();
        const keywords = [
          'def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return',
          'import', 'from', 'in', 'as', 'with', 'pass', 'break', 'continue',
          'print', 'len', 'range', 'enumerate',
          'lambda', 'async', 'await', 'try', 'except', 'finally', 'raise',
          'assert', 'del', 'global', 'nonlocal', 'yield', 'None', 'True', 'False',
          'and', 'or', 'not', 'is', 'function', 'const', 'let', 'var', 'this',
          'new', 'typeof', 'instanceof', 'delete', 'void', 'super', 'static',
          'get', 'set', 'extends', 'implements', 'interface', 'package', 'private',
          'protected', 'public', 'export', 'default', 'case', 'switch', 'do'
        ];
        const type = keywords.includes(value) ? 'KEYWORD' : 'IDENTIFIER';
        this.tokens.push(new Token(type, value, this.line, startCol));
        atLineStart = false;
        continue;
      }

      const threeChar = ch + this.peek(1) + this.peek(2);
      if (['===', '!==', '**=', '//=', '>>>', '<<=', '>>='].includes(threeChar)) {
        this.advance();
        this.advance();
        this.advance();
        this.tokens.push(new Token('OPERATOR', threeChar, this.line, startCol));
        atLineStart = false;
        continue;
      }

      const twoChar = ch + this.peek(1);
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', 
           '*=', '/=', '%=', '**', '//', '<<', '>>', '&=', '|=', '^=',
           '=>', '..', '?.'].includes(twoChar)) {
        this.advance();
        this.advance();
        this.tokens.push(new Token('OPERATOR', twoChar, this.line, startCol));
        atLineStart = false;
        continue;
      }

      if ('+-*/%=<>!&|^~'.includes(ch)) {
        this.tokens.push(new Token('OPERATOR', ch, this.line, this.col));
        this.advance();
        atLineStart = false;
        continue;
      }

      if ('(){}[]'.includes(ch)) {
        this.tokens.push(new Token('BRACKET', ch, this.line, this.col));
        this.advance();
        atLineStart = false;
        continue;
      }

      if ('.,;:?@'.includes(ch)) {
        this.tokens.push(new Token('PUNCTUATION', ch, this.line, this.col));
        this.advance();
        atLineStart = false;
        continue;
      }

      this.advance();
      atLineStart = false;
    }

    while (indentStack.length > 1) {
      indentStack.pop();
      this.tokens.push(new Token('DEDENT', 0, this.line, this.col));
    }

    this.tokens.push(new Token('EOF', '', this.line, this.col));
    return this.tokens;
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.tokens.length ? this.tokens[idx] : this.tokens[this.tokens.length - 1];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  skipNewlines() {
    while (this.peek().type === 'NEWLINE') {
      this.advance();
    }
  }

  expect(type, value = null) {
    const token = this.peek();
    if (token.type !== type || (value !== null && token.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` '${value}'` : ''} but got ${token.type} '${token.value}' at line ${token.line}:${token.col}`);
    }
    return this.advance();
  }

  parse() {
    const statements = [];
    this.skipNewlines();
    
    while (this.peek().type !== 'EOF') {
      try {
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
        this.skipNewlines();
      } catch (error) {
        throw error;
      }
    }
    
    return { type: 'Program', body: statements };
  }

  parseStatement() {
    this.skipNewlines();
    const token = this.peek();

    if (token.type === 'EOF') return null;

    if (token.type === 'KEYWORD') {
      switch (token.value) {
        case 'def': return this.parseFunctionDef();
        case 'class': return this.parseClassDef();
        case 'for': return this.parseForLoop();
        case 'if': return this.parseIfStatement();
        case 'while': return this.parseWhileLoop();
        case 'return': return this.parseReturn();
        case 'import': return this.parseImport();
        case 'from': return this.parseFromImport();
        case 'try': return this.parseTryExcept();
        case 'raise': return this.parseRaise();
        case 'assert': return this.parseAssert();
        case 'with': return this.parseWith();
        case 'pass': this.advance(); return { type: 'PassStatement' };
        case 'break': this.advance(); return { type: 'BreakStatement' };
        case 'continue': this.advance(); return { type: 'ContinueStatement' };
        case 'lambda': return this.parseLambda();
        case 'async': return this.parseAsync();
        case 'await': return this.parseAwait();
        case 'del': return this.parseDelete();
        case 'global': return this.parseGlobal();
        case 'yield': return this.parseYield();
        case 'print': return this.parsePrint();
      }
    }

    return this.parseExpressionStatement();
  }

  parseFunctionDef() {
    this.advance();
    const name = this.expect('IDENTIFIER').value;
    
    this.expect('BRACKET', '(');
    const params = this.parseParameters();
    this.expect('BRACKET', ')');
    
    let returnType = null;
    if (this.peek().type === 'OPERATOR' && this.peek().value === '->') {
      this.advance();
      returnType = this.parseType();
    }
    
    if (this.peek().value === ':') {
      this.advance();
    }
    
    const body = this.parseBlock();
    
    return {
      type: 'FunctionDeclaration',
      name,
      params,
      returnType,
      body
    };
  }

  parseParameters() {
    const params = [];
    
    while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
      if (this.peek().value === '*') {
        this.advance();
        if (this.peek().value === '*') {
          this.advance();
          params.push({
            name: this.expect('IDENTIFIER').value,
            spread: 'dict'
          });
        } else {
          params.push({
            name: this.expect('IDENTIFIER').value,
            spread: 'array'
          });
        }
      } else {
        const name = this.expect('IDENTIFIER').value;
        let defaultValue = null;
        
        if (this.peek().value === '=') {
          this.advance();
          defaultValue = this.parseExpression();
        }
        
        params.push({ name, defaultValue });
      }
      
      if (this.peek().value === ',') {
        this.advance();
      }
    }
    
    return params;
  }

  parseType() {
    return this.expect('IDENTIFIER').value;
  }

  parseClassDef() {
    this.advance();
    const name = this.expect('IDENTIFIER').value;
    
    let superClass = null;
    if (this.peek().value === '(') {
      this.advance();
      superClass = this.expect('IDENTIFIER').value;
      this.expect('BRACKET', ')');
    }
    
    if (this.peek().value === ':') {
      this.advance();
    }
    
    this.skipNewlines();
    if (this.peek().type === 'INDENT') {
      this.expect('INDENT');
    }
    
    const methods = [];
    const properties = [];
    
    while (this.peek().type !== 'DEDENT' && this.peek().type !== 'EOF') {
      if (this.peek().value === 'def') {
        methods.push(this.parseFunctionDef());
      } else if (this.peek().value === '@') {
        const decorator = this.parseDecorator();
        if (this.peek().value === 'def') {
          const method = this.parseFunctionDef();
          method.decorator = decorator;
          methods.push(method);
        }
      } else {
        const stmt = this.parseStatement();
        if (stmt) properties.push(stmt);
      }
      this.skipNewlines();
    }
    
    if (this.peek().type === 'DEDENT') {
      this.advance();
    }
    
    return {
      type: 'ClassDeclaration',
      name,
      superClass,
      methods,
      properties
    };
  }

  parseDecorator() {
    this.expect('PUNCTUATION', '@');
    const name = this.expect('IDENTIFIER').value;
    this.skipNewlines();
    return name;
  }

  parseForLoop() {
    this.advance();
    
    const variables = [];
    variables.push(this.expect('IDENTIFIER').value);
    
    while (this.peek().value === ',') {
      this.advance();
      variables.push(this.expect('IDENTIFIER').value);
    }
    
    this.expect('KEYWORD', 'in');
    const iterable = this.parseExpression();
    
    if (this.peek().value === ':') {
      this.advance();
    }
    
    const body = this.parseBlock();
    
    return {
      type: 'ForInLoop',
      variables,
      iterable,
      body
    };
  }

  parseIfStatement() {
    this.advance();
    const condition = this.parseExpression();
    
    if (this.peek().value === ':') {
      this.advance();
    }
    
    const consequent = this.parseBlock();
    
    let alternate = null;
    if (this.peek().value === 'elif') {
      alternate = this.parseIfStatement();
    } else if (this.peek().value === 'else') {
      this.advance();
      if (this.peek().value === ':') {
        this.advance();
      }
      alternate = this.parseBlock();
    }
    
    return {
      type: 'IfStatement',
      condition,
      consequent,
      alternate
    };
  }

  parseWhileLoop() {
    this.advance();
    const condition = this.parseExpression();
    
    if (this.peek().value === ':') {
      this.advance();
    }
    
    const body = this.parseBlock();
    
    return {
      type: 'WhileLoop',
      condition,
      body
    };
  }

  parseTryExcept() {
    this.advance();
    if (this.peek().value === ':') {
      this.advance();
    }
    
    const tryBlock = this.parseBlock();
    
    const handlers = [];
    while (this.peek().value === 'except') {
      this.advance();
      
      let errorType = null;
      let errorName = null;
      
      if (this.peek().type === 'IDENTIFIER') {
        errorType = this.expect('IDENTIFIER').value;
        
        if (this.peek().value === 'as') {
          this.advance();
          errorName = this.expect('IDENTIFIER').value;
        }
      }
      
      if (this.peek().value === ':') {
        this.advance();
      }
      
      const handler = this.parseBlock();
      handlers.push({ errorType, errorName, body: handler });
    }
    
    let finallyBlock = null;
    if (this.peek().value === 'finally') {
      this.advance();
      if (this.peek().value === ':') {
        this.advance();
      }
      finallyBlock = this.parseBlock();
    }
    
    return {
      type: 'TryStatement',
      tryBlock,
      handlers,
      finallyBlock
    };
  }

  parseRaise() {
    this.advance();
    const error = this.parseExpression();
    return {
      type: 'RaiseStatement',
      error
    };
  }

  parseAssert() {
    this.advance();
    const condition = this.parseExpression();
    let message = null;
    
    if (this.peek().value === ',') {
      this.advance();
      message = this.parseExpression();
    }
    
    return {
      type: 'AssertStatement',
      condition,
      message
    };
  }

  parseWith() {
    this.advance();
    const context = this.parseExpression();
    
    let alias = null;
    if (this.peek().value === 'as') {
      this.advance();
      alias = this.expect('IDENTIFIER').value;
    }
    
    if (this.peek().value === ':') {
      this.advance();
    }
    
    const body = this.parseBlock();
    
    return {
      type: 'WithStatement',
      context,
      alias,
      body
    };
  }

  parseLambda() {
    this.advance();
    const params = [];
    
    while (this.peek().value !== ':' && this.peek().type !== 'EOF') {
      if (this.peek().type === 'IDENTIFIER') {
        params.push(this.expect('IDENTIFIER').value);
      }
      if (this.peek().value === ',') {
        this.advance();
      }
    }
    
    if (this.peek().value === ':') {
      this.expect('PUNCTUATION', ':');
    }
    const body = this.parseExpression();
    
    return {
      type: 'LambdaExpression',
      params,
      body
    };
  }

  parseAsync() {
    this.advance();
    const func = this.parseFunctionDef();
    func.isAsync = true;
    return func;
  }

  parseAwait() {
    this.advance();
    const expression = this.parseExpression();
    return {
      type: 'AwaitExpression',
      expression
    };
  }

  parseDelete() {
    this.advance();
    const target = this.parseExpression();
    return {
      type: 'DeleteStatement',
      target
    };
  }

  parseGlobal() {
    this.advance();
    const variables = [];
    variables.push(this.expect('IDENTIFIER').value);
    
    while (this.peek().value === ',') {
      this.advance();
      variables.push(this.expect('IDENTIFIER').value);
    }
    
    return {
      type: 'GlobalStatement',
      variables
    };
  }

  parseYield() {
    this.advance();
    let value = null;
    if (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF') {
      value = this.parseExpression();
    }
    return {
      type: 'YieldExpression',
      value
    };
  }

  parseImport() {
    this.advance();
    const modules = [];
    
    do {
      const module = this.expect('IDENTIFIER').value;
      let alias = null;
      
      if (this.peek().value === 'as') {
        this.advance();
        alias = this.expect('IDENTIFIER').value;
      }
      
      modules.push({ module, alias });
      
      if (this.peek().value === ',') {
        this.advance();
      } else {
        break;
      }
    } while (true);
    
    return {
      type: 'ImportStatement',
      modules
    };
  }

  parseFromImport() {
    this.advance();
    const module = this.expect('IDENTIFIER').value;
    this.expect('KEYWORD', 'import');
    
    const imports = [];
    
    if (this.peek().value === '*') {
      this.advance();
      imports.push({ name: '*', alias: null });
    } else {
      do {
        const name = this.expect('IDENTIFIER').value;
        let alias = null;
        
        if (this.peek().value === 'as') {
          this.advance();
          alias = this.expect('IDENTIFIER').value;
        }
        
        imports.push({ name, alias });
        
        if (this.peek().value === ',') {
          this.advance();
        } else {
          break;
        }
      } while (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF');
    }
    
    return {
      type: 'FromImportStatement',
      module,
      imports
    };
  }

  parseReturn() {
    this.advance();
    
    if (this.peek().type === 'NEWLINE' || this.peek().type === 'EOF') {
      return { type: 'ReturnStatement', value: null };
    }
    
    const value = this.parseExpression();
    return {
      type: 'ReturnStatement',
      value
    };
  }

  parsePrint() {
    this.advance();
    
    const args = [];
    let hasParens = false;
    
    if (this.peek().value === '(') {
      hasParens = true;
      this.advance();
    }
    
    if (hasParens) {
      while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
        args.push(this.parseExpression());
        if (this.peek().value === ',') {
          this.advance();
        }
      }
      
      if (this.peek().value === ')') {
        this.advance();
      }
    } else {
      while (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF' && this.peek().value !== ':') {
        args.push(this.parseExpression());
        if (this.peek().value === ',') {
          this.advance();
        } else {
          break;
        }
      }
    }
    
    return {
      type: 'PrintStatement',
      arguments: args
    };
  }

  parseBlock() {
    this.skipNewlines();
    
    if (this.peek().type !== 'INDENT') {
      const stmt = this.parseStatement();
      return stmt ? [stmt] : [];
    }
    
    this.advance();
    
    const statements = [];
    while (this.peek().type !== 'DEDENT' && this.peek().type !== 'EOF') {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
      this.skipNewlines();
    }
    
    if (this.peek().type === 'DEDENT') {
      this.advance();
    }
    
    return statements;
  }

  parseExpressionStatement() {
    const expr = this.parseExpression();
    return {
      type: 'ExpressionStatement',
      expression: expr
    };
  }

  parseExpression() {
    const tokens = [];
    let depth = 0;
    
    while (this.peek().type !== 'EOF') {
      const token = this.peek();
      
      if (depth === 0) {
        if (token.type === 'NEWLINE' || token.type === 'INDENT' || token.type === 'DEDENT') {
          break;
        }
        if (token.value === ':' && token.type === 'PUNCTUATION') {
          break;
        }
      }
      
      if (token.value === '(' || token.value === '[' || token.value === '{') {
        depth++;
      }
      if (token.value === ')' || token.value === ']' || token.value === '}') {
        depth--;
        if (depth < 0) break;
      }
      
      if (depth === 0 && token.value === ',' && token.type === 'PUNCTUATION') {
        break;
      }
      
      tokens.push(this.advance());
    }
    
    return {
      type: 'Expression',
      tokens
    };
  }
}

class CodeGenerator {
  constructor(ast) {
    this.ast = ast;
    this.indentLevel = 0;
  }

  indent() {
    return '  '.repeat(this.indentLevel);
  }

  generate() {
    return this.generateProgram(this.ast);
  }

  generateProgram(node) {
    const lines = [];
    for (const stmt of node.body) {
      const code = this.generateStatement(stmt);
      if (code) lines.push(code);
    }
    return lines.join('\n');
  }

  generateStatement(node) {
    if (!node) return '';
    
    switch (node.type) {
      case 'FunctionDeclaration':
        return this.generateFunction(node);
      case 'ClassDeclaration':
        return this.generateClass(node);
      case 'ForInLoop':
        return this.generateForIn(node);
      case 'IfStatement':
        return this.generateIf(node);
      case 'WhileLoop':
        return this.generateWhile(node);
      case 'TryStatement':
        return this.generateTry(node);
      case 'WithStatement':
        return this.generateWith(node);
      case 'ReturnStatement':
        return this.generateReturn(node);
      case 'RaiseStatement':
        return this.generateRaise(node);
      case 'AssertStatement':
        return this.generateAssert(node);
      case 'PrintStatement':
        return this.generatePrint(node);
      case 'ImportStatement':
        return this.generateImport(node);
      case 'FromImportStatement':
        return this.generateFromImport(node);
      case 'PassStatement':
        return '';
      case 'BreakStatement':
        return this.indent() + 'break;';
      case 'ContinueStatement':
        return this.indent() + 'continue;';
      case 'DeleteStatement':
        return this.indent() + 'delete ' + this.generateExpression(node.target) + ';';
      case 'GlobalStatement':
        return '';
      case 'LambdaExpression':
        return this.indent() + this.generateLambda(node) + ';';
      case 'AwaitExpression':
        return this.indent() + 'await ' + this.generateExpression(node.expression) + ';';
      case 'YieldExpression':
        const yieldVal = node.value ? this.generateExpression(node.value) : '';
        return this.indent() + 'yield' + (yieldVal ? ' ' + yieldVal : '') + ';';
      case 'ExpressionStatement':
        const expr = this.generateExpression(node.expression);
        return expr ? this.indent() + expr + ';' : '';
      default:
        return '';
    }
  }

  generateFunction(node) {
    const params = node.params.map(p => {
      if (p.spread === 'array') return '...' + p.name;
      if (p.spread === 'dict') return '...' + p.name;
      if (p.defaultValue) {
        return p.name + ' = ' + this.generateExpression(p.defaultValue);
      }
      return p.name;
    }).join(', ');
    
    const asyncKeyword = node.isAsync ? 'async ' : '';
    
    let result = this.indent() + `${asyncKeyword}function ${node.name}(${params}) {\n`;
    this.indentLevel++;
    
    for (const stmt of node.body) {
      const code = this.generateStatement(stmt);
      if (code) result += code + '\n';
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    return result;
  }

  generateClass(node) {
    const extendsClause = node.superClass ? ` extends ${node.superClass}` : '';
    let result = this.indent() + `class ${node.name}${extendsClause} {\n`;
    this.indentLevel++;
    
    for (const prop of node.properties) {
      const code = this.generateStatement(prop);
      if (code) result += code + '\n';
    }
    
    for (const method of node.methods) {
      const isConstructor = method.name === '__init__';
      const isStatic = method.decorator === 'staticmethod';
      const isGetter = method.decorator === 'property';
      
      const methodName = isConstructor ? 'constructor' : method.name;
      const staticKeyword = isStatic ? 'static ' : '';
      const getterKeyword = isGetter ? 'get ' : '';
      
      const params = method.params.map(p => {
        if (p.spread === 'array') return '...' + p.name;
        if (p.spread === 'dict') return '...' + p.name;
        if (p.defaultValue) {
          return p.name + ' = ' + this.generateExpression(p.defaultValue);
        }
        return p.name;
      }).filter(p => p !== 'self').join(', ');
      
      result += this.indent() + `${staticKeyword}${getterKeyword}${methodName}(${params}) {\n`;
      this.indentLevel++;
      
      for (const stmt of method.body) {
        const code = this.generateStatement(stmt);
        if (code) result += code + '\n';
      }
      
      this.indentLevel--;
      result += this.indent() + '}\n\n';
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    return result;
  }

  generateForIn(node) {
    if (node.variables.length === 1) {
      const varName = node.variables[0];
      const iterable = this.generateExpression(node.iterable);
      
      let result = this.indent() + `for (const ${varName} of ${iterable}) {\n`;
      this.indentLevel++;
      
      for (const stmt of node.body) {
        const code = this.generateStatement(stmt);
        if (code) result += code + '\n';
      }
      
      this.indentLevel--;
      result += this.indent() + '}';
      return result;
    } else {
      const varNames = node.variables.join(', ');
      const iterable = this.generateExpression(node.iterable);
      
      let result = this.indent() + `for (const [${varNames}] of ${iterable}) {\n`;
      this.indentLevel++;
      
      for (const stmt of node.body) {
        const code = this.generateStatement(stmt);
        if (code) result += code + '\n';
      }
      
      this.indentLevel--;
      result += this.indent() + '}';
      return result;
    }
  }

  generateIf(node) {
    const condition = this.generateExpression(node.condition);
    let result = this.indent() + `if (${condition}) {\n`;
    this.indentLevel++;
    
    for (const stmt of node.consequent) {
      const code = this.generateStatement(stmt);
      if (code) result += code + '\n';
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    
    if (node.alternate) {
      if (Array.isArray(node.alternate)) {
        result += ' else {\n';
        this.indentLevel++;
        
        for (const stmt of node.alternate) {
          const code = this.generateStatement(stmt);
          if (code) result += code + '\n';
        }
        
        this.indentLevel--;
        result += this.indent() + '}';
      } else {
        result += ' else ' + this.generateIf(node.alternate).trim();
      }
    }
    
    return result;
  }

  generateWhile(node) {
    const condition = this.generateExpression(node.condition);
    let result = this.indent() + `while (${condition}) {\n`;
    this.indentLevel++;
    
    for (const stmt of node.body) {
      const code = this.generateStatement(stmt);
      if (code) result += code + '\n';
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    return result;
  }

  generateTry(node) {
    let result = this.indent() + 'try {\n';
    this.indentLevel++;
    
    for (const stmt of node.tryBlock) {
      const code = this.generateStatement(stmt);
      if (code) result += code + '\n';
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    
    for (const handler of node.handlers) {
      const errorName = handler.errorName || 'error';
      result += ` catch (${errorName}) {\n`;
      this.indentLevel++;
      
      for (const stmt of handler.body) {
        const code = this.generateStatement(stmt);
        if (code) result += code + '\n';
      }
      
      this.indentLevel--;
      result += this.indent() + '}';
    }
    
    if (node.finallyBlock) {
      result += ' finally {\n';
      this.indentLevel++;
      
      for (const stmt of node.finallyBlock) {
        const code = this.generateStatement(stmt);
        if (code) result += code + '\n';
      }
      
      this.indentLevel--;
      result += this.indent() + '}';
    }
    
    return result;
  }

  generateWith(node) {
    const context = this.generateExpression(node.context);
    const alias = node.alias || 'ctx';
    
    let result = this.indent() + `{\n`;
    this.indentLevel++;
    result += this.indent() + `const ${alias} = ${context};\n`;
    
    for (const stmt of node.body) {
      const code = this.generateStatement(stmt);
      if (code) result += code + '\n';
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    return result;
  }

  generateReturn(node) {
    if (!node.value) {
      return this.indent() + 'return;';
    }
    return this.indent() + 'return ' + this.generateExpression(node.value) + ';';
  }

  generateRaise(node) {
    return this.indent() + 'throw ' + this.generateExpression(node.error) + ';';
  }

  generateAssert(node) {
    const condition = this.generateExpression(node.condition);
    const message = node.message ? this.generateExpression(node.message) : '"Assertion failed"';
    return this.indent() + `if (!(${condition})) throw new Error(${message});`;
  }

  generatePrint(node) {
    const args = node.arguments.map(arg => this.generateExpression(arg)).join(', ');
    return this.indent() + `console.log(${args});`;
  }

  generateImport(node) {
    const imports = node.modules.map(m => {
      if (m.alias) {
        return `import * as ${m.alias} from '${m.module}';`;
      }
      return `import ${m.module} from '${m.module}';`;
    });
    return this.indent() + imports.join('\n' + this.indent());
  }

  generateFromImport(node) {
    const imports = node.imports.map(i => {
      if (i.name === '*') {
        return `* from '${node.module}'`;
      }
      if (i.alias) {
        return `${i.name} as ${i.alias}`;
      }
      return i.name;
    }).join(', ');
    
    if (node.imports[0] && node.imports[0].name === '*') {
      return this.indent() + `import ${imports};`;
    }
    
    return this.indent() + `import { ${imports} } from '${node.module}';`;
  }

  generateLambda(node) {
    const params = node.params.join(', ');
    const body = this.generateExpression(node.body);
    return `(${params}) => ${body}`;
  }

  generateExpression(node) {
    if (!node || !node.tokens) return '';
    
    let result = '';
    let i = 0;
    
    while (i < node.tokens.length) {
      const token = node.tokens[i];
      
      if (token.type === 'FSTRING') {
        let processed = token.value.replace(/\{([^}]+)\}/g, '${$1}');
        result += '`' + processed + '`';
      } else if (token.type === 'STRING') {
        result += '"' + token.value.replace(/"/g, '\\"') + '"';
      } else if (token.type === 'TEMPLATE') {
        result += '`' + token.value + '`';
      } else if (token.type === 'KEYWORD') {
        if (token.value === 'None') {
          result += 'null';
        } else if (token.value === 'True') {
          result += 'true';
        } else if (token.value === 'False') {
          result += 'false';
        } else if (token.value === 'and') {
          result += ' && ';
        } else if (token.value === 'or') {
          result += ' || ';
        } else if (token.value === 'not') {
          result += '!';
        } else if (token.value === 'is') {
          result += ' === ';
        } else if (token.value === 'in') {
          result += ' in ';
        } else if (token.value === 'lambda') {
          const lambdaTokens = [];
          i++;
          while (i < node.tokens.length) {
            lambdaTokens.push(node.tokens[i]);
            i++;
          }
          
          const colonIndex = lambdaTokens.findIndex(t => t.value === ':');
          const params = lambdaTokens.slice(0, colonIndex).filter(t => t.type === 'IDENTIFIER').map(t => t.value).join(', ');
          const bodyTokens = lambdaTokens.slice(colonIndex + 1);
          const body = this.generateExpression({ type: 'Expression', tokens: bodyTokens });
          
          result += `(${params}) => ${body}`;
          break;
        } else if (token.value === 'len') {
          if (i + 1 < node.tokens.length && node.tokens[i + 1].value === '(') {
            i++;
            i++;
            const argTokens = [];
            let depth = 1;
            while (i < node.tokens.length && depth > 0) {
              if (node.tokens[i].value === '(') depth++;
              if (node.tokens[i].value === ')') depth--;
              if (depth > 0) argTokens.push(node.tokens[i]);
              i++;
            }
            i--;
            const arg = this.generateExpression({ type: 'Expression', tokens: argTokens });
            result += arg + '.length';
          } else {
            result += 'length';
          }
        } else if (token.value === 'range') {
          i++;
          if (i < node.tokens.length && node.tokens[i].value === '(') {
            i++;
            const rangeArgs = [];
            let depth = 1;
            while (i < node.tokens.length && depth > 0) {
              if (node.tokens[i].value === '(') depth++;
              if (node.tokens[i].value === ')') depth--;
              if (depth > 0) rangeArgs.push(node.tokens[i]);
              i++;
            }
            i--;
            
            const args = [];
            let currentArg = [];
            for (const t of rangeArgs) {
              if (t.value === ',') {
                if (currentArg.length > 0) {
                  args.push(this.generateExpression({ type: 'Expression', tokens: currentArg }));
                  currentArg = [];
                }
              } else {
                currentArg.push(t);
              }
            }
            if (currentArg.length > 0) {
              args.push(this.generateExpression({ type: 'Expression', tokens: currentArg }));
            }
            
            if (args.length === 1) {
              result += `Array.from({length: ${args[0]}}, (_, i) => i)`;
            } else if (args.length === 2) {
              result += `Array.from({length: ${args[1]} - ${args[0]}}, (_, i) => i + ${args[0]})`;
            } else if (args.length === 3) {
              result += `Array.from({length: Math.ceil((${args[1]} - ${args[0]}) / ${args[2]})}, (_, i) => ${args[0]} + i * ${args[2]})`;
            }
          }
        } else if (token.value === 'enumerate') {
          i++;
          if (i < node.tokens.length && node.tokens[i].value === '(') {
            i++;
            const argTokens = [];
            let depth = 1;
            while (i < node.tokens.length && depth > 0) {
              if (node.tokens[i].value === '(') depth++;
              if (node.tokens[i].value === ')') depth--;
              if (depth > 0) argTokens.push(node.tokens[i]);
              i++;
            }
            i--;
            const arg = this.generateExpression({ type: 'Expression', tokens: argTokens });
            result += `${arg}.map((item, index) => [index, item])`;
          }
        } else {
          result += token.value;
        }
      } else if (token.type === 'IDENTIFIER') {
        if (token.value === 'self') {
          result += 'this';
        } else {
          result += token.value;
        }
      } else if (token.type === 'PUNCTUATION' && token.value === '.') {
        result += token.value;
        if (i + 1 < node.tokens.length && node.tokens[i + 1].type === 'IDENTIFIER') {
          const nextMethod = node.tokens[i + 1].value;
          const pythonMethods = {
            'append': 'push',
            'extend': 'push',
            'upper': 'toUpperCase',
            'lower': 'toLowerCase',
            'strip': 'trim',
            'lstrip': 'trimStart',
            'rstrip': 'trimEnd',
            'startswith': 'startsWith',
            'endswith': 'endsWith',
            'find': 'indexOf',
            'index': 'indexOf',
            'keys': 'keys',
            'values': 'values',
            'items': 'entries'
          };
          
          if (pythonMethods[nextMethod]) {
            result += pythonMethods[nextMethod];
            i++;
          }
        }
      } else if (token.type === 'OPERATOR') {
        if (token.value === '**') {
          result += ' ** ';
        } else if (token.value === '//') {
          result += ' / ';
          const remaining = [];
          i++;
          while (i < node.tokens.length) {
            remaining.push(node.tokens[i]);
            i++;
          }
          const rest = this.generateExpression({ type: 'Expression', tokens: remaining });
          result = 'Math.floor(' + result + rest + ')';
          break;
        } else {
          result += token.value;
        }
      } else {
        result += token.value;
      }
      
      i++;
    }
    
    return result.trim();
  }
}

class IndentScript {
  transpile(code) {
    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      const generator = new CodeGenerator(ast);
      const output = generator.generate();
      
      return output;
    } catch (error) {
      throw new Error(`IndentScript Error at line ${error.line || 'unknown'}: ${error.message}`);
    }
  }

  execute(code) {
    const jsCode = this.transpile(code);
    
    try {
      eval(jsCode);
    } catch (error) {
      throw new Error(`Execution Error: ${error.message}`);
    }
  }

  transpileFile(inputPath, outputPath = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`File not found: ${inputPath}`);
    }
    
    const code = fs.readFileSync(inputPath, 'utf8');
    const jsCode = this.transpile(code);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, jsCode, 'utf8');
      return outputPath;
    } else {
      const parsedPath = path.parse(inputPath);
      const defaultOutput = path.join(parsedPath.dir, parsedPath.name + '.js');
      fs.writeFileSync(defaultOutput, jsCode, 'utf8');
      return defaultOutput;
    }
  }

  executeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const code = fs.readFileSync(filePath, 'utf8');
    this.execute(code);
  }
}

function showHelp() {
  console.log('IndentScript v2.8.0 - Pythonic JavaScript Superset');
  console.log('');
  console.log('Usage:');
  console.log('  node indentscript.js --transpile <file.isc> [output.js]');
  console.log('  node indentscript.js --execute <file.isc>');
  console.log('  node indentscript.js --version');
  console.log('  node indentscript.js --help');
  console.log('');
  console.log('Options:');
  console.log('  --transpile, -t    Transpile .isc file to JavaScript');
  console.log('  --execute, -e      Execute .isc file directly');
  console.log('  --version, -v      Show version information');
  console.log('  --help, -h         Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node indentscript.js --transpile script.isc');
  console.log('  node indentscript.js --transpile script.isc output.js');
  console.log('  node indentscript.js --execute script.isc');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const indentScript = new IndentScript();
  const command = args[0];

  try {
    if (command === '--version' || command === '-v') {
      console.log('IndentScript v2.8.0');
      process.exit(0);
    } else if (command === '--help' || command === '-h') {
      showHelp();
      process.exit(0);
    } else if (command === '--transpile' || command === '-t') {
      if (!args[1]) {
        console.error('Error: No input file specified');
        process.exit(1);
      }

      const inputFile = args[1];
      const outputFile = args[2] || null;

      const output = indentScript.transpileFile(inputFile, outputFile);
      console.log(`✓ Transpiled successfully: ${inputFile} → ${output}`);
      
    } else if (command === '--execute' || command === '-e') {
      if (!args[1]) {
        console.error('Error: No input file specified');
        process.exit(1);
      }

      const inputFile = args[1];
      indentScript.executeFile(inputFile);
      
    } else {
      console.error(`Error: Unknown command '${command}'`);
      console.log('Run "node indentscript.js --help" for usage information');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
