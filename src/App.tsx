import DarkVeil from './DarkVeil';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <DarkVeil hueShift={120} speed={1.1} warpAmount={0.35} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(24px, 5vw, 72px)',
        color: '#ffffff',
        letterSpacing: '0.02em',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        in progress...
      </div>
    </div>
  );
}
