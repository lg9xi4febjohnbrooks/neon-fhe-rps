/**
 * Index Page - Home/Lobby
 *
 * Main landing page with game introduction and wallet connection
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/Leaderboard";
import { Gamepad2, Shield, Zap, Lock, Users, Play, XCircle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import heroImage from "@/assets/hero-arcade.jpg";
import { usePlayerActiveMatch, usePendingMatches, useMatchData, useRockPaperArena } from "@/hooks/useRockPaperArena";
import { toast } from "sonner";

// Component to show a single match card
const MatchCard = ({ matchId, onJoin, onContinue, onCancel, isOwn }: {
  matchId: number;
  onJoin?: () => void;
  onContinue?: () => void;
  onCancel?: () => void;
  isOwn?: boolean;
}) => {
  const { match, isLoading } = useMatchData(matchId);

  if (isLoading || !match) {
    return (
      <div className="neon-border-purple pixel-corners p-4 bg-card animate-pulse">
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  const stateLabels: Record<number, string> = {
    0: 'NONE',
    1: 'WAITING',
    2: 'BOTH COMMITTED',
    3: 'REVEALED',
    4: 'CANCELLED'
  };

  // Determine the primary action for this card
  const handleCardClick = () => {
    if (onContinue) {
      onContinue();
    } else if (onJoin) {
      onJoin();
    }
  };

  return (
    <div
      className="neon-border-purple pixel-corners p-4 bg-card cursor-pointer hover:bg-card/80 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs text-muted-foreground font-mono">MATCH ID</span>
          <h4 className="text-xl font-bold neon-glow-pink">#{matchId}</h4>
        </div>
        <span className={`px-2 py-1 text-xs font-mono ${
          match.state === 1 ? 'bg-yellow-500/20 text-yellow-500' :
          match.state === 2 ? 'bg-blue-500/20 text-blue-500' :
          match.state === 3 ? 'bg-green-500/20 text-green-500' :
          'bg-muted text-muted-foreground'
        }`}>
          {stateLabels[match.state] || 'UNKNOWN'}
        </span>
      </div>

      <div className="space-y-2 text-sm font-mono mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Player 1:</span>
          <span className="text-accent">{match.player1.slice(0, 6)}...{match.player1.slice(-4)}</span>
        </div>
        {match.player2 !== '0x0000000000000000000000000000000000000000' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Player 2:</span>
            <span className="text-accent">{match.player2.slice(0, 6)}...{match.player2.slice(-4)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {onContinue && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onContinue();
            }}
            className="flex-1 neon-border-pink pixel-corners bg-primary hover:bg-primary/80"
          >
            <Play className="w-4 h-4 mr-2" />
            CONTINUE
          </Button>
        )}
        {onJoin && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            className="flex-1 neon-border-pink pixel-corners bg-accent hover:bg-accent/80"
          >
            <Users className="w-4 h-4 mr-2" />
            JOIN
          </Button>
        )}
        {onCancel && isOwn && match.state === 1 && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            variant="outline"
            className="pixel-corners border-destructive text-destructive hover:bg-destructive/10"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const { activeMatchId, hasActiveMatch, isLoading: loadingActive } = usePlayerActiveMatch();
  const { pendingMatches, isLoading: loadingPending, refetch: refetchPending } = usePendingMatches();
  const { acceptChallenge, cancelMatch, isPending } = useRockPaperArena();

  const handleJoinMatch = async (matchId: number) => {
    if (hasActiveMatch) {
      toast.error('You already have an active match. Complete or cancel it first.');
      return;
    }

    try {
      console.log('[Index] Joining match:', matchId);
      const hash = await acceptChallenge(matchId);
      if (hash) {
        toast.success('Match joined! Waiting for transaction confirmation...');
        // Refetch pending matches and active match after joining
        setTimeout(() => {
          refetchPending();
          navigate(`/match?id=${matchId}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Join match error:', error);
      toast.error('Failed to join match');
    }
  };

  const handleCancelMatch = async (matchId: number) => {
    try {
      await cancelMatch(matchId);
      toast.success('Match cancelled');
      refetchPending();
    } catch (error) {
      console.error('Cancel match error:', error);
    }
  };

  // Filter pending matches to exclude player's own match
  const availableMatches = (pendingMatches || [])
    .map(id => Number(id))
    .filter(id => id !== Number(activeMatchId));

  return (
    <div className="min-h-screen bg-background scanlines">
      {/* Header/Nav */}
      <header className="border-b-4 border-primary p-4 bg-surface">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold neon-glow-pink flicker">
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

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Hero Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main title */}
            <div className="mb-8 animate-slide-up">
              <h2 className="text-5xl md:text-7xl font-bold neon-glow-pink mb-4 flicker">
                ROCK PAPER
              </h2>
              <h2 className="text-5xl md:text-7xl font-bold neon-glow-purple">
                SCISSORS
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl mb-12 text-foreground font-mono">
              &gt; BATTLE WITH FULLY ENCRYPTED MOVES_
            </p>

            {/* CTA Button */}
            {isConnected ? (
              <Button
                onClick={() => navigate("/match")}
                className="neon-border-pink pixel-corners bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-2xl px-12 py-8 pulse-glow"
              >
                <Gamepad2 className="w-8 h-8 mr-3" />
                ENTER ARENA
              </Button>
            ) : (
              <div className="inline-block">
                <ConnectButton />
              </div>
            )}

            {/* Feature badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <div className="neon-border-purple pixel-corners p-6 bg-card/50">
                <Lock className="w-12 h-12 mx-auto mb-3 text-accent" />
                <h3 className="font-bold text-lg mb-2">FHE ENCRYPTED</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  All moves encrypted before transmission
                </p>
              </div>
              
              <div className="neon-border-purple pixel-corners p-6 bg-card/50">
                <Zap className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="font-bold text-lg mb-2">INSTANT MATCH</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  Real-time opponent pairing
                </p>
              </div>
              
              <div className="neon-border-purple pixel-corners p-6 bg-card/50">
                <Shield className="w-12 h-12 mx-auto mb-3 text-accent" />
                <h3 className="font-bold text-lg mb-2">ZERO KNOWLEDGE</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  Provably fair outcomes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Match Arena Section - Only show when connected */}
      {isConnected && (
        <section className="py-12 bg-surface/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8 neon-glow-pink">
              [ MATCH ARENA ]
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* My Active Match */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  MY ACTIVE MATCH
                </h3>
                {loadingActive ? (
                  <div className="neon-border-purple pixel-corners p-4 bg-card animate-pulse">
                    <div className="h-32 bg-muted rounded"></div>
                  </div>
                ) : hasActiveMatch ? (
                  <MatchCard
                    matchId={Number(activeMatchId)}
                    onContinue={() => {
                      console.log('[Index] CONTINUE clicked, navigating to match:', Number(activeMatchId));
                      navigate(`/match?id=${Number(activeMatchId)}`);
                    }}
                    onCancel={() => handleCancelMatch(Number(activeMatchId))}
                    isOwn={true}
                  />
                ) : (
                  <div className="neon-border-purple pixel-corners p-6 bg-card text-center">
                    <p className="text-muted-foreground font-mono mb-4">
                      No active match
                    </p>
                    <Button
                      onClick={() => navigate("/match")}
                      className="neon-border-pink pixel-corners bg-primary hover:bg-primary/80"
                    >
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      CREATE MATCH
                    </Button>
                  </div>
                )}
              </div>

              {/* Available Matches to Join */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  AVAILABLE MATCHES
                </h3>
                {loadingPending ? (
                  <div className="neon-border-purple pixel-corners p-4 bg-card animate-pulse">
                    <div className="h-32 bg-muted rounded"></div>
                  </div>
                ) : availableMatches.length > 0 ? (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {availableMatches.slice(0, 5).map((matchId) => (
                      <MatchCard
                        key={matchId}
                        matchId={matchId}
                        onJoin={() => handleJoinMatch(matchId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="neon-border-purple pixel-corners p-6 bg-card text-center">
                    <p className="text-muted-foreground font-mono">
                      No matches waiting for opponents
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Create a new match to start playing!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {hasActiveMatch && availableMatches.length > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-4 font-mono">
                * Complete or cancel your current match to join another *
              </p>
            )}
          </div>
        </section>
      )}

      {/* Leaderboard Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-4">
          <Leaderboard />
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="neon-border-pink pixel-corners p-8 bg-card">
            <h2 className="text-3xl font-bold text-center mb-8 neon-glow-pink">
              [ HOW IT WORKS ]
            </h2>
            
            <div className="space-y-6 font-mono text-sm md:text-base">
              <div className="flex gap-4">
                <span className="text-primary font-bold">1.</span>
                <div>
                  <span className="text-accent">CONNECT</span> your wallet and enter the arena
                </div>
              </div>
              
              <div className="flex gap-4">
                <span className="text-primary font-bold">2.</span>
                <div>
                  <span className="text-accent">SELECT</span> your gesture: Rock (0), Paper (1), or Scissors (2)
                </div>
              </div>
              
              <div className="flex gap-4">
                <span className="text-primary font-bold">3.</span>
                <div>
                  <span className="text-accent">ENCRYPT</span> your move with FHE technology - stays private until reveal
                </div>
              </div>
              
              <div className="flex gap-4">
                <span className="text-primary font-bold">4.</span>
                <div>
                  <span className="text-accent">BATTLE</span> - both encrypted moves are submitted on-chain
                </div>
              </div>
              
              <div className="flex gap-4">
                <span className="text-primary font-bold">5.</span>
                <div>
                  <span className="text-accent">REVEAL</span> - smart contract determines winner with zero knowledge proof
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-background border-2 border-accent text-center">
              <p className="text-accent font-bold">
                &gt; NO ONE CAN SEE YOUR MOVE UNTIL THE REVEAL PHASE &lt;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-primary p-6 bg-surface">
        <div className="container mx-auto text-center text-sm text-muted-foreground font-mono">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-accent" />
            <span>POWERED BY FULLY HOMOMORPHIC ENCRYPTION</span>
          </div>
          <div>© 2025 ROCKPAPERFHE - DUEL WITH CONFIDENCE</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
