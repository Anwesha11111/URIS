import Starfield from './Starfield'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-950">
      <Starfield />
      <Navbar />
      <Sidebar />
      {/* md:ml-52 matches the sidebar width (w-[200px]) — on mobile the sidebar
          is a drawer overlay so no margin is needed */}
      <main className="md:ml-52 pt-[49px] min-h-screen relative z-10">
        <div className="px-4 md:px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
