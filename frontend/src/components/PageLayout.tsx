import Starfield from './Starfield'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#07080f' }}>
      <Starfield />
      <Navbar />
      <Sidebar />
      <main style={{ marginLeft: 200, paddingTop: 49, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        <div style={{ padding: '2rem 2.5rem' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
