import { formatEther } from 'viem'
import { useBalance } from 'wagmi'
import { CHAIN_ID } from '../constants/constants'

export default function EthBalance({ address }: { address: `0x${string}` }) {
	const { data: balance } = useBalance({ address, chainId: CHAIN_ID })

	return <div>ETH Balance: {formatEther(balance?.value ?? BigInt(0))}</div>
}
