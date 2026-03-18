import React from 'react';

const row1 = ["NEXUS", "Z-API", "SDR.AI", "WHATS.BOT", "LOGIC", "FLOW", "VERTEX", "QUANT"];
const row2 = ["QUANT", "APEX", "CORA", "MATRIX", "GRID", "PRISM", "SHIFT", "PULSE"];
const row3 = ["PULSE", "SYNC", "VECTOR", "BASE", "APEX", "CORA", "MATRIX", "GRID"];

export function LogoCloud() {
    return (
        <>
            <style>{`
                @keyframes scroll-left {
                    from { transform: translateX(0%); }
                    to { transform: translateX(-50%); }
                }
                @keyframes scroll-right {
                    from { transform: translateX(-50%); }
                    to { transform: translateX(0%); }
                }

                .scroll-track-left {
                    animation: scroll-left linear;
                    animation-timeline: scroll(root);
                    will-change: transform;
                }

                .scroll-track-right {
                    animation: scroll-right linear;
                    animation-timeline: scroll(root);
                    will-change: transform;
                }
            `}</style>

            <section className="bg-black border-t border-[#2C2C2C] overflow-hidden">
                <div className="space-y-0 divide-y divide-[#2C2C2C] border-y border-[#2C2C2C]">
                    
                    {/* Row 1: Left */}
                    <div className="py-8 overflow-hidden">
                        <div className="flex space-x-24 scroll-track-left whitespace-nowrap w-[200%]">
                            {[...row1, ...row1].map((logo, i) => (
                                <span key={i} className="font-heading text-xl font-bold text-white opacity-50 hover:opacity-100 transition-opacity duration-300 cursor-default px-6 tracking-widest leading-none">
                                    {logo}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Row 2: Right */}
                    <div className="py-8 overflow-hidden">
                        <div className="flex space-x-24 scroll-track-right whitespace-nowrap w-[200%]">
                            {[...row2, ...row2].map((logo, i) => (
                                <span key={i} className="font-heading text-xl font-bold text-white opacity-50 hover:opacity-100 transition-opacity duration-300 cursor-default px-6 tracking-widest leading-none">
                                    {logo}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Row 3: Left */}
                    <div className="py-8 overflow-hidden">
                        <div className="flex space-x-24 scroll-track-left whitespace-nowrap w-[200%]">
                            {[...row3, ...row3].map((logo, i) => (
                                <span key={i} className="font-heading text-xl font-bold text-white opacity-50 hover:opacity-100 transition-opacity duration-300 cursor-default px-6 tracking-widest leading-none">
                                    {logo}
                                </span>
                            ))}
                        </div>
                    </div>

                </div>
            </section>
        </>
    );
}
