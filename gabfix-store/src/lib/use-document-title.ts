import { useEffect } from "react";

/** Sets the browser tab title (and optionally description) on mount. Replaces TanStack's head(). */
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute("content", description);
      } else {
        const created = document.createElement("meta");
        created.name = "description";
        created.content = description;
        document.head.appendChild(created);
      }
    }
  }, [title, description]);
}
