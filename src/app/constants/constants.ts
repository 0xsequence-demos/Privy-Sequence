export const CHAIN_ID = 84532

export const contractAddr = '0xF47aE758E4f49E719d45EAC3414f9Db8B798D4a7'

export const STEPS = [
    {
        title: 'Login with Privy',
    },
    {
        title: 'Sequence Smart Wallet',
        description:
            'Your Sequence Smart Wallet for your Privy Signer. This wallet will be used to send gasless transactions.'
    },
    {
        title: 'Mint NFT Gasless',
        description:
            'Send a gasless transaction from your Sequence Smart Wallet to mint an NFT.'
    }
]

export const APP_ID = process.env.NEXT_PUBLIC_APP_ID
export const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID