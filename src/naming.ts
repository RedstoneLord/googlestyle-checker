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
