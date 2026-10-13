import React from 'react';
import { BookOpen } from 'lucide-react';
export default function Footer() {
  return <footer className="footer">
    <div className="wrap footer-inner">
      <span className="brand footer-brand"><span className="brand-mark">
          <BookOpen size={15} />
        </span>postlight<span className="brand-dot">.</span></span>
      <span>A little space for big ideas.</span>
    </div>
  </footer>;
}
