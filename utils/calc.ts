// Safe arithmetic evaluator for amount inputs.
// Lets the user type "120+35*2" straight into the amount field instead of
// switching to a calculator app. No eval() / Function() - a small shunting-yard
// parser that only accepts numbers, + - * / and parentheses.

const OPERATORS: Record<string, { prec: number; apply: (a: number, b: number) => number }> = {
    '+': { prec: 1, apply: (a, b) => a + b },
    '-': { prec: 1, apply: (a, b) => a - b },
    '*': { prec: 2, apply: (a, b) => a * b },
    '/': { prec: 2, apply: (a, b) => a / b },
};

// Accept full-width / mobile-keyboard variants and drop thousands separators.
const normalize = (input: string) => input
    .replace(/[＋]/g, '+')
    .replace(/[－—–ー]/g, '-')
    .replace(/[×✕✖xX＊]/g, '*')
    .replace(/[÷／]/g, '/')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[,，\s]/g, '')
    .replace(/([+\-*/(]|^)\+/g, '$1');

type Token = number | string;

const tokenize = (src: string): Token[] | null => {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        if (/[0-9.]/.test(ch)) {
            let num = '';
            while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++];
            if ((num.match(/\./g) || []).length > 1) return null;
            const value = parseFloat(num);
            if (isNaN(value)) return null;
            tokens.push(value);
            continue;
        }
        if (ch in OPERATORS || ch === '(' || ch === ')') { tokens.push(ch); i++; continue; }
        return null; // anything else -> not a valid expression
    }
    return tokens;
};

/** Returns the value of an arithmetic expression, or null if it is incomplete / invalid. */
export const evaluateExpression = (input: string): number | null => {
    const src = normalize(input || '');
    if (!src) return null;

    const tokens = tokenize(src);
    if (!tokens) return null;

    const values: number[] = [];
    const ops: string[] = [];

    const applyTop = () => {
        const op = ops.pop();
        if (!op || !(op in OPERATORS)) return false;
        const b = values.pop();
        const a = values.pop();
        if (a === undefined || b === undefined) return false;
        if (op === '/' && b === 0) return false;
        values.push(OPERATORS[op].apply(a, b));
        return true;
    };

    let prev: Token | null = null;
    for (const token of tokens) {
        if (typeof token === 'number') {
            if (typeof prev === 'number') return null; // "12 34"
            values.push(token);
        } else if (token === '(') {
            if (typeof prev === 'number') return null; // "12(3)"
            ops.push(token);
        } else if (token === ')') {
            while (ops.length && ops[ops.length - 1] !== '(') { if (!applyTop()) return null; }
            if (ops.pop() !== '(') return null;
        } else {
            // Leading "-" is a sign, not an operator: rewrite "-5" as "0-5".
            const isSign = prev === null || prev === '(' || (typeof prev === 'string' && prev in OPERATORS);
            if (isSign) {
                if (token !== '-') return null;
                values.push(0);
            }
            while (ops.length && ops[ops.length - 1] !== '(' && OPERATORS[ops[ops.length - 1]].prec >= OPERATORS[token].prec) {
                if (!applyTop()) return null;
            }
            ops.push(token);
        }
        prev = token;
    }

    while (ops.length) {
        if (ops[ops.length - 1] === '(') return null;
        if (!applyTop()) return null;
    }
    if (values.length !== 1) return null;

    const result = Math.round(values[0] * 100) / 100;
    return Number.isFinite(result) ? result : null;
};

/** True when the text is more than a plain number, i.e. worth showing a "= result" hint. */
export const isExpression = (input: string) => /[+*/()＋－×÷（）xX]/.test((input || '').trim()) ||
    /\d\s*-/.test((input || '').trim());
