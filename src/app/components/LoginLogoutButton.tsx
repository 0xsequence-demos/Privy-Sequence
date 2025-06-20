import { usePrivy } from '@privy-io/react-auth'

function LoginLogoutButton() {
	const { ready, authenticated, login, logout } = usePrivy()
	// Disable login when Privy is not ready or the user is already authenticated
	const disableLogin = !ready

	if (!ready) {
		return <span className="text-xs text-gray-400">Loading Privy...</span>
	}

	return (
		<button
			onClick={authenticated ? logout : login}
			disabled={disableLogin}
			aria-label={authenticated ? 'Log out' : 'Log in with Privy'}
			tabIndex={0}
			className="px-4 py-2 border border-white rounded text-white font-semibold bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 transition disabled:opacity-50 text-sm"
			onKeyDown={(e) => {
				if ((e.key === 'Enter' || e.key === ' ') && !disableLogin) {
					authenticated ? logout() : login()
				}
			}}
		>
			{authenticated ? 'Log out' : 'Log in with Privy'}
		</button>
	)
}

export default LoginLogoutButton
