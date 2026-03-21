"use client";

export default function MarketingEmails({ onAccept , onDecline}: { onAccept: () => void , onDecline: () => void}){
    return (
        <div className= "fixed justify-center z-50 items-center bg-black/60 backdrop-blur-sm">
            <div className ="bg-zinc-900 rounded border border-zinc-800 max-w-md shadow-2xl mx-4">
                <h1 className="text-xl text-white font-bold mb-2">
                    Stay in the loop!
                </h1>
                <p className="text-lg text-neutral-800 font-semibold mb-2">
                    Can we send you occassional emails about new competitions, features, or updates?
                    No spam and you may unsubcribe anytime.
                </p>
            </div>
            <div className="flex flex-col gap-3">
                <button
                    onClick={onAccept}
                    className="w-full rounded-xl py-3 text-white font-semibold text-sm"
                >
                    Yes, keep me updated
                </button>

                <button onClick={onDecline} className="w-full rounded-full py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                    No thanks
                </button>
            </div>
        </div>
    )

}