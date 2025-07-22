import React from 'react';
import { useChallenge } from '@/contexts/ChallengeContext';

export default function PublicChallengesTab() {
  console.log('🎯 PublicChallengesTab rendering');
  
  const { challenges } = useChallenge();
  
  console.log('📊 PublicChallengesTab challenges data:', {
    challengesCount: challenges?.length || 0,
    challenges: challenges
  });

  return (
    <div style={{ 
      padding: '20px', 
      background: 'rgba(255,255,255,0.1)', 
      borderRadius: '8px',
      color: 'white' 
    }}>
      <h2>🌍 Public Challenges</h2>
      
      {!challenges || challenges.length === 0 ? (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>No public challenges available yet.</p>
          <p>✅ Component rendering successfully</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p style={{ marginBottom: '20px' }}>
            Found {challenges.length} active public challenge{challenges.length !== 1 ? 's' : ''}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {challenges.map((challenge) => (
              <div 
                key={challenge.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', color: '#ffd700' }}>
                  {challenge.name}
                </h3>
                
                <p style={{ margin: '0 0 12px 0', opacity: 0.9 }}>
                  {challenge.customGoal || `${challenge.goalType.replace('-', ' ')} challenge`}
                </p>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '8px',
                  fontSize: '0.9em',
                  opacity: 0.8
                }}>
                  <div>
                    <strong>Status:</strong> {challenge.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div>
                    <strong>Start:</strong> {challenge.startDate ? challenge.startDate.toLocaleDateString() : 'Not set'}
                  </div>
                  <div>
                    <strong>End:</strong> {challenge.endDate ? challenge.endDate.toLocaleDateString() : 'Not set'}
                  </div>
                  <div>
                    <strong>Participants:</strong> {challenge.participants?.length || 0}
                  </div>
                  <div>
                    <strong>Type:</strong> {challenge.type}
                  </div>
                  <div>
                    <strong>Goal:</strong> {challenge.goalType}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}