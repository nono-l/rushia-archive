export type PageDateStamp = {
  published?: string;
  modified?: string;
};

export function articleDateHead(dates: PageDateStamp) {
  const meta: { property: string; content: string }[] = [];
  if (dates.published) {
    meta.push({ property: "article:published_time", content: dates.published });
  }
  if (dates.modified) {
    meta.push({ property: "article:modified_time", content: dates.modified });
  }
  const scripts =
    dates.published || dates.modified
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              datePublished: dates.published,
              dateModified: dates.modified ?? dates.published,
            }).replace(/</g, "\\u003c"),
          },
        ]
      : [];
  return { meta, scripts };
}
