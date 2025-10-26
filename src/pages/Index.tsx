import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/Leaderboard";
import { Gamepad2, Shield, Zap, Lock } from "lucide-react";
import heroImage from "@/assets/hero-arcade.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background scanlines">
      {/* Header/Nav */}
      <header className="border-b-4 border-primary p-4 bg-surface">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold neon-glow-pink flicker">
            [ ROCKPAPERFHE ]
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-accent" />
            <span className="font-mono text-muted-foreground hidden md:inline">
              FHE PROTECTED
            </span>
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
            <Button
              onClick={() => navigate("/match")}
              className="neon-border-pink pixel-corners bg-primary hover:bg-primary/80 text-primary-foreground font-bold text-2xl px-12 py-8 pulse-glow"
            >
              <Gamepad2 className="w-8 h-8 mr-3" />
              ENTER ARENA
            </Button>

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
