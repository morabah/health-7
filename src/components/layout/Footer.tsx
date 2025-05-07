/**
 * Application-wide footer with modern design, multiple sections, and responsive layout
 */
import Link from 'next/link';
import { Github, Twitter, Facebook, Instagram, Mail, Phone, MapPin, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Enhanced footer with healthcare-themed design */}
      <div className="pt-10 pb-4 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Main footer content with improved grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8">
            {/* Company Info - spans 4 columns on larger screens */}
            <div className="md:col-span-4">
              <h3 className="text-lg font-semibold text-primary dark:text-primary-400">
                Health Appointment
              </h3>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs">
                Your trusted platform for finding and booking healthcare services with qualified professionals. We connect patients with doctors for a healthier tomorrow.
              </p>
              <div className="flex mt-6 space-x-4">
                <a 
                  href="https://twitter.com/example" 
                  className="text-slate-400 hover:text-primary transition-colors w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                  aria-label="Twitter"
                >
                  <Twitter size={16} />
                </a>
                <a 
                  href="https://facebook.com/example" 
                  className="text-slate-400 hover:text-primary transition-colors w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                  aria-label="Facebook"
                >
                  <Facebook size={16} />
                </a>
                <a 
                  href="https://instagram.com/example" 
                  className="text-slate-400 hover:text-primary transition-colors w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                  aria-label="Instagram"
                >
                  <Instagram size={16} />
                </a>
                <a 
                  href="https://github.com/example/health-appointment" 
                  className="text-slate-400 hover:text-primary transition-colors w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                  aria-label="GitHub"
                >
                  <Github size={16} />
                </a>
              </div>
            </div>
            
            {/* Quick Links - spans 2 columns */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Links
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/find-doctors" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Find Doctors
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Our Services
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Health Blog
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Legal - spans 2 columns */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Legal
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/terms" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    Accessibility
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Contact - spans 4 columns */}
            <div className="md:col-span-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Contact Us
              </h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary-900/20 flex items-center justify-center text-primary dark:text-primary-400 mr-3">
                    <MapPin size={16} />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    123 Healthcare Avenue, Medical District, CA 90210
                  </span>
                </li>
                <li className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary-900/20 flex items-center justify-center text-primary dark:text-primary-400 mr-3">
                    <Phone size={16} />
                  </div>
                  <a href="tel:+11234567890" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                    +1 (123) 456-7890
                  </a>
                </li>
                <li className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary-900/20 flex items-center justify-center text-primary dark:text-primary-400 mr-3">
                    <Mail size={16} />
                  </div>
                  <a href="mailto:contact@healthapp.com" className="text-sm text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-400 transition-colors">
                    contact@healthapp.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Decorative separator */}
          <div className="py-4">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
          </div>
          
          {/* Footer bottom - copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm">
            <p className="text-slate-500 dark:text-slate-400">
              © {currentYear} Health Appointment. All rights reserved.
            </p>
            <p className="mt-2 sm:mt-0 text-slate-500 dark:text-slate-400 flex items-center">
              Made with <Heart size={14} className="mx-1 text-red-500" /> for better healthcare
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 