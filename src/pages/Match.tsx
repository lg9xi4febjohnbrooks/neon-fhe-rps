import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Zap } from "lucide-react";
import { toast } from "sonner";

type Gesture = 0 | 1 | 2 | null; // 0=Rock, 1=Paper, 2=Scissors

export default function Match() {
  const navigate = useNavigate();
  const [selectedGesture, setSelectedGesture] = useState<Gesture>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isMatching, setIsMatching] = useState(true);
  const [opponent, setOpponent] = useState<string | null>(null);

  const gestures = [
    { id: 0 as Gesture, name: "ROCK", symbol: "✊", color: "primary" },
    { id: 1 as Gesture, name: "PAPER", symbol: "✋", color: "accent" },
    { id: 2 as Gesture, name: "SCISSORS", symbol: "✌️", color: "muted-foreground" },
  ];

  const handleGestureSelect = (gesture: Gesture) => {
    setSelectedGesture(gesture);
  };

  const handleEncryptAndSubmit = async () => {
    if (selectedGesture === null) {
      toast.error("SELECT A GESTURE FIRST!");
      return;
    }

    setIsEncrypting(true);
    
    // Simulate FHE encryption process
    toast.info("ENCRYPTING YOUR MOVE WITH FHE...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate sending encrypted data
    toast.success(`ENCRYPTED GESTURE [${selectedGesture}] SENT!`);
    
    setIsEncrypting(false);
    
    // Simulate waiting for result
    setTimeout(() => {
      toast.success("MATCH COMPLETE! CHECK RESULTS");
    }, 3000);
  };

  // Simulate finding opponent
  useState(() => {
    const timer = setTimeout(() => {
      setIsMatching(false);
      setOpponent("0x8f3e...2Cd4");
      toast.success("OPPONENT FOUND! MAKE YOUR MOVE");
    }, 2000);
    
    return () => clearTimeout(timer);
  });

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
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-accent" />
            <span className="font-mono text-muted-foreground">FHE PROTECTED</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Matching status */}
        {isMatching ? (
          <div className="text-center py-20">
            <div className="inline-block neon-border-pink pixel-corners p-12 bg-card">
              <Zap className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse-glow" />
              <h2 className="text-3xl font-bold neon-glow-pink mb-4">
                FINDING OPPONENT...
              </h2>
              <div className="flex justify-center gap-2 mt-6">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0s" }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Versus Layout */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Player */}
              <div className="text-center">
                <div className="neon-border-purple pixel-corners p-6 bg-card">
                  <h3 className="text-xl font-bold neon-glow-purple mb-2">YOU</h3>
                  <div className="text-6xl mb-2">🎮</div>
                  <div className="font-mono text-sm text-muted-foreground">0x742d...89Ab</div>
                  {selectedGesture !== null && (
                    <div className="mt-4 p-2 bg-background border-2 border-primary">
                      <Lock className="w-6 h-6 mx-auto text-primary" />
                      <div className="text-xs text-primary mt-1">ENCRYPTED</div>
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
                  <div className="font-mono text-sm text-muted-foreground">{opponent}</div>
                  <div className="mt-4 p-2 bg-background border-2 border-accent">
                    <Lock className="w-6 h-6 mx-auto text-accent" />
                    <div className="text-xs text-accent mt-1">WAITING...</div>
                  </div>
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
