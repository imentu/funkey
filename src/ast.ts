import {Token} from './Token'

export interface Node {
    tokenLiteral: string
}

export interface Statement extends Node {
}

export interface Expression extends Node {
}

export class Program implements Node {
    private readonly _statements: Statement[] = []

    get tokenLiteral(): string {
        let result = ''

        for (const statement of this._statements) {
            result += statement.tokenLiteral
            result += '\n'
        }

        return result
    }

    get statements(): Statement[] {
        return Array.from(this._statements)
    }

    appendStatement(statement: Statement) {
        this._statements.push(statement)
    }

    toString(): string {
        let result = ''

        for (const statement of this._statements) {
            result += `${statement.toString()}\n`
        }

        return result
    }
}

export class IntegerLiteral implements Expression {
    private readonly token: Token
    readonly value: number

    constructor(token: Token, value: number) {
        this.token = token
        this.value = value
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return this.value.toString()
    }
}

export class BooleanLiteral implements Expression {
    private readonly token: Token
    readonly value: boolean

    constructor(token: Token, value: boolean) {
        this.token = token
        this.value = value
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return this.value.toString()
    }
}

export class Identifier implements Expression {
    private readonly token: Token
    readonly value: string

    constructor(token: Token, value: string) {
        this.token = token
        this.value = value
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return this.value
    }
}

export class FunctionLiteral implements Expression {
    private readonly token: Token

    readonly parameters: Identifier[]
    readonly body: BlockStatement

    constructor(token: Token, parameters: Identifier[], body: BlockStatement) {
        this.token = token
        this.parameters = parameters
        this.body = body
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return `fn (${this.parameters.join(', ')}) {
\t${this.body.statements.join('\n\t')}
}`
    }
}

export class CallExpression implements Expression {
    private readonly token: Token

    readonly fn: Expression
    readonly args: Expression[]

    constructor(token: Token, fn: Expression, args: Expression[]) {
        this.token = token
        this.fn = fn
        this.args = args
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return `${this.fn}(${this.args.join(', ')})`
    }
}

export class PrefixExpression implements Expression {
    private readonly token: Token

    readonly operator: string
    readonly value: Expression

    constructor(token: Token, operator: string, value: Expression) {
        this.token = token
        this.operator = operator
        this.value = value
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return `(${this.operator}${this.value})`
    }
}

export class InfixExpression implements Expression {
    private readonly token: Token

    readonly left: Expression
    readonly operator: string
    readonly right: Expression

    constructor(token: Token, left: Expression, operator: string, right: Expression) {
        this.token = token
        this.left = left
        this.operator = operator
        this.right = right
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return `(${this.left} ${this.operator} ${this.right})`
    }
}

export class IfExpression implements Expression {
    private readonly token: Token

    readonly condition: Expression
    readonly consequence: BlockStatement
    readonly alternative: BlockStatement | undefined

    constructor(token: Token, condition: Expression, consequence: BlockStatement, alternative: BlockStatement | undefined = undefined) {
        this.token = token
        this.condition = condition
        this.consequence = consequence
        this.alternative = alternative
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        let result = `if (${this.condition}) ${this.consequence}`
        if (this.alternative) {
            result += ` else ${this.alternative}`
        }
        return result
    }
}

export class BlockStatement implements Statement {
    private readonly token: Token

    readonly statements: Statement[] = []

    constructor(token: Token) {
        this.token = token
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    addStatement(statement: Statement) {
        this.statements.push(statement)
    }

    toString(): string {
        return this.statements.join('\n')
    }
}

export class LetStatement implements Statement {
    private readonly token: Token

    readonly identifier: Identifier
    readonly expression: Expression | undefined

    constructor(token: Token, identifier: Identifier, expression: Expression | undefined = undefined) {
        this.token = token
        this.identifier = identifier
        this.expression = expression
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        let result = `let ${this.identifier.value}`

        if (this.expression) {
            result = `${result} = ${this.expression}`
        }

        return `${result};`
    }
}

export class ReturnStatement implements Statement {
    private readonly token: Token

    readonly expression: Expression | undefined

    constructor(token: Token, expression: Expression | undefined = undefined) {
        this.token = token
        this.expression = expression
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return `return${this.expression ? ' ' + this.expression : ''};`
    }
}

export class ExpressionStatement implements Statement {
    private readonly token: Token

    readonly expression: Expression | undefined

    constructor(token: Token, expression: Expression | undefined = undefined) {
        this.token = token
        this.expression = expression
    }

    get tokenLiteral(): string {
        return this.token.literal
    }

    toString(): string {
        return `${this.expression};`
    }
}