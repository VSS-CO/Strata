package main

import (
	"strings"
	"fmt"
)

// ============================================================================
// LEXER - Tokenization with location tracking
// ============================================================================

type Token struct {
	Value    string
	Location Location
}

type Lexer struct {
	input     string
	pos       int
	line      int
	column    int
	lineStart int
}

func NewLexer(input string) *Lexer {
	return &Lexer{
		input:     input,
		pos:       0,
		line:      1,
		column:    1,
		lineStart: 0,
	}
}

func (l *Lexer) peek() byte {
	if l.pos >= len(l.input) {
		return 0
	}
	return l.input[l.pos]
}

func (l *Lexer) peekNext() byte {
	if l.pos+1 >= len(l.input) {
		return 0
	}
	return l.input[l.pos+1]
}

func (l *Lexer) advance() byte {
	if l.pos >= len(l.input) {
		return 0
	}
	ch := l.input[l.pos]
	l.pos++
	if ch == '\n' {
		l.line++
		l.column = 1
		l.lineStart = l.pos
	} else {
		l.column++
	}
	return ch
}

func (l *Lexer) getLocation() Location {
	end := l.pos
	if end > len(l.input) {
		end = len(l.input)
	}
	return Location{
		Line:   l.line,
		Column: l.column,
		Source: l.input[l.lineStart:end],
	}
}

func (l *Lexer) NextToken() *Token {
	// Skip whitespace and comments
	for l.peek() == ' ' || l.peek() == '\n' || l.peek() == '\r' || l.peek() == '\t' {
		l.advance()
	}

	if l.peek() == '/' && l.peekNext() == '/' {
		for l.peek() != 0 && l.peek() != '\n' {
			l.advance()
		}
		return l.NextToken()
	}

	if l.peek() == 0 {
		return nil
	}

	loc := l.getLocation()

	twoCharOps := []string{"==", "!=", "<=", ">=", "=>", "||", "&&", "++", "--", "::"}
	if l.pos+1 < len(l.input) {
		twoChar := l.input[l.pos : l.pos+2]
		for _, op := range twoCharOps {
			if twoChar == op {
				l.advance()
				l.advance()
				return &Token{Value: twoChar, Location: loc}
			}
		}
	}

	if isAlpha(l.peek()) || l.peek() == '_' {
		var word strings.Builder
		for isAlphaNum(l.peek()) || l.peek() == '_' {
			word.WriteByte(l.advance())
		}
		return &Token{Value: word.String(), Location: loc}
	}

	if l.peek() == '"' {
		l.advance()
		var str strings.Builder
		for l.peek() != 0 && l.peek() != '"' {
			if l.peek() == '\\' {
				l.advance()
				escaped := l.advance()
				if escaped == 'n' {
					str.WriteByte('\n')
				} else if escaped == 't' {
					str.WriteByte('\t')
				} else if escaped == 'r' {
					str.WriteByte('\r')
				} else {
					str.WriteByte(escaped)
				}
			} else {
				str.WriteByte(l.advance())
			}
		}
		if l.peek() == '"' {
			l.advance()
		}
		return &Token{Value: "\"" + str.String() + "\"", Location: loc}
	}

	if isDigit(l.peek()) {
		var num strings.Builder
		for isDigit(l.peek()) || l.peek() == '.' {
			num.WriteByte(l.advance())
		}
		return &Token{Value: num.String(), Location: loc}
	}

	ch := l.advance()
	return &Token{Value: string(ch), Location: loc}
}

func isAlpha(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

func isDigit(c byte) bool {
	return c >= '0' && c <= '9'
}

func isAlphaNum(c byte) bool {
	return isAlpha(c) || isDigit(c)
}
