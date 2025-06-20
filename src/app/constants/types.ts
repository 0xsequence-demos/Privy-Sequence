export type FlatTransaction = {
	to: string
	value?: string
	data?: string
	gasLimit?: string
	delegateCall?: boolean
	revertOnError?: boolean
}

export type TransactionsEntry = {
	subdigest?: string
	wallet: string
	space: string
	nonce: string
	chainId: string
	transactions: FlatTransaction[]
}
