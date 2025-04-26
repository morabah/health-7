import React from 'react';

/**
 * Contact Page
 * Allows users to send inquiries and find contact information
 * 
 * @returns Contact page component with inquiry form
 */
export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Send Us a Message</h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block mb-1">Name</label>
              <input
                type="text"
                id="name"
                className="w-full p-2 border rounded-md"
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block mb-1">Email</label>
              <input
                type="email"
                id="email"
                className="w-full p-2 border rounded-md"
                placeholder="Your email"
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block mb-1">Message</label>
              <textarea
                id="message"
                rows={5}
                className="w-full p-2 border rounded-md"
                placeholder="Your message"
              ></textarea>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Send Message
            </button>
          </form>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Email</h3>
              <p>support@healthapp.example</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Phone</h3>
              <p>+1 (123) 456-7890</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Address</h3>
              <p>123 Healthcare Avenue<br />Medical District<br />Health City, HC 12345</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Hours</h3>
              <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
              <p>Saturday: 10:00 AM - 2:00 PM</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 