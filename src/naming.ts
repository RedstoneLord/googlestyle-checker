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
                chars[i] = ' ';
                i++;
            }

            i++;
        } else {
            i++;
        }
    }

    return { text: chars.join(''), inBlock: inBlock };
}

export function mask(lines: string[]): string[] {
    const masked: string[] = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const res = masker(lines[i], inBlock);
        inBlock = res.inBlock;
        masked.push(res.text);
    }

    return masked;
}

const fok = /^[A-Z][A-Za-z0-9]*$/;
const cok = /^k[A-Z][A-Za-z0-9]*$/;
const vok = /^[a-z]+(_[a-z]+)*$/;

const f = /^(\s*(?:[\w:<>,*&~]+\s+)+)([A-Za-z_]\w*)\s*\([^;]*\{\s*$/;
const c = /^(.*?\bconst\s+(?:[\w:]+\s+)+)([A-Za-z_]\w*)\s*(?:=|\{|\[)/;
const v = /^(\s*(?:[A-Za-z_]\w*[\s*&]+)+?)([A-Za-z_]\w*)\s*(?:=|;|\[|\{)/;

const NOT_A_FUNCTION = new Set(['if', 'for', 'while', 'switch', 'catch', 'else']);

function problemer(rule: string, message: string, i: number, match: RegExpExecArray): Problem {
    const name = match[2];
    const start = match.index;
    const end = start + name.length;

    return { rule: rule, message: message, line: i, start: start, end: end };
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
            if (!NOT_A_FUNCTION.has(fname) && !fok.test(fname)) {
                const message = `Function "${fname}" should be PascalCase, like "AddItem"`;
                probs.push(problemer('NAME-FUNC', message, i, fmatch));
            }
        }

        const cmatch = c.exec(line);
        if (cmatch) {
            const cname = cmatch[2];
            if (!cok.test(cname)) {
                const message = `Constant "${cname}" should start with k and use CamelCase, like "kBufSize"`;
                probs.push(problemer('NAME-CONST', message, i, cmatch));
            }
        }

        const vmatch = v.exec(line);
        if (vmatch) {
            const vname = vmatch[2];
            if (!vok.test(vname)) {
                const message = `Variable "${vname}" should be snake_case, like "file_count"`;
                probs.push(problemer('NAME-VAR', message, i, vmatch));
            }
        }
    }

    return probs;
}
