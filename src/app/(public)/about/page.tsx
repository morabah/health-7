import React from 'react';

/**
 * About Page
 * Information about the service, mission, and team
 * 
 * @returns About page component
 */
export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About Health Appointment System</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="mb-4">
          Our mission is to make healthcare more accessible by simplifying the appointment booking process
          and connecting patients with the right healthcare providers.
        </p>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Team</h2>
        <p className="mb-4">
          We are a dedicated team of healthcare professionals and technology experts working together
          to improve the healthcare experience.
        </p>
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">How We Help</h2>
        <ul className="list-disc pl-6">
          <li className="mb-2">Streamlined appointment booking</li>
          <li className="mb-2">Doctor verification for quality assurance</li>
          <li className="mb-2">Easy management of healthcare appointments</li>
          <li className="mb-2">Secure platform for healthcare information</li>
        </ul>
      </section>
    </div>
  );
} 