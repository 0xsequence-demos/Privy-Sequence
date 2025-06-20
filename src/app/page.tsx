'use client'

import {
	usePublicClient,
	useSignMessage,
} from 'wagmi'
import LoginLogoutButton from './components/LoginLogoutButton'
import EthBalance from './components/EthBalance'
import {
	accountFor,
	createSequenceWallet,
	subdigestOf,
	toSequenceTransactions
} from './utils'
import { useState, useEffect } from 'react'
import { commons } from '@0xsequence/core'
import type { TransactionsEntry } from './constants/types'
import { ethers } from 'ethers'
import { CHAIN_ID, contractAddr, STEPS } from './constants/constants'
import { encodeFunctionData } from 'viem'
import { contractAbi } from './constants/abis'
import { usePrivy } from '@privy-io/react-auth'

export default function Home() {
  const { user } = usePrivy()

	const publicClient = usePublicClient({ chainId: CHAIN_ID })
	const { signMessageAsync } = useSignMessage()

	const [currentStep, setCurrentStep] = useState(0)
	const [sequenceWalletAddress, setSequenceWalletAddress] = useState<
		`0x${string}` | null
	>(null)
	const [walletError, setWalletError] = useState<string | null>(null)
	const [loadingWallet, setLoadingWallet] = useState(false)
	const [isWalletDeployed, setIsWalletDeployed] = useState<boolean | null>(null)
	const [loadingSend, setLoadingSend] = useState(false)
	const [sendError, setSendError] = useState<string | null>(null)
	const [sendSuccess, setSendSuccess] = useState(false)
	const [txHash, setTxHash] = useState<string | null>(null)

	useEffect(() => {
		if (user && currentStep === 1) {
			handleCreateWallet()
		}
	}, [user, currentStep])

	useEffect(() => {
		if (!user) {
			setCurrentStep(0)
			setSequenceWalletAddress(null)
			setWalletError(null)
			setLoadingWallet(false)
			setIsWalletDeployed(null)
			setLoadingSend(false)
			setSendError(null)
			setSendSuccess(false)
			setTxHash(null)
		}
	}, [user])

	const handleCreateWallet = async () => {
		setLoadingWallet(true)
		setWalletError(null)
		try {
			if (!user?.wallet?.address)
				throw new Error('Privy signer not available')
			const signer = user.wallet.address
      const threshold = 1
      const weight = 1
			const wallet = await createSequenceWallet(threshold, [
				{ address: signer, weight: weight }
			])
      // Check if the wallet is deployed
			const hasCode = await publicClient?.getCode({
				address: wallet.address as `0x${string}`
			})
			setIsWalletDeployed(hasCode !== undefined)
			setSequenceWalletAddress(wallet.address as `0x${string}`)
			setCurrentStep(2)
		} catch (err) {
			setWalletError(
				(err as { message?: string }).message ||
					'Failed to create Sequence Wallet'
			)
		} finally {
			setLoadingWallet(false)
		}
	}

	const handleSendTransaction = async () => {
		setSendError(null)
		setSendSuccess(false)
		setTxHash(null)
		setLoadingSend(true)
		try {
			if (!user?.wallet?.address || !sequenceWalletAddress)
				throw new Error('Privy signer or sequence wallet address not available')
			// Prepare the tx to send via the Sequence Wallet
			const data = encodeFunctionData({
				abi: contractAbi,
				functionName: 'safeMint',
				args: [sequenceWalletAddress]
			})
			const txsToExecute = [
				{
					to: contractAddr,
					data: data,
					value: '0',
					revertOnError: true
				}
			]
			const txe: TransactionsEntry = {
				wallet: sequenceWalletAddress as `0x${string}`,
				space: Math.floor(Date.now()).toString(),
				nonce: '0',
				chainId: CHAIN_ID.toString(),
				transactions: txsToExecute
			}
			// Calculate the tx subdigest
			const subdigest = subdigestOf(txe)
			const digestBytes = ethers.getBytes(subdigest)
			// Sign the tx subdigest
			const signature = await signMessageAsync({
				message: { raw: digestBytes }
			})
			const suffixed = signature + '02'
			// Get the account for the Sequence Wallet with signatures
			const account = accountFor({
				address: sequenceWalletAddress as `0x${string}`,
				signatures: [{ signer: user?.wallet?.address as `0x${string}`, signature: suffixed }]
			})
			const sequenceTxs = toSequenceTransactions(txsToExecute)
			const status = await account.status(CHAIN_ID)
			const wallet = account.walletForStatus(CHAIN_ID, status)
			// Check if the wallet is deployed
			if (!isWalletDeployed) {
				wallet.deploy()
				// sleep for 3 seconds then check if the wallet is deployed
				await new Promise((resolve) => setTimeout(resolve, 3000))
				setIsWalletDeployed(true)
			}
			// Sign the txs with the Sequence Wallet
			const signed = await wallet.signTransactions(
				sequenceTxs,
				commons.transaction.encodeNonce(txe.space, txe.nonce)
			)
			// Relay the txs to sponsor them
			const relayer = account.relayer(CHAIN_ID)
			const relayed = await relayer.relay(signed)
			setSendSuccess(true)
			setTxHash(relayed?.hash || null)
		} catch (error) {
			setSendError(
				(error as { message?: string }).message || 'Error sending transaction.'
			)
		} finally {
			setLoadingSend(false)
		}
	}

	useEffect(() => {
		if (user && currentStep === 0) {
			setCurrentStep(1)
		}
	}, [user, currentStep])

	return (
		<div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-6">
			<div className="w-full max-w-md flex flex-col items-center gap-8">
				<h1 className="text-2xl font-bold mb-4">Privy + Sequence</h1>
				<ol className="w-full flex flex-col gap-6">
					{STEPS.map((step, i) => {
						const isCompleted = i < currentStep || (i === 2 && sendSuccess)
						const isActive = i === currentStep
						const isInactive = i > currentStep && !(i === 2 && sendSuccess)
						return (
							<li
								className="w-full"
								key={step.title}
								aria-label={`Step ${i + 1}: ${step.title}`}
							>
								<div className="flex items-center gap-3 mb-2">
									<span
										className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${isCompleted ? 'border-green-400 bg-green-400 text-black' : isActive ? 'border-blue-400 text-blue-400' : 'border-gray-400 text-gray-400'}`}
									>
										{isCompleted ? '✓' : i + 1}
									</span>
									<span
										className={`${isInactive ? 'text-gray-500' : 'text-lg font-semibold'}`}
									>
										{step.title}
									</span>
								</div>
								<div
									className={`ml-9 text-sm ${isInactive ? 'text-gray-500' : 'text-gray-300'} mb-2`}
								>
									{step.description}
								</div>
								<div className="ml-9">
									{i === 0 && (
										<>
											<LoginLogoutButton />
											{user?.wallet?.address && (
												<div className="mt-2">
                         {user?.email?.address && (
                          <>
                           <div className="text-xs uppercase tracking-wider text-gray-400">
														Logged in with email
													</div>
													<div className="text-sm break-all mb-2">{user?.email?.address}</div>
                          </>
                         )}
													<div className="text-xs uppercase tracking-wider text-gray-400">
														Network
													</div>
													<div className="text-sm break-all mb-2">Base Sepolia</div>
													<div className="text-xs uppercase tracking-wider text-gray-400">
														EOA Address
													</div>
													<div className="text-sm break-all">{user?.wallet?.address}</div>
													<div className="text-xs uppercase tracking-wider text-gray-400 mt-2">
														ETH Balance
													</div>
													<EthBalance address={user?.wallet?.address as `0x${string}`} />
												</div>
											)}
										</>
									)}
									{i === 1 && (
										<div className="flex flex-col gap-2">
											{walletError && (
												<div className="text-xs text-red-500 mt-1" role="alert">
													{walletError}
												</div>
											)}
											{loadingWallet && (
												<div className="text-xs text-gray-400 mt-1">
													Loading wallet...
												</div>
											)}
											{isWalletDeployed !== null &&
												(isWalletDeployed ? (
													<div className="text-xs text-green-500 mt-1">
														Wallet is deployed.
													</div>
												) : (
													<div className="text-xs text-red-500 mt-1">
														Wallet not deployed yet.
													</div>
												))}
											{sequenceWalletAddress && (
												<div className="mt-2">
													<div className="text-xs uppercase tracking-wider text-gray-400">
														Wallet Address
													</div>
													<div className="text-sm break-all">
														{sequenceWalletAddress}
													</div>
													<div className="text-xs uppercase tracking-wider text-gray-400 mt-2">
														ETH Balance
													</div>
													<EthBalance
														address={sequenceWalletAddress as `0x${string}`}
													/>
												</div>
											)}
										</div>
									)}
									{i === 2 && (
										<div className="flex flex-col gap-2">
											<button
												onClick={handleSendTransaction}
												className="px-4 py-2 bg-black border border-white rounded text-white font-semibold focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 transition disabled:opacity-50"
												tabIndex={0}
												aria-label="Mint NFT"
												type="button"
												disabled={
													currentStep !== 2 ||
													loadingSend ||
													!sequenceWalletAddress
												}
												onKeyDown={(e) => {
													if (
														(e.key === 'Enter' || e.key === ' ') &&
														!loadingSend &&
														currentStep === 2 &&
														sequenceWalletAddress
													)
														handleSendTransaction()
												}}
											>
												{loadingSend ? 'Minting...' : 'Mint NFT'}
											</button>
											{sendError && (
												<div className="text-xs text-red-500 mt-1" role="alert">
													{sendError}
												</div>
											)}
											{sendSuccess && (
												<div className="text-xs text-green-500 mt-1">
													{txHash && (
														<span className="ml-2 break-all">
															Tx Hash: {txHash}
														</span>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							</li>
						)
					})}
				</ol>
			</div>
		</div>
	)
}
