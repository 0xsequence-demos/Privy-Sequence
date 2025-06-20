'use client'

import { type PrivyClientConfig, PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, WagmiProvider } from '@privy-io/wagmi'
import { baseSepolia } from 'viem/chains'
import { http } from 'wagmi'
import { APP_ID, CLIENT_ID } from './constants/constants'

const queryClient = new QueryClient()

const wagmiConfig = createConfig({
	chains: [baseSepolia], 
	transports: {
		[baseSepolia.id]: http()
	}
})

const privyConfig: PrivyClientConfig = {
	embeddedWallets: {
		requireUserPasswordOnCreate: true,
		showWalletUIs: true
	},
	loginMethods: ['wallet', 'email'],
	appearance: {
		showWalletLoginFirst: true
	},
	defaultChain: baseSepolia
}

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<PrivyProvider
			appId={APP_ID as string}
			clientId={CLIENT_ID as string}
			config={privyConfig}
		>
			<QueryClientProvider client={queryClient}>
				<WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
			</QueryClientProvider>
		</PrivyProvider>
	)
}
