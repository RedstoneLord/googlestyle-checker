export interface Problem {
    rule: string;
    message: string;
    line: number;
    start: number;
    end: number;
}

interface MaskedLine {
    text: string;
    inBlock: boolean;
}

function masker(line: string, block: boolean): MaskedLine {
    const chars = line.split('');
    let inBlock = block;
    let i = 0;

    while (i < line.length) {
        const next = line.slice(i, i + 2);
        const cur = line[i];

        if (inBlock) {
            if (next == '*/') {
                chars[i] = ' ';
                chars[i + 1] = ' ';
                i += 2;
                inBlock = false;
            } else {
                chars[i] = ' ';
                i++;
            }
        } else if (next == '//') {
            chars.fill(' ', i);
            break;
        } else if (next == '/*') {
            chars[i] = ' ';
            chars[i + 1] = ' ';
            i += 2;
            inBlock = true;
        } else if (cur == '"' || cur == "'") {
            const quote = cur;
            i++;

            while (i < line.length && line[i] !== quote) {
                if (line[i] == '\\') {
                    chars[i] = ' ';
                    i = i + 1;
                }
                if (i < line.length) {
                    chars[i] = ' ';
                    i = i + 1;
                }
            }

            i++;
        } else {
            i++;
        }
    }

    const res: MaskedLine = {
        text: chars.join(''),
        inBlock: inBlock,
    };
    return res;
}

export function mask(lines: string[]): string[] {
    const masked: string[] = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const cur = lines[i];
        const res = masker(cur, inBlock);
        inBlock = res.inBlock;
        masked.push(res.text);
    }

    return masked;
}

const fok = /^[A-Z][A-Za-z0-9]*$/;
const cok = /^k[A-Z][A-Za-z0-9]*$/;
const vok = /^[a-z][a-z0-9]*(_[a-z0-9]+)*_?$/;

const f = /^(\s*(?:[\w:<>,*&~]+\s+)+?[*&\s]*(?:[A-Za-z_]\w*::)*)([A-Za-z_]\w*)\s*\([^;]*\{\s*$/;
const c = /^(.*?\b(?:const|constexpr)\s+(?:[\w:]+(?:<[^<>]*>)?\s+)+)([A-Za-z_]\w*)\s*(?:=|\{|\[)/;
const v = /^(\s*(?:[A-Za-z_][\w:]*(?:<(?:[^<>]|<[^<>]*>)*>)?[\s*&]+)+?)([A-Za-z_]\w*)\s*(?:=(?!=)|;|\[|\{)/;

const NOT_A_TYPE = new Set([
    'return', 'else', 'delete', 'new', 'throw', 'goto', 'case', 'using', 'typedef',
    'namespace', 'class', 'struct', 'enum', 'union', 'template', 'friend', 'public',
    'private', 'protected', 'if', 'for', 'while', 'switch', 'do',
]);
const NOT_A_FUNCTION = new Set(['if', 'for', 'while', 'switch', 'catch', 'else', 'main']);

function problemer(rule: string, message: string, i: number, match: RegExpExecArray): Problem {
    const before = match[1];
    const name = match[2];
    const start = before.length;
    const end = start + name.length;

    const problem: Problem = {
        rule: rule,
        message: message,
        line: i,
        start: start,
        end: end,
    };
    return problem;
}

function first(line: string): string {
    const match = /^\s*(\w+)/.exec(line);
    if (match == null || match == undefined) {
        return '';
    }
    const word = match[1];
    if (word == undefined || word == null) {
        return '';
    }
    return word;
}

export function naming(text: string): Problem[] {
    const orig = text.split(/\r\n|\r|\n/);
    const masked = mask(orig);
    const probs: Problem[] = [];

    for (let i = 0; i < masked.length; i++) {
        const line = masked[i];

        const fmatch = f.exec(line);
        if (fmatch) {
            const fname = fmatch[2];
            const ignore = NOT_A_FUNCTION.has(fname);
            const good = fok.test(fname);

            if (!ignore && !good) {
                const message = `Function "${fname}" should be PascalCase, like "AddItem"`;
                probs.push(problemer('NAME-FUNC', message, i, fmatch));
            }
            continue;
        }

        const cmatch = c.exec(line);
        if (cmatch) {
            const cname = cmatch[2];
            const good = cok.test(cname);

            if (!good) {
                const message = `Constant "${cname}" should start with k and use CamelCase, like "kBufSize"`;
                probs.push(problemer('NAME-CONST', message, i, cmatch));
            }
            continue;
        }

        const con = /\bconst(expr)?\b/.test(line);
        if (con) {
            continue;
        }

        const vmatch = v.exec(line);
        const word = first(line);
        const ignore = NOT_A_TYPE.has(word);

        if (vmatch && !ignore) {
            const vname = vmatch[2];
            const good = vok.test(vname);

            if (!good) {
                const message = `Variable "${vname}" should be snake_case, like "file_count"`;
                probs.push(problemer('NAME-VAR', message, i, vmatch));
            }
        }
    }

    return probs;
}
