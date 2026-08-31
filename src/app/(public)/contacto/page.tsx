import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos tus dudas sobre el CICOM.",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-40 pt-12 sm:pb-12">
      <h1 className="text-3xl font-bold tracking-tight">Contacto</h1>
      <p className="mt-2 text-slate-600">
        ¿Tienes dudas sobre el congreso? Escríbenos.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
