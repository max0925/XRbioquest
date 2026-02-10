"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function Pricing() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addonLoading, setAddonLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const plans = [
    {
      name: "Free",
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: "Perfect for trying out BioQuest",
      features: [
        "3 game generations",
        "Basic AI features",
        "Standard 3D assets library",
        "Community support",
        "Quest 2/3 compatible",
      ],
      cta: "Start Free",
      href: "/signup",
      popular: false,
    },
    {
      name: "Pro",
      monthlyPrice: 29,
      yearlyPrice: 290,
      description: "For active educators and creators",
      features: [
        "15 game generations/month",
        "Advanced AI generation",
        "Premium 3D assets library",
        "Priority support",
        "All headset support",
        "Analytics dashboard",
        "Export & sharing",
        "Purchase add-ons when needed",
      ],
      cta: "Get Started",
      href: "/signup?plan=individual",
      popular: true,
    },
    {
      name: "School",
      monthlyPrice: null,
      yearlyPrice: 550,
      description: "For schools and districts",
      features: [
        "20 game generations/month",
        "Everything in Individual",
        "Training & onboarding",
        "Dedicated account manager",
        "Student management",
        "LMS integration",
        "Priority support",
        "Invoice billing",
      ],
      cta: "Contact Sales",
      href: "/contact",
      popular: false,
    },
  ];

  const addons = [
    {
      name: "Model Pack",
      price: 9.99,
      description: "+10 3D models",
      badge: null,
      key: "ADDON_MODEL_PACK",
    },
    {
      name: "Environment Pack",
      price: 19.99,
      description: "+15 environments",
      badge: "Best Value",
      key: "ADDON_ENV_PACK",
    },
  ];

  const formatPrice = (plan: typeof plans[number]) => {
    if (plan.name === "School") return "550";
    if (plan.monthlyPrice === 0) return "0";
    if (isYearly) {
      const perMonth = Math.round((plan.yearlyPrice! / 12) * 100) / 100;
      return perMonth % 1 === 0 ? perMonth.toString() : perMonth.toFixed(2);
    }
    return plan.monthlyPrice!.toString();
  };

  const getPriceSuffix = (plan: typeof plans[number]) => {
    if (plan.name === "School") return "/teacher/year";
    if (plan.monthlyPrice === 0) return "";
    return "/month";
  };

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);

    try {
      const plan = isYearly ? "PRO_YEARLY" : "PRO_MONTHLY";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      // Redirect to login if not authenticated
      if (res.status === 401) {
        router.push("/login?redirect=/pricing&message=Please log in to subscribe");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAddonCheckout = async (addonKey: string) => {
    setCheckoutError(null);
    setAddonLoading(addonKey);

    try {
      const res = await fetch("/api/stripe/addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addon: addonKey }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push("/login?redirect=/pricing&message=Please log in to purchase add-ons");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setAddonLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p
            className="text-xs font-semibold text-emerald-600 mb-3 tracking-wider uppercase"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Pricing
          </p>
          <h1
            className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4"
            style={{ fontFamily: '"Syne", "IBM Plex Sans", system-ui, sans-serif' }}
          >
            Choose your plan
          </h1>
          <p
            className="text-lg text-gray-600 max-w-2xl mx-auto mb-10"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Start free and scale as you grow. All plans include our core VR creation tools.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !isYearly
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                isYearly
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Yearly
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Save $58
              </span>
            </button>
          </div>

          {/* Error toast */}
          {checkoutError && (
            <div className="mt-6 inline-flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <span style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>{checkoutError}</span>
              <button onClick={() => setCheckoutError(null)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border transition-all duration-300 ${
                  plan.popular
                    ? "border-emerald-500 shadow-lg scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span
                      className="px-4 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3
                      className="text-2xl font-semibold text-gray-900 mb-2"
                      style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className="text-sm text-gray-600 mb-4"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                        $
                      </span>
                      <span
                        className="text-5xl font-semibold text-gray-900"
                        style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                      >
                        {formatPrice(plan)}
                      </span>
                      <span className="text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                        {getPriceSuffix(plan)}
                      </span>
                    </div>
                    {/* Yearly billing note for Individual */}
                    {plan.name === "Pro" && isYearly && (
                      <p
                        className="text-xs text-gray-500 mt-1.5"
                        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                      >
                        Billed as ${plan.yearlyPrice}/year
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  {plan.name === "Pro" ? (
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="block w-full px-6 py-3 rounded-lg font-medium text-center transition-all duration-300 mb-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {checkoutLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Redirecting to checkout...
                        </span>
                      ) : (
                        plan.cta
                      )}
                    </button>
                  ) : (
                    <Link
                      href={plan.href}
                      className={`block w-full px-6 py-3 rounded-lg font-medium text-center transition-all duration-300 mb-8 ${
                        plan.name === "School"
                          ? "bg-gray-900 hover:bg-gray-800 text-white"
                          : "bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {plan.cta}
                    </Link>
                  )}

                  {/* Features List */}
                  <div className="space-y-3">
                    <p
                      className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      What&apos;s Included
                    </p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span
                          className="text-sm text-gray-700"
                          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-on Packs Section */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2
              className="text-2xl font-semibold text-gray-900 mb-2"
              style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
            >
              Add-on Packs
            </h2>
            <p
              className="text-gray-600"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Need more generations? Purchase add-ons anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {addons.map((addon) => (
              <div
                key={addon.name}
                className="relative rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md transition-all duration-300"
              >
                {addon.badge && (
                  <div className="absolute -top-3 right-4">
                    <span
                      className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {addon.badge}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                    >
                      {addon.name}
                    </h3>
                    <p
                      className="text-sm text-gray-500"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {addon.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-2xl font-semibold text-gray-900"
                      style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                    >
                      ${addon.price}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAddonCheckout(addon.key)}
                  disabled={addonLoading === addon.key}
                  className="w-full px-4 py-2.5 rounded-lg font-medium text-center bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {addonLoading === addon.key ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Buy Now"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p
            className="text-sm text-gray-600 mb-6"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            All plans include 14-day free trial &middot; No credit card required &middot; Cancel anytime
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/contact"
              className="text-emerald-600 hover:text-emerald-700 font-medium transition"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Contact Sales
            </Link>
            <span className="text-gray-300">&middot;</span>
            <Link
              href="/faq"
              className="text-gray-600 hover:text-gray-900 transition"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Pricing FAQ
            </Link>
            <span className="text-gray-300">&middot;</span>
            <Link
              href="/enterprise"
              className="text-gray-600 hover:text-gray-900 transition"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Enterprise Options
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-3xl font-semibold text-gray-900 mb-12 text-center"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Frequently asked questions
          </h2>

          <div className="space-y-8">
            {[
              {
                q: "Can I switch plans later?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, PayPal, and offer invoice billing for School plans.",
              },
              {
                q: "Is there a student discount?",
                a: "Yes! Students and educators with valid .edu emails receive 50% off Individual plans.",
              },
              {
                q: "What happens when I hit my generation limit?",
                a: "On the Free plan, you'll be prompted to upgrade. Paid users can purchase add-on packs to get more generations instantly.",
              },
            ].map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-6">
                <h3
                  className="text-lg font-semibold text-gray-900 mb-3"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  {faq.q}
                </h3>
                <p
                  className="text-base text-gray-600 leading-relaxed"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p
              className="text-sm text-gray-600 mb-4"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Have more questions?
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-all duration-300"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
