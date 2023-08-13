import {
    AstVisitor, BlockStatement,
    BooleanLiteral, CallExpression,
    ExpressionStatement, FunctionLiteral, Identifier, IfExpression, InfixExpression,
    IntegerLiteral, LetStatement,
    Node,
    PrefixExpression,
    Program, ReturnStatement
} from "../ast/ast.ts"
import {Boolean, Function, Integer, Null, Object} from "../object/object.ts"
import {assert} from "vitest"

class ReturnTrap {
    readonly value: Object

    constructor(value: Object) {
        this.value = value
    }
}

export class EvaluatingError extends Error {
    readonly innerError: Error | undefined

    constructor(message: string, innerError: Error | undefined = undefined) {
        super(message)

        this.innerError = innerError
    }
}

export class Environment {
    private readonly variableMap: Map<string, Box<Object>>
    private readonly parent: Environment | undefined

    constructor(parent: Environment | undefined = undefined) {
        this.variableMap = new Map<string, Box<Object>>()
        this.parent = parent
    }

    private getVariableBoxRecursive(identifier: string): Box<Object> | undefined {
        return this.getVariableBox(identifier) ?? this.parent?.getVariableBoxRecursive(identifier)
    }

    private getVariableBox(identifier: string): Box<Object> | undefined {
        return this.variableMap.get(identifier)
    }

    declareVariable(identifier: string) {
        const box = this.getVariableBox(identifier)
        if (box) {
            throw new Error(`identifier has been declared`)
        }

        this.variableMap.set(identifier, new Box<Object>(Null.Instance))
    }

    getVariableValue(identifier: string): Object {
        const box = this.getVariableBoxRecursive(identifier)
        if (!box) {
            throw new Error(`identifier not found: ${identifier}`)
        }

        return box.value
    }

    setVariableValue(identifier: string, value: Object) {
        const box = this.getVariableBoxRecursive(identifier)
        if (!box) {
            throw new Error(`identifier not found: ${identifier}`)
        }

        box.value = value
    }
}

class Box<T> {
    value: T

    constructor(value: T) {
        this.value = value
    }
}

class AstEvaluatorVisitor implements AstVisitor {
    private _result: Object = Null.Instance
    private readonly environment: Environment

    constructor(environment: Environment | undefined = undefined) {
        this.environment = environment ?? new Environment()
    }

    visitProgram(x: Program) {
        try {
            for (const statement of x.statements) {
                statement.accept(this)
            }
        } catch (error) {
            if (error instanceof ReturnTrap) {
                this._result = error.value
            } else if (error instanceof Error) {
                throw new EvaluatingError('evaluating failed', error)
            } else {
                throw new EvaluatingError(`evaluating failed, reason: [${error}]`)
            }
        }
    }

    visitExpressionStatement(x: ExpressionStatement) {
        x.expression!.accept(this)
    }

    visitBlockStatement(x: BlockStatement) {
        for (const statement of x.statements) {
            statement.accept(this)
        }
    }

    visitReturnStatement(x: ReturnStatement) {
        x.expression?.accept(this)
        throw new ReturnTrap(this._result)
    }

    visitLetStatement(x: LetStatement) {
        const identifier = x.identifier.value;
        this.environment.declareVariable(identifier)
        if (x.expression) {
            this.environment.setVariableValue(identifier, evaluate(x.expression, this.environment))
        }
    }

    visitPrefixExpression(x: PrefixExpression) {
        switch (x.operator) {
            case '!':
                evaluateBang(this)
                break
            case '-':
                evaluateMinus(this)
                break
        }

        function evaluateBang(visitor: AstEvaluatorVisitor) {
            const expressionValue = evaluate(x.value, visitor.environment)
            visitor._result = AstEvaluatorVisitor.packNativeValue(!visitor.isTruthy(expressionValue))
        }

        function evaluateMinus(visitor: AstEvaluatorVisitor) {
            const expressionValue = evaluate(x.value, visitor.environment)
            if (expressionValue instanceof Integer) {
                visitor._result = new Integer(-expressionValue.value)
            } else {
                throw new Error(`unknown operator: -${expressionValue.type}`)
            }
        }
    }

