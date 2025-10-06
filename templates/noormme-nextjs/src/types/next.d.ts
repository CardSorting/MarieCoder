// Minimal Next.js types for template
declare module "next" {
	export const Metadata: any
	export default any
}
declare module "next/link" {
	export default any
}
declare module "next/navigation" {
	export const redirect: any
	export const useRouter: any
}
declare module "next/server" {
	export const NextRequest: any
	export const NextResponse: any
}
declare module "next/font/google" {
	export function Inter(options: any): any
}
declare module "next-auth" {
	export default any
}
declare module "next-auth/react" {
	export const SessionProvider: any
	export const signIn: any
	export const signOut: any
}
declare module "next-auth/providers/*" {
	export default any
}
declare module "react" {
	export const useState: any
	export default any
}
declare module "lucide-react" {
	export const Settings: any
	export const Users: any
	export const BarChart3: any
	export const CreditCard: any
	export const Bell: any
	export const User: any
	export const LogOut: any
	export const ArrowRight: any
	export const CheckCircle: any
	export const XCircle: any
	export const Clock: any
	export const DollarSign: any
	export const Calendar: any
	export const Mail: any
	export const Phone: any
	export const MapPin: any
	export const Globe: any
	export const Lock: any
	export const Eye: any
	export const EyeOff: any
	export const Github: any
	export const Chrome: any
	export const Home: any
	export const Shield: any
	export const Activity: any
	export const AlertCircle: any
}
