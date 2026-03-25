export default function Home() {
	return (
		<main
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				fontFamily: "system-ui, sans-serif",
			}}
		>
			<h1 style={{ fontSize: "3rem", fontWeight: 700 }}>FORJA</h1>
			<p style={{ fontSize: "1.25rem", color: "#666", marginTop: "0.5rem" }}>Create. Send. Lock.</p>
			<p style={{ fontSize: "0.875rem", color: "#999", marginTop: "2rem" }}>Coming Soon</p>
		</main>
	);
}
