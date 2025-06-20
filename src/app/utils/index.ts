import { Account } from '@0xsequence/account'
import { trackers } from '@0xsequence/sessions'
import { commons } from '@0xsequence/core'
import { Orchestrator, signers } from '@0xsequence/signhub'
import { allNetworks } from '@0xsequence/network'
import type { FlatTransaction, TransactionsEntry } from '../constants/types'
import { ethers } from 'ethers'
import { StaticSigner } from '../constants/StaticSigner'

export const TRACKER = new trackers.remote.RemoteConfigTracker(
	'https://sessions.sequence.app'
)

export const NETWORKS = allNetworks

export async function createSequenceWallet(
	threshold: number,
	signers: { address: string; weight: number }[]
): Promise<Account> {
	const account = await Account.new({
		config: {
			threshold,
			// By default a random checkpoint is generated every second
			checkpoint: Math.floor(Date.now() / 1000),
			signers: signers
		},
		tracker: TRACKER,
		contexts: commons.context.defaultContexts,
		orchestrator: new Orchestrator([]),
		networks: NETWORKS
	})

	// Try to fetch the config from the tracker
	const reverse1 = await TRACKER.imageHashOfCounterfactualWallet({
		wallet: account.address
	})
	if (!reverse1) {
		throw new Error('Failed to fetch imageHash from the tracker')
	}

	// Try to fetch the imageHash from the tracker
	const reverse2 = await TRACKER.configOfImageHash({
		imageHash: reverse1.imageHash
	})
	if (!reverse2) {
		throw new Error('Failed to fetch config from the tracker')
	}

	return account
}

export function toSequenceTransactions(
	txs: FlatTransaction[]
): commons.transaction.Transaction[] {
	return txs.map(toSequenceTransaction)
}

export function toSequenceTransaction(
	tx: FlatTransaction
): commons.transaction.Transaction {
	return {
		to: tx.to,
		value: tx.value ? BigInt(tx.value) : undefined,
		data: tx.data,
		gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
		delegateCall: tx.delegateCall || false,
		revertOnError: tx.revertOnError || false
	}
}

export function accountFor(args: {
	address: string
	signatures?: { signer: string; signature: string }[]
}) {
	const signers: signers.SapientSigner[] = []

	if (args.signatures) {
		for (const { signer, signature } of args.signatures) {
			// Some ECDSA libraries may return the signature with `v` as 0x00 or 0x01
			// but the Sequence protocol expects it to be 0x1b or 0x1c. We need to
			// adjust the signature to match the protocol.
			const signatureArr = ethers.getBytes(signature)
			if (
				signatureArr.length === 66 &&
				(signatureArr[64] === 0 || signatureArr[64] === 1)
			) {
				signatureArr[64] = signatureArr[64] + 27
			}

			signers.push(new StaticSigner(signer, ethers.hexlify(signatureArr)))
		}
	}

	console.log('signers', signers)

	return new Account({
		address: args.address,
		tracker: TRACKER,
		contexts: commons.context.defaultContexts,
		orchestrator: new Orchestrator(signers),
		networks: NETWORKS
	})
}

export function digestOf(tx: TransactionsEntry): string {
	return commons.transaction.digestOfTransactions(
		commons.transaction.encodeNonce(tx.space, tx.nonce),
		toSequenceTransactions(tx.transactions)
	)
}

export function subdigestOf(tx: TransactionsEntry): string {
	const digest = digestOf(tx)

	return commons.signature.subdigestOf({
		digest,
		chainId: tx.chainId,
		address: tx.wallet
	})
}

export function fromSequenceTransactions(
	wallet: string,
	txs: commons.transaction.Transactionish
): FlatTransaction[] {
	const sequenceTxs = commons.transaction.fromTransactionish(wallet, txs)
	return sequenceTxs.map((stx) => ({
		to: stx.to,
		value: stx.value?.toString(),
		data: stx.data?.toString(),
		gasLimit: stx.gasLimit?.toString(),
		delegateCall: stx.delegateCall,
		revertOnError: stx.revertOnError
	}))
}

export function recoverSigner(
	signatures: string[],
	subdigest: string
): { signer: string; signature: string }[] {
	const res: { signer: string; signature: string }[] = []

	for (const signature of signatures) {
		try {
			const r = commons.signer.recoverSigner(subdigest, signature)
			res.push({ signer: r, signature: signature })
		} catch (e) {
			console.error('Failed to recover signature', e)
		}
	}

	return res
}
