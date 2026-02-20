import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FAQItem } from '@/lib/types';

const faqItems: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'Is my report truly anonymous?',
    answer:
      'Yes, you can choose to submit your report anonymously. If you do not provide contact information, your identity will not be known to administrators. However, providing contact details may help if more information is needed to address your report effectively.',
  },
  {
    id: 'faq-2',
    question: 'What kind of incidents can I report?',
    answer:
      'You can report any incident that you believe violates college policy or law, or creates an unsafe environment. This includes, but is not limited to, harassment, theft, vandalism, assault, academic misconduct, safety concerns, and discrimination.',
  },
  {
    id: 'faq-3',
    question: 'What happens after I submit a report?',
    answer:
      'Once submitted, your report will be reviewed by the appropriate college personnel. It will be classified using our AI tool to help speed up administration. You can track the general status of your report on the dashboard if you create an account (feature pending) or if you save a unique report ID (feature pending). For anonymous reports without tracking, the college will take appropriate action based on the information provided.',
  },
  {
    id: 'faq-4',
    question: 'How long will it take to resolve my report?',
    answer:
      'The time to resolve a report varies depending on its complexity and the investigation required. We strive to address all reports promptly and thoroughly. You will see status updates on the dashboard if applicable.',
  },
  {
    id: 'faq-5',
    question: 'Can I upload evidence with my report?',
    answer:
      'Currently, direct file uploads are not supported in this version. However, please describe any evidence you have in the report description. If administrators need to collect evidence, they will outline a secure method if contact is possible.',
  },
  {
    id: 'faq-6',
    question: 'Who will see my report?',
    answer:
      'Reports are handled by designated college staff who are trained to manage such incidents with confidentiality and sensitivity. Access to reports is restricted to personnel directly involved in the investigation and resolution process.',
  },
];

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Find answers to common questions about incident reporting.
        </p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item) => (
          <AccordionItem
            value={item.id}
            key={item.id}
            className="bg-card shadow-sm rounded-lg mb-3 border px-2"
          >
            <AccordionTrigger className="text-left hover:no-underline text-md font-semibold py-4 px-4">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="py-4 px-4 text-muted-foreground leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
