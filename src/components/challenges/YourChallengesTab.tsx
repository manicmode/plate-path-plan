import React, { useMemo } from 'react';
import { useChallenge } from '@/contexts/ChallengeContext';

export default function YourChallengesTab() {
  console.log('🎯 YourChallengesTab rendering');
  
  const { challenges } = useChallenge();
  
  // For now, using hardcoded user ID that matches the context
  const currentUserId = 'current-user-id';
  
  // Filter challenges where current user is a participant
  const userChallenges = useMemo(() => {
    const filtered = challenges.filter(challenge => 
      challenge.participants.includes(currentUserId)
    );
    
    console.log('📊 YourChallengesTab filtering results:', {
      totalChallenges: challenges.length,
      userChallenges: filtered.length,
      currentUserId,
      filteredChallenges: filtered.map(c => ({
        id: c.id,
        name: c.name,
        participants: c.participants,
        isUserParticipant: c.participants.includes(currentUserId)
      }))
    });
    
    return filtered;
  }, [challenges, currentUserId]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>🧑‍🤝‍🧑 Your Challenges</h2>
      
      {userChallenges.length === 0 ? (
        <div style={{ marginTop: '20px' }}>
          <p>You're not participating in any challenges yet.</p>
          <p>✅ Component rendering successfully</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p style={{ marginBottom: '20px' }}>
            You're participating in {userChallenges.length} challenge{userChallenges.length !== 1 ? 's' : ''}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {userChallenges.map((challenge) => {
              const userProgress = challenge.progress[currentUserId] || 0;
              const isCompleted = userProgress >= 100;
              
              return (
                <div 
                  key={challenge.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 style={{ margin: '0', color: '#ffd700' }}>
                      {challenge.name}
                    </h3>
                    <button 
                      style={{
                        background: 'rgba(255,0,0,0.2)',
                        border: '1px solid rgba(255,0,0,0.4)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.8em',
                        cursor: 'pointer'
                      }}
                      onClick={() => console.log('Leave challenge clicked:', challenge.id)}
                    >
                      Leave Challenge
                    </button>
                  </div>
                  
                  <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>
                    {challenge.customGoal || `${challenge.goalType.replace('-', ' ')} challenge`}
                  </p>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '12px',
                    fontSize: '0.9em',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <strong>Status:</strong> 
                      <span style={{ 
                        color: isCompleted ? '#4ade80' : challenge.isActive ? '#60a5fa' : '#94a3b8',
                        marginLeft: '4px'
                      }}>
                        {isCompleted ? 'Completed' : challenge.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <strong>Progress:</strong> 
                      <span style={{ 
                        color: userProgress > 0 ? '#4ade80' : '#94a3b8',
                        marginLeft: '4px'
                      }}>
                        {userProgress}%
                      </span>
                    </div>
                    <div>
                      <strong>Start:</strong> {challenge.startDate.toLocaleDateString()}
                    </div>
                    <div>
                      <strong>End:</strong> {challenge.endDate.toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Type:</strong> {challenge.type}
                    </div>
                    <div>
                      <strong>Goal:</strong> {challenge.goalType}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${userProgress}%`,
                        height: '100%',
                        background: userProgress > 0 ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'rgba(255,255,255,0.2)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
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