"use client"



import React from "react"

const TICKER_ITEMS = [

  "Top Gun 3: $120M [▲12%]",

  "Wicked: $90M [▼4%]",

  "Mufasa: $45M [▲2%]",

  "Gladiator II: $30M [▼10%]",

  "BOXY OFFICE TRACKER LIVE",

]

export function TickerInterrupter() {

  return (

    <div

      className="w-full bg-[#E6FF00] py-3 overflow-hidden border-y border-black rotate-[0.5deg] scale-[1.01] my-6 shadow-[0_0_30px_rgba(230,255,0,0.4)] relative"

      role="marquee"

      aria-label="Live box office tracker"

    >

      <div className="flex gap-8 animate-marquee whitespace-nowrap font-mono text-black font-bold text-lg md:text-xl tracking-tight uppercase">

        {/* Repeat items 3 times for seamless loop */}

        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (

          <React.Fragment key={index}>

            <span>{item}</span>

            {(index + 1) % TICKER_ITEMS.length !== 0 && (

              <span className="text-black/50" aria-hidden="true">

                ///

              </span>

            )}

          </React.Fragment>

        ))}

      </div>

    </div>

  )

}

