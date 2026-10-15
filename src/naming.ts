/**
 * Интерфейс проблемыы
 *
 * Поля: rule (string) - код правила,
 * message (string) - текст сообщения для пользователя,
 * line (number) - номер строки (с нуля),
 * start (number) - позиция начала имени в строке,
 * end (number) - позиция конца имени в строке (не включительно)
 */
export interface Problem {
    rule: string;
    message: string;
    line: number;
    start: number;
    end: number;
}

/**
 * Маскернутая строка
 *
 * Поля: text (string) - строка, где комментарии и содержимое строк заменены пробелами,
 * inBlock (boolean) - true, если блочный комментарий не закончился в конце строки
 */
interface MaskedLine {
    text: string;
    inBlock: boolean;
}

/**
 * Заменяет пробелами комментарии и строки в одной строке.
 *
 * Ввод: line (string) - строка кода, block (boolean) - true, если строка начинается внутри блочного комментария
 * Вывод: MaskedLine
 *
 * Пример использования:
 * masker('f("hi");', false) = { text: 'f("  ");', inBlock: false }
 */
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

            while (i < line.length && line[i] != quote) {
                if (line[i] == '\\') {
                    chars[i] = ' ';
                    i++;
                }

                if (i < line.length) {
                    chars[i] = ' ';
                    i++;
                }
            }

            i++;
        } else {
            i++;
        }
    }

    return { text: chars.join(''), inBlock };
}

/**
 * Очищает весь текст от комментариев и содержимого строк, запоминая состояние блочного комментария между строками.
 *
 * Ввод: lines (string[]) - строки исходного кода
 * Вывод: mask (string[]) - строки той же длины, где комментарии и содержимое строк заменены пробелами
 *
 * Пример использования:
 * mask(['int a; // x', 'int b;']) = ['int a;     ', 'int b;']
 */
export function mask(lines: string[]): string[] {
    const masked: string[] = [];
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const result = masker(lines[i], inBlock);
        inBlock = result.inBlock;
        masked.push(result.text);
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

/**
 * Создаёт Problem по результату regex.
 *
 * Ввод: rule (string) - код правила, message (string) - сообщение,
 * i (number) - номер строки, match (RegExpExecArray) - совпадение (группа 1 - всё до имени, группа 2 - имя)
 * Вывод: problemer (Problem) - проблема с позицией имени в строке
 *
 * Пример использования:
 * problemer('NAME-VAR', 'msg', 0, match) = { rule: 'NAME-VAR', message: 'msg', line: 0, start: 4, end: 9 }
 * (для строки 'int MyVar = 1;')
 */
function problemer(rule: string, message: string, i: number, match: RegExpExecArray): Problem {
    const start = match[1].length;

    return {
        rule,
        message,
        line: i,
        start,
        end: start + match[2].length,
    };
}

/**
 * Возвращает первое слово строки.
 *
 * Ввод: line (string) - строка кода
 * Вывод: first (string) - первое слово или '', если слова нет
 *
 * Пример использования:
 * first('  return x;') = 'return'
 * first('}') = ''
 */
function first(line: string): string {
    return /^\s*(\w+)/.exec(line)?.[1] ?? '';
}

/**
 * Проверяет имена функций, констант и переменных в C++ коде по Google C++ Style.
 *
 * Ввод: text (string) - исходный код целиком
 * Вывод: naming (Problem[]) - список проблем
 *
 * Пример использования:
 * naming('int MyVar = 1;') = [{ rule: 'NAME-VAR', message: 'Variable "MyVar" should be snake_case, like "file_count"', line: 0, start: 4, end: 9 }]
 */
export function naming(text: string): Problem[] {
    const lines = text.split(/\r\n|\r|\n/);
    const masked = mask(lines);
    const probs: Problem[] = [];

    for (let i = 0; i < masked.length; i++) {
        const line = masked[i];
        const fmatch = f.exec(line);

        if (fmatch) {
            const name = fmatch[2];

            if (!NOT_A_FUNCTION.has(name) && !fok.test(name)) {
                probs.push(problemer(
                    'NAME-FUNC',
                    `Function "${name}" should be PascalCase, like "AddItem"`,
                    i,
                    fmatch,
                ));
            }

            continue;
        }

        const cmatch = c.exec(line);

        if (cmatch) {
            const name = cmatch[2];

            if (!cok.test(name)) {
                probs.push(problemer(
                    'NAME-CONST',
                    `Constant "${name}" should start with k and use CamelCase, like "kBufSize"`,
                    i,
                    cmatch,
                ));
            }

            continue;
        }

        if (/\bconst(expr)?\b/.test(line)) {
            continue;
        }

        const vmatch = v.exec(line);

        if (vmatch && !NOT_A_TYPE.has(first(line)) && !vok.test(vmatch[2])) {
            const name = vmatch[2];

            probs.push(problemer(
                'NAME-VAR',
                `Variable "${name}" should be snake_case, like "file_count"`,
                i,
                vmatch,
            ));
        }
    }

    return probs;
}
