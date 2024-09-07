"use client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useState, useCallback } from "react";
import { Button, Stack, Heading, useToast } from "@chakra-ui/react";

const RECIPIENT_ADDRESS = "FZRttsLAGQSPLsgFJgSvdTdaRrDgW2kKH2SwFbyNHQJA"; // Hardcoded recipient address
const TOKEN_MINT_ADDRESS = "5A7Ry6PQ6cvvVpHhRH7dJX6bNHcH2MpsFkmhnHs15b7h"; // Hardcoded token mint address

export default function HomePage() {
    const { publicKey: solanaPublicKey, sendTransaction } = useWallet();
    const { connection: solanaConnection } = useConnection();
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const transferTokens = useCallback(async () => {
        if (!solanaPublicKey) {
            toast({
                title: "Wallet not connected",
                status: "error",
                duration: 3000,
                position: "top",
            });
            return;
        }

        setLoading(true);

        try {
            const recipientPublicKey = new PublicKey(RECIPIENT_ADDRESS); // Hardcoded recipient address
            const tokenMintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS); // Token mint address
            const AMOUNT_TO_TRANSFER = 1 * LAMPORTS_PER_SOL; // Number of tokens to transfer

            // 1. Get the source token account (wallet's associated token account)
            const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
                solanaConnection,
                solanaPublicKey,
                tokenMintPublicKey,
                solanaPublicKey
            );

            // 2. Get the destination token account (recipient's associated token account)
            const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
                solanaConnection,
                solanaPublicKey,
                tokenMintPublicKey,
                recipientPublicKey
            );

            // 3. Create the transfer instruction
            const transferInstruction = createTransferInstruction(
                sourceTokenAccount.address, // Source token account
                destinationTokenAccount.address, // Destination token account
                solanaPublicKey, // Owner of the source token account (Phantom wallet)
                AMOUNT_TO_TRANSFER, // Transfer amount in smallest units
                [],
                TOKEN_PROGRAM_ID
            );

            // 4. Create and send the transaction
            const transaction = new Transaction().add(transferInstruction);
            const latestBlockHash = await solanaConnection.getLatestBlockhash();
            transaction.recentBlockhash = latestBlockHash.blockhash;

            const signature = await sendTransaction(transaction, solanaConnection);
            await solanaConnection.confirmTransaction(signature, "processed");

            toast({
                title: "Transfer Successful",
                description: `Transaction signature: ${signature}`,
                status: "success",
                duration: 5000,
                position: "top",
            });
        } catch (error) {
            console.error("Error transferring tokens:", error);
            toast({
                title: "Error",
                description: error.message,
                status: "error",
                duration: 5000,
                position: "top",
            });
        } finally {
            setLoading(false);
        }
    }, [solanaPublicKey, solanaConnection, sendTransaction, toast]);

    return (
        <Stack spacing={4} align="center" justify="center" height="100vh">
            <Heading>Solana Token Transfer</Heading>

            <WalletMultiButton />

            {solanaPublicKey && (
                <Button onClick={transferTokens} isLoading={loading} colorScheme="teal" size="lg">
                    Transfer 1 Token
                </Button>
            )}

            {!solanaPublicKey && <p>Please connect your wallet to proceed.</p>}
        </Stack>
    );
}
