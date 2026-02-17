import DarkVeil from './DarkVeil';

export default function App() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <DarkVeil hueShift={120} speed={1.1} warpAmount={0.35} />
      <span style={{
        position: 'relative',
        zIndex: 1,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontWeight: 600,
        fontSize: 'clamp(18px, 3vw, 48px)',
        color: '#ffffff',
        letterSpacing: '-0.02em',
        textRendering: 'geometricPrecision',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        in progress...
      </span>
    </div>
  );
}
