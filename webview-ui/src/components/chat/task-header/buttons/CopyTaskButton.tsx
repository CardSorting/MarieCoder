import { useCallback, useState } from "react"
import { Button } from "@/components/common/Button"
import HeroTooltip from "@/components/common/HeroTooltip"
import { CheckIcon, CopyIcon } from "@/components/icons"
import { cn } from "@/utils/classnames"

const CopyTaskButton: React.FC<{
	taskText?: string
	className?: string
}> = ({ taskText, className }) => {
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(() => {
		if (!taskText) {
			return
		}

		navigator.clipboard.writeText(taskText).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		})
	}, [taskText])

	return (
		<HeroTooltip content="Copy Text" placement="right">
			<Button
				aria-label="Copy"
				className={cn("bg-transparent hover:opacity-100", className)}
				isIconOnly={true}
				onPress={() => handleCopy()}
				radius="sm"
				size="sm">
				{copied ? <CheckIcon size="13" /> : <CopyIcon size="13" />}
			</Button>
		</HeroTooltip>
	)
}

export default CopyTaskButton
