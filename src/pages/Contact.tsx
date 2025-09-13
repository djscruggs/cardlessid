import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import './Contact.css';

const Contact: React.FC = () => {
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState('');

  const sendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');

    if (form.current) {
      emailjs.sendForm(
        'service_gd8ahdd', // Replace with your EmailJS service ID
        'template_96tq9fl', // Replace with your EmailJS template ID
        form.current,
        'CUs0nfElnWZlGwWWM' // Replace with your EmailJS public key
      )
      .then((result) => {
          console.log(result.text);
          setStatus('Message sent successfully!');
          form.current?.reset();
      }, (error) => {
          console.log(error.text);
          setStatus('Failed to send message.');
      });
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl">
      <h2>Contact Us</h2>
      {status && <p className="status-message text-green-700">{status}</p>}
      <form ref={form} onSubmit={sendEmail} className="contact-form text-left w-full max-w-xl">
        <div className="form-group">
          <label htmlFor="user_name" className='text-left'>Name</label>
          <input type="text" id="user_name" name="user_name" required />
        </div>
        <div className="form-group">
          <label htmlFor="user_email">Email</label>
          <input type="email" id="user_email" name="user_email" required />
        </div>
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required></textarea>
        </div>
        <button type="submit" className='bg-logoblue hover:bg-green-700 text-white'>Send Message</button>
      </form>
      
      
    </div>
  );
};

export default Contact;
