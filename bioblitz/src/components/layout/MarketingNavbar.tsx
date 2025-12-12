import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Zap, House, Trophy, Menu, X } from "lucide-react"; 

export default function MarketingNavbar() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <nav className="fixed w-full bg-black z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/home" className="flex items-center space-x-2 group">
            <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              BioBlitz
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <Link href="/contests" className="hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 text-medium">
              Contests
            </Link>
            {!loading && !isAuthenticated && (
              <Link href="/auth" className="hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 text-medium">
                Sign Up
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}