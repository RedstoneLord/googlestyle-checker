import * as vscode from 'vscode';
import { naming } from './naming';

export function activate(context: vscode.ExtensionContext) {
    console.log('gstyle is now active');

    const diagnostics = vscode.languages.createDiagnosticCollection('gstyle');
    context.subscriptions.push(diagnostics);

    function check(doc: vscode.TextDocument): void {
        if (doc.languageId != 'c++') return;
        const problems = naming(doc.getText());
        diagnostics.set(
            doc.uri,
            problems.map((p) => {
                const range = new vscode.Range(p.line, p.start, p.line, p.end);
                return new vscode.Diagnostic(range, p.message, vscode.DiagnosticSeverity.Error);
            })
        );
    }

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(check),
        vscode.workspace.onDidSaveTextDocument(check)
    );
}

export function deactivate() {}
