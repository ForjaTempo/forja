/**
 * Shared CSV parsing utilities used by multisend and batch lock forms.
 */

/** Strip UTF-8 BOM (byte order mark) from text */
export function stripBom(text: string): string {
	return text.replace(/^\uFEFF/, "");
}

/** Detect the delimiter used in CSV text by analyzing the first data line */
export function detectDelimiter(text: string): string {
	const lines = text.split("\n").filter((l) => l.trim().length > 0);
	const firstLine = lines[0] ?? "";

	// Count occurrences of each delimiter candidate
	const candidates = [
		{ char: "\t", count: (firstLine.match(/\t/g) ?? []).length },
		{ char: ";", count: (firstLine.match(/;/g) ?? []).length },
		{ char: ",", count: (firstLine.match(/,/g) ?? []).length },
	];

	// Pick the delimiter with the most occurrences (at least 1)
	const best = candidates.sort((a, b) => b.count - a.count)[0];
	return best && best.count > 0 ? best.char : ",";
}

/** Check if the first row looks like a header row */
export function detectHeaders(firstRow: string[]): { isHeader: boolean } {
	const headerPatterns = /^(address|recipient|wallet|to|amount|quantity|value|token|name)$/i;
	const matchCount = firstRow.filter((col) => headerPatterns.test(col.trim())).length;
	return { isHeader: matchCount >= 1 };
}

/** Generate and download a CSV template file */
export function downloadCsvTemplate(
	filename: string,
	headers: string[],
	examples: string[][],
): void {
	const lines = [headers.join(","), ...examples.map((row) => row.join(","))];
	const csv = lines.join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
