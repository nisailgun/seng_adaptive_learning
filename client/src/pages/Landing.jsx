import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  BookOpen,
  BarChart2,
  Zap,
  Globe2,
  Trophy
} from 'lucide-react';

/* ---------- THEME ---------- */
const theme = {
  bg: '#020617',
  panel: '#020617',
  glass: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  text: '#e5e7eb',
  muted: '#9ca3af',
  primary: '#6366f1'
};

/* ---------- DATA ---------- */
const slides = [
  { title: 'Master English Smarter', sub: 'AI-powered learning that adapts to you' },
  { title: 'Remember What You Learn', sub: 'Science-based spaced repetition system' },
  { title: 'Track Real Progress', sub: 'Data-driven ability measurement' }
];

const features = [
  { icon: <Target />, title: 'Smart Adaptive Learning', desc: 'Questions automatically match your skill level.' },
  { icon: <BookOpen />, title: 'Science-Based Repetition', desc: 'Memory-optimized review timing.' },
  { icon: <BarChart2 />, title: 'Ability Analytics', desc: 'Clear data on your improvement.' },
  { icon: <Zap />, title: 'Focused Micro-Lessons', desc: 'Short sessions, maximum impact.' },
  { icon: <Globe2 />, title: 'Real-World Context', desc: 'Practical English usage examples.' },
  { icon: <Trophy />, title: 'Proven Learning Results', desc: 'Trusted by many learners.' }
];

export default function Landing() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh' }}>

      {/* HEADER */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
        background: theme.glass,
        borderBottom: `1px solid ${theme.border}`
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <strong style={{ fontSize: 20 }}>📘 Adaptive Learner</strong>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: theme.primary,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* HERO */}
      <section style={{
        padding: '120px 20px',
        textAlign: 'center',
        background: `radial-gradient(circle at top, rgba(99,102,241,0.25), transparent)`
      }}>
        <h1 style={{ fontSize: 48, fontWeight: 900 }}>
          {slides[slide].title}
        </h1>
        <p style={{ color: theme.muted, fontSize: 18, marginTop: 12 }}>
          {slides[slide].sub}
        </p>

        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: 32,
            padding: '16px 34px',
            borderRadius: 14,
            border: 'none',
            background: theme.primary,
            color: 'white',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Start Your Learning Journey
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 30 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: i === slide ? theme.primary : theme.border,
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 20px' }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
          gap: 24
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: theme.glass,
              border: `1px solid ${theme.border}`,
              borderRadius: 20,
              padding: 28,
              backdropFilter: 'blur(12px)'
            }}>
              <div style={{ color: theme.primary, marginBottom: 14 }}>
                {React.cloneElement(f.icon, { size: 36 })}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{f.title}</h3>
              <p style={{ color: theme.muted, fontSize: 14, marginTop: 6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '100px 20px',
        textAlign: 'center',
        background: `linear-gradient(135deg, rgba(99,102,241,0.2), transparent)`
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 900 }}>
          Ready to Boost Your English Skills?
        </h2>
        <p style={{ color: theme.muted, marginTop: 10 }}>
          Personalized • Measurable • Effective
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: 30,
            padding: '16px 36px',
            borderRadius: 14,
            border: 'none',
            background: theme.primary,
            color: 'white',
            fontWeight: 800,
            fontSize: 18,
            cursor: 'pointer'
          }}
        >
          Get Started — It's Free
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: 30,
        textAlign: 'center',
        color: theme.muted,
        borderTop: `1px solid ${theme.border}`
      }}>
        © 2026 Adaptive Learner • Version 1.1
      </footer>
    </div>
  );
}
