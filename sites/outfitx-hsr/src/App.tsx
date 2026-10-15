import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { WhatsAppFab } from './components/WhatsAppFab';
import { ScrollManager } from './components/ScrollManager';
import { EnquiryPrefillProvider } from './lib/prefill';
import { Home } from './pages/Home';
import { TrainingDetail } from './pages/TrainingDetail';
import { Privacy } from './pages/Privacy';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    // reducedMotion="user" turns transform animations off for visitors who ask for less motion.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <EnquiryPrefillProvider>
          <ScrollManager />
          <Nav />
          <main id="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/training/:slug" element={<TrainingDetail />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <WhatsAppFab />
        </EnquiryPrefillProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
