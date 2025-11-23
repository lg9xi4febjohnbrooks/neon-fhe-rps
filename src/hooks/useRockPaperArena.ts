/**
 * Hook for interacting with RockPaperArena smart contract
 *
 * Provides methods for creating matches, joining matches,
 * submitting encrypted moves, and revealing results
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { RockPaperArenaABI } from '@/contracts/RockPaperArena';
import { CONTRACT_ADDRESS } from '@/config/wagmi';
import { encryptUint8 } from '@/utils/fheInstance';
import { toast } from 'sonner';

export type Gesture = 0 | 1 | 2; // Rock=0, Paper=1, Scissors=2

export class AlreadyInMatchError extends Error {
  matchId: bigint;
  constructor(matchId: bigint) {
    super(`Already in match ${matchId}`);
    this.name = 'AlreadyInMatchError';
    this.matchId = matchId;
  }
}

export type MatchState = {
  matchId: bigint;
  player1: string;
  player2: string;
  player1Committed: boolean;
  player2Committed: boolean;
  createdAt: bigint;
  state: number; // 0=None, 1=Waiting, 2=BothCommitted, 3=Revealed, 4=Cancelled
  winner: string;
};

/**
 * Hook to interact with RockPaperArena contract
 */
export function useRockPaperArena() {
  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Create a new match challenge
   * Returns transaction hash that can be used with useWaitForTransactionReceipt
   */
  const createChallenge = async () => {
    if (!address) {
      toast.error('Please connect wallet');
      return null;
    }

    try {
      toast.info('Creating match...');

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RockPaperArenaABI,
        functionName: 'createChallenge',
        args: [],
        gas: 500000n, // Explicitly set gas limit to 500k
      });

      return hash;
    } catch (error) {
      console.error('Create challenge error:', error);
      toast.error('Failed to create match');
      throw error;
    }
  };

  /**
   * Accept an existing match challenge
   */
  const acceptChallenge = async (matchId: number) => {
    if (!address) {
      toast.error('Please connect wallet');
      return null;
    }

    try {
      toast.info('Joining match...');

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RockPaperArenaABI,
        functionName: 'acceptChallenge',
        args: [BigInt(matchId)],
      });

      toast.success('Match joined successfully!');
      return hash;
    } catch (error) {
      console.error('Accept challenge error:', error);
      toast.error('Failed to join match');
      throw error;
    }
  };

  /**
   * Submit encrypted move for a match
   */
  const submitMove = async (matchId: number, gesture: Gesture) => {
    if (!address) {
      toast.error('Please connect wallet');
      return null;
    }

    try {
      toast.info('Encrypting your move...');

      // Encrypt the gesture using FHE
      const { handle, inputProof } = await encryptUint8(
        gesture,
        CONTRACT_ADDRESS,
        address
      );

      toast.info('Submitting encrypted move...');

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RockPaperArenaABI,
        functionName: 'submitMove',
        args: [BigInt(matchId), handle as any, inputProof as `0x${string}`],
      });

      toast.success('Move submitted successfully!');
      return hash;
    } catch (error) {
      console.error('Submit move error:', error);
      toast.error('Failed to submit move');
      throw error;
    }
  };

  /**
   * Request reveal for a match
   */
  const requestReveal = async (matchId: number) => {
    if (!address) {
      toast.error('Please connect wallet');
      return null;
    }

    try {
      toast.info('Requesting match reveal...');

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RockPaperArenaABI,
        functionName: 'requestReveal',
        args: [BigInt(matchId)],
      });

      toast.success('Match reveal requested!');
      return hash;
    } catch (error) {
      console.error('Request reveal error:', error);
      toast.error('Failed to request reveal');
      throw error;
    }
  };

  /**
   * Cancel a match (only player1 before player2 joins)
   */
  const cancelMatch = async (matchId: number) => {
    if (!address) {
      toast.error('Please connect wallet');
      return null;
    }

    try {
      toast.info('Cancelling match...');

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RockPaperArenaABI,
        functionName: 'cancelMatch',
        args: [BigInt(matchId)],
      });

      toast.success('Match cancelled');
      return hash;
    } catch (error) {
      console.error('Cancel match error:', error);
      toast.error('Failed to cancel match');
      throw error;
    }
  };

  return {
    createChallenge,
    acceptChallenge,
    submitMove,
    requestReveal,
    cancelMatch,
    isPending,
    isConfirming,
    isSuccess,
  };
}

/**
 * Hook to read match data with optional polling
 */
export function useMatchData(matchId: number, enablePolling: boolean = false) {
  const { data: matchData, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: RockPaperArenaABI,
    functionName: 'getMatch',
    args: [BigInt(matchId)],
    query: {
      enabled: matchId > 0,
      refetchInterval: enablePolling ? 3000 : false, // Poll every 3 seconds if enabled
    },
  });

  return {
    match: matchData as MatchState | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get pending matches
 */
export function usePendingMatches() {
  const { data: pendingMatches, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: RockPaperArenaABI,
    functionName: 'getPendingMatches',
  });

  return {
    pendingMatches: (pendingMatches as bigint[]) || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get player stats
 */
export function usePlayerStats(playerAddress?: string) {
  const { address } = useAccount();
  const targetAddress = playerAddress || address;

  const { data: stats, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: RockPaperArenaABI,
    functionName: 'getPlayerStats',
    args: [targetAddress as `0x${string}`],
    query: {
      enabled: !!targetAddress,
    },
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get player's active match
 */
export function usePlayerActiveMatch(playerAddress?: string) {
  const { address } = useAccount();
  const targetAddress = playerAddress || address;

  const { data: activeMatchId, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: RockPaperArenaABI,
    functionName: 'playerActiveMatch',
    args: [targetAddress as `0x${string}`],
    query: {
      enabled: !!targetAddress,
    },
  });

  return {
    activeMatchId: (activeMatchId as bigint) || BigInt(0),
    hasActiveMatch: activeMatchId !== undefined && activeMatchId !== BigInt(0),
    isLoading,
    error,
    refetch,
  };
}
