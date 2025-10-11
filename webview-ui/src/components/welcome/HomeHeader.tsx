import { EmptyRequest } from "@shared/proto/cline/common"
import MarieCoderLogo from "@/assets/MarieCoderLogo"
import HeroTooltip from "@/components/common/HeroTooltip"
import { UiServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"

const HomeHeader = () => {
	const handleTakeATour = async () => {
		try {
			await UiServiceClient.openWalkthrough(EmptyRequest.create())
		} catch (error) {
			debug.error("Error opening walkthrough:", error)
		}
	}

	return (
		<div className="flex flex-col items-center mb-5">
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
			<div className="mt-4">
				<button
					className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-panel bg-white/[0.02] hover:bg-list-background-hover transition-colors duration-150 ease-in-out text-code-foreground text-sm font-medium cursor-pointer"
					onClick={handleTakeATour}
					type="button">
					Take a Tour
					<span className="codicon codicon-play scale-90"></span>
				</button>
			</div>
		</div>
	)
}

export default HomeHeader
