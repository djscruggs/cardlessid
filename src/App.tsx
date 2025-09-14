import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Contact from './pages/Contact'
import What from './pages/What';
import About from './pages/About'
import Demo from './pages/Demo'
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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
