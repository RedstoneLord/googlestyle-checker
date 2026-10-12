export interface Problem {
    rule: string;
    message: string;
    line: number;
    start: number;
    end: number;
}

const fok = /^[A-Z][A-Za-z0-9]*$/;
const cok = /^k[A-Z][A-Za-z0-9]*$/;
const vok = /^[a-z]+(_[a-z]+)*$/;

const f = /^(\s*(?:[\w:<>,*&~]+\s+)+)([A-Za-z_]\w*)\s*\([^;]*\{\s*$/;
const c = /^(.*?\bconst\s+(?:[\w:]+\s+)+)([A-Za-z_]\w*)\s*(?:=|\{|\[)/;
const v = /^(\s*(?:[A-Za-z_]\w*[\s*&]+)+?)([A-Za-z_]\w*)\s*(?:=|;|\[|\{)/;
