"use client";
import Link from "next/link";
import {useEffect, useState, useRef } from "react";


export default function Resources(){

    return(
        <div className="justify-center">
            <main className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 sm:pl-12 lg:pl-33.5 pt-24 pb-12">
                <h1 className="text-neutral-300 text-3xl font-semibold mb-6">
                    Resources
                </h1>
                <p className="max-w-m text-neutral-400 mb-3">
                    This section is dedicated to approved resources by BioBlitz, with materials that will aid you in your USABO preparation.
                    <br/>
                    <br/>
                    Firstly, you should use <Link className="text-neutral-300 hover:underline" href="/resources/lamnhaj-guide.pdf">Lamnhaj's guide</Link> to subsidize and plan out your studying. This guide can be used
                    to take you to the level of a USABO Finalist if followed closely.
                </p>
                
            </main>

        </div>
    );
}