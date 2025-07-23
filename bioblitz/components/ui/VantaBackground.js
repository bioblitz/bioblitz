//Gemini generated code

"use client"; // This component uses hooks, so it must be a client component.

import { useState, useEffect, useRef } from 'react';
import NET from 'vanta/dist/vanta.net.min.js'; // Import the VANTA effect
import * as THREE from 'three'; // Import THREE

const VantaBackground = () => {
  const [vantaEffect, setVantaEffect] = useState(null);
  const vantaRef = useRef(null);

  useEffect(() => {
    // Ensure window.THREE is available for VANTA
    window.THREE = THREE;

    // Initialize Vanta effect only if it hasn't been created yet
    if (!vantaEffect) {
      const effect = NET({
        el: vantaRef.current, // Use the ref instead of a selector
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0xfff3f3,
        backgroundColor: 0x0,
        points: 15.00,
        maxDistance: 15.00,
        spacing: 11.00,
        THREE: THREE // Pass the THREE instance to VANTA
      });
      setVantaEffect(effect);
    }

    // Cleanup function to destroy the effect when the component unmounts
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]); // Rerun effect if vantaEffect changes

  // The div that Vanta will attach to, styled to cover the background
  return (
    <div ref={vantaRef} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1 // Place it behind all other content
    }}>
    </div>
  );
};

export default VantaBackground;