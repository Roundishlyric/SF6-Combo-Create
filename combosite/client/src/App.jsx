import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { getSession, loginUser, logoutUser, registerUser, updateSessionUser } from './lib/api.js';
import SkeletonLoader from './components/SkeletonLoader.jsx';
import Snackbar from './components/Snackbar.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Home = lazy(() => import('./pages/Home.jsx'));
const Create = lazy(() => import('./pages/Create.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Combos = lazy(() => import('./pages/Combos.jsx'));
const MyCombos = lazy(() => import('./pages/MyCombos.jsx'));
const ComboDetail = lazy(() => import('./pages/ComboDetail.jsx'));

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState(getSession);
  const [snackbar, setSnackbar] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setSnackbar({ message, type, id: Date.now() });
  }, []);
  const closeSnackbar = useCallback(() => setSnackbar(null), []);

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
    notify(`Welcome back, ${session.name}!`);
    navigate('/home');
  };

  const register = async (details) => {
    await registerUser(details);
    notify('Account created successfully. You can now log in.');
    navigate('/login');
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    notify('You have been logged out.');
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
    page = <Create navigate={navigate} user={user} notify={notify} />;
  } else if (path.startsWith('/combos/') && path.endsWith('/edit')) {
    const comboId = decodeURIComponent(path.slice('/combos/'.length, -'/edit'.length));
    page = <Create navigate={navigate} user={user} comboId={comboId} notify={notify} />;
  } else if (path.startsWith('/combos/')) {
    const comboId = decodeURIComponent(path.slice('/combos/'.length));
    page = <ComboDetail navigate={navigate} user={user} comboId={comboId} />;
  } else if (path === '/my-combos') {
    page = <MyCombos navigate={navigate} user={user} notify={notify} />;
  } else if (path === '/profile' || path.startsWith('/profile/')) {
    const profileId = path.startsWith('/profile/') ? decodeURIComponent(path.slice('/profile/'.length)) : user.id;
    page = <Profile navigate={navigate} user={user} profileId={profileId} onLogout={logout} onUserUpdate={updateUser} />;
  } else {
    page = <Home navigate={navigate} user={user} />;
  }

  return <><Suspense fallback={<div className="route-loading"><SkeletonLoader variant="card" count={3} /></div>}>{page}</Suspense><Snackbar snackbar={snackbar} onClose={closeSnackbar} /></>;
}

export default App;
