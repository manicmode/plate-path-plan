import React, { useMemo } from 'react';
import { useChallenge } from '@/contexts/ChallengeContext';

export default function TrendingChallengesTab() {
  console.log('🎯 TrendingChallengesTab rendering');
  
  const { challenges } = useChallenge();
  
  // Sort challenges by participant count (descending) and take top 5
  const trendingChallenges = useMemo(() => {
    const sorted = [...challenges]
      .sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0))
      .slice(0, 5);
    
    console.log('📈 TrendingChallengesTab sorting results:', {
      totalChallenges: challenges.length,
      trendingChallenges: sorted.length,
      sortedByParticipants: sorted.map(c => ({
        id: c.id,
        name: c.name,
        participantCount: c.participants?.length || 0,
        type: c.type,
        isActive: c.isActive
      }))
    });
    
    return sorted;
  }, [challenges]);

  return (
    <div style={{ padding: '20px', textAlign: 'center', minHeight: '400px' }}>
      <h2 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px'
      }}>
        📈 Trending Challenges
      </h2>
      <p style={{ opacity: 0.8, marginBottom: '32px' }}>Most popular challenges by participation</p>
      
      {trendingChallenges.length === 0 ? (
        <div style={{ 
          marginTop: '60px',
          padding: '40px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <p style={{ fontSize: '1.2em', marginBottom: '8px' }}>No trending challenges available right now.</p>
          <p style={{ opacity: 0.7 }}>✅ Rendering successful, ready for real data</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px', 
            maxWidth: '700px', 
            margin: '0 auto',
            padding: '0 16px'
          }}>
            {trendingChallenges.map((challenge, index) => {
              const participantCount = challenge.participants?.length || 0;
              const isHotTrending = participantCount > 10;
              
              // Rank styling
              const getRankBadge = (rank: number) => {
                switch(rank) {
                  case 0: return { emoji: '🥇', color: '#ffd700', shadow: '0 0 20px rgba(255,215,0,0.6)', text: '#000' };
                  case 1: return { emoji: '🥈', color: '#c0c0c0', shadow: '0 0 20px rgba(192,192,192,0.6)', text: '#000' };
                  case 2: return { emoji: '🥉', color: '#cd7f32', shadow: '0 0 20px rgba(205,127,50,0.6)', text: '#fff' };
                  case 3: return { emoji: '4️⃣', color: '#4a90e2', shadow: '0 0 15px rgba(74,144,226,0.5)', text: '#fff' };
                  default: return { emoji: '5️⃣', color: '#8b5cf6', shadow: '0 0 15px rgba(139,92,246,0.5)', text: '#fff' };
                }
              };
              
              const rankBadge = getRankBadge(index);
              
              return (
                <div 
                  key={challenge.id}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '20px',
                    padding: '24px',
                    position: 'relative',
                    textAlign: 'left',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    transform: 'translateY(0)',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  }}
                >
                  {/* Glowing Rank Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-16px',
                    left: '24px',
                    background: `linear-gradient(135deg, ${rankBadge.color}, ${rankBadge.color}dd)`,
                    color: rankBadge.text,
                    borderRadius: '50%',
                    width: '56px',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5em',
                    fontWeight: 'bold',
                    boxShadow: rankBadge.shadow,
                    border: '3px solid rgba(255,255,255,0.2)',
                    zIndex: 10
                  }}>
                    {rankBadge.emoji}
                  </div>

                  {/* Trending Badge */}
                  {isHotTrending && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '24px',
                      background: 'linear-gradient(135deg, #ff6b6b, #ffa500, #ff1744)',
                      color: 'white',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 16px rgba(255,107,107,0.5), 0 0 20px rgba(255,107,107,0.3)',
                      animation: 'pulse 2s infinite',
                      border: '2px solid rgba(255,255,255,0.3)'
                    }}>
                      🔥 Trending
                    </div>
                  )}
                  
                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ 
                      margin: '0 0 16px 0', 
                      color: '#ffffff',
                      fontSize: '1.5em',
                      fontWeight: 'bold',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      {challenge.name}
                    </h3>
                    
                    {/* Main Content Row */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      marginBottom: '16px'
                    }}>
                      {/* Large Participant Count Pill */}
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981, #059669, #047857)',
                        color: 'white',
                        borderRadius: '30px',
                        padding: '12px 24px',
                        fontSize: '1.3em',
                        fontWeight: 'bold',
                        boxShadow: '0 6px 20px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        minWidth: '140px',
                        textAlign: 'center'
                      }}>
                        👥 {participantCount}
                      </div>
                      
                      {/* Status and Type Badges */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          background: challenge.isActive 
                            ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                            : 'linear-gradient(135deg, #6b7280, #4b5563)',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '0.9em',
                          fontWeight: 'bold',
                          boxShadow: challenge.isActive 
                            ? '0 4px 12px rgba(34,197,94,0.3)' 
                            : '0 4px 12px rgba(107,114,128,0.3)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {challenge.isActive ? '🟢' : '⚪'} {challenge.isActive ? 'Active' : 'Inactive'}
                        </span>
                        
                        <span style={{
                          background: 'rgba(255,255,255,0.1)',
                          padding: '8px 14px',
                          borderRadius: '16px',
                          fontSize: '0.85em',
                          fontWeight: '600',
                          border: '1px solid rgba(255,255,255,0.2)',
                          textTransform: 'capitalize'
                        }}>
                          📂 {challenge.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Goal Description */}
                    <p style={{ 
                      margin: '0', 
                      opacity: 0.85,
                      fontSize: '1em',
                      fontStyle: 'italic',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      💫 {challenge.customGoal || `${challenge.goalType.replace('-', ' ')} challenge`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Add CSS animation for trending badge */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
        `}
      </style>
    </div>
  );
}