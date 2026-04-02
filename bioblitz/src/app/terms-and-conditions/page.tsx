import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";

export const metadata = {
  title: "Terms of Service | BioBlitz",
  description: "Terms and conditions for using BioBlitz.",
  alternates: {
    canonical: `${SITE_URL}/terms-and-conditions`,
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-neutral-500/30">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <div className="border-b border-zinc-800 pt-6 pb-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-tight">
            BioBlitz Terms & Conditions
          </h1>
          <p className="text-zinc-300">
            Effective Date:{" "}
            <span className="text-zinc-300 italic">January 1st, 2026</span>
          </p>
        </div>

        <div className="space-y-8 leading-relaxed text-lg">
          <section>
            <p>
              Welcome to BioBlitz, a platform operated by{" "}
              <a
                href="https://mitosisphere.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Mitosisphere
              </a>
              . By accessing our website, you agree to these Terms. Please read
              them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Eligibility & Registration
            </h2>
            <p className="mb-4">
              <strong>Age Requirement:</strong> Our services are not intended
              for children under the age of 13. By using BioBlitz, you confirm
              that you are at least 13 years old.
            </p>
            <p>
              <strong>Account Access:</strong> You must have a valid Google
              account to register and sign in. You are responsible for
              maintaining the security of your account and for all activities
              that occur under it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Competition Rules & Fair Play
            </h2>
            <p className="mb-4">
              To ensure a fair environment for all biology enthusiasts, you
              agree to the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300">
              <li>
                <strong>No Cheating:</strong> You will not use bots, scripts, or
                external assistance during competitive play.
              </li>
              <li>
                <strong>Respectful Conduct:</strong> You will not harass other
                users or post offensive content in your profile (username/bio).
              </li>
              <li>
                <strong>One Account:</strong> You will not create multiple
                accounts to manipulate rankings or ratings.
              </li>
            </ul>
            <p className="mt-4 text-sm text-zinc-400 italic">
              Violation of these rules may result in immediate account
              suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. Intellectual Property
            </h2>
            <p>
              All content on BioBlitz, including questions, "Problem of the Day"
              materials, graphics, and code, is the property of Mitosisphere or
              its content suppliers. You are granted a limited license to access
              this content for personal, educational use only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Disclaimer & Liability
            </h2>
            <div className="bg-zinc-900/50 border-l-4 border-neutral-400 p-6 rounded-r-lg">
              <p>
                BioBlitz is provided on an "as is" basis. While we strive for
                accuracy, we do not guarantee that the service will be
                error-free or uninterrupted. Mitosisphere is not liable for any
                damages or data loss resulting from your use of the platform.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued
              use of the service following any changes constitutes your
              acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Contact Us
            </h2>
            If you have questions regarding these Terms, please contact us at{" "}
            <a
              href="mailto:admin@bioblitz.net"
              className="text-neutral-400 hover:text-neutral-300 underline"
            >
              admin@bioblitz.net
            </a>
            .
          </section>
        </div>
      </div>

      <footer className="w-full text-center py-8 text-slate-600 text-sm border-t border-slate-900 bg-[#020204]">
        <div className="flex justify-center gap-6 mb-4">
          <Link
            href="/privacy-policy"
            className="hover:text-neutral-400 transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms-and-conditions"
            className="hover:text-neutral-400 transition-colors"
          >
            Terms and Conditions
          </Link>
        </div>
        © {new Date().getFullYear()} BioBlitz. Powered by{" "}
        <Link
          href="https://mitosisphere.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-400 transition-colors font-medium"
        >
          Mitosisphere
        </Link>
        .{" "}
      </footer>
    </div>
  );
}
