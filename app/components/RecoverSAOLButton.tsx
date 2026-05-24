import sdk from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';
import { createWalletClient, custom, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ERC20_ABI, SAOL, SAOL_CLAIM, SAOL_CLAIM_ABI } from '~/data/ecosystem';

export function RecoverSAOLButton() {
  const { address } = useAccount();
  const [inFrame,   setInFrame]   = useState(false);
  const [fcAddr,    setFcAddr]    = useState<string | null>(null);
  const [txHash,    setTxHash]    = useState('');
  const [fcError,   setFcError]   = useState('');
  const [fcPending, setFcPending] = useState(false);

  const { writeContract, isPending: wagmiPending, isSuccess: wagmiSent, data: wagmiHash } = useWriteContract();

  const { data: contractBalance, refetch } = useReadContract({
    address: SAOL.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [SAOL_CLAIM.address],
    chainId: SAOL_CLAIM.chain,
  });

  useEffect(() => {
    sdk.isInMiniApp().then(async (yes) => {
      if (!yes) return;
      setInFrame(true);
      try {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
          if (accounts.length > 0) setFcAddr(accounts[0].toLowerCase());
        }
        await sdk.actions.ready();
      } catch { /* ignore */ }
    });
  }, []);

  const isOwner = (
    (inFrame  && fcAddr   === SAOL_CLAIM.owner) ||
    (!inFrame && address?.toLowerCase() === SAOL_CLAIM.owner)
  );

  if (!isOwner) return null;

  const balance = contractBalance ?? 0n;
  const displayAmount = formatUnits(balance, SAOL.decimals);
  const hasBalance = balance > 0n;

  const handleFarcaster = async () => {
    if (!hasBalance) return;
    setFcError('');
    setFcPending(true);
    try {
      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) throw new Error('No Farcaster wallet provider');
      const client = createWalletClient({ chain: base, transport: custom(provider) });
      const [account] = await client.getAddresses();
      const hash = await client.writeContract({
        address: SAOL_CLAIM.address,
        abi: SAOL_CLAIM_ABI,
        functionName: 'recover',
        args: [SAOL.address, balance],
        account,
      });
      setTxHash(hash);
      refetch();
    } catch (e: unknown) {
      setFcError(e instanceof Error ? e.message : String(e));
    } finally {
      setFcPending(false);
    }
  };

  const handleWagmi = () => {
    if (!hasBalance) return;
    writeContract({
      address: SAOL_CLAIM.address,
      abi: SAOL_CLAIM_ABI,
      functionName: 'recover',
      args: [SAOL.address, balance],
      chainId: SAOL_CLAIM.chain,
    });
  };

  const pending = inFrame ? fcPending   : wagmiPending;
  const sent    = inFrame ? !!txHash    : wagmiSent;
  const hash    = inFrame ? txHash      : wagmiHash;
  const error   = inFrame ? fcError     : '';

  return (
    <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-yellow-400 text-xs tracking-widest mb-1">SAOL CLAIM — RECOVER</div>
          <div className="text-white/60 text-xs">
            Contract balance:{' '}
            <span className={hasBalance ? 'text-yellow-300 font-mono' : 'text-white/30'}>
              {Number(displayAmount).toLocaleString()} SAOL
            </span>
          </div>
          <div className="text-white/30 text-xs mt-0.5">→ {SAOL_CLAIM.owner}</div>
        </div>
        <button
          onClick={inFrame ? handleFarcaster : handleWagmi}
          disabled={pending || !hasBalance || sent}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-700 to-amber-600 hover:from-yellow-600 hover:to-amber-500 disabled:opacity-40 font-bold text-sm transition-all"
        >
          {pending ? 'Sending…' : sent ? 'Recovered ✓' : 'recover() →'}
        </button>
      </div>
      {sent && (
        <p className="text-yellow-300 text-xs break-all">
          ✓ Sent: {hash}
        </p>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </section>
  );
}
