import DarkVeil from './DarkVeil';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <DarkVeil hueShift={120} speed={1.1} warpAmount={0.35} />
    </div>
  );
}
