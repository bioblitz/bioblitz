"use client";

import { useMemo } from "react";
import twemoji from "twemoji";

interface TwemojiTextProps {
  children: string;
  className?: string;
}

export default function TwemojiText({ children, className }: TwemojiTextProps) {
  const html = useMemo(
    () =>
      twemoji.parse(children, {
        folder: "svg",
        ext: ".svg",
        attributes: () => ({
          style:
            "display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em;",
        }),
      }),
    [children],
  );

  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
