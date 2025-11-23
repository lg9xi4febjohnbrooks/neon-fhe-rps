/**
 * Match Page Component
 *
 * Handles Rock Paper Scissors match gameplay with FHE encryption
 * - Creates/joins matches via smart contract
 * - Encrypts moves with FHE before submission
 * - Displays match state and opponent info
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Zap, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRockPaperArena, useMatchData, usePlayerActiveMatch, type Gesture } from "@/hooks/useRockPaperArena";
import { initializeFHE, isFHEInitialized } from "@/utils/fheInstance";
import { decodeEventLog } from "viem";
import { RockPaperArenaABI } from "@/contracts/RockPaperArena";
import { CONTRACT_ADDRESS } from "@/config/wagmi";

type GestureOrNull = Gesture | null;

export default function Match() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const matchIdParam = searchParams.get('id');

  console.log('[Match] Component loaded with URL param:', matchIdParam);

  const { address, isConnected } = useAccount();
  const { createChallenge, submitMove, requestReveal, isPending } = useRockPaperArena();
  const { activeMatchId, hasActiveMatch, isLoading: loadingActiveMatch } = usePlayerActiveMatch();

  const [selectedGesture, setSelectedGesture] = useState<GestureOrNull>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [fheReady, setFheReady] = useState(false);
  const [createTxHash, setCreateTxHash] = useState<`0x${string}` | undefined>();

  // Use matchIdParam from URL directly, or fall back to 0
  const matchId = matchIdParam ? parseInt(matchIdParam) : 0;
  console.log('[Match] Computed matchId:', matchId);

  // Get match data if matchId exists - enable polling to detect opponent joining
  const { match, refetch: refetchMatch } = useMatchData(matchId, matchId > 0);

  // Watch for transaction confirmation
  const { data: receipt, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: createTxHash,
  });
  const publicClient = usePublicClient();

  const isPlayer1 = match?.player1.toLowerCase() === address?.toLowerCase();
  const isPlayer2 = match?.player2.toLowerCase() === address?.toLowerCase();
  const hasCommitted = isPlayer1 ? match?.player1Committed : (isPlayer2 ? match?.player2Committed : false);
  const opponentCommitted = isPlayer1 ? match?.player2Committed : match?.player1Committed;
  const opponent = isPlayer1 ? match?.player2 : match?.player1;

  const gestures = [
    { id: 0 as Gesture, name: "ROCK", symbol: "✊", color: "primary" },
    { id: 1 as Gesture, name: "PAPER", symbol: "✋", color: "accent" },
    { id: 2 as Gesture, name: "SCISSORS", symbol: "✌️", color: "muted-foreground" },
  ];

  // Initialize FHE on mount
  useEffect(() => {
    const initFHE = async () => {
      if (!isFHEInitialized()) {
        try {
          toast.info('Initializing FHE...');
          await initializeFHE();
          setFheReady(true);
          toast.success('FHE initialized successfully!');
        } catch (error) {
          console.error('FHE initialization error:', error);
          toast.error('Failed to initialize FHE');
        }
      } else {
        setFheReady(true);
      }
    };

    initFHE();
  }, []);

  // If player has active match and no matchId in URL, redirect to that match
  useEffect(() => {
    console.log('[Match] Redirect check:', {
      loadingActiveMatch,
      hasActiveMatch,
      matchIdParam,
      activeMatchId: activeMatchId?.toString(),
      matchId
    });

    if (!loadingActiveMatch && hasActiveMatch && !matchIdParam && activeMatchId && activeMatchId !== BigInt(0)) {
      const activeId = Number(activeMatchId);
      console.log('[Match] Player has active match:', activeId, 'redirecting...');
      toast.info(`Redirecting to your active match #${activeId}...`);
      navigate(`/match?id=${activeId}`, { replace: true });
    }
  }, [loadingActiveMatch, hasActiveMatch, activeMatchId, matchIdParam, navigate, matchId]);

  // Handle transaction success and extract matchId from events
  useEffect(() => {
    if (txSuccess && receipt) {
      const matchCreatedLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: RockPaperArenaABI,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === 'MatchCreated';
        } catch {
          return false;
        }
      });

      if (matchCreatedLog) {
        try {
          const decoded = decodeEventLog({
            abi: RockPaperArenaABI,
            data: matchCreatedLog.data,
            topics: matchCreatedLog.topics,
          });

          if (decoded.eventName === 'MatchCreated') {
            const newMatchId = Number(decoded.args.matchId);
            console.log('[Match] Created match ID:', newMatchId);

            toast.success('Match created! Redirecting to match page...');
            setIsCreatingMatch(false);

            // Navigate to the created match - matchId will be read from URL
            navigate(`/match?id=${newMatchId}`, { replace: true });
          }
        } catch (error) {
          console.error('[Match] Failed to decode event:', error);
          setIsCreatingMatch(false);
        }
      } else {
        setIsCreatingMatch(false);
      }
    }
  }, [txSuccess, receipt, navigate]);

  // Handle creating new match
  const handleCreateMatch = async () => {
    if (!isConnected) {
      toast.error('Please connect wallet first');
      return;
    }

    setIsCreatingMatch(true);
    try {
      const hash = await createChallenge();
      if (hash) {
        setCreateTxHash(hash);
        toast.info('Waiting for transaction confirmation...');
      }
    } catch (error) {
      console.error('Create match error:', error);
      setIsCreatingMatch(false);
    }
  };

  const handleGestureSelect = (gesture: Gesture) => {
    console.log('[Match] Gesture select - Address:', address);
    console.log('[Match] Gesture select - Player1:', match?.player1);
    console.log('[Match] Gesture select - Player2:', match?.player2);
    console.log('[Match] Gesture select - isPlayer1:', isPlayer1);
    console.log('[Match] Gesture select - isPlayer2:', isPlayer2);
    console.log('[Match] Gesture select - player1Committed:', match?.player1Committed);
    console.log('[Match] Gesture select - player2Committed:', match?.player2Committed);
    console.log('[Match] Gesture select - hasCommitted:', hasCommitted);

    if (hasCommitted) {
      toast.error('You have already committed your move!');
      return;
    }
    setSelectedGesture(gesture);
  };

  const handleEncryptAndSubmit = async () => {
    if (selectedGesture === null) {
      toast.error("SELECT A GESTURE FIRST!");
      return;
    }

    if (matchId === 0) {
      toast.error("No active match!");
      return;
    }

    if (!fheReady) {
      toast.error("FHE not initialized yet!");
      return;
    }

    setIsEncrypting(true);

    try {
      // Submit encrypted move to contract
      await submitMove(matchId, selectedGesture);

      // Refetch match data
      await refetchMatch();

      toast.success("ENCRYPTED GESTURE SUBMITTED!");
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleReveal = async () => {
    if (matchId === 0) {
      toast.error("No active match!");
      return;
    }

    try {
      toast.info('Requesting match reveal...');
      await requestReveal(matchId);

      // Refetch match data to show results
      setTimeout(async () => {
        await refetchMatch();
        toast.success('Match results revealed!');
      }, 2000);
    } catch (error) {
      console.error('Reveal error:', error);
      toast.error('Failed to reveal match');
    }
  };

  // Show wallet connect if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background scanlines flex items-center justify-center">
        <div className="text-center">
          <div className="neon-border-pink pixel-corners p-12 bg-card">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-3xl font-bold neon-glow-pink mb-4">
              CONNECT WALLET
            </h2>
            <p className="text-muted-foreground mb-6 font-mono">
              Connect your wallet to start playing
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background scanlines">
      {/* Header */}
      <header className="border-b-4 border-primary p-4 bg-surface">
        <div className="container mx-auto flex justify-between items-center">
          <h1
            className="text-2xl md:text-3xl font-bold neon-glow-pink cursor-pointer"
            onClick={() => navigate("/")}
          >
            [ ROCKPAPERFHE ]
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-accent" />
              <span className="font-mono text-muted-foreground hidden md:inline">
                FHE PROTECTED
              </span>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Waiting for match or no match */}
        {matchId === 0 || !match ? (
          <div className="text-center py-20">
            <div className="inline-block neon-border-pink pixel-corners p-12 bg-card">
              <Zap className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl font-bold neon-glow-pink mb-4">
                NO ACTIVE MATCH
              </h2>
              <p className="text-muted-foreground mb-6 font-mono">
                Create a new match to start playing
              </p>
              <Button
                onClick={handleCreateMatch}
                disabled={isCreatingMatch || !fheReady}
                className="neon-border-pink pixel-corners bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-xl px-12 py-6"
              >
                {isCreatingMatch ? 'CREATING...' : 'CREATE MATCH'}
              </Button>
            </div>
          </div>
        ) : match.state === 1 && match.player2 === '0x0000000000000000000000000000000000000000' ? (
          // Waiting for player2 - check both state AND player2 address
          <div className="text-center py-20">
            <div className="inline-block neon-border-pink pixel-corners p-12 bg-card">
              <Zap className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
              <h2 className="text-3xl font-bold neon-glow-pink mb-4">
                WAITING FOR OPPONENT...
              </h2>
              <p className="text-muted-foreground font-mono mb-4">
                Match ID: {matchId}
              </p>
              <p className="text-xs text-muted-foreground font-mono mb-2">
                State: {match.state} | Player2: {match.player2.slice(0, 10)}...
              </p>
              <div className="flex justify-center gap-2 mt-6">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0s" }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        ) : match.state === 3 ? (
          // Match revealed - show results
          <>
            {/* Versus Layout */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Player */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">YOU</h3>
                  <div className="text-6xl mb-2">🎮</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-6xl font-bold neon-glow-pink flicker">
                  VS
                </div>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">OPPONENT</h3>
                  <div className="text-6xl mb-2">👾</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {opponent ? `${opponent.slice(0, 6)}...${opponent.slice(-4)}` : 'Waiting...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="max-w-4xl mx-auto">
              <div className="neon-border-pink pixel-corners p-8 bg-card">
                <h2 className="text-3xl font-bold text-center mb-8 neon-glow-pink">
                  [ MATCH RESULT ]
                </h2>

                {/* Winner announcement */}
                <div className="text-center mb-8">
                  {match.winner === '0x0000000000000000000000000000000000000000' ? (
                    <div>
                      <div className="text-5xl mb-4">🤝</div>
                      <h3 className="text-2xl font-bold text-accent">IT'S A DRAW!</h3>
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-muted-foreground font-mono">
                          Player 1: {match.player1.slice(0, 6)}...{match.player1.slice(-4)}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          Player 2: {match.player2.slice(0, 6)}...{match.player2.slice(-4)}
                        </p>
                      </div>
                    </div>
                  ) : match.winner.toLowerCase() === address?.toLowerCase() ? (
                    <div>
                      <div className="text-5xl mb-4">🏆</div>
                      <h3 className="text-2xl font-bold neon-glow-pink">YOU WIN!</h3>
                    </div>
                  ) : (
                    <div>
                      <div className="text-5xl mb-4">💔</div>
                      <h3 className="text-2xl font-bold text-muted-foreground">YOU LOSE</h3>
                    </div>
                  )}
                </div>

                {/* Winner info */}
                {match.winner !== '0x0000000000000000000000000000000000000000' && (
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground font-mono">
                      Winner: {match.winner.slice(0, 6)}...{match.winner.slice(-4)}
                    </p>
                  </div>
                )}

                {/* Play again button */}
                <div className="text-center">
                  <Button
                    onClick={() => navigate('/')}
                    className="neon-border-pink pixel-corners bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-xl px-12 py-6"
                  >
                    RETURN TO LOBBY
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : match.state === 2 ? (
          // Both committed - show reveal button
          <>
            {/* Versus Layout */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Player */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">YOU</h3>
                  <div className="text-6xl mb-2">🎮</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                  </div>
                  <div className="mt-4 p-2 bg-background border-2 border-primary">
                    <Lock className="w-6 h-6 mx-auto text-primary" />
                    <div className="text-xs text-primary mt-1">COMMITTED</div>
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-6xl font-bold neon-glow-pink flicker">
                  VS
                </div>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">OPPONENT</h3>
                  <div className="text-6xl mb-2">👾</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {opponent ? `${opponent.slice(0, 6)}...${opponent.slice(-4)}` : 'Waiting...'}
                  </div>
                  <div className="mt-4 p-2 bg-background border-2 border-accent">
                    <Lock className="w-6 h-6 mx-auto text-accent" />
                    <div className="text-xs text-accent mt-1">COMMITTED</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reveal Section */}
            <div className="max-w-4xl mx-auto">
              <div className="neon-border-pink pixel-corners p-8 bg-card">
                <h2 className="text-2xl font-bold text-center mb-6 neon-glow-pink">
                  [ BOTH MOVES COMMITTED ]
                </h2>

                <div className="text-center mb-6">
                  <p className="text-muted-foreground font-mono mb-4">
                    Both players have submitted their encrypted moves!
                  </p>
                  <p className="text-accent font-mono">
                    Click the button below to reveal the winner
                  </p>
                </div>

                <div className="text-center">
                  <Button
                    onClick={handleReveal}
                    disabled={isPending}
                    className="neon-border-pink pixel-corners bg-accent hover:bg-accent/80 text-accent-foreground font-bold text-xl px-12 py-6"
                  >
                    {isPending ? (
                      <>
                        <Lock className="w-5 h-5 mr-2 animate-pulse" />
                        REVEALING...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        REVEAL MATCH
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-6 text-center text-xs text-muted-foreground font-mono">
                  &gt; THE SMART CONTRACT WILL DETERMINE THE WINNER &lt;
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Versus Layout */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Player */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">YOU</h3>
                  <div className="text-6xl mb-2">🎮</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                  </div>
                  {hasCommitted && (
                    <div className="mt-4 p-2 bg-background border-2 border-primary">
                      <Lock className="w-6 h-6 mx-auto text-primary" />
                      <div className="text-xs text-primary mt-1">COMMITTED</div>
                    </div>
                  )}
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-6xl font-bold neon-glow-pink flicker">
                  VS
                </div>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">OPPONENT</h3>
                  <div className="text-6xl mb-2">👾</div>
                  <div className="font-mono text-sm text-muted-foreground">
                    {opponent ? `${opponent.slice(0, 6)}...${opponent.slice(-4)}` : 'Waiting...'}
                  </div>
                  {opponentCommitted && (
                    <div className="mt-4 p-2 bg-background border-2 border-accent">
                      <Lock className="w-6 h-6 mx-auto text-accent" />
                      <div className="text-xs text-accent mt-1">COMMITTED</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gesture Selection */}
            <div className="max-w-4xl mx-auto">
              <div className="neon-border-pink pixel-corners p-8 bg-card">
                <h2 className="text-2xl font-bold text-center mb-8 neon-glow-pink">
                  [ SELECT YOUR GESTURE ]
                </h2>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  {gestures.map((gesture) => (
                    <button
                      key={gesture.id}
                      onClick={() => handleGestureSelect(gesture.id)}
                      className={`
                        pixel-corners p-8 text-center transition-all duration-300
                        ${selectedGesture === gesture.id 
                          ? 'bg-primary border-4 border-primary neon-border-pink scale-110' 
                          : 'bg-surface border-2 border-border hover:border-accent'
                        }
                      `}
                      disabled={isEncrypting}
                    >
                      <div className="text-6xl mb-4">{gesture.symbol}</div>
                      <div className="font-bold text-lg">{gesture.name}</div>
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        [{gesture.id}]
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action button */}
                <div className="text-center space-y-4">
                  <Button
                    onClick={handleEncryptAndSubmit}
                    disabled={selectedGesture === null || isEncrypting}
                    className="neon-border-pink pixel-corners bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-xl px-12 py-6 w-full md:w-auto"
                  >
                    {isEncrypting ? (
                      <>
                        <Lock className="w-5 h-5 mr-2 animate-pulse" />
                        ENCRYPTING...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        ENCRYPT & SUBMIT
                      </>
                    )}
                  </Button>
                  
                  <div className="text-xs text-muted-foreground font-mono">
                    &gt; YOUR MOVE WILL BE ENCRYPTED WITH FHE BEFORE SUBMISSION &lt;
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Back button */}
        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="pixel-corners border-2 border-border hover:border-accent font-mono"
          >
            &lt; RETURN TO LOBBY
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-primary p-6 mt-12 bg-surface">
        <div className="container mx-auto text-center text-sm text-muted-foreground font-mono">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-accent" />
            <span>FULLY HOMOMORPHIC ENCRYPTION ENABLED</span>
          </div>
          <div>© 2025 ROCKPAPERFHE - ALL MOVES REMAIN PRIVATE</div>
        </div>
      </footer>
    </div>
  );
}
