import { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Create from './pages/Create.jsx';
import Profile from './pages/Profile.jsx';
import Combos from './pages/Combos.jsx';
import MyCombos from './pages/MyCombos.jsx';
import { getSession, loginUser, logoutUser, registerUser } from './lib/api.js';

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

  if (path === '/register') {
    return user ? <Home navigate={navigate} user={user} /> : <Register navigate={navigate} onRegister={register} />;
  }

  if (path === '/' || path === '/login') {
    return user ? <Home navigate={navigate} user={user} /> : <Login navigate={navigate} onLogin={login} />;
  }

  if (!user) return <Login navigate={navigate} onLogin={login} />;

  if (path === '/home') {
    return <Home navigate={navigate} user={user} />;
  }

  if (path === '/create') {
    return <Create navigate={navigate} user={user} />;
  }

  if (path === '/combos') {
    return <Combos navigate={navigate} user={user} />;
  }

  if (path === '/my-combos') {
    return <MyCombos navigate={navigate} user={user} />;
  }

  if (path === '/profile') {
    return <Profile navigate={navigate} user={user} onLogout={logout} />;
  }

  return <Home navigate={navigate} user={user} />;
}

export default App;
