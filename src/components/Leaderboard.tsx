import { Trophy, Medal, Award } from "lucide-react";

interface LeaderEntry {
  rank: number;
  address: string;
  wins: number;
  streak: number;
}

const mockLeaderboard: LeaderEntry[] = [
  { rank: 1, address: "0x742d...89Ab", wins: 127, streak: 12 },
  { rank: 2, address: "0x8f3e...2Cd4", wins: 98, streak: 8 },
  { rank: 3, address: "0x1a9b...7Ef2", wins: 85, streak: 5 },
  { rank: 4, address: "0x5c6d...3Gh8", wins: 72, streak: 3 },
  { rank: 5, address: "0x9e4f...1Jk5", wins: 61, streak: 4 },
];

export const Leaderboard = () => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-primary" />;
      case 2:
        return <Medal className="w-6 h-6 text-accent" />;
      case 3:
        return <Award className="w-6 h-6 text-muted-foreground" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="neon-border-purple pixel-corners bg-card p-6 relative">
        {/* Title */}
        <h2 className="text-3xl font-bold text-center mb-6 neon-glow-purple flicker">
          [ LEADERBOARD ]
        </h2>

        {/* Leaderboard entries */}
        <div className="space-y-3">
          {mockLeaderboard.map((entry, index) => (
            <div
              key={entry.address}
              className="flex items-center justify-between p-4 bg-background/50 border-2 border-border hover:border-primary transition-all duration-300 pixel-corners"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Rank */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                
                {/* Address */}
                <span className="font-mono text-foreground text-sm md:text-base">
                  {entry.address}
                </span>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-primary font-bold text-lg">{entry.wins}</div>
                  <div className="text-muted-foreground text-xs">WINS</div>
                </div>
                <div className="text-center">
                  <div className="text-accent font-bold text-lg">{entry.streak}</div>
                  <div className="text-muted-foreground text-xs">STREAK</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center text-xs text-muted-foreground font-mono">
          &gt; ALL MOVES ENCRYPTED WITH FHE &lt;
        </div>
      </div>
    </div>
  );
};
