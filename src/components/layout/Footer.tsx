/**
 * Application-wide footer: copyright + policy links (+ optional socials).
 */
import Link from 'next/link';
import { Github, Twitter } from 'lucide-react';         // use lucide to avoid a second icon set

export default function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-slate-900">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-2 py-6 text-xs text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} Health Appointment. All rights reserved.</p>

        {/* Policy links */}
        <nav className="flex gap-3">
          <Link
            href="/terms"
            className="hover:text-primary transition-colors underline"
          >
            Terms&nbsp;of&nbsp;Service
          </Link>
          <span>|</span>
          <Link
            href="/privacy"
            className="hover:text-primary transition-colors underline"
          >
            Privacy&nbsp;Policy
          </Link>
        </nav>

        {/* Socials (optional) */}
        <div className="flex gap-4 pt-2">
          <a
            href="https://github.com/example/health-appointment"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <Github size={16} />
          </a>
          <a
            href="https://twitter.com/example"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <Twitter size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
} 