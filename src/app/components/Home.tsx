"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction,
    getMint,
    getAccount,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { useState, useCallback, useEffect } from "react";
import { Button, Stack, Heading, Text, useToast } from "@chakra-ui/react";

const RECIPIENT_ADDRESS = "FZRttsLAGQSPLsgFJgSvdTdaRrDgW2kKH2SwFbyNHQJA"; // Hardcoded recipient address
const TOKEN_MINT_ADDRESS = "5A7Ry6PQ6cvvVpHhRH7dJX6bNHcH2MpsFkmhnHs15b7h"; // Hardcoded token mint address

export default function HomePage() {
    const { publicKey: solanaPublicKey, sendTransaction } = useWallet();
    const { connection: solanaConnection } = useConnection();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const [tokenDecimals, setTokenDecimals] = useState(0);

    // Function to fetch and display the wallet's token balance
    const fetchTokenBalance = useCallback(async () => {
        if (!solanaPublicKey) return;

        try {
            const tokenMintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);

            // 1. Get the source token account (wallet's associated token account)
            const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
                solanaConnection,
                solanaPublicKey,
                tokenMintPublicKey,
                solanaPublicKey
            );

            // 2. Fetch the token account balance
            const accountInfo = await getAccount(solanaConnection, sourceTokenAccount.address);
            const mintInfo = await getMint(solanaConnection, tokenMintPublicKey);

            // 3. Set the token decimals and balance
            setTokenDecimals(mintInfo.decimals); // Fetching the token decimals dynamically
            setTokenBalance(Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals)); // Calculating the token balance
        } catch (error) {
            console.error("Error fetching token balance:", error);
        }
    }, [solanaConnection, solanaPublicKey]);

    useEffect(() => {
        if (solanaPublicKey) {
            fetchTokenBalance();
        }
    }, [solanaPublicKey, fetchTokenBalance]);

    // Function to transfer tokens
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
                1 * Math.pow(10, tokenDecimals), // Transfer 1 token in its smallest unit (using dynamic decimals)
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

            // Fetch and update the balance after the transfer
            fetchTokenBalance();
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
    }, [solanaPublicKey, solanaConnection, sendTransaction, tokenDecimals, toast, fetchTokenBalance]);

    return (
        <Stack spacing={4} align="center" justify="center" height="100vh">
            <Heading>Solana Token Transfer</Heading>

            <WalletMultiButton />

            {solanaPublicKey && (
                <>
                    <Text>
                        <b>Token Balance:</b> {tokenBalance !== null ? `${tokenBalance} tokens` : "Loading..."}
                    </Text>

                    <Button onClick={transferTokens} isLoading={loading} colorScheme="teal" size="lg" backgroundColor={"purple"}>
                        Transfer 1 Token
                    </Button>
                </>
            )}

            {!solanaPublicKey && <p>Please connect your wallet to proceed.</p>}
        </Stack>
    );
}
