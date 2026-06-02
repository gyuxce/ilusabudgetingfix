import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Briefcase } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FEFAE0] p-4 font-sans text-[#283618]">
      <div className="w-full max-w-md rounded-xl bg-white/85 p-8 border border-[#DDA15E]/35 shadow-xl shadow-[#283618]/10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-[#283618] rounded-md flex flex-shrink-0 items-center justify-center text-[#FEFAE0] mb-4 shadow-sm shadow-[#283618]/20">
            <Briefcase size={20} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#283618]">Ilusa Budget Controlling</h1>
          <p className="text-sm text-[#606C38] mt-1">Sign in to continue</p>
        </div>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#283618] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-[#DDA15E]/60 bg-white/90 px-3 py-2 text-sm text-[#283618] focus:border-[#606C38] focus:outline-none focus:ring-1 focus:ring-[#606C38]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#283618] mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-[#DDA15E]/60 bg-white/90 px-3 py-2 text-sm text-[#283618] focus:border-[#606C38] focus:outline-none focus:ring-1 focus:ring-[#606C38]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full justify-center rounded-md border border-transparent bg-[#283618] px-4 py-2 text-sm font-medium text-[#FEFAE0] transition-colors hover:bg-[#606C38] focus:outline-none focus:ring-2 focus:ring-[#606C38] focus:ring-offset-1 focus:ring-offset-[#FEFAE0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
