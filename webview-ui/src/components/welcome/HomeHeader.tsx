import MarieCoderLogo from "@/assets/MarieCoderLogo"
import HeroTooltip from "@/components/common/HeroTooltip"
import { Navbar } from "@/components/menu/Navbar"

const HomeHeader = () => {
	return (
		<div className="flex flex-col items-center mb-5">
			{/* Navigation Menu */}
			<div className="w-full flex justify-end px-4 pt-2">
				<Navbar />
			</div>

			<div className="my-5 relative">
				<MarieCoderLogo className="size-16" size={64} />
				{/* Subtle glow effect around logo */}
				<div
					className="absolute inset-0 -z-10 blur-2xl opacity-20"
					style={{
						background: "radial-gradient(circle, #6B46C1 0%, transparent 70%)",
					}}
				/>
			</div>
			<div className="text-center flex items-center justify-center">
				<h1 className="m-0 text-lg font-medium">
					<span className="text-foreground">What can I do for </span>
					<span className="marie-brand-gradient-text font-semibold">you</span>
					<span className="text-foreground">?</span>
				</h1>
				<HeroTooltip
					className="max-w-[300px]"
					content={
						"I can develop software step-by-step by editing files, exploring projects, running commands, and using browsers. I can even extend my capabilities with MCP tools to assist beyond basic code completion."
					}
					placement="bottom">
					<span className="codicon codicon-info ml-2 cursor-pointer text-brand-purple text-sm hover:opacity-80 transition-opacity" />
				</HeroTooltip>
			</div>
		</div>
	)
}

export default HomeHeader
