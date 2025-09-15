import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy } from 'react';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Contact from './pages/Contact'
import What from './pages/What';
import About from './pages/About'
const Demo = lazy(() => import('./pages/Demo'));
const Verify = lazy(() => import( './pages/Verify'));
import './App.css';



function App() {
  
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/whatisit" element={<What />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/demo/verify/:vid" element={<Verify />} />
          <Route path="/demo/verify" element={<Verify />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
