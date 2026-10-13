import { useCallback, useEffect, useState } from 'react';
import Hero from './ui/Hero.jsx';
import Overview from './ui/Overview.jsx';
import Systems from './ui/Systems.jsx';
import Contact, { Footer } from './ui/Contact.jsx';
import { MenuSheet, TabBar } from './ui/Chrome.jsx';
import { enableSmoothScroll, interceptAnchors, scrollToId } from './lib/scroll.js';
import { useMotion } from './lib/store.js';

const finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

export default function App() {
  const motion = useMotion();
  const [menu, setMenu] = useState(false);
  const openMenu = useCallback(() => setMenu(true), []);
  const closeMenu = useCallback(() => setMenu(false), []);

  useEffect(() => interceptAnchors(), []);

  // Inertial wheel scrolling on mouse/trackpad devices; touch keeps its native momentum.
  useEffect(() => {
    enableSmoothScroll(motion && finePointer);
  }, [motion]);

  // Honour a deep link like /#contact once the page has laid out.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => scrollToId(id));
  }, []);

  return (
    <>
      <a className="skip" href="#overview" data-focus>
        Skip to content
      </a>
      <div className="backdrop" aria-hidden="true" />
      <TabBar onMenu={openMenu} />
      <main>
        <Hero onMenu={openMenu} />
        <Overview />
        <Systems />
        <Contact />
      </main>
      <Footer />
      <MenuSheet open={menu} onClose={closeMenu} />
    </>
  );
}
