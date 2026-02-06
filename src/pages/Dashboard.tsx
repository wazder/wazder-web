export function Dashboard() {
    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h1>Good Afternoon, User</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Here plays your daily summary.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <h3>Pending Tasks</h3>
                    <p style={{ fontSize: '3rem', fontWeight: 700, margin: '1rem 0' }}>5</p>
                </div>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <h3>Today's Meetings</h3>
                    <p style={{ fontSize: '3rem', fontWeight: 700, margin: '1rem 0' }}>2</p>
                </div>
            </div>
        </div>
    );
}
