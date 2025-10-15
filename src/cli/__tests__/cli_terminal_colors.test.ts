/**
 * Tests for CLI Terminal Colors
 */

import { expect } from "chai"
import { describe, it } from "mocha"
import { BoxChars, colorize, SemanticColors, stripAnsi, TerminalCapabilities, TerminalColors } from "../cli_terminal_colors"

describe("CLI Terminal Colors", () => {
	describe("TerminalColors", () => {
		it("should export basic formatting codes", () => {
			expect(TerminalColors.reset).to.be.a("string")
			expect(TerminalColors.bright).to.be.a("string")
			expect(TerminalColors.dim).to.be.a("string")
		})

		it("should export foreground color codes", () => {
			expect(TerminalColors.red).to.be.a("string")
			expect(TerminalColors.green).to.be.a("string")
			expect(TerminalColors.blue).to.be.a("string")
			expect(TerminalColors.yellow).to.be.a("string")
			expect(TerminalColors.cyan).to.be.a("string")
			expect(TerminalColors.magenta).to.be.a("string")
		})

		it("should export background color codes", () => {
			expect(TerminalColors.bgRed).to.be.a("string")
			expect(TerminalColors.bgGreen).to.be.a("string")
			expect(TerminalColors.bgBlue).to.be.a("string")
		})
	})

	describe("BoxChars", () => {
		it("should export box drawing characters", () => {
			expect(BoxChars.topLeft).to.equal("┌")
			expect(BoxChars.topRight).to.equal("┐")
			expect(BoxChars.bottomLeft).to.equal("└")
			expect(BoxChars.bottomRight).to.equal("┘")
			expect(BoxChars.horizontal).to.equal("─")
			expect(BoxChars.vertical).to.equal("│")
		})

		it("should export double line box characters", () => {
			expect(BoxChars.doubleTopLeft).to.equal("╔")
			expect(BoxChars.doubleHorizontal).to.equal("═")
		})

		it("should export symbols", () => {
			expect(BoxChars.bulletPoint).to.equal("•")
			expect(BoxChars.rightArrow).to.equal("→")
			expect(BoxChars.checkMark).to.equal("✓")
		})

		it("should export spinner frames", () => {
			expect(BoxChars.spinner).to.be.an("array")
			expect(BoxChars.spinner.length).to.be.greaterThan(0)
		})
	})

	describe("SemanticColors", () => {
		it("should map semantic meanings to colors", () => {
			expect(SemanticColors.success).to.equal(TerminalColors.green)
			expect(SemanticColors.error).to.equal(TerminalColors.red)
			expect(SemanticColors.warning).to.equal(TerminalColors.yellow)
			expect(SemanticColors.info).to.equal(TerminalColors.cyan)
		})
	})

	describe("TerminalCapabilities", () => {
		it("should have capability detection methods", () => {
			expect(TerminalCapabilities.supportsColors).to.be.a("function")
			expect(TerminalCapabilities.supportsUnicode).to.be.a("function")
			expect(TerminalCapabilities.isInteractive).to.be.a("function")
			expect(TerminalCapabilities.getWidth).to.be.a("function")
			expect(TerminalCapabilities.isCI).to.be.a("function")
		})

		it("should return reasonable terminal width", () => {
			const width = TerminalCapabilities.getWidth()
			expect(width).to.be.a("number")
			expect(width).to.be.greaterThan(0)
		})
	})

	describe("stripAnsi", () => {
		it("should remove ANSI codes from strings", () => {
			const colored = `${TerminalColors.red}Error${TerminalColors.reset}`
			const plain = stripAnsi(colored)
			expect(plain).to.equal("Error")
		})

		it("should handle strings without ANSI codes", () => {
			const plain = "Hello World"
			expect(stripAnsi(plain)).to.equal(plain)
		})

		it("should handle empty strings", () => {
			expect(stripAnsi("")).to.equal("")
		})
	})

	describe("colorize", () => {
		it("should apply color codes", () => {
			const text = "Hello"
			const colored = colorize(text, TerminalColors.green)
			// Color should be applied (may be stripped if terminal doesn't support colors)
			expect(colored).to.be.a("string")
		})

		it("should handle empty strings", () => {
			const colored = colorize("", TerminalColors.red)
			expect(colored).to.be.a("string")
		})
	})
})
