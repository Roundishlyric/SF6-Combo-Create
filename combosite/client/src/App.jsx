import { lazy, Suspense, useEffect, useState } from 'react';
import { getSession, loginUser, logoutUser, registerUser, updateSessionUser } from './lib/api.js';
import SkeletonLoader from './components/SkeletonLoader.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Create = lazy(() => import('./pages/Create.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Combos = lazy(() => import('./pages/Combos.jsx'));
const MyCombos = lazy(() => import('./pages/MyCombos.jsx'));

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState(getSession);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  const login = async (credentials) => {
    const session = await loginUser(credentials);
    setUser(session);
    navigate('/home');
  };

  const register = async (details) => {
    const session = await registerUser(details);
    setUser(session);
    navigate('/home');
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    navigate('/login');
  };

  const updateUser = (details) => setUser(updateSessionUser(details));

  let page;

  if (path === '/register') {
    page = user ? <Home navigate={navigate} user={user} /> : <Register navigate={navigate} onRegister={register} />;
  } else if (path === '/login') {
    page = user ? <Home navigate={navigate} user={user} /> : <Login navigate={navigate} onLogin={login} />;
  } else if (path === '/' || path === '/home') {
    page = <Home navigate={navigate} user={user} />;
  } else if (path === '/combos') {
    page = <Combos navigate={navigate} user={user} />;
  } else if (!user) {
    page = <Login navigate={navigate} onLogin={login} />;
  } else if (path === '/create') {
    page = <Create navigate={navigate} user={user} />;
  } else if (path === '/my-combos') {
    page = <MyCombos navigate={navigate} user={user} />;
  } else if (path === '/profile' || path.startsWith('/profile/')) {
    const profileId = path.startsWith('/profile/') ? decodeURIComponent(path.slice('/profile/'.length)) : user.id;
    page = <Profile navigate={navigate} user={user} profileId={profileId} onLogout={logout} onUserUpdate={updateUser} />;
  } else {
    page = <Home navigate={navigate} user={user} />;
  }

  return <Suspense fallback={<div className="route-loading"><SkeletonLoader variant="card" count={3} /></div>}>{page}</Suspense>;
}

export default App;
