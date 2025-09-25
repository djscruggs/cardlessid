import { useRef, useState } from "react";
import emailjs from "@emailjs/browser";

export function meta() {
  return [{ title: "Contact Cardless ID" }];
}

const Contact: React.FC = () => {
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");

  const sendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Sending...");

    if (form.current) {
      emailjs
        .sendForm(
          "service_gd8ahdd", // Replace with your EmailJS service ID
          "template_96tq9fl", // Replace with your EmailJS template ID
          form.current,
          "CUs0nfElnWZlGwWWM" // Replace with your EmailJS public key
        )
        .then(
          () => {
            setStatus("Message sent successfully!");
            form.current?.reset();
          },
          () => {
            setStatus("Failed to send message.");
          }
        );
    }
  };
  const labelCss = "text-left w-full max-w-lg block mb-1";
  const inputCss =
    "w-full border-2 border-gray-200 max-w-lg rounded-sm mb-4 h-10 p-2";

  return (
    <div className="flex flex-col items-center justify-center w-full mt-10 ">
      <h2>Contact Us</h2>
      {status && <p className="status-message text-green-700">{status}</p>}
      <form
        ref={form}
        onSubmit={sendEmail}
        className="contact-form text-left w-full max-w-xl flex flex-col"
      >
        <div>
          <label htmlFor="user_name" className={labelCss}>
            Name
          </label>
          <input
            type="text"
            id="user_name"
            name="user_name"
            className={inputCss}
            required
          />
        </div>
        <div>
          <label htmlFor="user_email" className={labelCss}>
            Email
          </label>
          <input
            type="email"
            id="user_email"
            name="user_email"
            className={inputCss}
            required
          />
        </div>
        <div>
          <label htmlFor="message" className={labelCss}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            className={inputCss + " min-h-48"}
            required
          ></textarea>
        </div>
        <div className="flex justify-center max-w-lg">
          <button
            type="submit"
            className="cursor-pointer bg-logoblue hover:bg-green-700 text-white rounded-full w-md p-4"
          >
            Send Message
          </button>
        </div>
      </form>
    </div>
  );
};

export default Contact;
