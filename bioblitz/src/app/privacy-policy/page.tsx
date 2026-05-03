import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";

export const metadata = {
  title: "Privacy Policy | BioBlitz",
  description: "Privacy Policy for BioBlitz services.",
  alternates: {
    canonical: `${SITE_URL}/privacy-policy`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-neutral-500/30">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <div className="border-b border-zinc-800 pt-6 pb-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-tight">
            BioBlitz Privacy Policy
          </h1>
          <p className="text-zinc-300 ">
            Effective Date:{" "}
            <span className="text-zinc-300 italic">January 1st, 2026</span>
          </p>
        </div>

        <div className="space-y-8 leading-relaxed text-lg">
          <section>
            <p>
              BioBlitz, operated by{" "}
              <a
                href="https://mitosisphere.org"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-300  hover:text-zinc-100 transition-colors"
              >
                Mitosisphere
              </a>
              , a nonprofit organization based in Virginia, USA, is committed to
              protecting your personal information. This Privacy Policy explains
              how BioBlitz collects, uses, and safeguards data when you use our
              services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Data We Collect
            </h2>
            <p className="mb-4">
              When you create a BioBlitz account, we collect information that
              helps us provide a safe and personalized experience, such as your
              name, chosen username, account ID, email address, and any optional
              details you choose to share, like grade or location. Your
              authentication is securely handled via Google Authentication, and
              sensitive information is never stored in plain text.
            </p>
            <p className="mb-4">
              We also gather information that helps us improve and maintain our
              services, including how you interact with the platform, content
              you create or share, technical details from your device, and any
              information you provide when reaching out to our support team. We
              do not use cookies or tracking technologies, and all data is
              collected directly from you.
            </p>
            <div className="bg-zinc-900/50 border-l-4 border-neutral-400 p-6 rounded-r-lg">
              <h3 className="text-white font-bold mb-2">Children's Privacy</h3>
              <p>
                BioBlitz is not intended for users under 13. Please don't make an account if you're under 13 🙃. If we
                discover that we have received personal information from a child
                under 13, we will promptly remove it from our records in
                accordance with the Children&apos;s Online Privacy Protection
                Act (COPPA).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. How We Use Your Data
            </h2>
            <p>
              We use the information you provide to manage your BioBlitz
              account, support your participation in events and competitions,
              and keep you informed about important updates or announcements.
              Your data may be used to improve our services, ensure compliance
              with legal requirements, and protect the security and integrity of
              our community. Marketing emails or newsletters are only sent if
              you've given consent, and you can opt out at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. Supporting Services
            </h2>
            <p className="mb-6">
              We partner with carefully selected third-party service providers
              to operate BioBlitz, ensuring your data is handled securely and
              responsibly. These providers process data strictly on our behalf
              and in accordance with their own privacy policies.
            </p>
            <ul className="list-disc pl-5 space-y-3 text-zinc-300">
              <li>
                <strong className="text-white">
                  Authentication & Security:
                </strong>{" "}
                We use Firebase Authentication to securely manage user logins.
              </li>
              <li>
                <strong className="text-white">
                  Hosting & Infrastructure:
                </strong>{" "}
                Our website is hosted and deployed via Vercel.
              </li>
              <li>
                <strong className="text-white">Databases & Backend:</strong>{" "}
                User data and application services are managed through Firebase.
              </li>
              <li>
                <strong className="text-white">Email Communications:</strong> We
                use Sender.net to send newsletters, updates, and other
                communications you’ve opted into.
              </li>
            </ul>
            <p className="mt-6 text-sm text-zinc-400 italic">
              Your privacy is our priority: we do not sell, rent, or trade
              personal information, nor do we share your data for cross-context
              behavioral or targeted advertising.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. International Users
            </h2>
            <p>
              BioBlitz welcomes users from around the world, though our primary
              audience is in the U.S. If you access our services from outside
              the U.S., please note that your personal information may be
              transferred to and processed in the U.S., where it is subject to
              U.S. law. These laws may differ from those in your country, but we
              take care to handle your information thoughtfully and in line with
              our privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Your Privacy Rights
            </h2>
            <p className="mb-4">
              You may request access to the personal information associated with
              your account and ask that it be updated if any details are
              inaccurate. You may also request deletion of your personal
              information, except where we are required to retain certain data
              for legal, security, or operational purposes.
            </p>
            <p>
              In appropriate circumstances, you may request that we restrict or
              discontinue specific uses of your information. To protect your
              privacy, we may need to verify your identity before processing a
              request. We will respond in a timely manner and in accordance with
              applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Data Retention & Security
            </h2>
            <p className="mb-4">
              We keep your personal information only as long as it is reasonably
              necessary to operate BioBlitz, provide our services, and comply
              with legal obligations. Personal information may be deleted sooner
              if it is no longer needed.
            </p>
            <p className="mb-4">
              Marketing or email communications are retained only as long as you
              have consented to receive them and are deleted when you
              unsubscribe. You can opt out at any time by clicking the
              unsubscribe link in emails, updating your account preferences, or
              contacting us directly.
            </p>
            <p className="mb-4">
              We take reasonable steps to protect your information from
              unauthorized access, use, or disclosure. These steps include
              administrative, technical, and organizational safeguards
              appropriate to the type of data we collect. Access to personal
              information is limited to staff and volunteers who need it to
              operate the platform.
            </p>
            <p>
              While we work to protect your information, no system is completely
              secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Changes to This Privacy Policy
            </h2>
            <p>
              We may review and update this Privacy Policy as needed from time
              to time. The effective date at the top indicates when it was last
              revised. We will inform you of any significant changes through our
              website, email, or other suitable channels to ensure you are
              always aware of how your information is protected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Reach Out to Us
            </h2>
            If you have any questions or concerns about this Privacy Policy or
            how your data is handled, please contact us via email at
            <a href="mailto:admin@bioblitz.net"> admin@bioblitz.net</a>.
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
          <Link
            href="/about"
            className="hover:text-neutral-400 transition-colors"
          >
            About
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
