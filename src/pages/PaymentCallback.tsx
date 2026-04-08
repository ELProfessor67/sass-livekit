import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, X } from "lucide-react";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Notify the original tab via BroadcastChannel
    const channel = new BroadcastChannel("stripe-payment");
    channel.postMessage({ type: success ? "payment_success" : "payment_cancelled" });
    channel.close();

    if (success) {
      // Auto-close after 2 seconds
      const timer = setTimeout(() => {
        setClosing(true);
        window.close();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center space-y-6">
        {success ? (
          <>
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
              <Check className="h-10 w-10 text-green-500" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="text-gray-500">
                {closing ? "Closing this tab..." : "Redirecting you back to onboarding..."}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
              <X className="h-10 w-10 text-red-400" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Payment Cancelled</h2>
              <p className="text-gray-500">You can close this tab and try again.</p>
            </div>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Close Tab
            </button>
          </>
        )}
      </div>
    </div>
  );
}