    visitInfixExpression(x: InfixExpression) {
        const left = evaluate(x.left, this.environment)
        const right = evaluate(x.right, this.environment)
        switch (x.operator) {
            case '+':
            case '-':
            case '*':
            case '/':
                if (left instanceof Integer && right instanceof Integer) {
                    this._result = evaluateArithmeticExpression(left, x.operator, right)
                    break
                } else {
                    if (left.type !== right.type) {
                        throw new Error(`type mismatch: ${left.type} + ${right.type}`)
                    } else {
                        throw new Error(`unknown operator: ${left.type} + ${right.type}`)
                    }
                }
            case '>':
            case '<':
                assert(left instanceof Integer)
                assert(right instanceof Integer)
                this._result = evaluateComparingExpression(left, x.operator, right)
                break
            case '==':
                this._result = evaluateEquals(left, right)
                break
            case '!=':
                this._result = evaluateEquals(left, right).invert()
                break
        }

        function evaluateArithmeticExpression(left: Integer, operator: '+' | '-' | '*' | '/', right: Integer): Integer {
            switch (operator) {
                case "+":
                    return AstEvaluatorVisitor.packNativeValue(left.value + right.value)
                case "-":
                    return AstEvaluatorVisitor.packNativeValue(left.value - right.value)
                case "*":
                    return AstEvaluatorVisitor.packNativeValue(left.value * right.value)
                case "/":
                    return AstEvaluatorVisitor.packNativeValue(left.value / right.value)
            }
        }

        function evaluateComparingExpression(left: Integer, operator: '>' | '<' | '==' | '!=', right: Integer): Boolean {
            switch (operator) {
                case ">":
                    return AstEvaluatorVisitor.packNativeValue(left.value > right.value)
                case "<":
                    return AstEvaluatorVisitor.packNativeValue(left.value < right.value)
                case "==":
                    return AstEvaluatorVisitor.packNativeValue(left.value == right.value)
                case "!=":
                    return AstEvaluatorVisitor.packNativeValue(left.value != right.value)
            }
        }

        function evaluateEquals(left: Object, right: Object): Boolean {
            return AstEvaluatorVisitor.packNativeValue(left.equals(right))
        }
    }

    visitCallExpression(x: CallExpression) {
        const args = x.args.map(arg => evaluate(arg, this.environment))
        const fn = evaluate(x.fn, this.environment)
        if (!(fn instanceof Function)) {
            throw new Error('it is not a function')
        }

        if (fn.parameters.length !== args.length) {
            throw new Error('arguments count mismatch')
        }

        const environment = new Environment(fn.environment)
        fn.parameters.forEach((parameter, index) => {
            const variableName = parameter.value;
            environment.declareVariable(variableName)
            environment.setVariableValue(variableName, args[index])
        })

        this._result = evaluate(fn.body, environment)
    }

    visitIfExpression(x: IfExpression) {
        const condition = evaluate(x.condition, this.environment)
        if (this.isTruthy(condition)) {
            this._result = evaluate(x.consequence, this.environment)
        } else {
            if (x.alternative) {
                this._result = evaluate(x.alternative, this.environment)
            } else {
                this._result = Null.Instance
            }
        }
    }

    visitBooleanLiteral(x: BooleanLiteral) {
        this._result = x.value ? Boolean.True : Boolean.False
    }

    visitIntegerLiteral(x: IntegerLiteral) {
        this._result = new Integer(x.value)
    }

    visitFunctionLiteral(x: FunctionLiteral) {
        this._result = new Function(x.parameters, x.body, this.environment)
    }

    visitIdentifier(x: Identifier) {
        this._result = this.environment.getVariableValue(x.value)
    }

    get result(): Object {
        return this._result
    }

    private isTruthy(x: Object) {
        if (x instanceof Integer) {
            return x.value !== 0
        } else if (x instanceof Boolean) {
            return x.value
        } else {
            return false
        }
    }

    private static packNativeValue(value: number): Integer
    private static packNativeValue(value: boolean): Boolean
    private static packNativeValue(value: number | boolean): Object {
        if (typeof value === 'number') {
            return new Integer(value)
        } else {
            return value ? Boolean.True : Boolean.False
        }
    }
}

export function evaluate(node: Node, environment: Environment | undefined = undefined): Object {
    const evaluatorVisitor = new AstEvaluatorVisitor(environment)
    node.accept(evaluatorVisitor)
    return evaluatorVisitor.result
}