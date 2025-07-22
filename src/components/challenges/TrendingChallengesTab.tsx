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
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>📈 Trending Challenges</h2>
      
      {trendingChallenges.length === 0 ? (
        <div style={{ marginTop: '20px' }}>
          <p>No trending challenges available right now.</p>
          <p>✅ Rendering successful, ready for real data</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p style={{ marginBottom: '24px', fontSize: '1.1em', fontWeight: 'bold' }}>
            🏆 Top {trendingChallenges.length} Most Popular Challenges
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
            {trendingChallenges.map((challenge, index) => {
              const participantCount = challenge.participants?.length || 0;
              const isHotTrending = participantCount > 10;
              const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#4a90e2', '#8b5cf6'];
              const rankColor = rankColors[index] || '#6b7280';
              
              return (
                <div 
                  key={challenge.id}
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
                    border: `2px solid ${rankColor}`,
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Rank Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '16px',
                    background: rankColor,
                    color: index < 3 ? 'black' : 'white',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '0.9em',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}>
                    #{index + 1}
                  </div>

                  {/* Trending Badge */}
                  {isHotTrending && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '16px',
                      background: 'linear-gradient(45deg, #ff6b6b, #ffa500)',
                      color: 'white',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '0.8em',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(255,107,107,0.4)'
                    }}>
                      🔥 Trending
                    </div>
                  )}
                  
                  <div style={{ marginTop: '8px' }}>
                    <h3 style={{ 
                      margin: '0 0 12px 0', 
                      color: '#ffd700',
                      fontSize: '1.3em',
                      fontWeight: 'bold'
                    }}>
                      {challenge.name}
                    </h3>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      {/* Participant Count Badge */}
                      <div style={{
                        background: 'linear-gradient(45deg, #4ade80, #22c55e)',
                        color: 'white',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '1.1em',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 6px rgba(74,222,128,0.3)'
                      }}>
                        👥 {participantCount} participant{participantCount !== 1 ? 's' : ''}
                      </div>
                      
                      {/* Challenge Info */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px',
                        fontSize: '0.9em',
                        opacity: 0.9
                      }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.1)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                          📂 {challenge.type}
                        </span>
                        
                        <span style={{
                          background: challenge.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(156,163,175,0.2)',
                          color: challenge.isActive ? '#4ade80' : '#94a3b8',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${challenge.isActive ? 'rgba(74,222,128,0.4)' : 'rgba(156,163,175,0.4)'}`,
                          fontWeight: 'bold'
                        }}>
                          {challenge.isActive ? '🟢 Active' : '⚪ Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Goal Description */}
                    <p style={{ 
                      margin: '12px 0 0 0', 
                      opacity: 0.8,
                      fontSize: '0.95em',
                      fontStyle: 'italic'
                    }}>
                      {challenge.customGoal || `${challenge.goalType.replace('-', ' ')} challenge`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}