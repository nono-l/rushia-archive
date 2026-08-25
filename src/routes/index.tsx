import { createFileRoute } from "@tanstack/react-router";
import { ArchiveApp } from "@/components/archive-app";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <ArchiveApp />;
}
