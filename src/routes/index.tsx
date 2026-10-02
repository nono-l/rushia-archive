import { createFileRoute } from "@tanstack/react-router";
import { ArchiveApp } from "@/components/archive-app";
import { articleDateHead } from "@/lib/page-date";
import { PAGE_DATES } from "@/lib/page-dates.generated";

export const Route = createFileRoute("/")({
  head: () => {
    const dates = articleDateHead(PAGE_DATES["/"] ?? {});
    return { meta: dates.meta, scripts: dates.scripts };
  },
  component: HomePage,
});

function HomePage() {
  return <ArchiveApp />;
}
