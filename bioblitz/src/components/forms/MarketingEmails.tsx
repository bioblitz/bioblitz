"use client";

export default function MarketingEmails({ onAccept , onDecline}: { onAccept: () => void , onDecline: () => void}){
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl p-6">
                <h1 className="text-xl text-white font-bold mb-2">
                    Get early access to high-value updates
                </h1>
                <p className="text-sm text-zinc-300 mb-5 leading-relaxed">
                    Be the first to know about new ranked contests, strategy tips, and feature drops.
                    Most updates are short and actionable, and you can unsubscribe anytime.
                </p>
                <div className="mb-5 space-y-2 text-xs text-zinc-400">
                    <p>• New contest alerts before they trend</p>
                    <p>• Curated improvement tips from top performers</p>
                    <p>• Important platform updates, no spam blasts</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onAccept}
                        className="w-full rounded-xl py-3 bg-neutral-600 hover:bg-neutral-500 text-white font-semibold text-sm transition-colors"
                    >
                        Yes, send me the best updates
                    </button>

                    <button
                        onClick={onDecline}
                        className="w-full rounded-xl py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-sm"
                    >
                        No thanks
                    </button>
                </div>
            </div>
        </div>
    )

}