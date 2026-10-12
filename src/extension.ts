import * as vscode from 'vscode';
import { naming } from './naming';

export function activate(context: vscode.ExtensionContext) {
	const diagnostics = vscode.languages.createDiagnosticCollection('gstyle-naming');
	context.subscriptions.push(diagnostics);

	function check(doc: vscode.TextDocument): void {
		if (doc.languageId != 'cpp' || doc.uri.scheme != 'file') return;
		const problems = naming(doc.getText());
		diagnostics.set(
			doc.uri,
			problems.map((p) => {
				const range = new vscode.Range(p.line, p.start, p.line, p.end);
				const d = new vscode.Diagnostic(range, p.message, vscode.DiagnosticSeverity.Warning);
				d.source = 'gstyle';
				d.code = p.rule;
				return d;
			}),
		);
	}

	vscode.workspace.textDocuments.forEach(check);
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(check),
		vscode.workspace.onDidChangeTextDocument((e) => check(e.document)),
		vscode.workspace.onDidSaveTextDocument(check),
		vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
	);
}

export function deactivate() {}
