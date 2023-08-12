export enum TokenType {
    ILLEGAL = 'ILLEGAL',
    EOF = 'EOF',

    IDENT = 'IDENT',
    INT = 'INT',

    ASSIGN = '=',
    PLUS = '+',
    MINUS = '-',
    BANG = '!',
    ASTERISK = '*',
    SLASH = '/',

    LT = '<',
    GT = '>',
    EQ = '==',
    NOT_EQ = '!=',

    COMMA = ',',
    SEMICOLON = ';',

    LPAREN = '(',
    RPAREN = ')',
    LBRACE = '{',
    RBRACE = '}',

    FUNCTION = 'FUNCTION',
    LET = 'LET',
    TRUE = 'TRUE',
    FALSE = 'FALSE',
    IF = 'IF',
    ELSE = 'ELSE',
    RETURN = 'RETURN',
}