import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
export default function MarketingNavbar() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <nav className="w-full bg-black sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <span className="text-white text-2xl font-bold tracking-widest uppercase">
              <Link href='/'>BioBlitz</Link>
            </span>
          </div>

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