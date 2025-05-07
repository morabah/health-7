/**
 * Application-wide footer with modern design, multiple sections, and responsive layout
 */
import Link from 'next/link';
import { Github, Twitter, Facebook, Instagram, Mail, Phone, MapPin, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          {/* Company Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Health Appointment
            </h3>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Your trusted platform for finding and booking healthcare services with qualified professionals.
            </p>
            <div className="flex mt-6 space-x-6">
              <a 
                href="https://twitter.com/example" 
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a 
                href="https://facebook.com/example" 
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="https://instagram.com/example" 
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a 
                href="https://github.com/example/health-appointment" 
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/find-doctors" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Find Doctors
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Health Blog
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Contact Us
            </h3>
            <ul className="mt-4 space-y-2">
              <li className="flex items-start">
                <MapPin size={16} className="mt-1 mr-3 text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  123 Healthcare Avenue, Medical District, CA 90210
                </span>
              </li>
              <li className="flex items-center">
                <Phone size={16} className="mr-3 text-slate-400" />
                <a href="tel:+11234567890" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  +1 (123) 456-7890
                </a>
              </li>
              <li className="flex items-center">
                <Mail size={16} className="mr-3 text-slate-400" />
                <a href="mailto:contact@healthapp.com" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                  contact@healthapp.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Footer bottom - copyright */}
        <div className="border-t border-slate-200 dark:border-slate-800 py-6 flex flex-col sm:flex-row items-center justify-between text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            © {currentYear} Health Appointment. All rights reserved.
          </p>
          <p className="mt-2 sm:mt-0 text-slate-500 dark:text-slate-400 flex items-center">
            Made with <Heart size={14} className="mx-1 text-red-500" /> for better healthcare
          </p>
        </div>
      </div>
    </footer>
  );
} 