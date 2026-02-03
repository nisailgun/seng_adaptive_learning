import React, { useState } from 'react';
import { generateInitialPath } from '../api';
import { Sparkles, BookOpen, Target, TrendingUp } from 'lucide-react';

export default function InitialPathGenerator({ token, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [externalScores, setExternalScores] = useState({
    reading: 50,
    writing: 50,
    listening: 50,
    speaking: 50
  });
  const [hasExternalScores, setHasExternalScores] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([
    'reading', 'writing', 'listening', 'speaking'
  ]);

  const handleScoreChange = (skill, value) => {
    setExternalScores(prev => ({ ...prev, [skill]: parseInt(value) || 0 }));
  };

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const options = {
        targetSkills: selectedSkills,
        externalScores: hasExternalScores ? externalScores : null,
      };
      const path = await generateInitialPath(token, options);
      onComplete(path);
    } catch (err) {
      alert('Failed to generate learning path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '40px',
      maxWidth: 900,
      margin: '0 auto',
      minHeight: '100vh',
      color: 'white',
      background: '#0f172a'
    }}>

      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          background: 'linear-gradient(135deg,#6366f1,#22d3ee)'
        }}>
          <Sparkles size={40} color="#020617" />
        </div>

        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          marginBottom: 10,
          background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Create Your Learning Path
        </h1>

        <p style={{ opacity: 0.6, fontSize: 18 }}>
          Personalized learning journey tailored to your goals
        </p>
      </div>

      {/* PROGRESS */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 40
      }}>
        {[1, 2, 3].map(num => (
          <div key={num}
            style={{
              width: 50,
              height: 4,
              borderRadius: 2,
              background: step >= num ? '#6366f1' : 'rgba(255,255,255,0.1)',
              transition: '0.3s'
            }}
          />
        ))}
      </div>

      {/* CARD CONTAINER */}
      <div style={{
        background: '#020617',
        padding: 40,
        borderRadius: 20,
        boxShadow: '0 40px 120px rgba(0,0,0,0.5)'
      }}>
        
        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20 }}>
              Welcome to Adaptive AI Learn
            </h2>
            <p style={{ opacity: 0.6, lineHeight: 1.6, marginBottom: 30 }}>
              Our AI-powered system dynamically builds your learning path based on your skill level and progress.
            </p>

            {/* FEATURES */}
            <div style={{ display: 'grid', gap: 20, marginBottom: 40 }}>
              {[
                { icon: Target, title: 'Personalized Path', desc: 'Content adapted to your level' },
                { icon: TrendingUp, title: 'Adaptive Learning', desc: 'Difficulty adjusts as you grow' },
                { icon: BookOpen, title: 'Four Skills', desc: 'Reading, Writing, Listening, Speaking' }
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{
                  display: 'flex',
                  padding: 18,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(12px)',
                  gap: 16
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={24} color="#020617" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
                    <p style={{ opacity: 0.6, fontSize: 14 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              style={btnPrimary}
            >
              Get Started →
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
              Select Skills to Improve
            </h2>
            <p style={{ opacity: 0.6, marginBottom: 30 }}>
              Choose all skills you want to focus on.
            </p>

            {/* SKILL BUTTONS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginBottom: 30
            }}>
              {[
                { skill: 'reading', label: 'Reading', emoji: '📖' },
                { skill: 'writing', label: 'Writing', emoji: '✍️' },
                { skill: 'listening', label: 'Listening', emoji: '👂' },
                { skill: 'speaking', label: 'Speaking', emoji: '🗣️' }
              ].map(({ skill, label, emoji }) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedSkills.includes(skill)
                      ? 'linear-gradient(135deg,#6366f1,#22d3ee)'
                      : 'rgba(255,255,255,0.05)',
                    color: selectedSkills.includes(skill)
                      ? '#020617'
                      : 'white',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    fontWeight: 700
                  }}
                >
                  <span style={{ fontSize: 24 }}>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* EXTERNAL SCORES SWITCH */}
            <div style={{
              padding: 20,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.05)',
              marginBottom: 20
            }}>
              <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={hasExternalScores}
                  onChange={(e) => setHasExternalScores(e.target.checked)}
                />
                Use previous test scores for calibration
              </label>
            </div>

            {/* SCORE SECTION */}
            {hasExternalScores && (
              <div style={{
                padding: 20,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 30
              }}>
                <h3 style={{ marginBottom: 20 }}>Enter Scores (0 - 100)</h3>
                {Object.keys(externalScores).map(skill => (
                  <div key={skill} style={{ marginBottom: 18 }}>
                    <label style={{ textTransform: 'capitalize', opacity: 0.7 }}>
                      {skill}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={externalScores[skill]}
                      onChange={(e) => handleScoreChange(skill, e.target.value)}
                      style={{ width: '100%' }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      opacity: 0.6
                    }}>
                      <span>Beginner</span>
                      <span style={{ color: '#6366f1', fontWeight: 800 }}>
                        {externalScores[skill]}
                      </span>
                      <span>Advanced</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={btnGhost}>← Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedSkills.length === 0}
                style={{
                  ...btnPrimary,
                  opacity: selectedSkills.length > 0 ? 1 : 0.4,
                  cursor: selectedSkills.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20 }}>
              Ready to Generate Your Path!
            </h2>
            <p style={{ opacity: 0.6, marginBottom: 30 }}>
              Review your selections before continuing.
            </p>

            {/* SUMMARY CARD */}
            <div style={{
              padding: 24,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.05)',
              marginBottom: 30
            }}>
              <h3 style={{ opacity: 0.7, marginBottom: 10 }}>Selected Skills:</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedSkills.map(skill => (
                  <span key={skill} style={{
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
                    borderRadius: 20,
                    color: '#020617',
                    fontWeight: 700,
                    textTransform: 'capitalize'
                  }}>
                    {skill}
                  </span>
                ))}
              </div>

              {hasExternalScores && (
                <>
                  <h3 style={{ opacity: 0.7, margin: '20px 0 10px' }}>Scores:</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10
                  }}>
                    {Object.entries(externalScores).map(([skill, val]) => (
                      <div key={skill}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.08)'
                        }}
                      >
                        <span style={{ textTransform: 'capitalize', opacity: 0.6 }}>
                          {skill}:
                        </span>
                        <strong style={{ marginLeft: 8, color: '#6366f1' }}>
                          {val}
                        </strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* BUTTONS */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(2)} style={btnGhost}>← Back</button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  ...btnPrimary,
                  opacity: loading ? 0.4 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? "Generating..." : "Generate Path ✨"}
              </button>
            </div>
          </>
        )}

      </div>

    </div>
  );
}

/* === BUTTON STYLES (Account.jsx ile uyumlu) === */

const btnPrimary = {
  padding: '14px 22px',
  border: 'none',
  borderRadius: 10,
  background: '#6366f1',
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const btnGhost = {
  ...btnPrimary,
  background: 'rgba(255,255,255,0.1)',
};
