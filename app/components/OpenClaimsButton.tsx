import sdk from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { SAOL_CLAIM, SAOL_CLAIM_ABI } from '~/data/ecosystem';

export function OpenClaimsButton() {
  const { address } = useAccount();
  const [inFrame, setInFrame]   = useState(false);
  const [fcAddr,  setFcAddr]    = useState<string | null>(null);
  const [txHash,  setTxHash]    = useState('');
  const [fcError, setFcError]   = useState('');
  const [fcPending, setFcPending] = useState(false);

  // wagmi path (ConnectKit / standard browser)
  const { writeContract, isPending: wagmiPending, isSuccess: wagmiSent, data: wagmiHash } = useWriteContract();

  const { data: claimOpen, refetch } = useReadContract({
    address: SAOL_CLAIM.address,
    abi: SAOL_CLAIM_ABI,
    functionName: 'claimOpen',
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
    (inFrame && fcAddr === SAOL_CLAIM.owner) ||
    (!inFrame && address?.toLowerCase() === SAOL_CLAIM.owner)
  );

  if (!isOwner) return null;

  // Farcaster path
  const handleFarcaster = async () => {
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
        functionName: 'openClaims',
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

  // wagmi path
  const handleWagmi = () => {
    writeContract({
      address: SAOL_CLAIM.address,
      abi: SAOL_CLAIM_ABI,
      functionName: 'openClaims',
      chainId: SAOL_CLAIM.chain,
    });
  };

  const pending = inFrame ? fcPending : wagmiPending;
  const sent    = inFrame ? !!txHash  : wagmiSent;
  const hash    = inFrame ? txHash    : wagmiHash;
  const error   = inFrame ? fcError   : '';

  return (
    <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-orange-400 text-xs tracking-widest mb-1">SAOL CLAIM — ADMIN</div>
          <div className="text-white/60 text-xs">
            Status:{' '}
            <span className={claimOpen ? 'text-green-400' : 'text-red-400'}>
              {claimOpen === undefined ? '…' : claimOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <div className="text-white/30 text-xs mt-0.5">{SAOL_CLAIM.address}</div>
        </div>
        <button
          onClick={inFrame ? handleFarcaster : handleWagmi}
          disabled={pending || claimOpen === true}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 disabled:opacity-40 font-bold text-sm transition-all"
        >
          {pending ? 'Sending…' : claimOpen ? 'Claims Open ✓' : 'openClaims() →'}
        </button>
      </div>
      {sent && (
        <p className="text-green-400 text-xs break-all">
          ✓ Sent: {hash}
        </p>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </section>
  );
}
