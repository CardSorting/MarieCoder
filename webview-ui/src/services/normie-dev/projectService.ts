// Simple project service for NormieDev
export interface ProjectTemplate {
	id: string
	name: string
	description: string
	tech: string[]
}

export const projectTemplates: ProjectTemplate[] = [
	{
		id: "nextjs-blog",
		name: "Next.js Blog",
		description: "Complete blog with SQLite and auth",
		tech: ["Next.js", "SQLite", "NextAuth"],
	},
	{
		id: "todo-app",
		name: "Todo App",
		description: "Modern todo with SQLite optimization",
		tech: ["Next.js", "SQLite", "TypeScript"],
	},
	{
		id: "dashboard",
		name: "Admin Dashboard",
		description: "Dashboard with user management",
		tech: ["Next.js", "SQLite", "Tailwind"],
	},
]

export const getProjectTemplate = (id: string): ProjectTemplate | undefined => {
	return projectTemplates.find((template) => template.id === id)
}
