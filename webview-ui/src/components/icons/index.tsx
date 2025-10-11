/**
 * Lightweight SVG icon components to replace lucide-react (41MB)
 * Contains only the icons we actually use (~15 icons)
 * SVG paths extracted from lucide-react source
 */

import { type SVGProps } from "react"

export type IconProps = SVGProps<SVGSVGElement> & {
	size?: number | string
}

const Icon = ({ size = 24, ...props }: IconProps) => (
	<svg
		fill="none"
		height={size}
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth="2"
		viewBox="0 0 24 24"
		width={size}
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	/>
)

export const AlertTriangle = (props: IconProps) => (
	<Icon {...props}>
		<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
		<path d="M12 9v4" />
		<path d="M12 17h.01" />
	</Icon>
)

export const ArrowDownToLine = (props: IconProps) => (
	<Icon {...props}>
		<path d="M12 17V3" />
		<path d="m6 11 6 6 6-6" />
		<path d="M19 21H5" />
	</Icon>
)

export const AtSign = (props: IconProps) => (
	<Icon {...props}>
		<circle cx="12" cy="12" r="4" />
		<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
	</Icon>
)

export const Plus = (props: IconProps) => (
	<Icon {...props}>
		<path d="M5 12h14" />
		<path d="M12 5v14" />
	</Icon>
)

export const Check = (props: IconProps) => (
	<Icon {...props}>
		<path d="M20 6 9 17l-5-5" />
	</Icon>
)

export const X = (props: IconProps) => (
	<Icon {...props}>
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	</Icon>
)

export const Circle = (props: IconProps) => (
	<Icon {...props}>
		<circle cx="12" cy="12" r="10" />
	</Icon>
)

export const Copy = (props: IconProps) => (
	<Icon {...props}>
		<rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
		<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
	</Icon>
)

export const ChevronDown = (props: IconProps) => (
	<Icon {...props}>
		<path d="m6 9 6 6 6-6" />
	</Icon>
)

export const ChevronRight = (props: IconProps) => (
	<Icon {...props}>
		<path d="m9 18 6-6-6-6" />
	</Icon>
)

export const FoldVertical = (props: IconProps) => (
	<Icon {...props}>
		<path d="M12 22v-6" />
		<path d="M12 8V2" />
		<path d="M4 12H2" />
		<path d="M10 12H8" />
		<path d="M16 12h-2" />
		<path d="M22 12h-2" />
		<path d="m15 19-3-3-3 3" />
		<path d="m15 5-3 3-3-3" />
	</Icon>
)

export const History = (props: IconProps) => (
	<Icon {...props}>
		<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
		<path d="M3 3v5h5" />
		<path d="M12 7v5l4 2" />
	</Icon>
)

export const Settings = (props: IconProps) => (
	<Icon {...props}>
		<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
		<circle cx="12" cy="12" r="3" />
	</Icon>
)

export const Megaphone = (props: IconProps) => (
	<Icon {...props}>
		<path d="m3 11 18-5v12L3 14v-3z" />
		<path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
	</Icon>
)

export const Trash = (props: IconProps) => (
	<Icon {...props}>
		<path d="M3 6h18" />
		<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
		<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
	</Icon>
)

export const CheckCheck = (props: IconProps) => (
	<Icon {...props}>
		<path d="M18 6 7 17l-5-5" />
		<path d="m22 10-7.5 7.5L13 16" />
	</Icon>
)

export const FlaskConical = (props: IconProps) => (
	<Icon {...props}>
		<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
		<path d="M8.5 2h7" />
		<path d="M7 16h10" />
	</Icon>
)

export const Info = (props: IconProps) => (
	<Icon {...props}>
		<circle cx="12" cy="12" r="10" />
		<path d="M12 16v-4" />
		<path d="M12 8h.01" />
	</Icon>
)

export const SlidersHorizontal = (props: IconProps) => (
	<Icon {...props}>
		<line x1="21" x2="14" y1="4" y2="4" />
		<line x1="10" x2="3" y1="4" y2="4" />
		<line x1="21" x2="12" y1="12" y2="12" />
		<line x1="8" x2="3" y1="12" y2="12" />
		<line x1="21" x2="16" y1="20" y2="20" />
		<line x1="12" x2="3" y1="20" y2="20" />
		<line x1="14" x2="14" y1="2" y2="6" />
		<line x1="8" x2="8" y1="10" y2="14" />
		<line x1="16" x2="16" y1="18" y2="22" />
	</Icon>
)

export const SquareMousePointer = (props: IconProps) => (
	<Icon {...props}>
		<path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
		<path d="m12 12 4 10 1.7-4.3L22 16Z" />
	</Icon>
)

export const SquareTerminal = (props: IconProps) => (
	<Icon {...props}>
		<path d="m7 11 2-2-2-2" />
		<path d="M11 13h4" />
		<rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
	</Icon>
)

export const Wrench = (props: IconProps) => (
	<Icon {...props}>
		<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
	</Icon>
)

// Type for lucide-react compatibility
export type LucideIcon = React.FC<IconProps>

// Export aliases for compatibility
export const ArrowDownToLineIcon = ArrowDownToLine
export const AtSignIcon = AtSign
export const PlusIcon = Plus
export const CheckIcon = Check
export const XIcon = X
export const CircleIcon = Circle
export const CopyIcon = Copy
export const ChevronDownIcon = ChevronDown
export const ChevronRightIcon = ChevronRight
export const FoldVerticalIcon = FoldVertical
export const HistoryIcon = History
export const SettingsIcon = Settings
export const TrashIcon = Trash
