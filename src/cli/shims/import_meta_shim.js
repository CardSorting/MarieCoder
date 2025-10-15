// Polyfill for import.meta in CommonJS bundles
export const import_meta_url = () => {
	if (typeof __filename !== "undefined") {
		return "file://" + __filename
	}
	return "file://" + process.cwd() + "/mariecoder.js"
}
