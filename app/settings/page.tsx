"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import {
  Loader2,
  CreditCard,
  AlertTriangle,
  X,
  User,
  Settings as SettingsIcon,
  Bell,
  Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SubscriptionStatus = 'free' | 'active' | 'canceling' | 'past_due' | 'canceled';

type ProfileData = {
  email: string;
  subscription_status: SubscriptionStatus;
  subscription_id: string | null;
  current_period_end: string | null;
  price_id: string | null;
  env_credits: number;
  model_credits: number;
};

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using enough" },
  { value: "missing_features", label: "Missing features" },
  { value: "switching_tools", label: "Switching to another tool" },
  { value: "other", label: "Other" },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // States
  const [selectedReason, setSelectedReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preferences (UI only)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_id, current_period_end, price_id, env_credits, model_credits')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile exists, default to Free plan
      setProfile(data ? {
        ...data,
        email: user.email || "",
      } : {
        email: user.email || "",
        subscription_status: 'free',
        subscription_id: null,
        current_period_end: null,
        price_id: null,
        env_credits: 3,
        model_credits: 0,
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: selectedReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      await loadProfile();
      setShowCancelModal(false);
      setSelectedReason("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReactivateSubscription() {
    setReactivateLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }

      await loadProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReactivateLoading(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getPlanName(status: SubscriptionStatus): string {
    if (status === 'free' || !profile?.subscription_id) return 'Free';
    return 'Pro';
  }

  function getInitials(email: string): string {
    return email.charAt(0).toUpperCase();
  }

  function getUsagePercentage(): number {
    if (!profile) return 0;
    const plan = getPlanName(profile.subscription_status);
    const maxCredits = plan === 'Pro' ? 15 : 3;
    const used = maxCredits - (profile.env_credits || 0);
    return Math.min((used / maxCredits) * 100, 100);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </div>
    );
  }

  const planName = profile ? getPlanName(profile.subscription_status) : 'Free';
  const usagePercent = getUsagePercentage();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-[720px] mx-auto px-6 py-12 mt-16">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1
            className="text-4xl font-bold text-gray-900 mb-3"
            style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
          >
            Account Settings
          </h1>
          <p className="text-gray-600 text-lg" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Manage your profile, subscription, and preferences
          </p>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {/* 1. Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {getInitials(userEmail)}
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-xl font-bold text-gray-900 mb-1"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  {userEmail.split('@')[0]}
                </h2>
                <p className="text-sm text-gray-600 mb-1 truncate" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  {userEmail}
                </p>
                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md">
                  Teacher
                </span>
              </div>
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Edit Profile
              </button>
            </div>
          </motion.div>

          {/* 2. Subscription Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-bold text-gray-900 mb-1"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  Subscription
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Plan details and billing information
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Plan + Status */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Current Plan
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
                    {planName}
                  </span>
                  {profile?.subscription_status === 'active' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">Active</span>
                    </div>
                  )}
                  {profile?.subscription_status === 'canceling' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-xs font-semibold text-orange-700">Canceling</span>
                    </div>
                  )}
                  {(profile?.subscription_status === 'free' || !profile?.subscription_id) && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      <span className="text-xs font-semibold text-gray-600">Free</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Next Billing Date */}
              {profile?.current_period_end && profile.subscription_status !== 'free' && (
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    {profile.subscription_status === 'canceling' ? 'Expires on' : 'Next billing date'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    {formatDate(profile.current_period_end)}
                  </span>
                </div>
              )}

              {/* Usage Progress Bar */}
              <div className="pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Game Generations
                  </span>
                  <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    {profile && planName === 'Pro' ? (15 - (profile.env_credits || 0)) : (3 - (profile?.env_credits || 0))} / {planName === 'Pro' ? 15 : 3}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {profile?.subscription_status === 'active' && profile.subscription_id && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full px-4 py-2.5 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors font-medium text-sm"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    Cancel Subscription
                  </button>
                )}

                {profile?.subscription_status === 'canceling' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                        Your subscription ends on {formatDate(profile.current_period_end)}.
                        You can still use all Pro features until then.
                      </p>
                    </div>
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={reactivateLoading}
                      className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                    >
                      {reactivateLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Reactivating...
                        </>
                      ) : (
                        'Reactivate Subscription'
                      )}
                    </button>
                  </div>
                )}

                {(profile?.subscription_status === 'free' || !profile?.subscription_id) && (
                  <a
                    href="/pricing"
                    className="block w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm text-center"
                    style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                  >
                    Upgrade to Pro
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* 3. Preferences Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-bold text-gray-900 mb-1"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  Preferences
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Manage your notification settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Email notifications
                  </p>
                  <p className="text-xs text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Receive updates about your account
                  </p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailNotifications ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Product Updates Toggle */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Product updates
                  </p>
                  <p className="text-xs text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                    Get notified about new features
                  </p>
                </div>
                <button
                  onClick={() => setProductUpdates(!productUpdates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    productUpdates ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      productUpdates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          {/* 4. Danger Zone Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-red-50 rounded-xl border border-red-200 border-l-4 border-l-red-500 p-6 shadow-sm"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-bold text-red-900 mb-1"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  Danger Zone
                </h2>
                <p className="text-sm text-red-700" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Irreversible actions that affect your account
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-4 py-2.5 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-medium text-sm"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Delete Account
            </button>
          </motion.div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !cancelLoading && setShowCancelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="mb-4">
                <h3
                  className="text-xl font-bold text-gray-900 mb-2"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  Cancel Subscription?
                </h3>
                <p className="text-sm text-gray-600" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  You'll still have access to Pro features until {formatDate(profile?.current_period_end)}.
                  After that, you'll be downgraded to the Free plan.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  Why are you canceling? (Optional)
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  <option value="">Select a reason</option>
                  {CANCELLATION_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  Keep My Plan
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3
                  className="text-xl font-bold text-gray-900 mb-2 text-center"
                  style={{ fontFamily: '"Syne", system-ui, sans-serif' }}
                >
                  Delete Account
                </h3>
                <p className="text-sm text-gray-600 text-center" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                  To delete your account, please contact our support team at{' '}
                  <a href="mailto:support@bioquestxr.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    support@bioquestxr.com
                  </a>
                </p>
              </div>

              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
