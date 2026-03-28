import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — DocTex",
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
