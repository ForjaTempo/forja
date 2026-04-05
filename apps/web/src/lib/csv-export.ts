export function exportToCsv(data: Record<string, unknown>[], filename: string): void {
	if (data.length === 0) return;

	const firstRow = data[0];
	if (!firstRow) return;

	const headers = Object.keys(firstRow);
	const csvRows = [
		headers.join(","),
		...data.map((row) =>
			headers
				.map((h) => {
					const val = row[h];
					const str = val === null || val === undefined ? "" : String(val);
					// Escape quotes and wrap in quotes if contains comma, quote, or newline
					if (str.includes(",") || str.includes('"') || str.includes("\n")) {
						return `"${str.replace(/"/g, '""')}"`;
					}
					return str;
				})
				.join(","),
		),
	];

	const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${filename}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}
