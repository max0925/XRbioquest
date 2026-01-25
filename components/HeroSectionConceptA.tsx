/**
 * BioQuest Hero Section - Concept A: "The Centered Statement"
 *
 * Production hero section with deep forest green palette.
 * Desktop-first responsive design.
 */

import React from 'react';

// Deep Forest Green Palette
const colors = {
  primaryGreen: '#2D5A4A',
  primaryDark: '#1E3D32',
  primaryLight: '#E8F0EC',
  accentWarm: '#C4846C',
  accentGold: '#D4A857',
  background: '#FAFAF7',
  textPrimary: '#2C3E38',
  textSecondary: '#5A6B64',
  white: '#FFFFFF',
};

export default function HeroSectionConceptA() {
  return (
    <section style={styles.heroSection}>
      <div style={styles.container}>
        {/* Left Content */}
        <div style={styles.leftContent}>
          {/* Eyebrow Label */}
          <span style={styles.eyebrow}>FOR STEM EDUCATORS</span>

          {/* Main Headline */}
          <h1 style={styles.headline}>
            Create immersive{' '}
            <span style={styles.highlight}>XR learning</span>
            {' '}experiences — no coding required.
          </h1>

          {/* Supporting Paragraph */}
          <p style={styles.supportingText}>
            Design 3D lessons in minutes with AI-powered tools built for your curriculum.
            BioQuest helps you bring abstract science concepts to life for middle and
            high school classrooms.
          </p>

          {/* CTA Group */}
          <div style={styles.ctaGroup}>
            <a href="/creator" style={styles.primaryCta}>
              Start Creating
            </a>
            <a href="#demo" style={styles.secondaryCta}>
              See how it works
              <span style={styles.arrow}>→</span>
            </a>
          </div>

          {/* Trust Indicator */}
          <div style={styles.trustIndicator}>
            <div style={styles.trustDot}></div>
            <span style={styles.trustText}>Trusted by 500+ STEM educators</span>
          </div>
        </div>

        {/* Right Visual */}
        <div style={styles.rightVisual}>
          {/* Placeholder for NanoBanana-generated image */}
          <div style={styles.visualPlaceholder}>
            <img
              src="/hero-xr-learning-scene.svg"
              alt="Students exploring a 3D cell biology model in an XR learning environment"
              style={styles.heroImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  heroSection: {
    backgroundColor: colors.background,
    minHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    padding: '80px 0',
  },

  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 40px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    alignItems: 'center',
  },

  // Left Content Styles
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  eyebrow: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: colors.primaryGreen,
    textTransform: 'uppercase',
  },

  headline: {
    fontSize: '48px',
    fontWeight: 600,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    color: colors.textPrimary,
    margin: 0,
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif',
  },

  highlight: {
    backgroundColor: colors.primaryLight,
    padding: '2px 8px',
    borderRadius: '4px',
    color: colors.primaryGreen,
  },

  supportingText: {
    fontSize: '18px',
    lineHeight: 1.6,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: '480px',
    fontFamily: '"Inter", -apple-system, sans-serif',
  },

  ctaGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginTop: '8px',
  },

  primaryCta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 28px',
    backgroundColor: colors.primaryGreen,
    color: colors.white,
    fontSize: '16px',
    fontWeight: 500,
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 150ms ease',
    cursor: 'pointer',
    border: 'none',
    fontFamily: '"Inter", -apple-system, sans-serif',
  },

  secondaryCta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: colors.primaryGreen,
    fontSize: '16px',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 150ms ease',
    cursor: 'pointer',
    fontFamily: '"Inter", -apple-system, sans-serif',
  },

  arrow: {
    fontSize: '18px',
    transition: 'transform 150ms ease',
  },

  trustIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
  },

  trustDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: colors.primaryGreen,
    opacity: 0.6,
  },

  trustText: {
    fontSize: '14px',
    color: colors.textSecondary,
    fontFamily: '"Inter", -apple-system, sans-serif',
  },

  // Right Visual Styles
  rightVisual: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  visualPlaceholder: {
    width: '100%',
    maxWidth: '520px',
    aspectRatio: '1 / 1',
    backgroundColor: colors.primaryLight,
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
};
